'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { PorDispositivo, definir } from './PorDispositivo'
import { CLASSE_CONTROLE, Cor, Faixa, Fonte, Opcoes } from './campos'
import { estiloHerdado } from '@/lib/lp/heranca'
import type { Dispositivo, LpElemento, LpEstilo, LpTema } from '@/lib/lp/tipos'

export type MutarNo = (mut: (el: LpElemento) => void, agrupar?: string) => void

type Props = {
  no: LpElemento
  tema: LpTema
  mutarNo: MutarNo
  dispositivo: Dispositivo
  aoTrocarDispositivo: (d: Dispositivo) => void
}

/**
 * Aba "Estilo": as sobreposições que valem para qualquer nó.
 *
 * Cada campo mostra o valor EFETIVO — o que a página está usando. Sem override,
 * o que aparece é o do tema (o que o usuário definiu na Identidade), marcado
 * como "do tema". Mostrar não grava: o override só nasce quando ele mexe no
 * campo, senão cada elemento congelaria uma cópia e pararia de acompanhar o
 * tema quando a Identidade mudasse.
 */
export function CamposEstilo({ no, tema, mutarNo, dispositivo, aoTrocarDispositivo }: Props) {
  const e: LpEstilo = no.estilo ?? {}
  const herdado = estiloHerdado(no, tema)

  const mudar = (patch: (est: LpEstilo) => void, agrupar?: string) =>
    mutarNo((el) => {
      const est: LpEstilo = { ...(el.estilo ?? {}) }
      patch(est)
      // Estilo sem chave nenhuma sai do documento — CSS gerado só do que existe.
      el.estilo = Object.keys(est).length > 0 ? est : undefined
    }, agrupar)

  /** Apaga a chave do dispositivo ativo: o campo volta a seguir o tema. */
  const limpar = (chave: keyof LpEstilo) => () =>
    mudar((est) => {
      const atual = est[chave] as Record<string, unknown> | undefined
      const novo = { ...atual }
      delete novo[dispositivo]
      if (Object.keys(novo).length > 0) {
        ;(est as Record<string, unknown>)[chave] = novo
      } else {
        delete est[chave]
      }
    })

  return (
    <div className="space-y-3">
      <PorDispositivo
        rotulo="Cor do texto"
        valor={e.cor}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('cor')}
      >
        <Cor
          rotulo=""
          valor={e.cor?.[dispositivo]}
          padrao={herdado.cor}
          placeholder={herdado.cor ?? 'automático'}
          aoMudar={(v) => mudar((est) => { est.cor = definir(est.cor, dispositivo, v) }, 'estilo-cor')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Cor de fundo"
        valor={e.fundo}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('fundo')}
      >
        <Cor
          rotulo=""
          valor={e.fundo?.[dispositivo]}
          padrao={herdado.fundo}
          placeholder={herdado.fundo ?? 'sem fundo'}
          aoMudar={(v) => mudar((est) => { est.fundo = definir(est.fundo, dispositivo, v) }, 'estilo-fundo')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Fonte"
        valor={e.fonte}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('fonte')}
      >
        <Fonte
          rotulo=""
          permitirVazio
          rotuloVazio={herdado.fonte ? `Do tema (${herdado.fonte})` : 'Automático'}
          valor={e.fonte?.[dispositivo]}
          aoMudar={(v) => mudar((est) => { est.fonte = definir(est.fonte, dispositivo, v) })}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Tamanho"
        valor={e.tamanho}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('tamanho')}
      >
        <input
          className={CLASSE_CONTROLE}
          placeholder={herdado.tamanho ?? 'automático'}
          value={e.tamanho?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => { est.tamanho = definir(est.tamanho, dispositivo, ev.target.value) }, 'estilo-tamanho')
          }
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Peso"
        valor={e.peso}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('peso')}
      >
        <Faixa
          rotulo=""
          sufixo=""
          min={100}
          max={900}
          passo={100}
          valor={e.peso?.[dispositivo] ?? herdado.peso ?? 400}
          aoMudar={(v) => mudar((est) => { est.peso = definir(est.peso, dispositivo, v) }, 'estilo-peso')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Altura da linha"
        valor={e.alturaLinha}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('alturaLinha')}
      >
        <input
          className={CLASSE_CONTROLE}
          placeholder={herdado.alturaLinha ?? 'automática'}
          value={e.alturaLinha?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => {
              est.alturaLinha = definir(est.alturaLinha, dispositivo, ev.target.value)
            }, 'estilo-altura')
          }
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Espaçamento das letras"
        valor={e.espacamentoLetras}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('espacamentoLetras')}
      >
        <input
          className={CLASSE_CONTROLE}
          placeholder={herdado.espacamentoLetras ?? 'automático'}
          value={e.espacamentoLetras?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => {
              est.espacamentoLetras = definir(est.espacamentoLetras, dispositivo, ev.target.value)
            }, 'estilo-espaco')
          }
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Alinhamento"
        valor={e.alinhamento}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('alinhamento')}
      >
        <Opcoes<'left' | 'center' | 'right'>
          aria="Alinhamento do texto"
          valor={e.alinhamento?.[dispositivo] ?? 'left'}
          aoMudar={(v) => mudar((est) => { est.alinhamento = definir(est.alinhamento, dispositivo, v) })}
          opcoes={[
            { valor: 'left', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
            { valor: 'center', rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
            { valor: 'right', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
          ]}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Cantos"
        valor={e.raio}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
        aoLimpar={limpar('raio')}
      >
        <Faixa
          rotulo=""
          min={0}
          max={64}
          valor={e.raio?.[dispositivo] ?? tema.raio}
          aoMudar={(v) => mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'estilo-raio')}
        />
      </PorDispositivo>

      {herdado.fonte && (
        <p className="text-xs text-text-dim">
          Os valores marcados como “do tema” vêm da Identidade do briefing e mudam junto com ela.
          Mexer aqui vale só para este elemento.
        </p>
      )}
    </div>
  )
}
