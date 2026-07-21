import { Header } from '@/components/Header'
import { exigirUsuario } from '@/lib/auth/usuarioAtual'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Gate autoritativo + fonte do usuário real para o Header (defesa em
  // profundidade sobre o proxy.ts).
  const usuario = await exigirUsuario()

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      {/* Fundo ambiente: brilhos que flutuam devagar + grade técnica sutil. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="aurora aurora-a"
          style={{ background: 'var(--blue)', width: '44rem', height: '44rem', top: '-14rem', left: '-10rem' }}
        />
        <div
          className="aurora aurora-b"
          style={{ background: 'var(--pink)', width: '38rem', height: '38rem', bottom: '-16rem', right: '-8rem' }}
        />
        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:46px_46px]" />
      </div>

      <Header uid={usuario.uid} nome={usuario.name} email={usuario.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
