'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { PorDispositivo, definir } from './PorDispositivo'
import { CLASSE_CONTROLE, Cor, Faixa, Fonte, Opcoes } from './campos'
import type { Dispositivo, LpElemento, LpEstilo } from '@/lib/lp/tipos'

export type MutarNo = (mut: (el: LpElemento) => void, agrupar?: string) => void

type Props = {
  no: LpElemento
  mutarNo: MutarNo
  dispositivo: Dispositivo
  aoTrocarDispositivo: (d: Dispositivo) => void
}

/**
 * Aba "Estilo": as sobreposições que valem para qualquer nó. Vazio em qualquer
 * campo significa "herda do tema" — é por isso que o Cor manda '' de volta e o
 * `definir` apaga a chave em vez de gravar vazio.
 */
export function CamposEstilo({ no, mutarNo, dispositivo, aoTrocarDispositivo }: Props) {
  const e: LpEstilo = no.estilo ?? {}
  const mudar = (patch: (est: LpEstilo) => void, agrupar?: string) =>
    mutarNo((el) => {
      const est: LpEstilo = { ...(el.estilo ?? {}) }
      patch(est)
      // Estilo sem chave nenhuma sai do documento — CSS gerado só do que existe.
      el.estilo = Object.keys(est).length > 0 ? est : undefined
    }, agrupar)

  return (
    <div className="space-y-3">
      <PorDispositivo rotulo="Cor do texto" valor={e.cor} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <Cor
          rotulo=""
          valor={e.cor?.[dispositivo]}
          aoMudar={(v) => mudar((est) => { est.cor = definir(est.cor, dispositivo, v) }, 'estilo-cor')}
        />
      </PorDispositivo>

      <PorDispositivo rotulo="Cor de fundo" valor={e.fundo} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <Cor
          rotulo=""
          valor={e.fundo?.[dispositivo]}
          aoMudar={(v) => mudar((est) => { est.fundo = definir(est.fundo, dispositivo, v) }, 'estilo-fundo')}
        />
      </PorDispositivo>

      <PorDispositivo rotulo="Fonte" valor={e.fonte} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <Fonte
          rotulo=""
          permitirVazio
          valor={e.fonte?.[dispositivo]}
          aoMudar={(v) => mudar((est) => { est.fonte = definir(est.fonte, dispositivo, v) })}
        />
      </PorDispositivo>

      <PorDispositivo rotulo="Tamanho" valor={e.tamanho} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <input
          className={CLASSE_CONTROLE}
          placeholder="automático (ex.: 32px)"
          value={e.tamanho?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => { est.tamanho = definir(est.tamanho, dispositivo, ev.target.value) }, 'estilo-tamanho')
          }
        />
      </PorDispositivo>

      <PorDispositivo rotulo="Peso" valor={e.peso} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <Faixa
          rotulo=""
          sufixo=""
          min={100}
          max={900}
          passo={100}
          valor={e.peso?.[dispositivo] ?? 400}
          aoMudar={(v) => mudar((est) => { est.peso = definir(est.peso, dispositivo, v) }, 'estilo-peso')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Alinhamento"
        valor={e.alinhamento}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
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

      <PorDispositivo rotulo="Cantos" valor={e.raio} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <Faixa
          rotulo=""
          min={0}
          max={64}
          valor={e.raio?.[dispositivo] ?? 0}
          aoMudar={(v) => mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'estilo-raio')}
        />
      </PorDispositivo>
    </div>
  )
}
