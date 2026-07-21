'use client'

import { useMemo } from 'react'
import type { Rect } from '@/lib/places/geometria'

export type EstadoCelula = 'varrendo' | 'ok' | 'saturada'
export type CelulaRadar = { key: string; rect: Rect; estado: EstadoCelula }

const W = 320
const H = 320

/**
 * Mini-mapa vetorial da bounding box com as celulas do quadtree se subdividindo
 * em tempo real (secao 4). A ousadia visual do projeto mora aqui.
 *
 * Respeita prefers-reduced-motion: sem a animacao, o SVG some (motion-reduce:hidden)
 * e sobra so o contador — que fica sempre visivel.
 */
export function Radar({
  extent,
  celulas,
  total,
  chamadas,
  ativo,
}: {
  extent: Rect | null
  celulas: CelulaRadar[]
  total: number
  chamadas: number
  ativo: boolean
}) {
  const projetar = useMemo(() => {
    if (!extent) return null
    const lngSpan = extent.high.longitude - extent.low.longitude || 1e-9
    const latSpan = extent.high.latitude - extent.low.latitude || 1e-9
    return (r: Rect) => {
      const x = ((r.low.longitude - extent.low.longitude) / lngSpan) * W
      const w = ((r.high.longitude - r.low.longitude) / lngSpan) * W
      // Norte no topo: latitude maior => y menor.
      const y = ((extent.high.latitude - r.high.latitude) / latSpan) * H
      const h = ((r.high.latitude - r.low.latitude) / latSpan) * H
      return { x, y, w, h }
    }
  }, [extent])

  return (
    <div
      className={`rounded-xl border bg-surface/80 p-4 backdrop-blur-sm transition-shadow duration-500 ${
        ativo
          ? 'border-blue/50 shadow-[0_0_50px_-14px_var(--blue)]'
          : 'border-border'
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <span className="flex items-center gap-2 font-display text-sm text-text-dim">
          {ativo ? (
            <span className="inline-block h-2 w-2 animate-glow-pulse rounded-full bg-blue" />
          ) : null}
          {ativo ? 'Varrendo…' : 'Radar'}
        </span>
        <div className="flex items-baseline gap-4 font-mono text-sm">
          <span>
            <span className="text-2xl font-medium text-yellow tabular-nums">{total}</span>
            <span className="ml-1 text-text-dim">negócios</span>
          </span>
          <span className="text-text-dim">
            <span className="tabular-nums text-text">{chamadas}</span> chamadas
          </span>
        </div>
      </div>

      {extent && projetar ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="aspect-square w-full rounded-md [background:radial-gradient(circle_at_center,color-mix(in_srgb,var(--blue)_10%,transparent),transparent_65%),var(--bg)] motion-reduce:hidden"
          role="img"
          aria-label={`Radar de varredura: ${total} negócios encontrados`}
        >
          {/* moldura da bounding box */}
          <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" stroke="var(--border)" />

          {celulas.map((c) => {
            const p = projetar(c.rect)
            const cor =
              c.estado === 'saturada'
                ? 'var(--pink)'
                : c.estado === 'varrendo'
                  ? 'var(--blue)'
                  : 'var(--border)'
            const fill =
              c.estado === 'varrendo'
                ? 'color-mix(in srgb, var(--blue) 22%, transparent)'
                : 'transparent'
            const classe =
              c.estado === 'varrendo'
                ? 'radar-celula-varrendo'
                : c.estado === 'saturada'
                  ? 'radar-celula-satura'
                  : ''
            return (
              <rect
                key={c.key}
                x={p.x}
                y={p.y}
                width={Math.max(0, p.w)}
                height={Math.max(0, p.h)}
                fill={fill}
                stroke={cor}
                strokeWidth={c.estado === 'ok' ? 0.5 : 1}
                className={classe}
              />
            )
          })}
        </svg>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-md bg-bg text-sm text-text-dim">
          {ativo ? 'Localizando bairro…' : 'A varredura aparece aqui.'}
        </div>
      )}
    </div>
  )
}
