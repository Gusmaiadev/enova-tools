'use client'

import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import type { useArrastar } from './arrastar'

/**
 * Alça de arrastar + botões subir/descer. O arrasto é opcional (mouse); os
 * botões dão a alternativa por teclado, com rótulo acessível.
 */
export function Alca({
  arrastar,
  indice,
  total,
  rotulo,
}: {
  arrastar: ReturnType<typeof useArrastar>
  indice: number
  total: number
  rotulo: string
}) {
  return (
    <span className="flex shrink-0 items-center">
      <span
        {...arrastar.alca(indice)}
        aria-hidden
        className="cursor-grab p-0.5 text-text-dim"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <button
        type="button"
        aria-label={`Mover ${rotulo} para cima`}
        disabled={indice === 0}
        onClick={() => arrastar.mover(indice, indice - 1)}
        className="rounded p-1 text-text-dim transition-colors hover:text-text disabled:opacity-30"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label={`Mover ${rotulo} para baixo`}
        disabled={indice === total - 1}
        onClick={() => arrastar.mover(indice, indice + 1)}
        className="rounded p-1 text-text-dim transition-colors hover:text-text disabled:opacity-30"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}
