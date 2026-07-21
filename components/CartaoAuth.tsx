import Link from 'next/link'
import { FundoVideo } from '@/components/FundoVideo'
import { LogoImg } from '@/components/LogoImg'

export function CartaoAuth({
  titulo,
  children,
  rodape,
}: {
  titulo: string
  children: React.ReactNode
  rodape?: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden bg-bg p-6">
      <FundoVideo />

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <Link href="/" className="mb-8 flex justify-center rounded-sm">
          <LogoImg className="h-auto w-full max-w-[190px]" />
        </Link>
        {/* Painel de vidro sobre o vídeo. */}
        <div className="rounded-xl border border-border/70 bg-surface/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h1 className="mb-5 font-display text-xl font-semibold">{titulo}</h1>
          {children}
        </div>
        {rodape ? (
          <p className="mt-5 text-center text-sm text-text-dim">{rodape}</p>
        ) : null}
      </div>
    </main>
  )
}
