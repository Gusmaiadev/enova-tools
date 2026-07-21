import 'server-only'

import { db } from '@/lib/firebase/admin'
import type { AdsCliente, AdsSnapshot, TipoRelatorio } from './tipos'

const clientesCol = () => db.collection('ads_clientes')
const snapsCol = () => db.collection('ads_snapshots')

/** Clientes (contas de Ads geridas) da equipe, por nome. */
export async function listarClientes(teamId: string): Promise<AdsCliente[]> {
  const snap = await clientesCol().where('teamId', '==', teamId).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<AdsCliente, 'id'>) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function criarCliente(
  teamId: string,
  uid: string,
  nome: string,
): Promise<AdsCliente> {
  const dados = { nome: nome.trim(), teamId, criadoPor: uid, createdAt: Date.now() }
  const ref = await clientesCol().add(dados)
  return { id: ref.id, ...dados }
}

/** Cliente pelo id, confirmando que pertence à equipe (senão null). */
export async function obterCliente(clienteId: string, teamId: string): Promise<AdsCliente | null> {
  const doc = await clientesCol().doc(clienteId).get()
  const dados = doc.data() as Omit<AdsCliente, 'id'> | undefined
  if (!dados || dados.teamId !== teamId) return null
  return { id: doc.id, ...dados }
}

/** Exclui o cliente e todos os seus snapshots. */
export async function excluirCliente(clienteId: string, teamId: string): Promise<void> {
  const cliente = await obterCliente(clienteId, teamId)
  if (!cliente) return
  const snaps = await snapsCol().where('clienteId', '==', clienteId).get()
  const batch = db.batch()
  snaps.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(clientesCol().doc(clienteId))
  await batch.commit()
}

export async function salvarSnapshot(snap: Omit<AdsSnapshot, 'id'>): Promise<string> {
  const ref = await snapsCol().add(snap)
  return ref.id
}

/**
 * Snapshots do cliente, mais recentes primeiro. Filtra por igualdade (índice de
 * campo único) e confere o teamId em memória — sem índice composto.
 */
export async function snapshotsDoCliente(
  clienteId: string,
  teamId: string,
): Promise<AdsSnapshot[]> {
  const snap = await snapsCol().where('clienteId', '==', clienteId).get()
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<AdsSnapshot, 'id'>) }))
    .filter((s) => s.teamId === teamId)
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Último snapshot de um tipo (campanhas ou termos), ou null. */
export async function ultimoSnapshot(
  clienteId: string,
  teamId: string,
  tipo: TipoRelatorio,
): Promise<AdsSnapshot | null> {
  const todos = await snapshotsDoCliente(clienteId, teamId)
  return todos.find((s) => s.tipo === tipo) ?? null
}
