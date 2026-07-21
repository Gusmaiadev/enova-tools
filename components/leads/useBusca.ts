'use client'

import { useCallback, useRef, useState } from 'react'
import type { EventoBusca } from '@/lib/leads/eventos'
import type { LeadResultado } from '@/lib/leads/resultado'
import type { Rect } from '@/lib/places/geometria'
import type { CelulaRadar, EstadoCelula } from './Radar'

export type Filtros = { uf: string; cidade: string; bairro: string; tipo: string }

function chaveRect(r: Rect): string {
  const f = (n: number) => n.toFixed(5)
  return `${f(r.low.latitude)},${f(r.low.longitude)},${f(r.high.latitude)},${f(r.high.longitude)}`
}

export function useBusca() {
  const [rodando, setRodando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [extent, setExtent] = useState<Rect | null>(null)
  const [celulas, setCelulas] = useState<CelulaRadar[]>([])
  const [total, setTotal] = useState(0)
  const [chamadas, setChamadas] = useState(0)
  const [truncado, setTruncado] = useState(false)
  const [leads, setLeads] = useState<LeadResultado[] | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const celulasRef = useRef<Map<string, CelulaRadar>>(new Map())

  const setEstadoCelula = useCallback((rect: Rect, depth: number, estado: EstadoCelula) => {
    const key = chaveRect(rect)
    const mapa = celulasRef.current
    mapa.set(key, { key: `${key}@${depth}`, rect, estado })
    setCelulas([...mapa.values()])
  }, [])

  const cancelar = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRodando(false)
  }, [])

  const buscar = useCallback(async (filtros: Filtros) => {
    // reset
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    celulasRef.current = new Map()
    setCelulas([])
    setExtent(null)
    setTotal(0)
    setChamadas(0)
    setTruncado(false)
    setLeads(null)
    setErro(null)
    setRodando(true)

    try {
      const resp = await fetch('/api/leads/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filtros),
        signal: controller.signal,
      })

      if (!resp.ok || !resp.body) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.erro ?? 'Falha ao iniciar a busca.')
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const partes = buffer.split('\n\n')
        buffer = partes.pop() ?? ''
        for (const parte of partes) {
          const linha = parte.replace(/^data: /, '').trim()
          if (!linha) continue
          const evt = JSON.parse(linha) as EventoBusca
          aplicar(evt)
        }
      }
    } catch (e) {
      if (controller.signal.aborted) return
      setErro(e instanceof Error ? e.message : 'Erro inesperado.')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setRodando(false)
    }

    function aplicar(evt: EventoBusca) {
      switch (evt.tipo) {
        case 'bbox':
          setExtent(evt.bbox)
          break
        case 'celula':
          setEstadoCelula(evt.bbox, evt.depth, 'varrendo')
          break
        case 'celula_ok':
          setEstadoCelula(evt.bbox, evt.depth, evt.saturada ? 'saturada' : 'ok')
          break
        case 'subdividir':
          setEstadoCelula(evt.bbox, evt.depth, 'saturada')
          break
        case 'progresso':
          setTotal(evt.total)
          setChamadas(evt.chamadas)
          break
        case 'truncado':
          setTruncado(true)
          break
        case 'resultado':
          setLeads(evt.leads)
          setTotal(evt.total)
          setChamadas(evt.chamadas)
          setTruncado(evt.truncado)
          break
        case 'erro':
          setErro(evt.erro)
          break
      }
    }
  }, [setEstadoCelula])

  return { rodando, erro, extent, celulas, total, chamadas, truncado, leads, buscar, cancelar }
}
