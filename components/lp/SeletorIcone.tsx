'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { NOMES_ICONES, svgIcone } from '@/lib/lp/icones'

/**
 * Grade de ícones do catálogo. Vive em arquivo próprio porque o painel antigo
 * (por seção) e o novo (por widget) precisam do mesmo controle.
 *
 * Sobre o `dangerouslySetInnerHTML`: `svgIcone` (lib/lp/icones.ts) devolve
 * `ICONES[nome] ?? ICONES.check` — o nome vindo do documento apenas ESCOLHE uma
 * chave de um mapa constante, e nome desconhecido cai no fallback. A string
 * inserida é sempre nossa; conteúdo do usuário não chega ao HTML.
 */
export function SeletorIcone({
  valor,
  aoMudar,
}: {
  valor: string | null | undefined
  aoMudar: (nome: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">Ícone</span>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm transition-colors hover:border-blue/60"
      >
        <span
          className="grid h-5 w-5 place-items-center text-blue [&_svg]:h-5 [&_svg]:w-5"
          dangerouslySetInnerHTML={{ __html: svgIcone(valor ?? 'check') }}
        />
        <span className="flex-1 truncate text-left">{valor ?? 'check'}</span>
        <ChevronDown
          className={`h-4 w-4 text-text-dim transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>
      {aberto && (
        <div className="grid max-h-44 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-border bg-surface-2 p-2">
          {NOMES_ICONES.map((nome) => (
            <button
              key={nome}
              type="button"
              title={nome}
              onClick={() => {
                aoMudar(nome)
                setAberto(false)
              }}
              className={`grid aspect-square place-items-center rounded transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                valor === nome
                  ? 'bg-blue text-white'
                  : 'text-text-dim hover:bg-surface hover:text-text'
              }`}
              dangerouslySetInnerHTML={{ __html: svgIcone(nome) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
