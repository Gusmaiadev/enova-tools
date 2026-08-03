'use client'

import { PorDispositivo, definir } from './PorDispositivo'
import type { MutarNo } from './CamposEstilo'
import { CLASSE_CONTROLE, Marcar } from './campos'
import type { Caixa, Dispositivo, LpElemento, LpEstilo } from '@/lib/lp/tipos'

const LADOS: { chave: keyof Caixa; rotulo: string }[] = [
  { chave: 'topo', rotulo: 'Topo' },
  { chave: 'direita', rotulo: 'Direita' },
  { chave: 'base', rotulo: 'Base' },
  { chave: 'esquerda', rotulo: 'Esquerda' },
]

const CAIXA_ZERO: Caixa = { topo: 0, direita: 0, base: 0, esquerda: 0 }

/** Quatro medidas em px. Tudo zero apaga a chave — volta a herdar. */
function CamposCaixa({
  valor,
  aoMudar,
}: {
  valor: Caixa | undefined
  aoMudar: (c: Caixa | undefined) => void
}) {
  const atual = valor ?? CAIXA_ZERO
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {LADOS.map(({ chave, rotulo }) => (
        <label key={chave} className="flex flex-col gap-1">
          <span className="text-[11px] text-text-dim">{rotulo}</span>
          <input
            type="number"
            className={`${CLASSE_CONTROLE} px-2 text-xs`}
            value={atual[chave]}
            onChange={(e) => {
              const novo = { ...atual, [chave]: Number(e.target.value) || 0 }
              const vazio = LADOS.every(({ chave: c }) => novo[c] === 0)
              aoMudar(vazio ? undefined : novo)
            }}
          />
        </label>
      ))}
    </div>
  )
}

/**
 * Aba "Avançado": espaçamento, largura e visibilidade. Iguais para todo nó, por
 * isso vivem aqui e não em cada painel de widget.
 */
export function CamposAvancado({
  no,
  mutarNo,
  dispositivo,
  aoTrocarDispositivo,
}: {
  no: LpElemento
  mutarNo: MutarNo
  dispositivo: Dispositivo
  aoTrocarDispositivo: (d: Dispositivo) => void
}) {
  const e: LpEstilo = no.estilo ?? {}
  const mudar = (patch: (est: LpEstilo) => void, agrupar?: string) =>
    mutarNo((el) => {
      const est: LpEstilo = { ...(el.estilo ?? {}) }
      patch(est)
      el.estilo = Object.keys(est).length > 0 ? est : undefined
    }, agrupar)

  return (
    <div className="space-y-3">
      <PorDispositivo rotulo="Margem" valor={e.margem} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <CamposCaixa
          valor={e.margem?.[dispositivo]}
          aoMudar={(c) => mudar((est) => { est.margem = definir(est.margem, dispositivo, c) }, 'av-margem')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Espaçamento interno"
        valor={e.padding}
        ativo={dispositivo}
        aoTrocar={aoTrocarDispositivo}
      >
        <CamposCaixa
          valor={e.padding?.[dispositivo]}
          aoMudar={(c) => mudar((est) => { est.padding = definir(est.padding, dispositivo, c) }, 'av-padding')}
        />
      </PorDispositivo>

      <PorDispositivo rotulo="Largura" valor={e.largura} ativo={dispositivo} aoTrocar={aoTrocarDispositivo}>
        <input
          className={CLASSE_CONTROLE}
          placeholder="automática (ex.: 320px, 50%)"
          value={e.largura?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => { est.largura = definir(est.largura, dispositivo, ev.target.value) }, 'av-largura')
          }
        />
      </PorDispositivo>

      <div className="rounded-md border border-border bg-surface-2/40 px-3 py-2.5">
        <p className="mb-2 text-xs text-text-dim">Não mostrar em</p>
        <div className="flex flex-wrap gap-3">
          {(['desktop', 'tablet', 'celular'] as Dispositivo[]).map((d) => (
            <Marcar
              key={d}
              rotulo={{ desktop: 'Computador', tablet: 'Tablet', celular: 'Celular' }[d]}
              valor={no.oculto?.[d] === true}
              aoMudar={(v) =>
                mutarNo((el) => {
                  el.oculto = definir(el.oculto, d, v ? true : undefined)
                })
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}
