import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { excluirCliente, obterCliente } from '@/lib/ads/persistencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** DELETE /api/ads/clientes/{clienteId} — remove o cliente e seus snapshots. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clienteId: string }> },
) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  const { clienteId } = await params
  const cliente = await obterCliente(clienteId, usuario.teamId)
  if (!cliente) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 })

  await excluirCliente(clienteId, usuario.teamId)
  return Response.json({ ok: true })
}
