'use client'

import { Plus, Trash2 } from 'lucide-react'
import { CamposBotao } from './CamposBotao'
import { Cor, Opcoes, Vazio } from './campos'
import type { BotaoComId, LpBotao } from '@/lib/lp/tipos'
import { MAX_BOTOES, gerarId } from '@/lib/lp/util'

/**
 * Botões do header e do rodapé: vários, cada um com os mesmos campos do botão de
 * seção (menos a posição, que quem manda ali é o layout da barra). `agrupar`
 * junta as digitações seguidas num só passo do desfazer.
 */
export function ListaBotoes({
  botoes,
  aoMudar,
  agrupar,
  vazio,
}: {
  botoes: BotaoComId[]
  aoMudar: (botoes: BotaoComId[], agrupar?: string) => void
  agrupar: string
  vazio: string
}) {
  const mudar = (id: string, patch: Partial<LpBotao>, chave?: string) =>
    aoMudar(
      botoes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      chave,
    )

  return (
    <div className="space-y-2">
      {botoes.length === 0 && <Vazio>{vazio}</Vazio>}

      {botoes.map((b, i) => (
        <div key={b.id} className="space-y-3 rounded-md border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{b.texto || `Botão ${i + 1}`}</span>
            <button
              type="button"
              onClick={() => aoMudar(botoes.filter((x) => x.id !== b.id))}
              aria-label={`Remover ${b.texto || `botão ${i + 1}`}`}
              className="rounded p-1 text-text-dim transition-colors hover:text-pink"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <CamposBotao
            botao={b}
            aoMudar={(patch, chave) => mudar(b.id, patch, chave)}
            agrupar={`${agrupar}-${b.id}`}
            comPosicao={false}
          />
          <Opcoes
            rotulo="Estilo"
            valor={b.estilo ?? 'solido'}
            aoMudar={(v) => mudar(b.id, { estilo: v })}
            opcoes={[
              { valor: 'solido' as const, rotulo: 'Preenchido' },
              { valor: 'contorno' as const, rotulo: 'Contorno' },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Cor
              rotulo="Fundo"
              valor={b.corFundo}
              aoMudar={(v) => mudar(b.id, { corFundo: v || undefined })}
            />
            <Cor
              rotulo="Texto"
              valor={b.corTexto}
              aoMudar={(v) => mudar(b.id, { corTexto: v || undefined })}
            />
          </div>
        </div>
      ))}

      {botoes.length < MAX_BOTOES && (
        <button
          type="button"
          onClick={() =>
            aoMudar([...botoes, { id: gerarId(), texto: 'Fale conosco', url: '#contato' }])
          }
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-dim transition-colors hover:border-blue/60 hover:text-text"
        >
          <Plus className="h-4 w-4" />
          Adicionar botão
        </button>
      )}
    </div>
  )
}
