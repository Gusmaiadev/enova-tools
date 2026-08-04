'use client'

import { Laptop, Monitor, Smartphone, Tablet } from 'lucide-react'
import type { ReactNode } from 'react'
import { DISPOSITIVOS, NOME_DISPOSITIVO } from '@/lib/lp/padroes'
import type { Dispositivo, PorDisp } from '@/lib/lp/tipos'

const ICONES: Record<Dispositivo, typeof Monitor> = {
  desktop: Monitor,
  notebook: Laptop,
  tabletDeitado: Tablet,
  tablet: Tablet,
  celularDeitado: Smartphone,
  celular: Smartphone,
}

/** Ícone girado 90° marca a tela deitada — mesma convenção da barra de cima. */
const DEITADO = new Set<Dispositivo>(['tabletDeitado', 'celularDeitado'])

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
 * Seletor de dispositivo do painel. Aparece UMA vez, no topo — antes ele era
 * repetido em cada campo, o que enchia a coluna de seis botões dez vezes.
 */
export function SeletorDispositivo({
  ativo,
  aoTrocar,
}: {
  ativo: Dispositivo
  aoTrocar: (d: Dispositivo) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2/60 px-2 py-1.5">
      <span className="text-[11px] text-text-dim">Editando</span>
      <div
        role="group"
        aria-label="Dispositivo que os campos abaixo editam"
        className="flex gap-0.5"
      >
        {DISPOSITIVOS.map((d) => {
          const Icone = ICONES[d]
          return (
            <button
              key={d}
              type="button"
              onClick={() => aoTrocar(d)}
              aria-label={NOME_DISPOSITIVO[d]}
              aria-pressed={ativo === d}
              title={NOME_DISPOSITIVO[d]}
              className={`rounded p-1 transition-colors ${
                ativo === d ? 'bg-blue text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              <Icone className={`h-3.5 w-3.5 ${DEITADO.has(d) ? 'rotate-90' : ''}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Envolve um controle e diz de onde vem o valor dele no dispositivo ativo. Quem
 * escolhe o dispositivo é o SeletorDispositivo, no topo do painel.
 */
export function PorDispositivo<T>({
  rotulo,
  valor,
  ativo,
  aoLimpar,
  rotuloHerdado = 'do tema',
  children,
}: {
  rotulo: string
  valor: PorDisp<T> | undefined
  ativo: Dispositivo
  /** Devolve o campo ao valor herdado. Sem isto, não aparece o botão. */
  aoLimpar?: () => void
  /** De onde vem o valor quando não há override — "do tema" só vale para o que
   *  o tema realmente define; margem e padding, por exemplo, são "padrão". */
  rotuloHerdado?: string
  children: ReactNode
}) {
  // O campo é "do tema" enquanto não houver valor próprio NESTE dispositivo —
  // sem essa marca, o usuário não distingue o que ele mexeu do que veio da
  // Identidade, e não sabe o que o botão de limpar vai desfazer.
  const proprio = valor?.[ativo] !== undefined
  // Sem o seletor em cada campo, este contador é o que resta avisando que o
  // campo está diferente em OUTRA tela — a informação que os pontinhos davam.
  const outros = DISPOSITIVOS.filter((d) => d !== ativo && valor?.[d] !== undefined)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-1.5 text-sm text-text-dim">
        {rotulo}
        {proprio ? (
          aoLimpar && (
            <button
              type="button"
              onClick={aoLimpar}
              title="Voltar ao valor herdado"
              className="text-[11px] text-blue underline-offset-2 hover:underline"
            >
              próprio ✕
            </button>
          )
        ) : (
          <span className="text-[11px] opacity-60">{rotuloHerdado}</span>
        )}
        {outros.length > 0 && (
          <span
            className="text-[11px] text-blue/70"
            title={`Também tem valor próprio em: ${outros
              .map((d) => NOME_DISPOSITIVO[d])
              .join(', ')}`}
          >
            +{outros.length}
          </span>
        )}
      </span>
      {children}
    </div>
  )
}
