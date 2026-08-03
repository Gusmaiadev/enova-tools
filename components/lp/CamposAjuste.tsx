'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { Cor, Fonte, Opcoes, Selecao, Texto } from './campos'
import type { AjusteTexto } from '@/lib/lp/tipos'

/**
 * Ajuste fino de um texto (cor, fonte, tamanho, peso, alinhamento) por cima do
 * tema. Usado nos elementos da seção, no editor, e na fonte do menu das barras
 * — no briefing e no editor.
 */
export function CamposAjuste({
  ajuste,
  aoMudar,
  /** No menu das barras o alinhamento é da barra inteira, não do texto. */
  comAlinhamento = true,
}: {
  ajuste: AjusteTexto
  aoMudar: (patch: AjusteTexto) => void
  comAlinhamento?: boolean
}) {
  return (
    <div className="space-y-3">
      <Cor rotulo="Cor" valor={ajuste.cor} aoMudar={(v) => aoMudar({ cor: v || undefined })} />
      <Fonte
        rotulo="Fonte"
        valor={ajuste.fonte}
        permitirVazio
        aoMudar={(v) => aoMudar({ fonte: v || undefined })}
      />
      <Texto
        rotulo="Tamanho"
        dica="ex.: 32px"
        placeholder="automático"
        value={ajuste.tamanho ?? ''}
        onChange={(e) => aoMudar({ tamanho: e.target.value || undefined })}
      />
      <Selecao
        rotulo="Peso"
        value={ajuste.peso ?? ''}
        onChange={(e) => aoMudar({ peso: Number(e.target.value) || undefined })}
      >
        <option value="">Automático</option>
        {[300, 400, 500, 600, 700, 800, 900].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Selecao>
      {comAlinhamento && (
        <Opcoes
          rotulo="Alinhamento"
          valor={ajuste.alinhamento ?? 'left'}
          aoMudar={(v) => aoMudar({ alinhamento: v })}
          opcoes={[
            { valor: 'left' as const, rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
            { valor: 'center' as const, rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
            { valor: 'right' as const, rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
          ]}
        />
      )}
    </div>
  )
}
