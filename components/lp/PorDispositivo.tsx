'use client'

import { Monitor, Smartphone, Tablet } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Dispositivo, PorDisp } from '@/lib/lp/tipos'

const ICONES = { desktop: Monitor, tablet: Tablet, celular: Smartphone } as const
const ROTULOS = { desktop: 'Computador', tablet: 'Tablet', celular: 'Celular' } as const
const DISPOSITIVOS: Dispositivo[] = ['desktop', 'tablet', 'celular']

/**
 * Escreve `valor` no dispositivo escolhido. Valor vazio APAGA a chave — é o que
 * devolve o campo ao herdado: `{ desktop: 3, celular: 1 }` sem o celular volta a
 * usar o 3 do desktop, em vez de gravar um vazio que geraria CSS inútil.
 * Objeto sem chave nenhuma vira `undefined`, para o documento não acumular `{}`.
 */
export function definir<T>(
  atual: PorDisp<T> | undefined,
  d: Dispositivo,
  valor: T | undefined,
): PorDisp<T> | undefined {
  const novo: PorDisp<T> = { ...atual }
  if (valor === undefined || valor === '') delete novo[d]
  else novo[d] = valor
  return Object.keys(novo).length > 0 ? novo : undefined
}

/**
 * Envolve um controle e escolhe em qual dispositivo o valor é escrito. O ponto
 * marca os dispositivos que já têm valor próprio — sem ele não há como saber que
 * o celular está diferente sem clicar em cada aba.
 */
export function PorDispositivo<T>({
  rotulo,
  valor,
  ativo,
  aoTrocar,
  children,
}: {
  rotulo: string
  valor: PorDisp<T> | undefined
  ativo: Dispositivo
  aoTrocar: (d: Dispositivo) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text-dim">{rotulo}</span>
        <div
          role="group"
          aria-label={`Dispositivo de "${rotulo}"`}
          className="flex gap-0.5 rounded border border-border bg-surface-2 p-0.5"
        >
          {DISPOSITIVOS.map((d) => {
            const Icone = ICONES[d]
            const proprio = valor?.[d] !== undefined
            return (
              <button
                key={d}
                type="button"
                onClick={() => aoTrocar(d)}
                aria-label={ROTULOS[d]}
                aria-pressed={ativo === d}
                title={proprio ? `${ROTULOS[d]} — valor próprio` : ROTULOS[d]}
                className={`relative rounded p-1 transition-colors ${
                  ativo === d ? 'bg-blue text-white' : 'text-text-dim hover:text-text'
                }`}
              >
                <Icone className="h-3.5 w-3.5" />
                {proprio && (
                  <span
                    aria-hidden
                    className={`absolute right-0.5 top-0.5 h-1 w-1 rounded-full ${
                      ativo === d ? 'bg-white' : 'bg-blue'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}
