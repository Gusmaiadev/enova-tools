'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/Button'
import { useFocoModal } from '@/components/useFocoModal'

type Variante = 'primary' | 'danger'

type Props = {
  aberto: boolean
  titulo: string
  mensagem: React.ReactNode
  textoConfirmar?: string
  textoCancelar?: string
  variante?: Variante
  carregando?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

/**
 * Modal de confirmação — substitui window.confirm por algo estilizado e
 * acessível. Controlado por `aberto`. Fecha no Escape, no clique fora e no
 * Cancelar; enquanto `carregando`, trava os botões e ignora o fechamento.
 */
export function ModalConfirmacao({
  aberto,
  titulo,
  mensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variante = 'primary',
  carregando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const painelRef = useRef<HTMLDivElement>(null)
  useFocoModal(painelRef, aberto)

  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !carregando) onCancelar()
    }
    document.addEventListener('keydown', onKey)
    // Trava o scroll do fundo enquanto o modal está aberto.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [aberto, carregando, onCancelar])

  // Fechado (server e client renderizam null no mesmo estado, sem mismatch de
  // hidratação) ou fora do browser: nada a portalar. Quando `aberto` vira true, já
  // estamos no client, num clique do usuário — createPortal é seguro aqui.
  if (!aberto || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      {/* Fundo escurecido: clicar fora cancela (a menos que esteja carregando). */}
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        onClick={() => !carregando && onCancelar()}
        className="absolute inset-0 cursor-default bg-bg/70 backdrop-blur-sm"
      />
      <div
        ref={painelRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-2xl outline-none"
      >
        <h2 id="modal-titulo" className="font-display text-lg font-semibold">
          {titulo}
        </h2>
        <div className="mt-2 text-sm text-text-dim">{mensagem}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variante="ghost" onClick={onCancelar} disabled={carregando}>
            {textoCancelar}
          </Button>
          <Button variante={variante} onClick={onConfirmar} disabled={carregando}>
            {carregando ? 'Aguarde…' : textoConfirmar}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
