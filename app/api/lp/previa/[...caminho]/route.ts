import { lerUsuario } from '@/lib/auth/usuarioAtual'
import { compilar } from '@/lib/lp/compilador'
import { obterProjeto } from '@/lib/lp/persistencia'
import { PAGINAS_LEGAIS } from '@/lib/lp/tipos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Arquivos que a prévia serve: a página e as de texto que ela linka. */
const ARQUIVOS = new Set(['index.html', ...PAGINAS_LEGAIS.map((p) => p.arquivo)])

/**
 * Página avulsa (erro), no visual mais simples possível: quem abriu esta aba
 * queria ver a landing page, não a interface do painel.
 */
function aviso(mensagem: string, status: number): Response {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prévia</title></head><body style="font:16px/1.6 system-ui,sans-serif;padding:2rem;color:#0f172a"><p>${mensagem}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } },
  )
}

/**
 * GET /api/lp/previa/{lpId}/index.html — a landing page sozinha, para ver numa
 * aba do navegador. Serve o que está gravado no projeto; o editor salva antes de
 * abrir a aba.
 *
 * O caminho termina em "index.html" de propósito: os links das páginas de texto
 * no rodapé são relativos ("termos.html") e só caem em {lpId}/termos.html se a
 * página que os contém estiver dentro dessa pasta.
 *
 * Vai com CSP `sandbox`: o conteúdo é nosso (compilado, com todo texto escapado),
 * mas roda numa origem opaca — sem alcançar cookie, storage nem API do painel,
 * a mesma proteção que o canvas do editor tem por ser um iframe sem
 * allow-same-origin.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ caminho: string[] }> },
) {
  const usuario = await lerUsuario(true)
  if (!usuario) return Response.redirect(new URL('/login', req.url), 302)

  const { caminho } = await params
  const [lpId, arquivo = 'index.html'] = caminho
  if (!lpId || caminho.length > 2 || !ARQUIVOS.has(arquivo)) {
    return aviso('Página não encontrada.', 404)
  }

  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) return aviso('Projeto não encontrado.', 404)
  if (!projeto.documento) return aviso('Esta landing page ainda não foi gerada.', 404)

  const compilado = compilar(projeto.documento)
  const html =
    arquivo === 'index.html'
      ? compilado.unico
      : compilado.paginas.find((p) => p.arquivo === arquivo)?.unico
  if (html === undefined) return aviso('Esta página não faz parte do projeto.', 404)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy':
        'sandbox allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox',
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'no-store',
    },
  })
}
