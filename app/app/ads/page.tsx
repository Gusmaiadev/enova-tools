import { ListaClientes } from '@/components/ads/ListaClientes'
import { listarClientes } from '@/lib/ads/persistencia'
import { exigirUsuario } from '@/lib/auth/usuarioAtual'

export const dynamic = 'force-dynamic'

export default async function AdsHome() {
  const usuario = await exigirUsuario()
  const clientes = await listarClientes(usuario.teamId)

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Google Ads</p>
      <h1 className="mt-1 font-display text-2xl font-semibold">Acompanhamento de campanhas</h1>
      <p className="mt-1 mb-8 text-sm text-text-dim">
        Escolha um cliente para ver as métricas e as sugestões da IA, ou adicione um novo.
      </p>

      <ListaClientes inicial={clientes} />
    </div>
  )
}
