'use client'

import { LayoutTemplate, PencilRuler, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { Campo, Erro } from '@/components/Campo'
import { ModalConfirmacao } from '@/components/ModalConfirmacao'
import type { LpProjetoResumo } from '@/lib/lp/tipos'

const data = (ms: number) =>
  new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export function ListaProjetos({ inicial }: { inicial: LpProjetoResumo[] }) {
  const [projetos, setProjetos] = useState(inicial)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [paraExcluir, setParaExcluir] = useState<LpProjetoResumo | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (nome.trim().length < 2) return setErro('Dê um nome ao projeto (2+ caracteres).')
    setCriando(true)
    try {
      const r = await fetch('/api/lp/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao criar projeto.')
      const novo = d.projeto as { id: string; nome: string; createdAt: number; atualizadoEm: number }
      setProjetos((lista) => [
        { id: novo.id, nome: novo.nome, createdAt: novo.createdAt, atualizadoEm: novo.atualizadoEm, gerada: false },
        ...lista,
      ])
      setNome('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao criar projeto.')
    } finally {
      setCriando(false)
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return
    setExcluindo(true)
    try {
      const r = await fetch(`/api/lp/projetos/${paraExcluir.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.erro ?? 'Falha ao excluir.')
      }
      setProjetos((lista) => lista.filter((p) => p.id !== paraExcluir.id))
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
            rotulo="Nova landing page"
            placeholder="Nome do projeto (ex.: Clínica Vida — Setembro)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={criando}>
          {criando ? 'Criando…' : 'Criar'}
        </Button>
      </form>
      {erro ? <Erro>{erro}</Erro> : null}

      {projetos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-text-dim">
          Nenhuma landing page ainda. Crie a primeira acima — o assistente guia você em três etapas
          e a IA escreve a página inteira.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projetos.map((p) => (
            <li
              key={p.id}
              className="group relative flex items-center justify-between gap-2 rounded-xl border border-border bg-surface/80 p-4 transition-colors hover:border-blue/60"
            >
              <Link
                href={p.gerada ? `/app/lp/${p.id}/editor` : `/app/lp/${p.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-blue">
                  {p.gerada ? (
                    <PencilRuler className="h-5 w-5" strokeWidth={1.75} />
                  ) : (
                    <LayoutTemplate className="h-5 w-5" strokeWidth={1.75} />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.nome}</span>
                  <span className="block text-xs text-text-dim">
                    {p.gerada ? 'Página gerada' : 'Em preparação'} · {data(p.atualizadoEm)}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                aria-label={`Excluir ${p.nome}`}
                onClick={() => setParaExcluir(p)}
                className="shrink-0 rounded-md p-2 text-text-dim opacity-0 transition-opacity hover:text-pink group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ModalConfirmacao
        aberto={!!paraExcluir}
        titulo="Excluir landing page"
        variante="danger"
        textoConfirmar="Excluir"
        carregando={excluindo}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setParaExcluir(null)}
        mensagem={
          <>
            A landing page <strong className="text-text">{paraExcluir?.nome}</strong> e tudo que
            você configurou nela serão apagados. Isso não pode ser desfeito.
          </>
        }
      />
    </div>
  )
}
