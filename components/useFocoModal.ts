'use client'

import { useEffect, type RefObject } from 'react'

const FOCAVEIS =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Acessibilidade de modal: ao abrir, foca o diálogo (respeitando um autoFocus já
 * existente) e prende o Tab dentro dele; ao fechar, devolve o foco a quem abriu.
 * O elemento apontado por `ref` deve ter tabIndex={-1} como alvo de fallback.
 */
export function useFocoModal(ref: RefObject<HTMLElement | null>, aberto: boolean) {
  useEffect(() => {
    if (!aberto) return
    const dialogo = ref.current
    if (!dialogo) return
    const anterior = document.activeElement as HTMLElement | null

    if (!dialogo.contains(document.activeElement)) {
      const primeiro = dialogo.querySelector<HTMLElement>(FOCAVEIS)
      ;(primeiro ?? dialogo).focus()
    }

    function aoTeclar(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogo) return
      const focaveis = Array.from(dialogo.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => el.offsetParent !== null,
      )
      if (focaveis.length === 0) {
        e.preventDefault()
        return
      }
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    dialogo.addEventListener('keydown', aoTeclar)
    return () => {
      dialogo.removeEventListener('keydown', aoTeclar)
      if (anterior && document.body.contains(anterior)) anterior.focus()
    }
  }, [aberto, ref])
}
