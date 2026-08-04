'use client'

import { Faixa, Selecao } from './campos'
import { ANIMACOES, ATRASO_MAX, DURACAO_MAX, DURACAO_PADRAO } from '@/lib/lp/animacoes'
import type { LpAnimacao } from '@/lib/lp/animacoes'

/**
 * Animação de entrada: o elemento anima quando entra na tela. Os mesmos campos
 * servem widget e seção — o que muda é só onde o valor é gravado.
 *
 * Não é por breakpoint de propósito: animação é comportamento do elemento, não
 * medida de tela, e quem prefere menos movimento já é atendido pelo
 * prefers-reduced-motion no CSS gerado.
 */
export function CamposAnimacao({
  animacao,
  aoMudar,
}: {
  animacao: LpAnimacao | undefined
  aoMudar: (a: LpAnimacao | undefined, agrupar?: string) => void
}) {
  const mudar = (patch: Partial<LpAnimacao>, agrupar?: string) => {
    if (!animacao) return
    aoMudar({ ...animacao, ...patch }, agrupar)
  }

  return (
    <div className="space-y-3">
      <Selecao
        rotulo="Animação de entrada"
        dica="roda quando o elemento aparece na tela"
        value={animacao?.tipo ?? ''}
        onChange={(e) =>
          aoMudar(e.target.value === '' ? undefined : { ...animacao, tipo: e.target.value as never })
        }
      >
        <option value="">Nenhuma</option>
        {ANIMACOES.map((a) => (
          <option key={a.tipo} value={a.tipo}>
            {a.rotulo}
          </option>
        ))}
      </Selecao>

      {animacao && (
        <>
          <Faixa
            rotulo="Duração"
            sufixo="ms"
            min={100}
            max={DURACAO_MAX}
            passo={100}
            valor={animacao.duracao ?? DURACAO_PADRAO}
            aoMudar={(v) => mudar({ duracao: v }, 'anim-duracao')}
          />
          <Faixa
            rotulo="Atraso"
            sufixo="ms"
            min={0}
            max={ATRASO_MAX}
            passo={100}
            valor={animacao.atraso ?? 0}
            aoMudar={(v) => mudar({ atraso: v }, 'anim-atraso')}
          />
          <p className="text-xs text-text-dim">
            Escalone o atraso entre os elementos de uma linha para eles entrarem em sequência.
          </p>
        </>
      )}
    </div>
  )
}
