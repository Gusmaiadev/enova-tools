import 'server-only'

import { db } from '@/lib/firebase/admin'
import { codigoConfere, gerarCodigo, hashDoCodigo } from './codigo'

// Regras de seguranca do 2FA (secao 5.4).
export const EXPIRA_MS = 10 * 60 * 1000 // codigo expira em 10 minutos
export const MAX_TENTATIVAS = 5 // 5 tentativas por challenge, depois queima
export const MAX_ENVIOS = 3 // 3 envios de codigo...
export const JANELA_ENVIOS_MS = 15 * 60 * 1000 // ...por 15 minutos

type Challenge = {
  hash: string
  expiresAt: number
  attempts: number
  sentAt: number
  /** Timestamps dos envios dentro da janela, para o limite de 3/15min. */
  envios: number[]
}

function ref(uid: string) {
  return db.collection('mfa_challenges').doc(uid)
}

export type ResultadoEnvio =
  | { ok: true; codigo: string; minutos: number; sentAt: number }
  | { ok: false; erro: string; status: number }

/**
 * Cria ou renova o challenge, respeitando o teto de 3 envios / 15 min.
 *
 * O check da janela e a escrita rodam numa TRANSACAO: sem isso, requisicoes
 * concorrentes leem o mesmo estado velho e furam o limite de 3/15min. O codigo
 * volta em texto plano UMA vez, para o handler enviar por e-mail; so o hash e
 * persistido.
 */
export async function criarEnvio(uid: string, agora: number): Promise<ResultadoEnvio> {
  const codigo = gerarCodigo()
  const challengeBase = {
    hash: hashDoCodigo(codigo),
    expiresAt: agora + EXPIRA_MS,
    attempts: 0, // cada novo envio zera as tentativas do codigo anterior
    sentAt: agora,
  }

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref(uid))
      const atual = snap.exists ? (snap.data() as Challenge) : null
      const enviosNaJanela = (atual?.envios ?? []).filter((t) => agora - t < JANELA_ENVIOS_MS)

      if (enviosNaJanela.length >= MAX_ENVIOS) {
        const maisAntigo = Math.min(...enviosNaJanela)
        const esperaMin = Math.ceil((JANELA_ENVIOS_MS - (agora - maisAntigo)) / 60000)
        return {
          ok: false as const,
          status: 429,
          erro: `Muitos códigos enviados. Tente de novo em ${esperaMin} min.`,
        }
      }

      const challenge: Challenge = { ...challengeBase, envios: [...enviosNaJanela, agora] }
      tx.set(ref(uid), challenge)
      return { ok: true as const }
    })

    if (!resultado.ok) return resultado
    return { ok: true, codigo, minutos: Math.round(EXPIRA_MS / 60000), sentAt: agora }
  } catch {
    return { ok: false, status: 500, erro: 'Não foi possível gerar o código.' }
  }
}

/**
 * Desfaz a reserva de um envio quando o e-mail nao pode ser entregue — remove so
 * aquele timestamp da janela, para uma falha de entrega nao consumir o teto de
 * 3/15min e travar o usuario. O hash fica (inofensivo, sera sobrescrito).
 */
export async function reverterEnvio(uid: string, sentAt: number): Promise<void> {
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref(uid))
      if (!snap.exists) return
      const c = snap.data() as Challenge
      const envios = (c.envios ?? []).filter((t) => t !== sentAt)
      tx.update(ref(uid), { envios })
    })
  } catch {
    // best-effort: se falhar, o pior caso e o envio contar contra o teto
  }
}

export type ResultadoVerificacao =
  | { ok: true }
  | { ok: false; erro: string; status: number }

/**
 * Confere o codigo dentro de uma TRANSACAO: existencia, expiracao, teto de
 * tentativas, igualdade em tempo constante, incremento e queima — tudo atomico.
 * Sem a transacao, N requisicoes paralelas leem attempts=0 juntas e furam o teto
 * de 5 tentativas, viabilizando forca bruta do codigo de 6 digitos.
 */
export async function verificar(
  uid: string,
  codigo: string,
  agora: number,
): Promise<ResultadoVerificacao> {
  try {
    return await db.runTransaction<ResultadoVerificacao>(async (tx) => {
      const snap = await tx.get(ref(uid))
      if (!snap.exists) {
        return { ok: false, status: 400, erro: 'Nenhum código pendente. Peça um novo.' }
      }
      const c = snap.data() as Challenge

      if (agora > c.expiresAt) {
        tx.delete(ref(uid))
        return { ok: false, status: 400, erro: 'Código expirado. Peça um novo.' }
      }

      if (c.attempts >= MAX_TENTATIVAS) {
        tx.delete(ref(uid))
        return { ok: false, status: 429, erro: 'Tentativas esgotadas. Peça um novo código.' }
      }

      if (!codigoConfere(codigo, c.hash)) {
        const attempts = c.attempts + 1
        if (attempts >= MAX_TENTATIVAS) {
          tx.delete(ref(uid))
          return {
            ok: false,
            status: 429,
            erro: 'Código incorreto. Tentativas esgotadas, peça um novo código.',
          }
        }
        tx.update(ref(uid), { attempts })
        return {
          ok: false,
          status: 401,
          erro: `Código incorreto. Restam ${MAX_TENTATIVAS - attempts} tentativas.`,
        }
      }

      tx.delete(ref(uid))
      return { ok: true }
    })
  } catch {
    return { ok: false, status: 500, erro: 'Falha ao verificar o código. Tente de novo.' }
  }
}
