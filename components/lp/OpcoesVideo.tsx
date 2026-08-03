'use client'

import { Aviso } from '@/components/Campo'
import { Marcar } from './campos'
import type { ReproducaoVideo } from '@/lib/lp/tipos'

type Props = {
  valor: ReproducaoVideo
  aoMudar: (patch: ReproducaoVideo) => void
  /**
   * Mídia que a página usa como fundo (banner e hero com fundo): é decorativa,
   * entra sem som e sem controles — só o autoplay e o loop são escolha do
   * usuário, e vêm ligados.
   */
  deFundo?: boolean
}

/**
 * Reprodução do vídeo, igual no briefing e no editor. Estado ausente = padrão
 * (com controles, parado, sem repetir), então só o que o usuário mexer é gravado.
 */
export function OpcoesVideo({ valor, aoMudar, deFundo = false }: Props) {
  const controles = valor.controles !== false
  const autoplay = deFundo ? valor.autoplay !== false : valor.autoplay === true
  const loop = deFundo ? valor.loop !== false : valor.loop === true

  return (
    <div className="space-y-2 rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">
        Reprodução do vídeo
      </p>
      {deFundo ? (
        <p className="text-xs text-text-dim">
          Como fundo da seção, o vídeo entra sem som e sem controles.
        </p>
      ) : (
        <Marcar
          rotulo="Mostrar os controles (play, volume, tela cheia)"
          valor={controles}
          aoMudar={(v) => aoMudar({ controles: v })}
        />
      )}
      <Marcar
        rotulo="Repetir sem parar (loop)"
        valor={loop}
        aoMudar={(v) => aoMudar({ loop: v })}
      />
      <Marcar
        rotulo="Começar sozinho ao abrir a página (sem som)"
        valor={autoplay}
        aoMudar={(v) => aoMudar({ autoplay: v })}
      />
      {/* Sem controles e sem autoplay o vídeo vira uma imagem parada: o visitante
          não tem por onde dar play. */}
      {!deFundo && !controles && !autoplay && (
        <Aviso>
          Sem controles e sem início automático, o visitante não consegue dar play — o vídeo fica
          parado no primeiro quadro.
        </Aviso>
      )}
    </div>
  )
}
