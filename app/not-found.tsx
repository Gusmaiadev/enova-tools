import type { Metadata } from 'next'
import { ButtonLink } from '@/components/Button'

export const metadata: Metadata = {
  title: '404 · Página não encontrada',
  description: 'A página que você procura foi levada pela maré.',
}

/**
 * 404 — página raiz de "não encontrado". Também atende qualquer URL que não
 * casa com nenhuma rota do app (comportamento do App Router).
 *
 * A cena: um robozinho de barriga pra cima na beira da praia, à noite, meio
 * dentro da água. Tudo é SVG + keyframes em globals.css (nada de imagem, nada
 * de JS) — o "efeito na água" são camadas de onda deslizando, o reflexo da lua
 * tremendo, ondulações lambendo o corpo e bolhas subindo do robô afogado.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-bg">
      {/* ---------- A cena da praia (fundo, viewBox 1200x520) ---------- */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          {/* Céu noturno */}
          <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a14" />
            <stop offset="60%" stopColor="#0d1024" />
            <stop offset="100%" stopColor="#111a3a" />
          </linearGradient>
          {/* Mar */}
          <linearGradient id="mar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#132a52" />
            <stop offset="100%" stopColor="#0a1730" />
          </linearGradient>
          {/* Areia molhada */}
          <linearGradient id="areia" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1826" />
            <stop offset="100%" stopColor="#0c0b12" />
          </linearGradient>
          {/* Brilho da lua */}
          <radialGradient id="brilhoLua" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fdf6d8" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#ffd60a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffd60a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Camadas de base */}
        <rect x="0" y="0" width="1200" height="300" fill="url(#ceu)" />
        <rect x="0" y="290" width="1200" height="120" fill="url(#mar)" />
        <rect x="0" y="392" width="1200" height="128" fill="url(#areia)" />

        {/* Estrelas */}
        <g fill="#e8e8f0">
          {[
            [120, 60, 1.4, '0s'],
            [260, 110, 1, '0.8s'],
            [420, 45, 1.6, '1.6s'],
            [560, 130, 1, '0.4s'],
            [720, 70, 1.3, '2.1s'],
            [880, 120, 1, '1.1s'],
            [1040, 55, 1.5, '0.2s'],
            [1130, 150, 1.1, '1.9s'],
            [340, 175, 1, '2.6s'],
            [640, 30, 1.2, '1.3s'],
          ].map(([cx, cy, r, delay], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              className="cintila"
              style={{ animationDelay: String(delay) }}
            />
          ))}
        </g>

        {/* Lua */}
        <circle cx="985" cy="95" r="90" fill="url(#brilhoLua)" />
        <circle cx="985" cy="95" r="38" fill="#fdf6d8" />
        <circle cx="1000" cy="86" r="34" fill="#0d1024" opacity="0.55" />

        {/* Reflexo da lua tremeluzindo na água — o coração do "efeito na água" */}
        <g>
          {[300, 320, 340, 360, 380].map((y, i) => (
            <ellipse
              key={y}
              cx="985"
              cy={y}
              rx={26 + i * 7}
              ry="3"
              fill="#fdf6d8"
              className="reflexo-treme"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </g>

        {/* Ondas do mar deslizando de lado (camadas com velocidades diferentes).
            Cada faixa é desenhada com 1800 de largura e arrastada -600 pra
            emendar sem costura. */}
        <g className="onda-deriva-lenta" opacity="0.5">
          <path
            d="M0,318 q75,-14 150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 V360 H0 Z"
            fill="#1c3a68"
          />
        </g>
        <g className="onda-deriva" opacity="0.6">
          <path
            d="M0,338 q75,-11 150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 V380 H0 Z"
            fill="#24528f"
          />
        </g>

        {/* Linha de espuma da arrebentação */}
        <path
          d="M0,382 q75,-9 150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0"
          fill="none"
          stroke="#cfe4ff"
          strokeWidth="3"
          strokeLinecap="round"
          className="espuma-respira"
        />

        {/* ---------- O robozinho morto, de barriga pra cima ----------
            Deitado na beira, metade na água. Origem do grupo em (600, 430). */}
        <g transform="translate(600 430) rotate(-6)">
          {/* Poça de água ao redor + ondulações concêntricas */}
          <ellipse cx="0" cy="34" rx="150" ry="26" fill="#1c3a68" opacity="0.45" />
          {[0, 1.3, 2.6].map((delay, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="34"
              rx="120"
              ry="22"
              fill="none"
              stroke="#7fb0ff"
              strokeWidth="2"
              className="ondulacao"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}

          {/* Perna esquerda (flopada) */}
          <g stroke="#3b3b4e" strokeWidth="12" strokeLinecap="round">
            <line x1="-30" y1="14" x2="-70" y2="34" />
            <line x1="-70" y1="34" x2="-104" y2="24" />
          </g>
          {/* Perna direita */}
          <g stroke="#3b3b4e" strokeWidth="12" strokeLinecap="round">
            <line x1="30" y1="14" x2="66" y2="36" />
            <line x1="66" y1="36" x2="104" y2="34" />
          </g>
          {/* Pés */}
          <rect x="-118" y="16" width="20" height="16" rx="4" fill="#2c2c3c" />
          <rect x="98" y="26" width="20" height="16" rx="4" fill="#2c2c3c" />

          {/* Braço esquerdo, largado para cima (rendição) */}
          <g stroke="#43435a" strokeWidth="11" strokeLinecap="round">
            <line x1="-54" y1="-14" x2="-92" y2="-34" />
            <line x1="-92" y1="-34" x2="-120" y2="-24" />
          </g>
          <circle cx="-123" cy="-22" r="9" fill="#2c2c3c" />
          {/* Braço direito, caído na água */}
          <g stroke="#43435a" strokeWidth="11" strokeLinecap="round">
            <line x1="54" y1="-8" x2="94" y2="6" />
            <line x1="94" y1="6" x2="122" y2="20" />
          </g>
          <circle cx="125" cy="22" r="9" fill="#2c2c3c" />

          {/* Torso */}
          <rect x="-56" y="-30" width="112" height="70" rx="16" fill="#565672" />
          <rect x="-56" y="-30" width="112" height="70" rx="16" fill="none" stroke="#6f6f90" strokeWidth="2" />
          {/* Painel do peito: bateria vazia + linha reta (sem sinais vitais) */}
          <rect x="-34" y="-14" width="68" height="38" rx="6" fill="#14141f" />
          <polyline
            points="-28,5 -14,5 -8,-4 -2,14 4,5 28,5"
            fill="none"
            stroke="#ff2e88"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Ícone de bateria vazia */}
          <g transform="translate(-30 -22)">
            <rect x="0" y="0" width="18" height="9" rx="1.5" fill="none" stroke="#8b8ba0" strokeWidth="1.5" />
            <rect x="18" y="3" width="2.5" height="3" fill="#8b8ba0" />
          </g>

          {/* Pescoço */}
          <rect x="-10" y="-44" width="20" height="18" rx="4" fill="#3b3b4e" />

          {/* Cabeça, tombada para o lado */}
          <g transform="translate(0 -76) rotate(14)">
            <rect x="-40" y="-34" width="80" height="70" rx="16" fill="#63637f" />
            <rect x="-40" y="-34" width="80" height="70" rx="16" fill="none" stroke="#7c7c9c" strokeWidth="2" />
            {/* Olhos em X — o clássico "morto" */}
            <g stroke="#12121a" strokeWidth="5" strokeLinecap="round">
              <line x1="-26" y1="-14" x2="-12" y2="0" />
              <line x1="-12" y1="-14" x2="-26" y2="0" />
              <line x1="12" y1="-14" x2="26" y2="0" />
              <line x1="26" y1="-14" x2="12" y2="0" />
            </g>
            {/* Boca reta e resignada */}
            <line x1="-14" y1="18" x2="14" y2="18" stroke="#12121a" strokeWidth="4" strokeLinecap="round" />
            {/* Antena quebrada e apagada */}
            <line x1="20" y1="-34" x2="34" y2="-54" stroke="#3b3b4e" strokeWidth="4" strokeLinecap="round" />
            <circle cx="35" cy="-57" r="5" fill="#2c2c3c" stroke="#4a4a60" strokeWidth="1.5" />
          </g>

          {/* Bolhas subindo do robô afogado */}
          {[
            [70, 5, '0s'],
            [95, 3, '1.6s'],
            [50, 4, '3.1s'],
            [110, 2.5, '2.2s'],
          ].map(([x, r, delay], i) => (
            <circle
              key={i}
              cx={x}
              cy="10"
              r={r}
              fill="#bcd6ff"
              opacity="0.7"
              className="bolha-sobe"
              style={{ animationDelay: String(delay) }}
            />
          ))}
        </g>

        {/* Uma última onda por cima, cobrindo os pés do robô */}
        <g className="onda-deriva" opacity="0.85">
          <path
            d="M0,470 q75,-13 150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 t150,0 V520 H0 Z"
            fill="#0f2245"
          />
        </g>
      </svg>

      {/* ---------- Texto por cima ---------- */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-[8vh] text-center">
        <div className="flex w-full max-w-xl animate-fade-in-up flex-col items-center gap-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/60">
            Erro 404 · Fora do mapa
          </p>

          <h1 className="font-display text-7xl font-bold leading-none tracking-tight sm:text-8xl [text-shadow:0_4px_40px_rgba(0,0,0,0.6)]">
            404
          </h1>

          <h2 className="font-display text-2xl font-semibold sm:text-3xl [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
            Este robô não resistiu à maré.
          </h2>

          <p className="max-w-md text-base text-text-dim [text-shadow:0_1px_16px_rgba(0,0,0,0.7)]">
            A página que você procura encalhou, ou foi levada pela correnteza.
            Vamos te tirar da água antes que a próxima onda chegue.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/" className="h-11 px-6 text-base">
              Voltar para casa
            </ButtonLink>
            <ButtonLink
              href="/app"
              variante="secondary"
              className="h-11 px-6 text-base"
            >
              Ir para as ferramentas
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  )
}
