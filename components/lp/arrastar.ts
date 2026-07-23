'use client'

import { useState, type DragEvent } from 'react'

/**
 * Reordenacao por arrastar e soltar (HTML5 DnD) para listas verticais.
 * Só a ALÇA arrasta (props `alca`) — o item inteiro é apenas alvo de soltura
 * (props `alvo`), então dá para selecionar texto nos campos sem disparar arrasto.
 * `mover` fica exposto para botões de subir/descer (acessibilidade por teclado).
 */
export function useArrastar(mover: (de: number, para: number) => void) {
  const [origem, setOrigem] = useState<number | null>(null)
  const [alvoIdx, setAlvoIdx] = useState<number | null>(null)

  const fim = () => {
    setOrigem(null)
    setAlvoIdx(null)
  }

  return {
    mover,
    /** Props da alça (o punho): inicia o arrasto. */
    alca: (indice: number) => ({
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setOrigem(indice)
        e.dataTransfer.effectAllowed = 'move'
        // Firefox só inicia o arrasto se houver dado no dataTransfer.
        e.dataTransfer.setData('text/plain', String(indice))
      },
      onDragEnd: fim,
    }),
    /** Props do contêiner (o item): recebe o soltar. */
    alvo: (indice: number) => ({
      onDragOver: (e: DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (alvoIdx !== indice) setAlvoIdx(indice)
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        if (origem !== null && origem !== indice) mover(origem, indice)
        fim()
      },
    }),
    /** Classe de realce do alvo atual. */
    classe: (indice: number) =>
      origem !== null && alvoIdx === indice && origem !== indice
        ? 'border-blue/70 bg-surface-2'
        : '',
  }
}

/** Move um item de posição devolvendo um array novo. */
export function reordenar<T>(itens: T[], de: number, para: number): T[] {
  const copia = [...itens]
  const [item] = copia.splice(de, 1)
  copia.splice(para, 0, item)
  return copia
}
