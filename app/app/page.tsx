import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { FERRAMENTAS } from '@/lib/ferramentas'

export default function AppHome() {
  return (
    <div className="animate-fade-in-up">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-dim">
        E-nova Tools
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Ferramentas</h1>
      <p className="mt-1 text-sm text-text-dim">
        Escolha uma ferramenta para começar.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FERRAMENTAS.map((f, i) => {
          const Icone = f.icone
          return (
            <Link
              key={f.slug}
              href={f.href}
              style={{ animationDelay: `${i * 70}ms` }}
              className="group relative animate-fade-in-up overflow-hidden rounded-xl border border-border bg-surface/80 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue/60 hover:bg-surface-2 hover:shadow-[0_12px_40px_-12px_var(--blue)]"
            >
              {/* Brilho que segue o hover no topo do card */}
              <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-lg border border-border bg-surface-2 text-blue transition-transform duration-300 group-hover:scale-110">
                  <Icone className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <ArrowRight className="h-5 w-5 text-text-dim transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue" />
              </div>

              <h2 className="mt-4 font-display text-lg font-semibold group-hover:text-blue">
                {f.nome}
              </h2>
              <p className="mt-1 text-sm text-text-dim">{f.descricao}</p>
            </Link>
          )
        })}

        {/* Placeholder das próximas ferramentas — comunica que o catálogo cresce. */}
        <div className="flex min-h-[164px] items-center justify-center rounded-xl border border-dashed border-border/60 p-5 text-center text-sm text-text-dim/70">
          Mais ferramentas em breve
        </div>
      </div>
    </div>
  )
}
