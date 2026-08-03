'use client'

import { Copy, Eye, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Alca } from './Alca'
import { useArrastar } from './arrastar'
import { SeletorLayout } from './SeletorLayout'
import { infoLayout } from '@/lib/lp/layouts'
import type { LpDocumento, TipoLayout, TipoPaginaLegal } from '@/lib/lp/tipos'
import { PAGINAS_LEGAIS, infoPagina } from '@/lib/lp/tipos'

export function PainelEstrutura({
  doc,
  selecionadoId,
  aoSelecionar,
  aoMover,
  aoDuplicar,
  aoExcluir,
  aoAdicionar,
  aoAbrirPagina,
  aoAdicionarPagina,
  aoExcluirPagina,
}: {
  doc: LpDocumento
  selecionadoId: string | null
  aoSelecionar: (id: string) => void
  aoMover: (de: number, para: number) => void
  aoDuplicar: (id: string) => void
  aoExcluir: (id: string) => void
  aoAdicionar: (tipo: TipoLayout, aposId?: string) => void
  aoAbrirPagina: (tipo: TipoPaginaLegal) => void
  aoAdicionarPagina: (tipo: TipoPaginaLegal) => void
  aoExcluirPagina: (tipo: TipoPaginaLegal) => void
}) {
  const [adicionando, setAdicionando] = useState(false)
  const arrastar = useArrastar(aoMover)
  const paginas = doc.paginas ?? []
  const faltando = PAGINAS_LEGAIS.filter((p) => !paginas.some((x) => x.tipo === p.tipo))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Seções</p>
        <button
          type="button"
          onClick={() => setAdicionando(true)}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs transition-colors hover:border-blue/60"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova
        </button>
      </div>

      <ul className="space-y-1.5">
        {doc.secoes.map((s, i) => {
          const ativo = selecionadoId === s.id
          return (
            <li
              key={s.id}
              {...arrastar.alvo(i)}
              className={`group flex items-center gap-1.5 rounded-md border px-2 py-2 transition-colors ${
                ativo ? 'border-blue bg-surface-2' : 'border-border bg-surface-2/40 hover:border-blue/50'
              } ${arrastar.classe(i)}`}
            >
              <Alca arrastar={arrastar} indice={i} total={doc.secoes.length} rotulo={s.nome} />
              <button
                type="button"
                onClick={() => aoSelecionar(s.id)}
                className="flex min-w-0 flex-1 flex-col text-left"
              >
                <span className="truncate text-xs font-medium">{s.nome}</span>
                <span className="truncate text-[11px] text-text-dim">
                  {infoLayout(s.tipo).rotulo}
                  {s.ancora ? ` · #${s.ancora}` : ''}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Ver ${s.nome}`}
                onClick={() => aoSelecionar(s.id)}
                className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Duplicar ${s.nome}`}
                onClick={() => aoDuplicar(s.id)}
                className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Excluir ${s.nome}`}
                onClick={() => aoExcluir(s.id)}
                className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-pink group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          )
        })}
      </ul>

      {doc.secoes.length === 0 && (
        <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-text-dim">
          A página está sem seções. Clique em “Nova”.
        </p>
      )}

      <div className="border-t border-border pt-3">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Páginas</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-dim/80">
          Páginas de texto que saem no .zip junto com a landing page. O link entra sozinho nos
          “Links úteis” do rodapé.
        </p>

        <ul className="mt-2.5 space-y-1.5">
          {paginas.map((p) => (
            <li
              key={p.tipo}
              className="group flex items-center gap-1.5 rounded-md border border-border bg-surface-2/40 px-2 py-2 transition-colors hover:border-blue/50"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-text-dim" />
              <button
                type="button"
                onClick={() => aoAbrirPagina(p.tipo)}
                className="flex min-w-0 flex-1 flex-col text-left"
              >
                <span className="truncate text-xs font-medium">{p.titulo}</span>
                <span className="truncate text-[11px] text-text-dim">
                  {infoPagina(p.tipo).arquivo}
                  {p.conteudo.trim() === ''
                    ? ' · sem texto'
                    : ` · ${p.conteudo.trim().length.toLocaleString('pt-BR')} caracteres`}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Editar ${p.titulo}`}
                onClick={() => aoAbrirPagina(p.tipo)}
                className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-text group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Excluir ${p.titulo}`}
                onClick={() => aoExcluirPagina(p.tipo)}
                className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-pink group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>

        {faltando.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {faltando.map((p) => (
              <button
                key={p.tipo}
                type="button"
                onClick={() => aoAdicionarPagina(p.tipo)}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] transition-colors hover:border-blue/60"
              >
                + {p.titulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <SeletorLayout
        aberto={adicionando}
        aoEscolher={(tipo) => aoAdicionar(tipo, selecionadoId ?? undefined)}
        aoFechar={() => setAdicionando(false)}
      />
    </div>
  )
}
