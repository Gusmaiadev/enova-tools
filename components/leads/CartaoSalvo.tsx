'use client'

import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { classificar } from '@/lib/places/classificar'
import {
  type Lead,
  type LeadEquipe,
  leadId,
  ROTULO_STATUS,
  STATUS_LEAD,
  type StatusLead,
  TTL_CACHE_MS,
} from '@/lib/tipos'
import { ClassBadge } from './ClassBadge'

/**
 * Cartao de um lead ja salvo. `dono=true` (aba Meus leads) permite editar status
 * e notas. `dono=false` (aba Equipe) e so leitura, com avatar do colega — e nesse
 * caso o lead vem SEM o campo `proprio` (privado do dono, secao 8.5).
 */
export function CartaoSalvo({ lead, dono }: { lead: Lead | LeadEquipe; dono: boolean }) {
  const [status, setStatus] = useState<StatusLead>(lead.status)
  const [notas, setNotas] = useState('proprio' in lead ? lead.proprio.notas : '')
  const [salvandoNota, setSalvandoNota] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const id = leadId(lead.teamId, lead.placeId)
  const classificacao = classificar({ websiteUri: lead.cache.websiteUri })
  // Ler o relogio e impuro no corpo do render; o inicializador do useState roda
  // uma vez, fora do fluxo puro. Basta para o aviso de "dados vencidos".
  const [vencido] = useState(() => Date.now() - lead.cache.cachedAt > TTL_CACHE_MS)

  async function patch(corpo: Record<string, unknown>) {
    setErro(null)
    const r = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
    if (!r.ok) {
      const d = await r.json().catch(() => ({}))
      setErro(d.erro ?? 'Falha ao salvar.')
      return false
    }
    return true
  }

  async function mudarStatus(novo: StatusLead) {
    const anterior = status
    setStatus(novo)
    const ok = await patch({ status: novo })
    if (!ok) setStatus(anterior)
  }

  async function salvarNota() {
    setSalvandoNota(true)
    await patch({ proprio: { notas } })
    setSalvandoNota(false)
  }

  const quente = classificacao === 'lead_quente'

  return (
    <li
      className={`animate-fade-in-up rounded-xl border bg-surface/80 p-4 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 ${
        quente
          ? 'border-yellow/45 hover:border-yellow/70 hover:shadow-[0_10px_40px_-14px_var(--yellow)]'
          : 'border-border hover:border-blue/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-semibold">
            {lead.cache.displayName}
          </h3>
          {lead.cache.primaryType ? (
            <p className="text-xs text-text-dim">{lead.cache.primaryType}</p>
          ) : null}
        </div>
        <ClassBadge classificacao={classificacao} />
      </div>

      <div className="mt-3 space-y-1 font-mono text-sm text-text-dim">
        {lead.cache.formattedAddress ? (
          <p className="break-words">{lead.cache.formattedAddress}</p>
        ) : null}
        {lead.cache.phone ? <p className="text-text">{lead.cache.phone}</p> : null}
        {lead.cache.websiteUri ? (
          <a
            href={lead.cache.websiteUri}
            target="_blank"
            rel="noopener noreferrer"
            className="block break-all text-blue hover:underline"
          >
            {lead.cache.websiteUri}
          </a>
        ) : null}
      </div>

      {vencido ? (
        <p className="mt-2 text-xs text-text-dim/70">
          Dados com mais de 30 dias — podem estar desatualizados.
        </p>
      ) : null}

      {dono ? (
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-text-dim">Status</span>
            <select
              value={status}
              onChange={(e) => mudarStatus(e.target.value as StatusLead)}
              className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-text focus:border-blue"
            >
              {STATUS_LEAD.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS[s]}
                </option>
              ))}
            </select>
          </label>

          <div>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={salvarNota}
              rows={2}
              placeholder="Notas (telefone confirmado, quem atende, melhor horário…)"
              className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-dim/60 focus:border-blue"
            />
            {salvandoNota ? <span className="text-xs text-text-dim">Salvando…</span> : null}
          </div>
          {erro ? <p className="text-xs text-pink">{erro}</p> : null}
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <Avatar uid={lead.ownerUid} nome={lead.ownerName} size={24} />
          <span className="text-sm text-text-dim">
            {ROTULO_STATUS[lead.status]} por {lead.ownerName}
          </span>
        </div>
      )}
    </li>
  )
}
