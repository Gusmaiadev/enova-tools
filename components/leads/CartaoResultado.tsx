'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import type { LeadResultado } from '@/lib/leads/resultado'
import { ROTULO_STATUS } from '@/lib/tipos'
import { ClassBadge } from './ClassBadge'

type EstadoSalvar = 'idle' | 'salvando' | 'erro'

export function CartaoResultado({
  lead,
  onSalvar,
  indice = 0,
  salvo = false,
}: {
  lead: LeadResultado
  onSalvar: (lead: LeadResultado) => Promise<{ ok: boolean; erro?: string }>
  indice?: number
  /** Controlado pela aba: true apos salvar (individual ou via "Salvar todos"). */
  salvo?: boolean
}) {
  const [estado, setEstado] = useState<EstadoSalvar>('idle')
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setEstado('salvando')
    setErro(null)
    const r = await onSalvar(lead)
    if (r.ok) {
      setEstado('idle') // o estado "salvo" vem do prop controlado pela aba
    } else {
      setEstado('erro')
      setErro(r.erro ?? 'Falha ao salvar.')
    }
  }

  // Lead ja tocado por colega -> borda rosa (secao 8.4).
  const daEquipe = lead.tocadoPor !== null
  const quente = lead.classificacao === 'lead_quente'

  // Cores semânticas: amarelo (ouro) só em lead quente; rosa em lead da equipe;
  // azul (sistema) no resto.
  const acento = quente
    ? 'border-yellow/45 hover:border-yellow/70 hover:shadow-[0_10px_40px_-14px_var(--yellow)]'
    : daEquipe
      ? 'border-pink/40 hover:border-pink/60 hover:shadow-[0_10px_40px_-16px_var(--pink)]'
      : 'border-border hover:border-blue/50 hover:shadow-[0_10px_40px_-16px_var(--blue)]'

  return (
    <li
      style={{ animationDelay: `${Math.min(indice, 14) * 45}ms` }}
      className={`group animate-fade-in-up rounded-xl border bg-surface/80 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 ${acento}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">{lead.displayName}</h3>
          {lead.primaryType ? (
            <p className="text-xs text-text-dim">{lead.primaryType}</p>
          ) : null}
        </div>
        <ClassBadge classificacao={lead.classificacao} />
      </div>

      {/* Dados operacionais em mono — o usuario vai copiar e ligar (secao 4). */}
      <div className="mt-3 space-y-1 font-mono text-sm text-text-dim">
        {lead.formattedAddress ? <p className="break-words">{lead.formattedAddress}</p> : null}
        {lead.phone ? <p className="text-text">{lead.phone}</p> : null}
        {lead.websiteUri ? (
          <a
            href={lead.websiteUri}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-blue hover:underline"
          >
            {lead.websiteUri}
          </a>
        ) : null}
      </div>

      {daEquipe ? (
        <p className="mt-3 inline-block rounded border border-pink/40 bg-pink/10 px-2 py-0.5 text-xs text-pink">
          {ROTULO_STATUS[lead.statusEquipe ?? 'salvo']} por {lead.tocadoPor}
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        {salvo ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue/40 bg-blue/10 px-3 text-sm font-semibold text-blue">
            <Check className="h-4 w-4" />
            Salvo
          </span>
        ) : (
          <button
            type="button"
            onClick={salvar}
            disabled={estado === 'salvando'}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3 text-sm font-semibold text-white transition-colors hover:bg-blue/85 disabled:opacity-50"
          >
            {estado === 'salvando' ? 'Salvando…' : 'Salvar lead'}
          </button>
        )}
        {erro ? <span className="text-xs text-pink">{erro}</span> : null}
      </div>
    </li>
  )
}
