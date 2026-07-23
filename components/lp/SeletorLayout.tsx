'use client'

import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useFocoModal } from '@/components/useFocoModal'
import { GRUPOS_LAYOUT, LAYOUTS } from '@/lib/lp/layouts'
import type { TipoLayout } from '@/lib/lp/tipos'

/** Barrinhas cinza que sugerem o formato — o usuário escolhe pelo desenho. */
function Miniatura({ tipo }: { tipo: TipoLayout }) {
  const barra = 'rounded-[2px] bg-text-dim/35'
  const bloco = 'rounded-[3px] bg-text-dim/25'

  const texto = (
    <div className="flex flex-1 flex-col gap-1">
      <div className={`h-1.5 w-3/4 ${barra}`} />
      <div className={`h-1 w-full ${barra}`} />
      <div className={`h-1 w-5/6 ${barra}`} />
    </div>
  )
  const colunas = (n: number, altura = 'h-6') => (
    <div className="flex gap-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`flex-1 ${altura} ${bloco}`} />
      ))}
    </div>
  )

  const desenhos: Record<TipoLayout, React.ReactNode> = {
    hero: (
      <div className="flex h-full items-center gap-2">
        {texto}
        <div className={`h-full w-1/2 ${bloco}`} />
      </div>
    ),
    'texto-midia': (
      <div className="flex h-full items-center gap-2">
        {texto}
        <div className={`h-full w-1/2 ${bloco}`} />
      </div>
    ),
    'texto-centralizado': (
      <div className="flex h-full flex-col items-center justify-center gap-1">
        <div className={`h-1.5 w-1/2 ${barra}`} />
        <div className={`h-1 w-3/4 ${barra}`} />
        <div className={`h-1 w-2/3 ${barra}`} />
      </div>
    ),
    cards: (
      <div className="flex h-full flex-col justify-center gap-1.5">
        <div className={`mx-auto h-1.5 w-1/2 ${barra}`} />
        {colunas(3)}
      </div>
    ),
    galeria: (
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={bloco} />
        ))}
      </div>
    ),
    masonry: (
      <div className="grid h-full grid-cols-3 gap-1">
        <div className="flex flex-col gap-1">
          <div className={`h-2/3 ${bloco}`} />
          <div className={`h-1/3 ${bloco}`} />
        </div>
        <div className="flex flex-col gap-1">
          <div className={`h-1/3 ${bloco}`} />
          <div className={`h-2/3 ${bloco}`} />
        </div>
        <div className="flex flex-col gap-1">
          <div className={`h-1/2 ${bloco}`} />
          <div className={`h-1/2 ${bloco}`} />
        </div>
      </div>
    ),
    timeline: (
      <div className="flex h-full gap-2 pl-1">
        <div className="w-[2px] rounded bg-text-dim/35" />
        <div className="flex flex-1 flex-col justify-around gap-1">
          <div className={`h-1 w-3/4 ${barra}`} />
          <div className={`h-1 w-2/3 ${barra}`} />
          <div className={`h-1 w-4/5 ${barra}`} />
        </div>
      </div>
    ),
    faq: (
      <div className="flex h-full flex-col justify-center gap-1.5">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={`h-3 w-full rounded-[3px] border border-text-dim/25`} />
        ))}
      </div>
    ),
    depoimentos: (
      <div className="flex h-full flex-col items-center justify-center gap-1.5">
        <div className={`h-4 w-4 rounded-full ${bloco}`} />
        <div className={`h-1 w-3/4 ${barra}`} />
        <div className={`h-1 w-1/2 ${barra}`} />
      </div>
    ),
    logos: (
      <div className="flex h-full items-center justify-center gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`h-3 w-8 ${bloco}`} />
        ))}
      </div>
    ),
    estatisticas: (
      <div className="flex h-full items-center justify-around">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`h-2.5 w-6 ${barra}`} />
            <div className={`h-1 w-8 ${barra}`} />
          </div>
        ))}
      </div>
    ),
    cta: (
      <div className="flex h-full items-center justify-center">
        <div className="flex h-4/5 w-full flex-col items-center justify-center gap-1 rounded-[4px] bg-blue/25">
          <div className={`h-1.5 w-1/2 ${barra}`} />
          <div className="h-2.5 w-12 rounded-[3px] bg-text-dim/45" />
        </div>
      </div>
    ),
    banner: (
      <div className="flex h-full items-center justify-center rounded-[3px] bg-text-dim/25">
        <div className="h-1.5 w-1/2 rounded-[2px] bg-bg/60" />
      </div>
    ),
    formulario: (
      <div className="flex h-full items-center gap-2">
        {texto}
        <div className="flex flex-1 flex-col gap-1">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-2.5 w-full rounded-[3px] border border-text-dim/30" />
          ))}
        </div>
      </div>
    ),
    precos: (
      <div className="flex h-full items-center gap-1.5">
        <div className={`h-4/5 flex-1 ${bloco}`} />
        <div className="h-full flex-1 rounded-[3px] bg-blue/25" />
        <div className={`h-4/5 flex-1 ${bloco}`} />
      </div>
    ),
    comparacao: (
      <div className="flex h-full flex-col gap-1">
        <div className={`h-2 w-full ${barra}`} />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-1">
            <div className={`h-1.5 flex-1 ${barra}`} />
            <div className={`h-1.5 w-6 ${barra}`} />
            <div className={`h-1.5 w-6 ${barra}`} />
          </div>
        ))}
      </div>
    ),
    'grid-produtos': (
      <div className="grid h-full grid-cols-3 gap-1">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className={`flex-1 ${bloco}`} />
            <div className={`h-1 w-2/3 ${barra}`} />
          </div>
        ))}
      </div>
    ),
    'lista-beneficios': (
      <div className="flex h-full items-center gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${bloco}`} />
              <div className={`h-1 flex-1 ${barra}`} />
            </div>
          ))}
        </div>
        <div className={`h-full w-2/5 ${bloco}`} />
      </div>
    ),
    'blocos-alternados': (
      <div className="flex h-full flex-col gap-1.5">
        <div className="flex flex-1 gap-1.5">
          <div className={`flex-1 ${barra}`} />
          <div className={`w-1/3 ${bloco}`} />
        </div>
        <div className="flex flex-1 gap-1.5">
          <div className={`w-1/3 ${bloco}`} />
          <div className={`flex-1 ${barra}`} />
        </div>
      </div>
    ),
    tabs: (
      <div className="flex h-full flex-col gap-1.5">
        <div className="flex justify-center gap-1">
          <div className="h-2 w-8 rounded-full bg-blue/40" />
          <div className={`h-2 w-8 rounded-full ${bloco}`} />
          <div className={`h-2 w-8 rounded-full ${bloco}`} />
        </div>
        <div className={`flex-1 ${bloco}`} />
      </div>
    ),
    carrossel: (
      <div className="flex h-full flex-col gap-1.5">
        <div className={`flex-1 ${bloco}`} />
        <div className="flex justify-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-blue/60" />
          <div className={`h-1.5 w-1.5 rounded-full ${bloco}`} />
          <div className={`h-1.5 w-1.5 rounded-full ${bloco}`} />
        </div>
      </div>
    ),
  }

  return (
    <div className="h-16 rounded-md border border-border bg-surface-2 p-2">{desenhos[tipo]}</div>
  )
}

export function SeletorLayout({
  aberto,
  atual,
  aoEscolher,
  aoFechar,
}: {
  aberto: boolean
  atual?: TipoLayout
  aoEscolher: (tipo: TipoLayout) => void
  aoFechar: () => void
}) {
  const dialogoRef = useRef<HTMLDivElement>(null)
  useFocoModal(dialogoRef, aberto)

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflow
    }
  }, [aberto, aoFechar])

  // Fechado (server e client renderizam null igual) ou fora do browser: nada a
  // portalar. Quando abre, já estamos no client — createPortal é seguro.
  if (!aberto || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={aoFechar}
    >
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-label="Escolher layout da seção"
        className="w-full max-w-4xl rounded-lg border border-border bg-surface p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Escolher layout</h2>
            <p className="mt-1 text-sm text-text-dim">
              O desenho mostra como a seção fica na página. A IA preenche com o seu conteúdo.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-md p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {GRUPOS_LAYOUT.map((grupo) => {
            const doGrupo = LAYOUTS.filter((l) => l.grupo === grupo)
            if (doGrupo.length === 0) return null
            return (
              <div key={grupo}>
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-text-dim">
                  {grupo}
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {doGrupo.map((l) => (
                    <button
                      key={l.tipo}
                      type="button"
                      onClick={() => {
                        aoEscolher(l.tipo)
                        aoFechar()
                      }}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        atual === l.tipo
                          ? 'border-blue bg-surface-2'
                          : 'border-border bg-surface hover:border-blue/60 hover:bg-surface-2'
                      }`}
                    >
                      <Miniatura tipo={l.tipo} />
                      <p className="mt-2.5 text-sm font-medium">{l.rotulo}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-text-dim">{l.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
