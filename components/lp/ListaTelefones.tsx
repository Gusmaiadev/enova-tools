'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Marcar, Vazio } from './campos'
import type { TelefoneFooter } from '@/lib/lp/tipos'
import { MAX_TELEFONES, gerarId, linkTelefone } from '@/lib/lp/util'

/**
 * Telefones do rodapé: vários números, cada um podendo virar link de WhatsApp.
 * Usada no briefing (etapa Navegação) e no painel do editor — por isso a linha
 * quebra em duas, para caber também na coluna estreita do editor.
 */
export function ListaTelefones({
  telefones,
  aoMudar,
}: {
  telefones: TelefoneFooter[]
  aoMudar: (telefones: TelefoneFooter[]) => void
}) {
  const mudar = (id: string, patch: Partial<TelefoneFooter>) =>
    aoMudar(telefones.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-text-dim">Telefones</span>
        {telefones.length < MAX_TELEFONES && (
          <button
            type="button"
            onClick={() =>
              aoMudar([...telefones, { id: gerarId(), numero: '', whatsapp: false }])
            }
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar telefone
          </button>
        )}
      </div>
      {telefones.length === 0 ? (
        <Vazio>
          Nenhum telefone. Marque &ldquo;Link de WhatsApp&rdquo; e o número abre a conversa.
        </Vazio>
      ) : (
        <ul className="space-y-2">
          {telefones.map((t) => {
            // Prévia do destino: mostra o DDI que o link vai levar, para o usuário
            // conferir antes de publicar.
            const previa = linkTelefone(t.numero, true).replace(/^https:\/\//, '')
            return (
              <li key={t.id} className="space-y-2 rounded-md border border-border bg-surface-2/50 p-2">
                <div className="flex items-center gap-2">
                  <input
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                    placeholder="(11) 99999-9999"
                    value={t.numero}
                    onChange={(e) => mudar(t.id, { numero: e.target.value })}
                    inputMode="tel"
                    maxLength={40}
                  />
                  <button
                    type="button"
                    aria-label={`Remover ${t.numero || 'telefone'}`}
                    onClick={() => aoMudar(telefones.filter((x) => x.id !== t.id))}
                    className="shrink-0 rounded-md p-2 text-text-dim transition-colors hover:text-pink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <Marcar
                    rotulo="Link de WhatsApp"
                    valor={t.whatsapp}
                    aoMudar={(v) => mudar(t.id, { whatsapp: v })}
                  />
                  {t.whatsapp && previa !== '' && (
                    <span className="font-mono text-xs text-text-dim/70">{previa}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
