import 'server-only'

/**
 * Arquivos de midia que o usuario envia para a landing page, no Firebase
 * Storage. O client NUNCA fala com o bucket: manda o arquivo para
 * /api/lp/upload e o Admin SDK grava. Isso mantem a regra do projeto (todo
 * dado passa por Route Handler) e deixa storage.rules negando tudo.
 *
 * O link publico e o download URL do Firebase (token no metadata do objeto),
 * nao um ACL publico: funciona com uniform bucket-level access ligado e pode
 * ser invalidado apagando o token, sem tornar o bucket inteiro legivel.
 */

import { randomUUID } from 'node:crypto'
import { getBucket } from '@/lib/firebase/admin'
import { FORMATOS, orientacaoDe, recusar } from './formatos'
import type { LpMidia } from './tipos'

/** Segmento de caminho de objeto: só [A-Za-z0-9_-]. */
const limpo = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'sem-id'

export const pastaDoTime = (teamId: string) => `lp/${limpo(teamId)}`

export const pastaDoProjeto = (teamId: string, lpId: string) =>
  `${pastaDoTime(teamId)}/${limpo(lpId)}`

export type ResultadoUpload =
  | { ok: true; midia: LpMidia }
  | { ok: false; erro: string; status: 400 | 413 | 500 }

type Medidas = { largura?: number; altura?: number; duracao?: number }

/**
 * Grava o arquivo e devolve a midia pronta para entrar no documento. As medidas
 * vem do client (ele ja carregou o arquivo para mostrar a previa) — nao da para
 * confiar nelas, mas sao so metadado visual, ja limitadas na rota.
 */
export async function enviarMidia(
  arquivo: File,
  destino: { teamId: string; lpId: string; uid: string },
  medidas: Medidas = {},
): Promise<ResultadoUpload> {
  const recusa = recusar(arquivo.type, arquivo.size)
  if (recusa) {
    // 413 so no caso de tamanho: o client usa o status para diferenciar o aviso.
    return { ok: false, status: /limite/.test(recusa) ? 413 : 400, erro: recusa }
  }
  const formato = FORMATOS[arquivo.type]

  const nome = (arquivo.name || `arquivo.${formato.ext}`).slice(-120)
  const caminho = `${pastaDoProjeto(destino.teamId, destino.lpId)}/${randomUUID()}.${formato.ext}`
  const token = randomUUID()

  try {
    const bucket = getBucket()
    await bucket.file(caminho).save(Buffer.from(await arquivo.arrayBuffer()), {
      resumable: false,
      metadata: {
        contentType: arquivo.type,
        // O nome do objeto e um uuid: o conteudo nunca muda, pode cachear forte.
        cacheControl: 'public, max-age=31536000, immutable',
        metadata: {
          // Token do download URL do Firebase — sem ele o link publico nao abre.
          firebaseStorageDownloadTokens: token,
          nomeOriginal: nome,
          enviadoPor: destino.uid,
        },
      },
    })

    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`
    const midia: LpMidia = {
      tipo: formato.tipo,
      url,
      caminho,
      alt: nome,
      busca: '',
      orientacao: orientacaoDe(medidas.largura, medidas.altura),
    }
    if (medidas.largura) midia.largura = medidas.largura
    if (medidas.altura) midia.altura = medidas.altura
    if (medidas.duracao) midia.duracao = medidas.duracao
    return { ok: true, midia }
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : ''
    return {
      ok: false,
      status: 500,
      erro: `Não foi possível guardar o arquivo${detalhe ? `: ${detalhe}` : '.'}`,
    }
  }
}

/** Idade minima para um arquivo sem uso poder ser apagado pela limpeza. */
const CARENCIA_ORFAO = 60 * 60 * 1000

/**
 * Apaga da pasta do projeto os arquivos que ele nao cita mais (troca de midia no
 * editor, seção que mudou de layout, pagina gerada de novo).
 *
 * Poupa o que tem menos de uma hora, e isso e essencial: o editor tem desfazer
 * (Ctrl+Z), entao a midia trocada agora pode voltar em seguida — e um upload em
 * andamento ainda nao esta no documento salvo. Nunca lanca; devolve quantos saiu.
 */
export async function limparOrfaos(
  teamId: string,
  lpId: string,
  usados: Set<string>,
): Promise<number> {
  try {
    const [arquivos] = await getBucket().getFiles({
      prefix: `${pastaDoProjeto(teamId, lpId)}/`,
    })
    const agora = Date.now()
    const orfaos = arquivos.filter((a) => {
      if (usados.has(a.name)) return false
      const criado = Date.parse(String(a.metadata.timeCreated ?? ''))
      // Sem data confiavel, nao arrisca: deixa o arquivo onde esta.
      return Number.isFinite(criado) && agora - criado > CARENCIA_ORFAO
    })
    await Promise.all(orfaos.map((a) => a.delete().catch(() => {})))
    return orfaos.length
  } catch {
    return 0
  }
}

/**
 * Apaga a pasta inteira do projeto. So para quando a LP e excluida: ai nao ha
 * documento nem desfazer para trazer nada de volta.
 */
export async function removerPastaDoProjeto(teamId: string, lpId: string): Promise<number> {
  try {
    const [arquivos] = await getBucket().getFiles({
      prefix: `${pastaDoProjeto(teamId, lpId)}/`,
    })
    await Promise.all(arquivos.map((a) => a.delete().catch(() => {})))
    return arquivos.length
  } catch {
    return 0
  }
}

/**
 * Apaga um arquivo do bucket. So aceita caminho dentro da pasta do time — o
 * caminho chega do client e nao pode virar chave para o arquivo de outro.
 * Silencioso: arquivo que nao existe mais conta como removido.
 */
export async function removerMidia(caminho: string, teamId: string): Promise<boolean> {
  const prefixo = `${pastaDoTime(teamId)}/`
  if (!caminho.startsWith(prefixo) || caminho.includes('..')) return false
  try {
    await getBucket().file(caminho).delete()
    return true
  } catch (e) {
    return (e as { code?: number }).code === 404
  }
}
