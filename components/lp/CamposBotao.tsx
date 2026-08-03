'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { Opcoes, Selecao, Texto } from './campos'
import {
  ANIMACOES_BOTAO,
  HOVERS_BOTAO,
  ROTULO_ANIMACAO,
  ROTULO_HOVER,
  type AnimacaoBotao,
  type HoverBotao,
  type LpBotao,
  type PosicaoBotao,
} from '@/lib/lp/tipos'

type Props = {
  botao: LpBotao
  aoMudar: (patch: Partial<LpBotao>, agrupar?: string) => void
  /** Prefixo para agrupar as digitações no histórico do editor. */
  agrupar?: string
  /**
   * Posição só existe para o botão da seção: o de um item (card, plano, slide)
   * fica onde o layout do item manda.
   */
  comPosicao?: boolean
}

/**
 * Texto, link, posição, hover e animação — os mesmos campos no briefing e no
 * editor, para o botão não se comportar diferente em cada tela.
 */
export function CamposBotao({ botao, aoMudar, agrupar = 'botao', comPosicao = true }: Props) {
  return (
    <>
      <Texto
        rotulo="Texto do botão"
        placeholder="Ex.: Fale conosco"
        value={botao.texto}
        onChange={(e) => aoMudar({ texto: e.target.value }, `${agrupar}-texto`)}
        maxLength={80}
      />
      <Texto
        rotulo="Link"
        dica="#secao da página ou https://"
        placeholder="#contato"
        value={botao.url}
        onChange={(e) => aoMudar({ url: e.target.value }, `${agrupar}-url`)}
      />
      {comPosicao && (
        <Opcoes<PosicaoBotao>
          rotulo="Posição"
          valor={botao.posicao ?? 'esquerda'}
          aoMudar={(v) => aoMudar({ posicao: v })}
          opcoes={[
            { valor: 'esquerda', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
            { valor: 'centro', rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
            { valor: 'direita', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
          ]}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Selecao
          rotulo="Ao passar o mouse"
          value={botao.hover ?? 'elevar'}
          onChange={(e) => aoMudar({ hover: e.target.value as HoverBotao })}
        >
          {HOVERS_BOTAO.map((h) => (
            <option key={h} value={h}>
              {ROTULO_HOVER[h]}
            </option>
          ))}
        </Selecao>
        <Selecao
          rotulo="Animação"
          dica="chama atenção sozinha"
          value={botao.animacao ?? 'nenhuma'}
          onChange={(e) => aoMudar({ animacao: e.target.value as AnimacaoBotao })}
        >
          {ANIMACOES_BOTAO.map((a) => (
            <option key={a} value={a}>
              {ROTULO_ANIMACAO[a]}
            </option>
          ))}
        </Selecao>
      </div>
    </>
  )
}
