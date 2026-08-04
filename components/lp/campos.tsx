'use client'

import type { ComponentProps, ReactNode } from 'react'
import { FONTES_GOOGLE } from '@/lib/lp/fontes'

export const CLASSE_CONTROLE =
  'h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none'

/** Cartão de seção do assistente/editor. */
export function Bloco({
  titulo,
  descricao,
  acao,
  children,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm text-text-dim">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

/** Rótulo + controle arbitrário. */
export function Rotulo({
  texto,
  dica,
  children,
}: {
  texto: string
  dica?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">
        {texto}
        {dica && <span className="ml-1 text-xs text-text-dim/70">({dica})</span>}
      </span>
      {children}
    </label>
  )
}

export function Texto({
  rotulo,
  dica,
  className = '',
  ...props
}: ComponentProps<'input'> & { rotulo: string; dica?: string }) {
  return (
    <Rotulo texto={rotulo} dica={dica}>
      <input className={`${CLASSE_CONTROLE} ${className}`} {...props} />
    </Rotulo>
  )
}

export function Area({
  rotulo,
  dica,
  className = '',
  ...props
}: ComponentProps<'textarea'> & { rotulo: string; dica?: string }) {
  return (
    <Rotulo texto={rotulo} dica={dica}>
      <textarea
        className={`min-h-24 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none ${className}`}
        {...props}
      />
    </Rotulo>
  )
}

export function Selecao({
  rotulo,
  dica,
  className = '',
  children,
  ...props
}: ComponentProps<'select'> & { rotulo: string; dica?: string }) {
  return (
    <Rotulo texto={rotulo} dica={dica}>
      <select className={`${CLASSE_CONTROLE} ${className}`} {...props}>
        {children}
      </select>
    </Rotulo>
  )
}

/**
 * Cor com amostra clicável + hex digitável. `valor` vazio = "não definido"
 * (a IA escolhe); o X limpa de volta para esse estado.
 */
export function Cor({
  rotulo,
  valor,
  padrao = '#2563eb',
  placeholder = 'automático',
  aoMudar,
}: {
  rotulo: string
  valor: string | undefined
  padrao?: string
  /** Texto do campo vazio — serve para mostrar o valor herdado do tema. */
  placeholder?: string
  aoMudar: (valor: string) => void
}) {
  const definido = Boolean(valor)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">{rotulo}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={rotulo}
          value={valor || padrao}
          onChange={(e) => aoMudar(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-border bg-surface-2 p-1"
        />
        <input
          type="text"
          value={valor ?? ''}
          placeholder={placeholder}
          onChange={(e) => aoMudar(e.target.value)}
          className={`${CLASSE_CONTROLE} font-mono text-xs`}
        />
        {definido && (
          <button
            type="button"
            onClick={() => aoMudar('')}
            title="Deixar automático"
            className="h-10 shrink-0 rounded-md px-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

/** Select de fonte do catálogo do Google Fonts, agrupado por categoria. */
export function Fonte({
  rotulo,
  valor,
  aoMudar,
  permitirVazio = false,
  rotuloVazio = 'Automático',
}: {
  rotulo: string
  valor: string | undefined
  aoMudar: (valor: string) => void
  permitirVazio?: boolean
  /** Texto da opção vazia — serve para mostrar a fonte herdada do tema. */
  rotuloVazio?: string
}) {
  const grupos = [
    ['sans', 'Sem serifa'],
    ['serif', 'Com serifa'],
    ['display', 'Display'],
    ['mono', 'Monoespaçada'],
  ] as const

  return (
    <Selecao rotulo={rotulo} value={valor ?? ''} onChange={(e) => aoMudar(e.target.value)}>
      {permitirVazio && <option value="">{rotuloVazio}</option>}
      {grupos.map(([cat, nome]) => (
        <optgroup key={cat} label={nome}>
          {FONTES_GOOGLE.filter((f) => f.categoria === cat).map((f) => (
            <option key={f.nome} value={f.nome}>
              {f.nome}
            </option>
          ))}
        </optgroup>
      ))}
    </Selecao>
  )
}

/** Grupo de botões exclusivos (substitui radio em espaços apertados). */
/**
 * Grupo de botões exclusivos. Opção só com ícone precisa de `aria` — senão o
 * botão fica sem nome acessível.
 */
export function Opcoes<T extends string>({
  rotulo,
  aria,
  valor,
  opcoes,
  aoMudar,
}: {
  rotulo?: string
  /** Nome do grupo quando ele não tem rótulo visível. */
  aria?: string
  valor: T
  opcoes: { valor: T; rotulo: string; icone?: ReactNode; aria?: string }[]
  aoMudar: (valor: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {rotulo && <span className="text-sm text-text-dim">{rotulo}</span>}
      <div
        role="group"
        aria-label={rotulo ?? aria}
        className="flex flex-wrap gap-1 rounded-md border border-border bg-surface-2 p-1"
      >
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            onClick={() => aoMudar(o.valor)}
            aria-pressed={valor === o.valor}
            aria-label={o.rotulo === '' ? (o.aria ?? o.valor) : undefined}
            title={o.aria}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              valor === o.valor
                ? 'bg-blue text-white'
                : 'text-text-dim hover:bg-surface hover:text-text'
            }`}
          >
            {o.icone}
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Checkbox com rótulo à direita. */
export function Marcar({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string
  valor: boolean
  aoMudar: (valor: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-text-dim">
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => aoMudar(e.target.checked)}
        className="h-4 w-4 accent-[var(--blue)]"
      />
      {rotulo}
    </label>
  )
}

/** Slider com valor numérico ao lado. */
export function Faixa({
  rotulo,
  valor,
  min,
  max,
  passo = 1,
  sufixo = 'px',
  aoMudar,
}: {
  rotulo: string
  valor: number
  min: number
  max: number
  passo?: number
  sufixo?: string
  aoMudar: (valor: number) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm text-text-dim">
        <span>{rotulo}</span>
        <span className="font-mono text-xs text-text">
          {valor}
          {sufixo}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="w-full accent-[var(--blue)]"
      />
    </div>
  )
}

/** Caixa tracejada de estado vazio. */
export function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-text-dim">
      {children}
    </div>
  )
}
