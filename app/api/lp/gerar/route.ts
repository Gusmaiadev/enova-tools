import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { documentoBase } from '@/lib/lp/documento'
import { gerarDocumento } from '@/lib/lp/ia'
import { preencherMidias } from '@/lib/lp/midias'
import { atualizarProjeto, obterProjeto } from '@/lib/lp/persistencia'
import { analisarReferencias } from '@/lib/lp/referencias'
import { coergirBriefing } from '@/lib/lp/validar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// IA (até 120s) + análise de referências + buscas no Envato em lotes.
export const maxDuration = 300

/**
 * POST /api/lp/gerar — gera a landing page. Body: { lpId, briefing? }.
 *
 * O briefing enviado é salvo antes de gerar (o assistente manda o estado atual).
 * Sem GEMINI_API_KEY a página ainda é gerada a partir do briefing, só sem o
 * conteúdo escrito pela IA — o aviso volta em `semChave`.
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

  const projeto = await obterProjeto(corpo.lpId, usuario.teamId)
  if (!projeto) return Response.json({ erro: 'Projeto não encontrado.' }, { status: 404 })

  const briefing =
    corpo.briefing === undefined
      ? projeto.briefing
      : coergirBriefing(corpo.briefing, projeto.nome)

  if (briefing.secoes.length === 0) {
    return Response.json(
      { erro: 'Adicione pelo menos uma seção antes de gerar a página.' },
      { status: 400 },
    )
  }

  const avisos: string[] = []
  const referencias =
    briefing.referencias.length > 0 ? await analisarReferencias(briefing.referencias) : []
  const inacessiveis = referencias.filter((r) => r.resumo === 'não foi possível acessar o site')
  if (inacessiveis.length > 0) {
    avisos.push(
      `${inacessiveis.length} ${inacessiveis.length === 1 ? 'site de referência não pôde ser analisado' : 'sites de referência não puderam ser analisados'}.`,
    )
  }

  const resultado = await gerarDocumento(briefing, referencias)
  let semChaveIA = false

  // Erro real da IA (rede, cota, resposta inválida OU chave inválida/expirada):
  // salva só o briefing e preserva a página que já existir. Só a AUSÊNCIA de
  // chave (semChave) cai no fallback determinístico abaixo.
  if (!resultado.ok && !resultado.semChave) {
    await atualizarProjeto(corpo.lpId, usuario.teamId, { briefing })
    return Response.json({ erro: resultado.erro }, { status: 502 })
  }

  const documento = resultado.ok ? resultado.documento : documentoBase(briefing)
  if (!resultado.ok) {
    semChaveIA = true
    avisos.push(resultado.erro)
  }

  // A IA pode devolver menos seções do que o briefing pediu (descartadas por
  // tipo inválido na coerção) — avisa em vez de sumir com elas em silêncio.
  const faltando = briefing.secoes.length - documento.secoes.length
  if (resultado.ok && faltando > 0) {
    avisos.push(
      `${faltando} ${faltando === 1 ? 'seção não pôde ser gerada' : 'seções não puderam ser geradas'} e ficou de fora. Reveja no editor ou gere de novo.`,
    )
  }

  const midias = await preencherMidias(documento)
  if (midias.semChave) {
    avisos.push(
      'Busca de mídia não configurada (ENVATO_TOKEN): as imagens ficaram como espaço reservado. Troque cada uma no editor.',
    )
  } else if (midias.pendentes > 0) {
    avisos.push(
      `${midias.pendentes} ${midias.pendentes === 1 ? 'mídia não teve resultado' : 'mídias não tiveram resultado'} na busca. Ajuste a descrição no editor.`,
    )
  }

  await atualizarProjeto(corpo.lpId, usuario.teamId, { briefing, documento })

  return Response.json({ ok: true, documento, avisos, semChave: semChaveIA })
}
