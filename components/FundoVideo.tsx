import { VideoBg } from './VideoBg'

/**
 * Camada de fundo em vídeo compartilhada (home, login, cadastro): poster estático
 * como fallback, o vídeo por cima e o scrim que garante legibilidade e funde com
 * o tema. Fica atrás do conteúdo.
 */
export function FundoVideo() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home-still.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <VideoBg />
      <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_38%,transparent_0%,rgba(8,8,12,0.55)_58%,rgba(8,8,12,0.92)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/45 via-transparent to-bg" />
    </div>
  )
}
