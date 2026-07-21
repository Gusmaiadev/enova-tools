'use client'

import { useMemo, useState } from 'react'
import type { LeadResultado } from '@/lib/leads/resultado'
import { CartaoResultado } from './CartaoResultado'
import { FiltrosBusca, type FiltroSite } from './FiltrosBusca'
import { Radar } from './Radar'
import { useBusca } from './useBusca'
import { UsoMensal } from './UsoMensal'

/** So os campos do Place (o server reclassifica e monta o cache). */
function placeDe(l: LeadResultado) {
  return {
    id: l.id,
    displayName: l.displayName,
    formattedAddress: l.formattedAddress,
    phone: l.phone,
    websiteUri: l.websiteUri,
    primaryType: l.primaryType,
  }
}

export function AbaGerar() {
  const busca = useBusca()
  const [filtroSite, setFiltroSite] = useState<FiltroSite>('sem_site')
  const [salvandoTodos, setSalvandoTodos] = useState(false)
  const [loteMsg, setLoteMsg] = useState<string | null>(null)
  // Ids ja salvos (individual ou em lote) — controla o "Salvo ✓" dos cards.
  const [salvosIds, setSalvosIds] = useState<Set<string>>(new Set())

  // Filtro de site (secao 8.3): "sem site" (padrao) esconde quem ja tem site
  // proprio; "com site" mostra so esses; "todos" mostra tudo.
  const visiveis = useMemo(() => {
    if (!busca.leads) return null
    if (filtroSite === 'todos') return busca.leads
    if (filtroSite === 'com_site')
      return busca.leads.filter((l) => l.classificacao === 'tem_site')
    return busca.leads.filter((l) => l.classificacao !== 'tem_site')
  }, [busca.leads, filtroSite])

  // Nova busca limpa a mensagem e os marcadores de salvo (evita setState em efeito).
  function buscar(f: Parameters<typeof busca.buscar>[0]) {
    setLoteMsg(null)
    setSalvosIds(new Set())
    busca.buscar(f)
  }

  async function salvar(lead: LeadResultado) {
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: placeDe(lead) }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) return { ok: false, erro: d.erro ?? 'Falha ao salvar.' }
      setSalvosIds((prev) => new Set(prev).add(lead.id))
      return { ok: true }
    } catch {
      return { ok: false, erro: 'Falha de rede.' }
    }
  }

  // Salva todos os leads visiveis de uma vez → vao para "Meus leads".
  async function salvarTodos() {
    if (!visiveis || visiveis.length === 0) return
    setSalvandoTodos(true)
    setLoteMsg(null)
    try {
      const r = await fetch('/api/leads/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: visiveis.map(placeDe) }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao salvar.')
      if (Array.isArray(d.salvosIds) && d.salvosIds.length) {
        setSalvosIds((prev) => new Set([...prev, ...d.salvosIds]))
      }
      if (d.salvos > 0) {
        setLoteMsg(
          `${d.salvos} ${d.salvos === 1 ? 'lead salvo' : 'leads salvos'} em Meus leads` +
            (d.pulados ? ` · ${d.pulados} já estavam salvos.` : '.'),
        )
      } else {
        setLoteMsg('Todos esses leads já estavam salvos.')
      }
    } catch (e) {
      setLoteMsg(e instanceof Error ? e.message : 'Falha ao salvar.')
    } finally {
      setSalvandoTodos(false)
    }
  }

  // Quantos visíveis ainda dá para salvar (os já salvos nesta sessão não contam).
  const restantesSalvar = visiveis
    ? visiveis.filter((l) => !salvosIds.has(l.id)).length
    : 0

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="order-2 lg:order-1">
        <FiltrosBusca
          rodando={busca.rodando}
          onBuscar={buscar}
          filtroSite={filtroSite}
          onFiltroSite={setFiltroSite}
        />

        {busca.erro ? (
          <p className="mt-4 rounded-md border border-pink/40 bg-pink/10 px-3 py-2 text-sm text-pink">
            {busca.erro}
          </p>
        ) : null}

        {busca.truncado ? (
          <p className="mt-4 rounded-md border border-pink/40 bg-pink/10 px-3 py-2 text-sm text-pink">
            A área é muito densa e a busca atingiu o teto de chamadas. Os
            resultados abaixo são parciais — refine por um bairro menor.
          </p>
        ) : null}

        {visiveis ? (
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {visiveis.length} {visiveis.length === 1 ? 'resultado' : 'resultados'}
                </h2>
                <span className="text-xs text-text-dim">
                  {filtroSite === 'sem_site'
                    ? 'sem site'
                    : filtroSite === 'com_site'
                      ? 'com site'
                      : 'todos'}{' '}
                  · de {busca.leads?.length ?? 0} encontrados
                </span>
              </div>

              {visiveis.length > 0 ? (
                <button
                  type="button"
                  onClick={salvarTodos}
                  disabled={salvandoTodos || restantesSalvar === 0}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue/50 bg-blue/10 px-3 text-sm font-semibold text-blue transition-colors hover:bg-blue/20 disabled:opacity-50"
                >
                  {salvandoTodos
                    ? 'Salvando…'
                    : restantesSalvar === 0
                      ? 'Todos salvos'
                      : `Salvar todos (${restantesSalvar})`}
                </button>
              ) : null}
            </div>

            {loteMsg ? (
              <p className="mb-3 rounded-md border border-blue/40 bg-blue/10 px-3 py-2 text-sm text-blue">
                {loteMsg}
              </p>
            ) : null}

            {visiveis.length === 0 ? (
              <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-dim">
                {filtroSite === 'com_site'
                  ? 'Nenhum lead com site nesta área.'
                  : 'Nenhum lead sem site nesta área. Tente outra cidade, bairro ou ramo.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {visiveis.map((lead, i) => (
                  <CartaoResultado
                    key={lead.id}
                    lead={lead}
                    onSalvar={salvar}
                    indice={i}
                    salvo={salvosIds.has(lead.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="order-1 lg:order-2">
        <div className="lg:sticky lg:top-20 space-y-4">
          {/* Rebusca o uso quando a busca termina (busca.leads muda). */}
          <UsoMensal chave={busca.leads} />
          <Radar
            extent={busca.extent}
            celulas={busca.celulas}
            total={busca.total}
            chamadas={busca.chamadas}
            ativo={busca.rodando}
          />
        </div>
      </div>
    </div>
  )
}
