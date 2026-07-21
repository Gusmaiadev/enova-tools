'use client'

import { useEffect, useState } from 'react'
import { RAMOS } from '@/lib/places/ramos'
import type { Filtros } from './useBusca'

type Estado = { id: number; sigla: string; nome: string }
type Municipio = { id: number; nome: string }

/** Filtro de site (exibicao): sem site (padrao), com site, ou todos. */
export type FiltroSite = 'sem_site' | 'com_site' | 'todos'

const selectClasse =
  'h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text focus:border-blue disabled:opacity-50'

export function FiltrosBusca({
  rodando,
  onBuscar,
  filtroSite,
  onFiltroSite,
}: {
  rodando: boolean
  onBuscar: (f: Filtros) => void
  filtroSite: FiltroSite
  onFiltroSite: (v: FiltroSite) => void
}) {
  const [estados, setEstados] = useState<Estado[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [carregandoMun, setCarregandoMun] = useState(false)

  const [uf, setUf] = useState('')
  const [cidade, setCidade] = useState('')
  const [bairro, setBairro] = useState('')
  const [tipo, setTipo] = useState(RAMOS[0].tipo)

  useEffect(() => {
    // Carga inicial dos estados: setState so no callback assincrono do fetch.
    fetch('/api/ibge/estados')
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setEstados(d))
      .catch(() => {})
  }, [])

  // Trocar a UF reseta a cidade e recarrega os municipios — tudo no handler do
  // evento, nao num efeito (evita setState sincrono em effect).
  async function trocarUf(novaUf: string) {
    setUf(novaUf)
    setCidade('')
    setMunicipios([])
    if (!novaUf) return
    setCarregandoMun(true)
    try {
      const d = await fetch(`/api/ibge/municipios?uf=${novaUf}`).then((r) => r.json())
      if (Array.isArray(d)) setMunicipios(d)
    } catch {
      // silencioso: o select fica vazio e o usuario tenta de novo
    } finally {
      setCarregandoMun(false)
    }
  }

  const podeBuscar = uf && cidade && bairro.trim() && tipo && !rodando

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!podeBuscar) return
    onBuscar({ uf, cidade, bairro: bairro.trim(), tipo })
  }

  return (
    <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Estado</span>
        <select
          className={selectClasse}
          value={uf}
          onChange={(e) => trocarUf(e.target.value)}
        >
          <option value="">Selecione…</option>
          {estados.map((e) => (
            <option key={e.id} value={e.sigla}>
              {e.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Cidade</span>
        <select
          className={selectClasse}
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          disabled={!uf || carregandoMun}
        >
          <option value="">{carregandoMun ? 'Carregando…' : 'Selecione…'}</option>
          {municipios.map((m) => (
            <option key={m.id} value={m.nome}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Bairro</span>
        <input
          className="h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue"
          value={bairro}
          onChange={(e) => setBairro(e.target.value)}
          placeholder="Ex.: Centro"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Ramo</span>
        <select
          className={selectClasse}
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {RAMOS.map((r) => (
            <option key={r.tipo} value={r.tipo}>
              {r.rotulo}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-dim">Site</span>
        <select
          className={selectClasse}
          value={filtroSite}
          onChange={(e) => onFiltroSite(e.target.value as FiltroSite)}
        >
          <option value="sem_site">Sem site</option>
          <option value="com_site">Com site</option>
          <option value="todos">Todos</option>
        </select>
      </label>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={!podeBuscar}
          className="h-10 w-full rounded-md bg-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-blue/85 disabled:opacity-50 sm:w-auto"
        >
          {rodando ? 'Buscando…' : 'Buscar leads'}
        </button>
      </div>
    </form>
  )
}
