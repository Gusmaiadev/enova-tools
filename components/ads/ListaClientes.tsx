'use client'

import { LineChart, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { Campo, Erro } from '@/components/Campo'
import { ModalConfirmacao } from '@/components/ModalConfirmacao'
import type { AdsCliente } from '@/lib/ads/tipos'

export function ListaClientes({ inicial }: { inicial: AdsCliente[] }) {
  const [clientes, setClientes] = useState(inicial)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [paraExcluir, setParaExcluir] = useState<AdsCliente | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (nome.trim().length < 2) return setErro('Dê um nome ao cliente (2+ caracteres).')
    setCriando(true)
    try {
      const r = await fetch('/api/ads/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao criar cliente.')
      setClientes((lista) =>
        [...lista, d.cliente as AdsCliente].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      )
      setNome('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar cliente.')
    } finally {
      setCriando(false)
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindo(true)
    try {
      const r = await fetch(`/api/ads/clientes/${paraExcluir.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.erro ?? 'Falha ao excluir.')
      }
      setClientes((lista) => lista.filter((c) => c.id !== paraExcluir.id))
      setParaExcluir(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao excluir.')
      setParaExcluir(null)
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={criar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Campo
            rotulo="Novo cliente"
            placeholder="Nome do cliente / conta de Ads"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={criando}>
          {criando ? 'Adicionando…' : 'Adicionar'}
        </Button>
      </form>
      {erro ? <Erro>{erro}</Erro> : null}

      {clientes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-text-dim">
          Nenhum cliente ainda. Adicione o primeiro acima para começar a importar relatórios.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map((c) => (
            <li
              key={c.id}
              className="group relative flex items-center justify-between gap-2 rounded-xl border border-border bg-surface/80 p-4 transition-colors hover:border-blue/60"
            >
              <Link href={`/app/ads/${c.id}`} className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-blue">
                  <LineChart className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className="truncate font-medium">{c.nome}</span>
              </Link>
              <button
                type="button"
                aria-label={`Excluir ${c.nome}`}
                onClick={() => setParaExcluir(c)}
                className="shrink-0 rounded-md p-2 text-text-dim opacity-0 transition-opacity hover:text-pink group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ModalConfirmacao
        aberto={!!paraExcluir}
        titulo="Excluir cliente"
        variante="danger"
        textoConfirmar="Excluir"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setParaExcluir(null)}
        mensagem={
          <>
            O cliente <strong className="text-text">{paraExcluir?.nome}</strong> e todos os
            relatórios importados dele serão apagados. Isso não pode ser desfeito.
          </>
        }
      />
    </div>
  )
}
