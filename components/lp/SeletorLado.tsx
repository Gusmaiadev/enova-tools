'use client'

import { Opcoes } from './campos'
import type { TipoLayout } from '@/lib/lp/tipos'

/**
 * De que lado ficam o conteúdo e a mídia numa seção que divide a linha entre os
 * dois (hero, texto+mídia, blocos alternados). Mesmo controle no briefing e no
 * editor, para a escolha se chamar do mesmo jeito nas duas telas.
 */
export function SeletorLado({
  tipo,
  inverter,
  aoMudar,
}: {
  tipo: TipoLayout
  inverter: boolean
  aoMudar: (inverter: boolean) => void
}) {
  return (
    <Opcoes
      rotulo={
        // Em blocos alternados a escolha vale para o primeiro: os outros seguem
        // alternando a partir dele.
        tipo === 'blocos-alternados' ? 'Lados (1º bloco)' : 'Lados'
      }
      valor={inverter ? 'midia' : 'conteudo'}
      aoMudar={(v) => aoMudar(v === 'midia')}
      opcoes={[
        { valor: 'conteudo' as const, rotulo: 'Texto · Mídia' },
        { valor: 'midia' as const, rotulo: 'Mídia · Texto' },
      ]}
    />
  )
}
