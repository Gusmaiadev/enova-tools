import { ButtonLink } from '@/components/Button'
import { FundoVideo } from '@/components/FundoVideo'
import { LogoImg } from '@/components/LogoImg'
import { redirecionarSeAutenticado } from '@/lib/auth/usuarioAtual'

/**
 * Home / porta de entrada. Continua sendo uma porta (não uma vitrine de vendas):
 * a logo sobre o fundo em vídeo, uma descrição simples e os dois caminhos.
 * Quem já tem sessão válida é mandado direto para /app — não vê a porta de novo.
 */
export default async function Home() {
  await redirecionarSeAutenticado()

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-bg">
      {/* --- Fundo em vídeo --- */}
      <FundoVideo />

      {/* --- Conteúdo ---
          Wrapper 'relative' SEM z-index de propósito: não cria stacking context,
          então o mix-blend-screen da logo enxerga o vídeo atrás e o preto some. */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-2xl animate-fade-in-up flex-col items-center gap-6 text-center">
          <LogoImg
            priority
            className="h-auto w-full max-w-[340px] sm:max-w-[400px]"
          />

          <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/70 [text-shadow:0_1px_12px_rgba(0,0,0,0.85)]">
            Ambiente interno · E-nova
          </p>

          <h1 className="w-full font-display text-3xl font-bold leading-[1.1] sm:text-4xl md:text-5xl [text-shadow:0_2px_28px_rgba(0,0,0,0.65)]">
            A caixa de ferramentas da equipe, num só lugar.
          </h1>

          <p className="w-full max-w-xl text-base text-text-dim sm:text-lg">
            Reunimos aqui o que a E-nova usa no dia a dia. Comece pelo{' '}
            <span className="text-text">Buscador de Leads</span> — empresas que ainda não
            têm site, prontas para prospectar.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/login" className="h-11 px-6 text-base">
              Entrar
            </ButtonLink>
            <ButtonLink
              href="/cadastro"
              variante="secondary"
              className="h-11 px-6 text-base"
            >
              Criar conta
            </ButtonLink>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-text-dim">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue" />
            Acesso restrito à equipe
          </p>
        </div>
      </div>
    </main>
  )
}
