'use client'

import { useEffect, useState } from 'react'

type Uso = { total: number; limite: number; restante: number; bloqueado: boolean }

/**
 * Mostra quanto do teto mensal de chamadas à Places já foi usado. Rebusca sempre
 * que `chave` muda (passe o resultado da busca, para atualizar quando ela termina).
 */
export function UsoMensal({ chave }: { chave?: unknown }) {
  const [uso, setUso] = useState<Uso | null>(null)

  useEffect(() => {
    let vivo = true
    fetch('/api/leads/uso')
      .then((r) => r.json())
      .then((d) => {
        if (vivo && typeof d?.total === 'number') setUso(d)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [chave])

  if (!uso) return null

  const pct = Math.min(100, Math.round((uso.total / uso.limite) * 100))
  // Cor: azul (sistema) no normal; rosa (atenção) quando aperta. Ouro é só lead.
  const apertado = uso.bloqueado || uso.restante <= 40
  const cor = apertado ? 'bg-pink' : 'bg-blue'
  const texto = apertado ? 'text-pink' : 'text-text-dim'

  return (
    <div className="rounded-xl border border-border bg-surface/80 p-4 backdrop-blur-sm">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-sm text-text-dim">Chamadas este mês</span>
        <span className="font-mono text-sm">
          <span className="text-text tabular-nums">{uso.total}</span>
          <span className="text-text-dim"> / {uso.limite}</span>
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${cor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`mt-2 text-xs ${texto}`}>
        {uso.bloqueado
          ? 'Teto do mês atingido. Reinicia no dia 1º.'
          : `Restam ${uso.restante} chamadas · reinicia no dia 1º`}
      </p>
    </div>
  )
}
