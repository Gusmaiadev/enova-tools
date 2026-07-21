import Link from 'next/link'
import type { ComponentProps } from 'react'

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 font-sans text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none'

const VARIANTES: Record<Variante, string> = {
  primary: 'bg-blue text-white hover:bg-blue/85',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2',
  ghost: 'text-text-dim hover:bg-surface-2 hover:text-text',
  // Rosa tambem cobre estados de atencao (secao 4).
  danger: 'border border-pink/40 text-pink hover:bg-pink/10',
}

export function Button({
  variante = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variante?: Variante }) {
  return (
    <button
      className={`${BASE} ${VARIANTES[variante]} ${className}`}
      {...props}
    />
  )
}

export function ButtonLink({
  variante = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return (
    <Link className={`${BASE} ${VARIANTES[variante]} ${className}`} {...props} />
  )
}
