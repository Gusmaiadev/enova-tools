'use client'

import { definir } from './PorDispositivo'
import { Marcar } from './campos'
import { DISPOSITIVOS, NOME_DISPOSITIVO } from '@/lib/lp/padroes'
import type { Dispositivo, PorDisp } from '@/lib/lp/tipos'

/**
 * "Não mostrar em": marque quantas telas quiser. Vira `display:none` no
 * breakpoint marcado — o elemento continua no documento e no HTML, só não
 * aparece ali.
 *
 * O mesmo controle serve widget e seção; o que muda é onde o valor é gravado.
 */
export function CamposVisibilidade({
  oculto,
  aoMudar,
}: {
  oculto: PorDisp<boolean> | undefined
  aoMudar: (oculto: PorDisp<boolean> | undefined) => void
}) {
  return (
    <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
      <p className="mb-2 text-xs text-text-dim">Não mostrar em</p>
      <div className="flex flex-wrap gap-3">
        {DISPOSITIVOS.map((d) => (
          <Marcar
            key={d}
            rotulo={NOME_DISPOSITIVO[d]}
            valor={oculto?.[d] === true}
            aoMudar={(v) => aoMudar(definir(oculto, d as Dispositivo, v ? true : undefined))}
          />
        ))}
      </div>
    </div>
  )
}
