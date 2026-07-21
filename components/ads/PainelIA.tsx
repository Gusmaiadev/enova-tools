'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Aviso, Erro } from '@/components/Campo'
import type { SugestaoIA } from '@/lib/ads/tipos'

export function PainelIA({ clienteId, temDados }: { clienteId: string; temDados: boolean }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [semChave, setSemChave] = useState(false)
  const [sugestao, setSugestao] = useState<SugestaoIA | null>(null)

  async function analisar() {
    setErro(null)
    setSemChave(false)
    setCarregando(true)
    try {
      const r = await fetch('/api/ads/analisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId }),
      })
      const d = await r.json().catch(() => ({}))
      if (d.semChave) {
        setSemChave(true)
        setErro(d.erro)
        return
      }
      if (!r.ok) throw new Error(d.erro ?? 'Falha na análise.')
      setSugestao(d.sugestao as SugestaoIA)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha na análise.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-blue" />
            Análise com IA
          </h2>
          <p className="mt-1 text-sm text-text-dim">
            Sugestões geradas por IA a partir das métricas. Revise antes de aplicar — nada é
            alterado na conta automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={analisar}
          disabled={carregando || !temDados}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3 text-sm font-semibold text-white transition-colors hover:bg-blue/85 disabled:opacity-50"
        >
          {carregando ? 'Analisando…' : sugestao ? 'Analisar de novo' : 'Analisar'}
        </button>
      </div>

      {!temDados ? (
        <p className="mt-3 text-sm text-text-dim">Importe um relatório para habilitar a análise.</p>
      ) : null}

      {semChave ? (
        <div className="mt-4">
          <Aviso>{erro}</Aviso>
        </div>
      ) : erro ? (
        <div className="mt-4">
          <Erro>{erro}</Erro>
        </div>
      ) : null}

      {sugestao ? (
        <div className="mt-5 space-y-5">
          {sugestao.resumo ? (
            <p className="rounded-md border border-blue/30 bg-blue/5 p-3 text-sm">{sugestao.resumo}</p>
          ) : null}

          <Bloco titulo="Pontos de atenção" itens={sugestao.anomalias} />
          <Bloco titulo="Sugestões de palavras-chave negativas" itens={sugestao.negativas} />

          {sugestao.acoes.length ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-dim">Ações recomendadas</h3>
              <ul className="space-y-2">
                {sugestao.acoes.map((a, i) => (
                  <li key={i} className="rounded-md border border-border bg-surface-2/50 p-3">
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <p className="mt-0.5 text-sm text-text-dim">{a.detalhe}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Bloco({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-dim">{titulo}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {itens.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
