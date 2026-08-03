'use client'

import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Alca } from './Alca'
import { reordenar, useArrastar } from './arrastar'
import { CamposBotao } from './CamposBotao'
import { Area, Marcar, Texto, Vazio } from './campos'
import { SeletorPeriodo } from './SeletorPeriodo'
import { rotuloItem } from '@/lib/lp/layouts'
import type { CampoItem } from '@/lib/lp/layouts'
import type { ItemBriefing, TipoLayout } from '@/lib/lp/tipos'
import { gerarId } from '@/lib/lp/util'

type Props = {
  tipo: TipoLayout
  /** Rótulo do item naquele layout: Card, Plano, Depoimento… */
  rotulo: string
  campos: CampoItem[]
  itens: ItemBriefing[]
  aoMudar: (itens: ItemBriefing[]) => void
}

/**
 * Lista de itens escritos no briefing (os cards, os planos, os depoimentos).
 * Sem nenhum item, a IA cria os dela — por isso o estado vazio não é erro.
 * Ícone e imagem ficam de fora de propósito: um a IA escolhe, o outro se resolve
 * na geração ou no editor, e os dois inchariam a etapa.
 */
export function ItensSecao({ tipo, rotulo, campos, itens, aoMudar }: Props) {
  // Um item aberto por vez, como as seções: com dez cards escritos, a lista
  // toda aberta empurraria o resto da etapa para longe da tela.
  const [aberto, setAberto] = useState<string | null>(null)
  const arrastar = useArrastar((de, para) => aoMudar(reordenar(itens, de, para)))

  const mudar = (id: string, patch: Partial<ItemBriefing>) =>
    aoMudar(itens.map((i) => (i.id === id ? { ...i, ...patch } : i)))

  const tem = (campo: CampoItem) => campos.includes(campo)
  const parPrincipal = campos.filter((c): c is 'titulo' | 'extra' => c === 'titulo' || c === 'extra')

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {rotulo}s desta seção
            {itens.length > 0 && <span className="ml-1.5 text-text-dim">({itens.length})</span>}
          </p>
          <p className="text-xs text-text-dim">
            Escreva os que você já tem. O que deixar em branco a IA preenche.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // O item novo já nasce aberto: senão seria preciso clicar mais uma
            // vez só para começar a escrever nele.
            const novo = { id: gerarId() }
            aoMudar([...itens, novo])
            setAberto(novo.id)
          }}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar {rotulo.toLowerCase()}
        </button>
      </div>

      {itens.length === 0 ? (
        <Vazio>
          Nenhum {rotulo.toLowerCase()} escrito — a IA cria os desta seção a partir do conteúdo
          que você descreveu.
        </Vazio>
      ) : (
        <ul className="space-y-2">
          {itens.map((item, i) => {
            const escrito = item.titulo || item.extra || item.texto
            const estaAberto = aberto === item.id

            return (
              <li
                key={item.id}
                {...arrastar.alvo(i)}
                className={`rounded-md border border-border bg-surface-2/50 ${arrastar.classe(i)}`}
              >
                <div
                  className={`flex items-center gap-2 px-3 py-2 ${
                    estaAberto ? 'border-b border-border' : ''
                  }`}
                >
                  <Alca
                    arrastar={arrastar}
                    indice={i}
                    total={itens.length}
                    rotulo={item.titulo || `${rotulo} ${i + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => setAberto(estaAberto ? null : item.id)}
                    aria-expanded={estaAberto}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-surface font-mono text-xs text-text-dim">
                      {i + 1}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${escrito ? '' : 'text-text-dim'}`}
                    >
                      {escrito || `${rotulo} ${i + 1} — em branco`}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${rotulo.toLowerCase()} ${i + 1}`}
                    onClick={() => aoMudar(itens.filter((x) => x.id !== item.id))}
                    className="shrink-0 rounded-md p-1.5 text-text-dim transition-colors hover:text-pink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${
                      estaAberto ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {estaAberto && (
                  <div className="space-y-3 px-3 py-3">
                    {/* Na ordem em que o catálogo declara: em big numbers o valor
                        vem antes da informação; no card, o título antes do subtítulo. */}
                    {parPrincipal.length > 0 && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {parPrincipal.map((campo) => (
                          <Texto
                            key={campo}
                            rotulo={rotuloItem(tipo, campo)}
                            value={item[campo] ?? ''}
                            onChange={(e) => mudar(item.id, { [campo]: e.target.value })}
                            maxLength={300}
                          />
                        ))}
                      </div>
                    )}
                    {tem('detalhe') &&
                      (tipo === 'precos' ? (
                        <SeletorPeriodo
                          valor={item.detalhe ?? ''}
                          aoMudar={(v) => mudar(item.id, { detalhe: v })}
                        />
                      ) : (
                        <Texto
                          rotulo={rotuloItem(tipo, 'detalhe')}
                          value={item.detalhe ?? ''}
                          onChange={(e) => mudar(item.id, { detalhe: e.target.value })}
                          maxLength={300}
                        />
                      ))}
                    {tem('texto') && (
                      <Area
                        rotulo="Conteúdo"
                        placeholder="O que este item diz"
                        value={item.texto ?? ''}
                        onChange={(e) => mudar(item.id, { texto: e.target.value })}
                        maxLength={2000}
                      />
                    )}
                    {tem('lista') && (
                      <Area
                        rotulo={
                          tipo === 'comparacao' ? 'Células (uma por linha)' : 'Itens (um por linha)'
                        }
                        dica={tipo === 'comparacao' ? 'use sim/não' : undefined}
                        value={(item.lista ?? []).join('\n')}
                        onChange={(e) =>
                          mudar(item.id, {
                            lista: e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter((l) => l !== ''),
                          })
                        }
                      />
                    )}
                    {tem('destaque') && (
                      <Marcar
                        rotulo="Destacar este item"
                        valor={item.destaque === true}
                        aoMudar={(v) => mudar(item.id, { destaque: v })}
                      />
                    )}
                    {tem('botao') &&
                      (item.botao ? (
                        <div className="space-y-3 rounded-md border border-border bg-surface p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              Botão do {rotulo.toLowerCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => mudar(item.id, { botao: null })}
                              aria-label="Remover botão"
                              className="rounded p-1 text-text-dim transition-colors hover:text-pink"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <CamposBotao
                            botao={item.botao}
                            comPosicao={false}
                            aoMudar={(patch) =>
                              mudar(item.id, { botao: { ...item.botao!, ...patch } })
                            }
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            mudar(item.id, { botao: { texto: 'Saiba mais', url: '#contato' } })
                          }
                          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-dim transition-colors hover:border-blue/60 hover:text-text"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar botão neste {rotulo.toLowerCase()}
                        </button>
                      ))}
                    {campos.includes('imagem') && (
                      <p className="text-xs text-text-dim">
                        A imagem deste {rotulo.toLowerCase()} vem da busca da IA — troque no editor
                        depois de gerar.
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
