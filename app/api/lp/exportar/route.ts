import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { montarPacote } from '@/lib/lp/exportar'
import { obterProjeto } from '@/lib/lp/persistencia'
import { coergirDocumento } from '@/lib/lp/validar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Baixa todas as mídias (e fontes) antes de montar o zip.
export const maxDuration = 300

/**
 * POST /api/lp/exportar — devolve o .zip da landing page.
 * Body: { lpId, formato: 'unico' | 'projeto', documento? }.
 *
 * O `documento` é opcional: o editor manda o estado atual para exportar sem
 * precisar salvar antes. Sem ele, exporta o que está gravado.
 * Avisos (mídias que não baixaram) voltam no header X-Lp-Avisos.
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
  if (typeof corpo.lpId !== 'string') {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  const formato = corpo.formato === 'projeto' ? 'projeto' : 'unico'

  const projeto = await obterProjeto(corpo.lpId, usuario.teamId)
  if (!projeto) return Response.json({ erro: 'Projeto não encontrado.' }, { status: 404 })

  const documento =
    corpo.documento === undefined ? projeto.documento : coergirDocumento(corpo.documento)
  if (!documento) {
    return Response.json({ erro: 'Gere a landing page antes de exportar.' }, { status: 400 })
  }

  const pacote = await montarPacote(documento, projeto.nome, formato)

  // Streaming: um zip com muitas mídias passa do limite de corpo bufferizado
  // (~4,5 MB) da função; entregue em pedaços evita FUNCTION_PAYLOAD_TOO_LARGE.
  const stream = paraStream(pacote.zip)

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${pacote.nomeArquivo}"`,
      'Content-Length': String(pacote.zip.length),
      'X-Lp-Avisos': encodeURIComponent(pacote.avisos.join('|')),
      'Cache-Control': 'no-store',
    },
  })
}

function paraStream(dados: Uint8Array): ReadableStream<Uint8Array> {
  const PEDACO = 512 * 1024
  let pos = 0
  return new ReadableStream({
    pull(controller) {
      if (pos >= dados.length) {
        controller.close()
        return
      }
      controller.enqueue(dados.subarray(pos, pos + PEDACO))
      pos += PEDACO
    },
  })
}
