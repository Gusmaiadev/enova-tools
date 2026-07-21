import { avatarDe } from '@/lib/avatar'

type Props = {
  uid: string
  nome?: string | null
  /** Fallback quando nao ha nome: a primeira letra do e-mail. */
  email?: string | null
  size?: number
  className?: string
}

export function Avatar({ uid, nome, email, size = 32, className = '' }: Props) {
  const rotulo = nome?.trim() || email?.trim() || '?'
  const { bg, iniciais } = avatarDe(uid, rotulo)

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold leading-none text-bg select-none ${className}`}
      style={{
        background: bg,
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden="true"
    >
      {iniciais}
    </span>
  )
}
