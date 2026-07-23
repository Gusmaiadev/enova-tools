'use client'

import { Check, Copy, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { compilar } from '@/lib/lp/compilador'
import type { LpDocumento } from '@/lib/lp/tipos'

type Aba = 'html' | 'css' | 'js'

const ABAS: { chave: Aba; rotulo: string; arquivo: string }[] = [
  { chave: 'html', rotulo: 'HTML', arquivo: 'index.html' },
  { chave: 'css', rotulo: 'CSS', arquivo: 'style.css' },
  { chave: 'js', rotulo: 'JavaScript', arquivo: 'script.js' },
]

export function PainelCodigo({ doc, aoFechar }: { doc: LpDocumento; aoFechar: () => void }) {
  const [aba, setAba] = useState<Aba>('html')
  const [copiado, setCopiado] = useState(false)

  const codigo = useMemo(() => compilar(doc), [doc])
  const atual = codigo[aba]

  async function copiar() {
    try {
      await navigator.clipboard.writeText(atual)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="flex h-72 max-h-[45vh] flex-col border-t border-border bg-surface">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setAba(a.chave)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              aba === a.chave ? 'bg-blue text-white' : 'text-text-dim hover:bg-surface-2 hover:text-text'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
        <span className="ml-2 font-mono text-[11px] text-text-dim">
          {ABAS.find((a) => a.chave === aba)?.arquivo} ·{' '}
          {(new TextEncoder().encode(atual).length / 1024).toFixed(1)} KB
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={copiar}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-blue" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar código"
            className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto bg-bg/60 p-4 font-mono text-[11px] leading-relaxed text-text-dim">
        <code>{atual}</code>
      </pre>
    </div>
  )
}
