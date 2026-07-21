import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ImportarCSV } from '@/components/ads/ImportarCSV'
import { KpiTiles } from '@/components/ads/KpiTiles'
import { PainelIA } from '@/components/ads/PainelIA'
import { TabelaCampanhas } from '@/components/ads/TabelaCampanhas'
import { TabelaTermos } from '@/components/ads/TabelaTermos'
import { Tendencia } from '@/components/ads/Tendencia'
import { obterCliente, snapshotsDoCliente } from '@/lib/ads/persistencia'
import type { AdsSnapshot, LinhaCampanha, LinhaTermo } from '@/lib/ads/tipos'
import { exigirUsuario } from '@/lib/auth/usuarioAtual'

export const dynamic = 'force-dynamic'

function metaSnapshot(s: AdsSnapshot): string {
  const data = new Date(s.createdAt).toLocaleString('pt-BR')
  const truncado = s.totalLinhas > s.linhas.length ? ` · mostrando as ${s.linhas.length} maiores de ${s.totalLinhas}` : ''
  return `Atualizado em ${data} por ${s.importadoPorNome}${truncado}`
}

export default async function ClienteDashboard({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const usuario = await exigirUsuario()
  const { clienteId } = await params

  const cliente = await obterCliente(clienteId, usuario.teamId)
  if (!cliente) redirect('/app/ads')

  const snaps = await snapshotsDoCliente(clienteId, usuario.teamId)
  const campanhas = snaps.find((s) => s.tipo === 'campanhas') ?? null
  const termos = snaps.find((s) => s.tipo === 'termos') ?? null

  // Histórico de campanhas (mais antigo → recente) para a tendência.
  const historico = snaps
    .filter((s) => s.tipo === 'campanhas')
    .slice()
    .reverse()
    .map((s) => ({ custo: s.agregados.custo, conversoes: s.agregados.conversoes }))

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/app/ads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-dim hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Clientes
      </Link>

      <h1 className="mb-6 font-display text-2xl font-semibold">{cliente.nome}</h1>

      <div className="space-y-6">
        <ImportarCSV clienteId={clienteId} />

        {campanhas ? (
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Visão geral</h2>
              <p className="text-xs text-text-dim">{metaSnapshot(campanhas)}</p>
            </div>
            <KpiTiles agregados={campanhas.agregados} />
            <Tendencia historico={historico} />
            <TabelaCampanhas linhas={campanhas.linhas as LinhaCampanha[]} />
          </section>
        ) : null}

        {termos ? (
          <section className="space-y-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Termos de busca</h2>
              <p className="text-xs text-text-dim">{metaSnapshot(termos)}</p>
            </div>
            <TabelaTermos linhas={termos.linhas as LinhaTermo[]} />
          </section>
        ) : null}

        {!campanhas && !termos ? (
          <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-text-dim">
            Nenhum relatório importado ainda. Use o painel acima para enviar o primeiro CSV.
          </p>
        ) : null}

        <PainelIA clienteId={clienteId} temDados={!!(campanhas || termos)} />
      </div>
    </div>
  )
}
