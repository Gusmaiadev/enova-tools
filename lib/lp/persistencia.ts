import 'server-only'

import { db } from '@/lib/firebase/admin'
import { migrarProjeto, precisaMigrar } from './migrar'
import type { LpBriefing, LpDocumento, LpProjeto, LpProjetoResumo } from './tipos'
import { briefingVazio } from './tipos'

const projetosCol = () => db.collection('lp_projetos')

// A conversão de formatos antigos — inclusive o documento para árvore — mora em
// lib/lp/migrar.ts, que é puro e por isso testável sem o Firebase Admin.

/** Remove undefined (o Firestore rejeita) e qualquer prototipo estranho. */
const paraFirestore = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/**
 * Projetos da equipe, mais recentes primeiro. Usa .select() para não baixar o
 * briefing e o documento (que podem ser grandes) só para montar o resumo — o
 * flag `gerada` é denormalizado a cada escrita.
 */
export async function listarProjetos(teamId: string): Promise<LpProjetoResumo[]> {
  const snap = await projetosCol()
    .where('teamId', '==', teamId)
    .select('nome', 'createdAt', 'atualizadoEm', 'gerada')
    .get()
  return snap.docs
    .map((d) => {
      const dados = d.data() as {
        nome: string
        createdAt: number
        atualizadoEm: number
        gerada?: boolean
      }
      return {
        id: d.id,
        nome: dados.nome,
        createdAt: dados.createdAt,
        atualizadoEm: dados.atualizadoEm,
        gerada: dados.gerada ?? false,
      }
    })
    .sort((a, b) => b.atualizadoEm - a.atualizadoEm)
}

export async function criarProjeto(
  teamId: string,
  uid: string,
  nome: string,
): Promise<LpProjeto> {
  const agora = Date.now()
  const dados: Omit<LpProjeto, 'id'> = {
    nome: nome.trim(),
    teamId,
    criadoPor: uid,
    createdAt: agora,
    atualizadoEm: agora,
    briefing: briefingVazio(nome.trim()),
    documento: null,
  }
  // `gerada` é denormalizado para o resumo da lista não precisar do documento.
  const ref = await projetosCol().add(paraFirestore({ ...dados, gerada: false }))
  return { id: ref.id, ...dados }
}

/** Projeto pelo id, confirmando que pertence à equipe (senão null). */
export async function obterProjeto(lpId: string, teamId: string): Promise<LpProjeto | null> {
  const doc = await projetosCol().doc(lpId).get()
  const dados = doc.data() as Omit<LpProjeto, 'id'> | undefined
  if (!dados || dados.teamId !== teamId) return null
  return { id: doc.id, ...migrarProjeto(dados) }
}

/** Atualiza nome, briefing e/ou documento; carimba atualizadoEm. */
export async function atualizarProjeto(
  lpId: string,
  teamId: string,
  patch: { nome?: string; briefing?: LpBriefing; documento?: LpDocumento | null },
): Promise<boolean> {
  const projeto = await obterProjeto(lpId, teamId)
  if (!projeto) return false
  const dados: Record<string, unknown> = { atualizadoEm: Date.now() }
  if (patch.nome !== undefined) dados.nome = patch.nome.trim()
  if (patch.briefing !== undefined) dados.briefing = patch.briefing
  if (patch.documento !== undefined) {
    dados.documento = patch.documento
    dados.gerada = patch.documento !== null
    // Rede de proteção: na primeira escrita depois da migração, guarda o
    // documento como estava. Se um expansor errado estragar a página de um
    // cliente, o original ainda existe.
    //
    // A leitura tem de ser CRUA: obterProjeto já devolve migrado, e gravar isso
    // como "V1" salvaria justamente a coisa que se quer poder desfazer.
    const cru = (await projetosCol().doc(lpId).get()).data() as
      | { documento?: LpDocumento | null; documentoV1?: unknown }
      | undefined
    if (cru?.documentoV1 === undefined && cru?.documento && precisaMigrar(cru.documento)) {
      dados.documentoV1 = cru.documento
    }
  }
  await projetosCol().doc(lpId).update(paraFirestore(dados))
  return true
}

export async function excluirProjeto(lpId: string, teamId: string): Promise<void> {
  const projeto = await obterProjeto(lpId, teamId)
  if (!projeto) return
  await projetosCol().doc(lpId).delete()
}
