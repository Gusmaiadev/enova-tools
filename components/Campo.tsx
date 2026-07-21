import type { ComponentProps } from 'react'

export function Campo({
  rotulo,
  className = '',
  ...props
}: ComponentProps<'input'> & { rotulo: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">{rotulo}</span>
      <input
        className={`h-10 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue ${className}`}
        {...props}
      />
    </label>
  )
}

/** Rosa cobre estados de atencao (secao 4). */
export function Erro({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-md border border-pink/40 bg-pink/10 px-3 py-2 text-sm text-pink">
      {children}
    </p>
  )
}

export function Aviso({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p role="status" className="rounded-md border border-blue/40 bg-blue/10 px-3 py-2 text-sm text-blue">
      {children}
    </p>
  )
}
