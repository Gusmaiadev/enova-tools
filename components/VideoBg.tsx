'use client'

import { useEffect, useRef } from 'react'

/**
 * Vídeo de fundo da home, com autoplay robusto.
 *
 * O Chrome bloqueia autoplay se o vídeo não estiver comprovadamente mudo, e
 * algumas configs (economia de energia, "reduzir animações") bloqueiam mesmo
 * mudo. Então: forçamos `muted` via propriedade, tentamos tocar no load e no
 * canplay, e — como rede de segurança — destravamos no primeiro gesto do
 * usuário (clique, scroll, tecla). Se tudo falhar, o poster estático fica.
 */
export function VideoBg() {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    v.defaultMuted = true

    const tentar = () => {
      const p = v.play()
      if (p) p.catch(() => {})
    }

    tentar()
    v.addEventListener('loadeddata', tentar)
    v.addEventListener('canplay', tentar)

    const eventos = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const
    const noGesto = () => {
      tentar()
      eventos.forEach((e) => window.removeEventListener(e, noGesto))
    }
    eventos.forEach((e) => window.addEventListener(e, noGesto, { passive: true }))

    return () => {
      v.removeEventListener('loadeddata', tentar)
      v.removeEventListener('canplay', tentar)
      eventos.forEach((e) => window.removeEventListener(e, noGesto))
    }
  }, [])

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/home-still.jpg"
    >
      <source src="/home-loop.mp4" type="video/mp4" />
    </video>
  )
}
