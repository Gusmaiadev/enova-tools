'use client'

import { ImageIcon, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { OpcoesVideo } from './OpcoesVideo'
import { SeletorMidia } from './SeletorMidia'
import type { LpMidia, Orientacao, TipoMidia } from '@/lib/lp/tipos'

type Props = {
  rotulo?: string
  /** Projeto dono da mídia enviada — o upload vai para a pasta dele no bucket. */
  lpId: string
  midia: LpMidia | null | undefined
  aoMudar: (m: LpMidia) => void
  aoRemover?: () => void
  /** Texto do botão enquanto não há mídia escolhida. */
  rotuloVazio?: string
  /**
   * Filtros com que o seletor abre quando ainda não há mídia escolhida — no
   * briefing são a descrição, o tipo e o formato que o usuário já preencheu.
   */
  filtros?: { busca: string; tipo: TipoMidia; orientacao: Orientacao }
  /**
   * Reprodução do vídeo junto do campo. O briefing desliga: lá as opções ficam
   * na seção (valem também para a mídia que a IA ainda vai buscar).
   */
  comOpcoesVideo?: boolean
  /** Slot que a página usa como fundo — muda o que faz sentido oferecer. */
  deFundo?: boolean
}

/**
 * Prévia da mídia + botão que abre o seletor (bancos de imagem, arquivo do
 * computador ou URL). Usado no briefing e no painel de propriedades do editor,
 * para que escolher mídia funcione igual nos dois lugares.
 */
export function CampoMidia({
  rotulo,
  lpId,
  midia,
  aoMudar,
  aoRemover,
  rotuloVazio = 'Escolher mídia',
  filtros,
  comOpcoesVideo = true,
  deFundo = false,
}: Props) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      {rotulo && <span className="text-sm text-text-dim">{rotulo}</span>}
      {midia ? (
        <div className="overflow-hidden rounded-md border border-border bg-surface-2">
          {/* Vídeo tem `thumb` (poster): sem isso o mp4 iria para o <img> e o
              painel mostraria o ícone de imagem quebrada. */}
          <div className="relative aspect-video w-full">
            {midia.thumb || midia.tipo === 'imagem' ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={midia.thumb ?? midia.url}
                alt={midia.alt}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface text-text-dim">
                <Play className="h-5 w-5" />
              </div>
            )}
            {midia.tipo === 'video' && (
              <span className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Play className="h-2.5 w-2.5 fill-current" />
                Vídeo
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 p-2">
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="flex-1 rounded bg-surface px-2 py-1.5 text-xs transition-colors hover:bg-blue hover:text-white"
            >
              Trocar
            </button>
            {aoRemover && (
              <button
                type="button"
                onClick={aoRemover}
                aria-label="Remover mídia"
                className="rounded p-1.5 text-text-dim transition-colors hover:text-pink"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-dim transition-colors hover:border-blue/60 hover:text-text"
        >
          <ImageIcon className="h-4 w-4" />
          {rotuloVazio}
        </button>
      )}
      {comOpcoesVideo && midia?.tipo === 'video' && (
        <OpcoesVideo
          valor={midia}
          deFundo={deFundo}
          aoMudar={(patch) => aoMudar({ ...midia, ...patch })}
        />
      )}
      <SeletorMidia
        aberto={aberto}
        lpId={lpId}
        midia={midia ?? (filtros ? { ...filtros, url: '', alt: '' } : null)}
        aoEscolher={aoMudar}
        aoFechar={() => setAberto(false)}
      />
    </div>
  )
}
