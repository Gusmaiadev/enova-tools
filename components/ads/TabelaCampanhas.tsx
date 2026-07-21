import { formatarMoeda, formatarNumero, formatarPercent } from '@/lib/ads/formato'
import { derivar, type LinhaCampanha } from '@/lib/ads/tipos'

export function TabelaCampanhas({ linhas }: { linhas: LinhaCampanha[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
            <th className="px-3 py-2 font-medium">Campanha</th>
            <th className="px-3 py-2 text-right font-medium">Custo</th>
            <th className="px-3 py-2 text-right font-medium">Impr.</th>
            <th className="px-3 py-2 text-right font-medium">Cliques</th>
            <th className="px-3 py-2 text-right font-medium">CTR</th>
            <th className="px-3 py-2 text-right font-medium">Conv.</th>
            <th className="px-3 py-2 text-right font-medium">Custo/conv.</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const d = derivar(l)
            return (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface-2/50">
                <td className="max-w-[240px] truncate px-3 py-2 font-medium" title={l.campanha}>
                  {l.campanha}
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatarMoeda(l.custo)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatarNumero(l.impressoes)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatarNumero(l.cliques)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatarPercent(d.ctr)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatarNumero(l.conversoes)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatarMoeda(d.custoPorConv)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
