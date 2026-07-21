import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { LogoImg } from '@/components/LogoImg'

type Props = {
  uid: string
  nome?: string | null
  email?: string | null
}

export function Header({ uid, nome, email }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/app" className="flex items-center rounded-sm">
          <LogoImg className="h-10 w-auto" />
        </Link>
        <Link
          href="/app/perfil"
          className="flex items-center gap-2 rounded-full text-sm text-text-dim hover:text-text"
        >
          <span className="hidden sm:inline">{nome ?? email}</span>
          <Avatar uid={uid} nome={nome} email={email} size={28} />
        </Link>
      </div>
    </header>
  )
}
