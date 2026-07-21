import Image from 'next/image'

/**
 * Logo oficial (robô + espiral "e-nova Tools"), com fundo já transparente
 * (logo-t.png, gerado por colorkey). Funciona sobre qualquer fundo — vídeo, vidro
 * ou tema — sem precisar de mix-blend. next/image cuida de webp + responsividade.
 */
export function LogoImg({
  className = '',
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/logo-t.png"
      alt="E-nova Tools"
      width={1962}
      height={802}
      priority={priority}
      className={className}
    />
  )
}
