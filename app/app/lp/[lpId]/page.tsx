import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Assistente } from '@/components/lp/Assistente'
import { exigirUsuario } from '@/lib/auth/usuarioAtual'
import { obterProjeto } from '@/lib/lp/persistencia'

export const dynamic = 'force-dynamic'

export default async function BriefingLp({ params }: { params: Promise<{ lpId: string }> }) {
  const usuario = await exigirUsuario()
  const { lpId } = await params
  const projeto = await obterProjeto(lpId, usuario.teamId)
  if (!projeto) redirect('/app/lp')

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/app/lp"
        className="inline-flex items-center gap-1.5 text-sm text-text-dim transition-colors hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Landing pages
      </Link>

      <p className="mt-4 font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Briefing</p>
      <h1 className="mt-1 font-display text-2xl font-semibold">{projeto.nome}</h1>
      <p className="mt-1 mb-8 text-sm text-text-dim">
        Quanto mais você contar aqui, melhor a IA escreve. Só o nome do projeto é obrigatório.
      </p>

      <Assistente projeto={projeto} />
    </div>
  )
}
