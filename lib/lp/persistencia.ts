import 'server-only'

import { db } from '@/lib/firebase/admin'
import type { LpBriefing, LpDocumento, LpProjeto, LpProjetoResumo } from './tipos'
import { briefingVazio } from './tipos'

const projetosCol = () => db.collection('lp_projetos')

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
  return { id: doc.id, ...dados }
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
  }
  await projetosCol().doc(lpId).update(paraFirestore(dados))
  return true
}

export async function excluirProjeto(lpId: string, teamId: string): Promise<void> {
  const projeto = await obterProjeto(lpId, teamId)
  if (!projeto) return
  await projetosCol().doc(lpId).delete()
}
