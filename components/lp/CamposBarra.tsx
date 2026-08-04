'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { CamposAjuste } from './CamposAjuste'
import { Faixa, Opcoes } from './campos'
import type { Alinhamento, EstiloBarra } from '@/lib/lp/tipos'
import { ALINHAMENTOS, ROTULO_ALINHAMENTO } from '@/lib/lp/tipos'

const ICONE: Record<Alinhamento, React.ReactNode> = {
  esquerda: <AlignLeft className="h-3.5 w-3.5" />,
  centro: <AlignCenter className="h-3.5 w-3.5" />,
  direita: <AlignRight className="h-3.5 w-3.5" />,
}

/**
 * Aparência de uma barra (header ou rodapé): onde o menu fica, tamanho da logo
 * e fonte dos links. Os mesmos campos no briefing e no editor. Header e rodapé
 * mostram a mesma marca, mas cada um guarda o seu tamanho.
 */
export function CamposBarra({
  estilo,
  logoImagem,
  aoMudar,
}: {
  estilo: EstiloBarra | undefined
  /** Barra com imagem de logo: o tamanho vira altura, não corpo de fonte. */
  logoImagem: boolean
  aoMudar: (patch: EstiloBarra, agrupar?: string) => void
}) {
  return (
    <div className="space-y-3">
      <Opcoes<Alinhamento>
        rotulo="Alinhamento do menu"
        valor={estilo?.alinhamento ?? 'direita'}
        aoMudar={(v) => aoMudar({ alinhamento: v })}
        opcoes={ALINHAMENTOS.map((a) => ({
          valor: a,
          rotulo: '',
          aria: ROTULO_ALINHAMENTO[a],
          icone: ICONE[a],
        }))}
      />
      <Faixa
        rotulo={logoImagem ? 'Altura da logo' : 'Tamanho do nome'}
        valor={estilo?.logo ?? (logoImagem ? 44 : 22)}
        min={logoImagem ? 24 : 14}
        max={logoImagem ? 120 : 56}
        aoMudar={(v) => aoMudar({ logo: v }, 'barra-logo')}
      />
      <div className="rounded-md border border-border bg-surface-2/40 p-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-dim">
          Fonte do menu
        </p>
        <CamposAjuste
          ajuste={estilo?.menu ?? {}}
          comAlinhamento={false}
          aoMudar={(patch) => aoMudar({ menu: { ...estilo?.menu, ...patch } }, 'barra-menu')}
        />
      </div>
    </div>
  )
}
