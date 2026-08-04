'use client'

import { PorDispositivo, definir } from './PorDispositivo'
import type { MutarNo } from './CamposEstilo'
import { CLASSE_CONTROLE, Marcar } from './campos'
import {
  CAIXA_ZERO,
  DISPOSITIVOS,
  NOME_DISPOSITIVO,
  margemPadraoDe,
} from '@/lib/lp/padroes'
import type { Caixa, Dispositivo, LpElemento, LpEstilo } from '@/lib/lp/tipos'

const LADOS: { chave: keyof Caixa; rotulo: string }[] = [
  { chave: 'topo', rotulo: 'Topo' },
  { chave: 'direita', rotulo: 'Direita' },
  { chave: 'base', rotulo: 'Base' },
  { chave: 'esquerda', rotulo: 'Esquerda' },
]

/**
 * Quatro medidas em px. Zerar tudo GRAVA zero — não volta a herdar: quem quer o
 * padrão de volta usa o "próprio ✕" no rótulo. Antes, zerar os quatro lados
 * apagava a chave, o que tornava impossível definir margem zero num elemento.
 */
function CamposCaixa({
  valor,
  padrao,
  aoMudar,
}: {
  valor: Caixa | undefined
  /** Mostrado enquanto não há valor próprio — é o que o CSS base aplica. */
  padrao: Caixa
  aoMudar: (c: Caixa) => void
}) {
  const atual = valor ?? padrao
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {LADOS.map(({ chave, rotulo }) => (
        <label key={chave} className="flex flex-col gap-1">
          <span className="text-[11px] text-text-dim">{rotulo}</span>
          <input
            type="number"
            className={`${CLASSE_CONTROLE} px-2 text-xs`}
            value={atual[chave]}
            onChange={(e) => aoMudar({ ...atual, [chave]: Number(e.target.value) || 0 })}
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
}: {
  no: LpElemento
  mutarNo: MutarNo
  dispositivo: Dispositivo
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
      <PorDispositivo
        rotulo="Margem"
        valor={e.margem}
        ativo={dispositivo}
        rotuloHerdado="padrão"
      >
        <CamposCaixa
          valor={e.margem?.[dispositivo]}
          // Só texto tem margem por padrão — numa imagem o campo mostraria 10
          // e a página estaria com 0.
          padrao={margemPadraoDe(no.tipo)}
          aoMudar={(c) => mudar((est) => { est.margem = definir(est.margem, dispositivo, c) }, 'av-margem')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Espaçamento interno"
        valor={e.padding}
        ativo={dispositivo}
        rotuloHerdado="padrão"
      >
        <CamposCaixa
          valor={e.padding?.[dispositivo]}
          padrao={CAIXA_ZERO}
          aoMudar={(c) => mudar((est) => { est.padding = definir(est.padding, dispositivo, c) }, 'av-padding')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Largura"
        valor={e.largura}
        ativo={dispositivo}
        rotuloHerdado="automática"
      >
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
          {DISPOSITIVOS.map((d) => (
            <Marcar
              key={d}
              rotulo={NOME_DISPOSITIVO[d]}
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
