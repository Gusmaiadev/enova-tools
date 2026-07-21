import { formatarMoeda, formatarNumero, formatarPercent } from '@/lib/ads/formato'
import { type Agregados, derivar } from '@/lib/ads/tipos'

function Tile({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-text-dim">{rotulo}</p>
      <p className="mt-1 font-display text-xl font-semibold">{valor}</p>
    </div>
  )
}

/** Painel de KPIs a partir dos agregados de um snapshot. */
export function KpiTiles({ agregados }: { agregados: Agregados }) {
  const d = derivar(agregados)
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Tile rotulo="Custo" valor={formatarMoeda(agregados.custo)} />
      <Tile rotulo="Conversões" valor={formatarNumero(agregados.conversoes)} />
      <Tile rotulo="Custo/conv." valor={formatarMoeda(d.custoPorConv)} />
      <Tile rotulo="Cliques" valor={formatarNumero(agregados.cliques)} />
      <Tile rotulo="Impressões" valor={formatarNumero(agregados.impressoes)} />
      <Tile rotulo="CTR" valor={formatarPercent(d.ctr)} />
      <Tile rotulo="CPC médio" valor={formatarMoeda(d.cpcMedio)} />
      <Tile rotulo="Taxa de conv." valor={formatarPercent(d.taxaConv)} />
    </div>
  )
}
