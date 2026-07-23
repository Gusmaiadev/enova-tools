import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { buscarMidias } from '@/lib/lp/envato'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/lp/midias — busca imagens ou vídeos no Envato.
 * Body: { busca, tipo?: 'imagem'|'video', orientacao?: 'paisagem'|'retrato'|'quadrado' }.
 * Sem ENVATO_TOKEN responde 200 com { erro, semChave: true } (padrão da IA de Ads).
 */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof corpo.busca !== 'string' || corpo.busca.trim() === '') {
    return Response.json({ erro: 'Descreva a imagem ou o vídeo que você quer.' }, { status: 400 })
  }

  const tipo = corpo.tipo === 'video' ? 'video' : 'imagem'
  const orientacao =
    corpo.orientacao === 'retrato' || corpo.orientacao === 'quadrado' ? corpo.orientacao : 'paisagem'

  const resultado = await buscarMidias(corpo.busca, tipo, orientacao, 24)
  if (!resultado.ok) {
    return Response.json(
      { erro: resultado.erro, semChave: resultado.semChave ?? false },
      { status: resultado.semChave ? 200 : 502 },
    )
  }

  return Response.json({ ok: true, midias: resultado.midias })
}
