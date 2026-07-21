'use client'

import { useCallback, useState } from 'react'
import { type Lead, type LeadEquipe, TTL_CACHE_MS } from '@/lib/tipos'
import { AbaGerar } from './AbaGerar'
import { CartaoSalvo } from './CartaoSalvo'

type Aba = 'gerar' | 'meus' | 'equipe'

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'gerar', rotulo: 'Gerar' },
  { id: 'meus', rotulo: 'Meus leads' },
  { id: 'equipe', rotulo: 'Equipe' },
]

export function LeadsTabs() {
  const [aba, setAba] = useState<Aba>('gerar')
  const [meus, setMeus] = useState<Lead[] | null>(null)
  const [equipe, setEquipe] = useState<LeadEquipe[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const r = await fetch('/api/leads')
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao carregar leads.')
      setMeus(d.meus)
      setEquipe(d.equipe)

      // Revalida em lote os meus leads vencidos (>30 dias). Só os meus, só os
      // vencidos — o server ainda reconfere e respeita o teto mensal (secao 8.5).
      const agora = Date.now()
      const vencidos = (d.meus as Lead[])
        .filter((l) => agora - l.cache.cachedAt > TTL_CACHE_MS)
        .map((l) => l.placeId)

      if (vencidos.length > 0) {
        const rr = await fetch('/api/leads/revalidar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ placeIds: vencidos }),
        })
        const dd = await rr.json().catch(() => ({}))
        const atualizados = dd.atualizados ?? {}
        if (Object.keys(atualizados).length > 0) {
          setMeus((prev) =>
            (prev ?? []).map((l) =>
              atualizados[l.placeId]
                ? {
                    ...l,
                    cache: atualizados[l.placeId].cache,
                    classificacao: atualizados[l.placeId].classificacao,
                  }
                : l,
            ),
          )
        }
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar.')
    } finally {
      setCarregando(false)
    }
  }, [])

  // Troca de aba: carrega Meus/Equipe na primeira visita (no handler, nao em efeito).
  function irPara(nova: Aba) {
    setAba(nova)
    if ((nova === 'meus' || nova === 'equipe') && meus === null && !carregando) {
      carregar()
    }
  }

  return (
    <div>
      <div
        role="tablist"
        className="mb-6 flex gap-1 border-b border-border"
        aria-label="Ferramenta de leads"
      >
        {ABAS.map((a) => {
          const ativa = aba === a.id
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={ativa}
              onClick={() => irPara(a.id)}
              className={`relative -mb-px px-4 py-2.5 text-sm font-semibold transition-colors ${
                ativa ? 'text-text' : 'text-text-dim hover:text-text'
              }`}
            >
              {a.rotulo}
              {/* Sublinhado animado da aba ativa. */}
              <span
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue transition-all duration-300 ${
                  ativa ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </button>
          )
        })}
      </div>

      <div key={aba} className="animate-fade-in-up">
        {aba === 'gerar' ? <AbaGerar /> : null}

        {aba === 'meus' ? (
          <ListaSalvos
            leads={meus}
            dono
            carregando={carregando}
            erro={erro}
            vazio="Você ainda não salvou nenhum lead. Vá para a aba Gerar."
          />
        ) : null}

        {aba === 'equipe' ? (
          <ListaSalvos
            leads={equipe}
            dono={false}
            carregando={carregando}
            erro={erro}
            vazio="Nenhum lead da equipe ainda."
          />
        ) : null}
      </div>
    </div>
  )
}

function ListaSalvos({
  leads,
  dono,
  carregando,
  erro,
  vazio,
}: {
  leads: (Lead | LeadEquipe)[] | null
  dono: boolean
  carregando: boolean
  erro: string | null
  vazio: string
}) {
  if (erro)
    return (
      <p className="rounded-md border border-pink/40 bg-pink/10 px-3 py-2 text-sm text-pink">
        {erro}
      </p>
    )
  if (carregando || leads === null)
    return <p className="text-sm text-text-dim">Carregando…</p>
  if (leads.length === 0)
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-text-dim">
        {vazio}
      </p>
    )

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {leads.map((lead) => (
        // cachedAt na key: um lead revalidado remonta e recalcula "vencido".
        <CartaoSalvo key={`${lead.placeId}:${lead.cache.cachedAt}`} lead={lead} dono={dono} />
      ))}
    </ul>
  )
}
