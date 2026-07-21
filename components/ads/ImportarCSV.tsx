'use client'

import { Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Aviso, Erro } from '@/components/Campo'
import { ROTULO_RELATORIO, type TipoRelatorio } from '@/lib/ads/tipos'

export function ImportarCSV({ clienteId }: { clienteId: string }) {
  const router = useRouter()
  const [tipo, setTipo] = useState<TipoRelatorio>('campanhas')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setErro(null)
    setAviso(null)
    setEnviando(true)
    try {
      const csv = await arquivo.text()
      const r = await fetch('/api/ads/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, tipo, csv }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao importar.')
      setAviso(`Importado: ${d.total} ${d.total === 1 ? 'linha' : 'linhas'} de ${ROTULO_RELATORIO[tipo].toLowerCase()}.`)
      router.refresh() // recarrega o dashboard (Server Component)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao importar.')
    } finally {
      setEnviando(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">Importar relatório</h2>
      <p className="mt-1 text-sm text-text-dim">
        Exporte o relatório do Google Ads em CSV e envie aqui. Cada envio vira um novo snapshot.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-text-dim">Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoRelatorio)}
            disabled={enviando}
            className="h-9 rounded-md border border-border bg-surface-2 px-2 text-sm text-text focus:border-blue"
          >
            <option value="campanhas">{ROTULO_RELATORIO.campanhas}</option>
            <option value="termos">{ROTULO_RELATORIO.termos}</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-3 text-sm font-semibold text-white transition-colors hover:bg-blue/85 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {enviando ? 'Importando…' : 'Escolher CSV'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          onChange={aoEscolher}
          className="hidden"
        />
      </div>

      {aviso ? <div className="mt-3"><Aviso>{aviso}</Aviso></div> : null}
      {erro ? <div className="mt-3"><Erro>{erro}</Erro></div> : null}
    </div>
  )
}
