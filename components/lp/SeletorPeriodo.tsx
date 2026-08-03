'use client'

import { Selecao } from './campos'
import { PERIODOS_PRECO, rotuloItem } from '@/lib/lp/layouts'

/**
 * Período do plano no Pricing Table (o "/mês" ao lado do preço). Um período
 * escrito fora do catálogo — digitado direto no canvas, ou vindo de um projeto
 * antigo — continua valendo e aparece como opção própria: o select nunca troca
 * sozinho o período de um plano, que é o mesmo que mudar o preço dele.
 */
export function SeletorPeriodo({
  valor,
  aoMudar,
}: {
  valor: string
  aoMudar: (valor: string) => void
}) {
  const conhecido = PERIODOS_PRECO.some((p) => p.valor === valor)
  return (
    <Selecao
      rotulo={rotuloItem('precos', 'detalhe')}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
    >
      {!conhecido && <option value={valor}>{valor} (personalizado)</option>}
      {PERIODOS_PRECO.map((p) => (
        <option key={p.valor} value={p.valor}>
          {p.rotulo}
        </option>
      ))}
    </Selecao>
  )
}
