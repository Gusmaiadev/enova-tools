'use client'

import { ChevronRight, Copy, Eye, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Alca } from './Alca'
import { NOME_ELEMENTO, resumoNo } from './elementos'
import { useArrastar } from './arrastar'
import { SeletorLayout } from './SeletorLayout'
import { infoLayout } from '@/lib/lp/layouts'
import type { LpDocumento, LpElemento, TipoLayout, TipoPaginaLegal } from '@/lib/lp/tipos'
import { PAGINAS_LEGAIS, infoPagina } from '@/lib/lp/tipos'

/** Uma linha da árvore, e as dos filhos abaixo dela. */
function LinhaNo({
  no,
  nivel,
  selecionadoId,
  aoSelecionar,
  aoDuplicar,
  aoRemover,
}: {
  no: LpElemento
  nivel: number
  selecionadoId: string | null
  aoSelecionar: (id: string) => void
  aoDuplicar: (id: string) => void
  aoRemover: (id: string) => void
}) {
  const ativo = selecionadoId === no.id
  const resumo = resumoNo(no)
  const nome = NOME_ELEMENTO[no.tipo] ?? no.tipo
  // A raiz (nível 0) é a seção: duplicá-la ou removê-la é operação de seção, e
  // isso já tem botão na linha de cima.
  const proprio = nivel > 0
  return (
    <>
      <li className="group/no flex items-center">
        <button
          type="button"
          onClick={() => aoSelecionar(no.id)}
          aria-current={ativo ? 'true' : undefined}
          style={{ paddingLeft: `${nivel * 12 + 6}px` }}
          className={`flex min-w-0 flex-1 items-baseline gap-1.5 rounded py-1 pr-1.5 text-left transition-colors ${
            ativo ? 'bg-blue/15 text-blue' : 'text-text-dim hover:bg-surface-2 hover:text-text'
          }`}
        >
          <span className="shrink-0 text-[11px] font-medium">{nome}</span>
          {resumo && <span className="truncate text-[11px] opacity-70">{resumo}</span>}
        </button>
        {proprio && (
          <>
            <button
              type="button"
              aria-label={`Duplicar ${nome}`}
              onClick={() => aoDuplicar(no.id)}
              className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-text group-hover/no:opacity-100 focus-visible:opacity-100"
            >
              <Copy className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label={`Remover ${nome}`}
              onClick={() => aoRemover(no.id)}
              className="shrink-0 rounded p-1 text-text-dim opacity-0 transition-opacity hover:text-pink group-hover/no:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </li>
      {no.tipo === 'container' &&
        no.filhos.map((f) => (
          <LinhaNo
            key={f.id}
            no={f}
            nivel={nivel + 1}
            selecionadoId={selecionadoId}
            aoSelecionar={aoSelecionar}
            aoDuplicar={aoDuplicar}
            aoRemover={aoRemover}
          />
        ))}
    </>
  )
}

export function PainelEstrutura({
  doc,
  selecionadoId,
  noSelecionadoId,
  aoSelecionar,
  aoSelecionarNo,
  aoDuplicarNo,
  aoRemoverNo,
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
  /** Nó da árvore selecionado no canvas, para destacar a linha certa. */
  noSelecionadoId: string | null
  aoSelecionar: (id: string) => void
  aoSelecionarNo: (id: string) => void
  aoDuplicarNo: (id: string) => void
  aoRemoverNo: (id: string) => void
  aoMover: (de: number, para: number) => void
  aoDuplicar: (id: string) => void
  aoExcluir: (id: string) => void
  aoAdicionar: (tipo: TipoLayout, aposId?: string) => void
  aoAbrirPagina: (tipo: TipoPaginaLegal) => void
  aoAdicionarPagina: (tipo: TipoPaginaLegal) => void
  aoExcluirPagina: (tipo: TipoPaginaLegal) => void
}) {
  const [adicionando, setAdicionando] = useState(false)
  // Seções expandidas na árvore. Começa fechado: com muitas seções, tudo aberto
  // vira uma parede de linhas e some a visão geral da página.
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const alternar = (id: string) =>
    setExpandidas((atual) => {
      const nova = new Set(atual)
      if (nova.has(id)) nova.delete(id)
      else nova.add(id)
      return nova
    })
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
          const aberta = expandidas.has(s.id)
          return (
            <li
              key={s.id}
              {...arrastar.alvo(i)}
              className={`group rounded-md border transition-colors ${
                ativo ? 'border-blue bg-surface-2' : 'border-border bg-surface-2/40 hover:border-blue/50'
              } ${arrastar.classe(i)}`}
            >
            <div className="flex items-center gap-1.5 px-2 py-2">
              {s.raiz ? (
                <button
                  type="button"
                  onClick={() => alternar(s.id)}
                  aria-expanded={aberta}
                  aria-label={aberta ? `Recolher ${s.nome}` : `Expandir ${s.nome}`}
                  className="shrink-0 rounded p-0.5 text-text-dim transition-colors hover:text-text"
                >
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${aberta ? 'rotate-90' : ''}`}
                  />
                </button>
              ) : (
                <span className="w-[18px] shrink-0" />
              )}
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
            </div>
            {aberta && s.raiz && (
              <ul className="border-t border-border/60 px-2 py-1.5">
                <LinhaNo
                  no={s.raiz}
                  nivel={0}
                  selecionadoId={noSelecionadoId}
                  aoSelecionar={aoSelecionarNo}
                  aoDuplicar={aoDuplicarNo}
                  aoRemover={aoRemoverNo}
                />
              </ul>
            )}
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
