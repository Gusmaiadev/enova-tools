import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { enviarMidia, removerMidia } from '@/lib/lp/armazenamento'
import { obterProjeto } from '@/lib/lp/persistencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Video de 50 MB em conexao ruim: o padrao de 300s sobra, mas 60s ja cobre.
export const maxDuration = 60

/** Numero positivo vindo do FormData (medidas do arquivo, medidas no client). */
function medida(valor: FormDataEntryValue | null, maximo: number): number | undefined {
  const n = Number(valor)
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), maximo) : undefined
}

/**
 * POST /api/lp/upload — envia uma imagem ou video do usuario para o bucket do
 * projeto. FormData: { arquivo: File, lpId: string, largura?, altura?, duracao? }.
 * Responde { ok: true, midia } com a LpMidia pronta para o documento/briefing.
 */
export async function POST(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let dados: FormData
  try {
    dados = await req.formData()
  } catch {
    return Response.json({ erro: 'Envio inválido.' }, { status: 400 })
  }

  const arquivo = dados.get('arquivo')
  const lpId = dados.get('lpId')
  if (!(arquivo instanceof File) || typeof lpId !== 'string' || lpId === '') {
    return Response.json({ erro: 'Envio inválido.' }, { status: 400 })
  }

  // Confirma que a LP é do time antes de criar pasta no bucket para ela.
  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) return Response.json({ erro: 'Projeto não encontrado.' }, { status: 404 })

  const resultado = await enviarMidia(
    arquivo,
    { teamId: usuario.teamId, lpId, uid: usuario.uid },
    {
      largura: medida(dados.get('largura'), 20000),
      altura: medida(dados.get('altura'), 20000),
      duracao: medida(dados.get('duracao'), 36000),
    },
  )
  if (!resultado.ok) return Response.json({ erro: resultado.erro }, { status: resultado.status })

  return Response.json({ ok: true, midia: resultado.midia })
}

/**
 * DELETE /api/lp/upload — apaga um arquivo enviado. Body: { caminho }.
 * Usado quando o usuário troca ou remove a mídia que acabou de enviar, para o
 * arquivo não ficar ocupando o bucket sem ninguém apontando para ele.
 */
export async function DELETE(req: Request) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 })

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }
  if (typeof corpo.caminho !== 'string' || corpo.caminho === '') {
    return Response.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  const ok = await removerMidia(corpo.caminho, usuario.teamId)
  if (!ok) return Response.json({ erro: 'Não foi possível remover o arquivo.' }, { status: 400 })
  return Response.json({ ok: true })
}
