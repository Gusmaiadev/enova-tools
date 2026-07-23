import { redirect } from 'next/navigation'
import { EditorLp } from '@/components/lp/EditorLp'
import { exigirUsuario } from '@/lib/auth/usuarioAtual'
import { obterProjeto } from '@/lib/lp/persistencia'

export const dynamic = 'force-dynamic'

export default async function EditorPagina({
  params,
  searchParams,
}: {
  params: Promise<{ lpId: string }>
  searchParams: Promise<{ avisos?: string | string[] }>
}) {
  const usuario = await exigirUsuario()
  const { lpId } = await params
  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) redirect('/app/lp')
  // Sem página gerada não há o que editar — volta para o briefing.
  if (!projeto.documento) redirect(`/app/lp/${lpId}`)

  // Avisos da geração (mídia sem resultado, IA sem chave…) chegam pela URL.
  const { avisos } = await searchParams
  const lista = typeof avisos === 'string' ? avisos.split('|').filter(Boolean) : []

  return <EditorLp projeto={{ ...projeto, documento: projeto.documento }} avisos={lista} />
}
