import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { buscarMidias } from '@/lib/lp/bancos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/lp/midias — busca imagens ou vídeos nos bancos configurados.
 * Body: { busca, tipo?: 'imagem'|'video', orientacao?, pagina? }.
 * Sem nenhuma chave responde 200 com { erro, semChave: true } (padrão da IA de Ads).
 *
 * A resposta traz `termo`/`traduzido` para a interface poder mostrar em que
 * texto a busca foi feita de verdade (o termo vai traduzido para inglês).
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
  const pagina = typeof corpo.pagina === 'number' && corpo.pagina > 1 ? Math.floor(corpo.pagina) : 1

  const resultado = await buscarMidias(corpo.busca, tipo, orientacao, { limite: 48, pagina })
  if (!resultado.ok) {
    return Response.json(
      { erro: resultado.erro, semChave: resultado.semChave ?? false },
      { status: resultado.semChave ? 200 : 502 },
    )
  }

  return Response.json({
    ok: true,
    midias: resultado.midias,
    termo: resultado.termo,
    original: resultado.original,
    traduzido: resultado.traduzido,
    fontes: resultado.fontes,
    temMais: resultado.temMais,
  })
}
