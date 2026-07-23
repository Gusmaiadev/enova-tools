import { ListaProjetos } from '@/components/lp/ListaProjetos'
import { exigirUsuario } from '@/lib/auth/usuarioAtual'
import { listarProjetos } from '@/lib/lp/persistencia'

export const dynamic = 'force-dynamic'

export default async function LpHome() {
  const usuario = await exigirUsuario()
  const projetos = await listarProjetos(usuario.teamId)

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Landing Pages</p>
      <h1 className="mt-1 font-display text-2xl font-semibold">Criador de Landing Pages</h1>
      <p className="mt-1 mb-8 text-sm text-text-dim">
        Responda três etapas, a IA monta a página inteira e você ajusta tudo no editor visual.
      </p>

      <ListaProjetos inicial={projetos} />
    </div>
  )
}
