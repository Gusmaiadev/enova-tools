import { formatarMoeda, formatarNumero } from '@/lib/ads/formato'

type Ponto = { custo: number; conversoes: number }

function Sparkline({ valores, cor }: { valores: number[]; cor: string }) {
  const w = 240
  const h = 48
  const max = Math.max(...valores, 1)
  const min = Math.min(...valores, 0)
  const span = max - min || 1
  const pts = valores.map((v, i) => {
    const x = valores.length === 1 ? w : (i / (valores.length - 1)) * w
    const y = h - ((v - min) / span) * (h - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** Tendência de custo e conversões ao longo das importações (mais antiga → recente). */
export function Tendencia({ historico }: { historico: Ponto[] }) {
  if (historico.length < 2) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-text-dim">
        Importe o relatório de campanhas mais de uma vez para ver a tendência ao longo do tempo.
      </p>
    )
  }

  const custos = historico.map((p) => p.custo)
  const convs = historico.map((p) => p.conversoes)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wide text-text-dim">Custo</p>
          <p className="font-mono text-sm">{formatarMoeda(custos[custos.length - 1])}</p>
        </div>
        <div className="mt-2">
          <Sparkline valores={custos} cor="var(--blue)" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs uppercase tracking-wide text-text-dim">Conversões</p>
          <p className="font-mono text-sm">{formatarNumero(convs[convs.length - 1])}</p>
        </div>
        <div className="mt-2">
          <Sparkline valores={convs} cor="var(--yellow)" />
        </div>
      </div>
    </div>
  )
}
