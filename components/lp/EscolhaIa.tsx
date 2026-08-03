'use client'

import { Ban, Sparkles } from 'lucide-react'
import { Opcoes } from './campos'

/**
 * O que acontece com um campo de texto que ficou em branco: a IA escreve (o
 * padrão de sempre) ou a seção sai sem ele.
 *
 * Só existe enquanto o campo está vazio — havendo texto escrito, ele é a
 * resposta e não há nada a decidir; por isso a escolha some ao digitar.
 */
export function EscolhaIa({
  vazio,
  escrever,
  campo,
  rotuloSem,
  aoMudar,
}: {
  vazio: boolean
  escrever: boolean
  /** Nome do campo, só para leitores de tela ("Título", "Subtítulo"…). */
  campo: string
  /** O que dizer na opção de dispensar ("Sem título", "Sem texto"…). */
  rotuloSem: string
  aoMudar: (escrever: boolean) => void
}) {
  if (!vazio) return null
  return (
    <Opcoes<'ia' | 'sem'>
      aria={`${campo}: quem escreve`}
      valor={escrever ? 'ia' : 'sem'}
      aoMudar={(v) => aoMudar(v === 'ia')}
      opcoes={[
        { valor: 'ia', rotulo: 'A IA escreve', icone: <Sparkles className="h-3.5 w-3.5" /> },
        { valor: 'sem', rotulo: rotuloSem, icone: <Ban className="h-3.5 w-3.5" /> },
      ]}
    />
  )
}
