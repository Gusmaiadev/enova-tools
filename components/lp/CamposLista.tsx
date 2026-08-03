'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alca } from './Alca'
import { CampoMidia } from './CampoMidia'
import { SeletorIcone } from './SeletorIcone'
import type { MutarNo } from './CamposEstilo'
import { useArrastar, reordenar } from './arrastar'
import { Area, Marcar, Texto, Vazio } from './campos'
import type { LpElemento } from '@/lib/lp/tipos'
import { gerarId } from '@/lib/lp/util'

type Props = { no: LpElemento; lpId: string; mutarNo: MutarNo }

/** Caixa de um item da lista: alça para arrastar, campos e o botão de excluir. */
function ItemCaixa({
  rotulo,
  arrastar,
  indice,
  total,
  aoExcluir,
  children,
}: {
  rotulo: string
  arrastar: ReturnType<typeof useArrastar>
  indice: number
  total: number
  aoExcluir: () => void
  children: ReactNode
}) {
  return (
    <li
      {...arrastar.alvo(indice)}
      className={`space-y-2.5 rounded-md border border-border bg-surface-2/40 p-3 ${arrastar.classe(indice)}`}
    >
      <div className="flex items-center gap-1.5">
        <Alca arrastar={arrastar} indice={indice} total={total} rotulo={rotulo} />
        <span className="flex-1 truncate text-xs font-medium text-text-dim">{rotulo}</span>
        <button
          type="button"
          onClick={aoExcluir}
          aria-label={`Excluir ${rotulo}`}
          className="rounded p-1 text-text-dim transition-colors hover:text-pink"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
    </li>
  )
}

function BotaoAdicionar({ rotulo, aoClicar }: { rotulo: string; aoClicar: () => void }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-text-dim transition-colors hover:border-blue/60 hover:text-text"
    >
      <Plus className="h-3.5 w-3.5" />
      {rotulo}
    </button>
  )
}

/** Onde cada widget composto guarda a lista dele. */
const CHAVE_LISTA: Record<string, string> = {
  faq: 'perguntas',
  abas: 'abas',
  carrossel: 'slides',
  depoimentos: 'depoimentos',
  comparacao: 'colunas',
  lista: 'itens',
}

/**
 * Aba "Conteúdo" dos widgets compostos — os que continuam com lista própria
 * porque carregam JS e semântica (FAQ, abas, carrossel, depoimentos, comparação)
 * — e do widget de lista simples.
 */
export function CamposLista({ no, lpId, mutarNo }: Props) {
  // Um único useArrastar, fora de qualquer condicional: a chave do array vem do
  // tipo do nó. Chamar o hook dentro dos `if` por tipo quebraria as regras de
  // hooks do React assim que o usuário trocasse de elemento selecionado.
  const chave = CHAVE_LISTA[no.tipo]
  const arrastar = useArrastar((de, para) =>
    mutarNo((el) => {
      const alvo = el as unknown as Record<string, unknown[]>
      if (chave && Array.isArray(alvo[chave])) {
        alvo[chave] = reordenar(alvo[chave], de, para)
      }
    }),
  )

  if (no.tipo === 'faq') {
    return (
      <div className="space-y-2.5">
        <ul className="space-y-2.5">
          {no.perguntas.map((p, i) => (
            <ItemCaixa
              key={p.id}
              rotulo={p.pergunta || `Pergunta ${i + 1}`}
              arrastar={arrastar}
              indice={i}
              total={no.perguntas.length}
              aoExcluir={() =>
                mutarNo((el) => {
                  if (el.tipo === 'faq') el.perguntas = el.perguntas.filter((x) => x.id !== p.id)
                })
              }
            >
              <Texto
                rotulo="Pergunta"
                value={p.pergunta}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'faq') {
                      const alvo = el.perguntas.find((x) => x.id === p.id)
                      if (alvo) alvo.pergunta = e.target.value
                    }
                  }, `faq-p-${p.id}`)
                }
              />
              <Area
                rotulo="Resposta"
                value={p.resposta}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'faq') {
                      const alvo = el.perguntas.find((x) => x.id === p.id)
                      if (alvo) alvo.resposta = e.target.value
                    }
                  }, `faq-r-${p.id}`)
                }
              />
            </ItemCaixa>
          ))}
        </ul>
        <BotaoAdicionar
          rotulo="Nova pergunta"
          aoClicar={() =>
            mutarNo((el) => {
              if (el.tipo === 'faq') {
                el.perguntas.push({ id: gerarId(), pergunta: 'Nova pergunta', resposta: '' })
              }
            })
          }
        />
      </div>
    )
  }

  if (no.tipo === 'abas') {
    return (
      <div className="space-y-2.5">
        <ul className="space-y-2.5">
          {no.abas.map((a, i) => (
            <ItemCaixa
              key={a.id}
              rotulo={a.titulo || `Aba ${i + 1}`}
              arrastar={arrastar}
              indice={i}
              total={no.abas.length}
              aoExcluir={() =>
                mutarNo((el) => {
                  if (el.tipo === 'abas') el.abas = el.abas.filter((x) => x.id !== a.id)
                })
              }
            >
              <Texto
                rotulo="Título"
                value={a.titulo}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'abas') {
                      const alvo = el.abas.find((x) => x.id === a.id)
                      if (alvo) alvo.titulo = e.target.value
                    }
                  }, `aba-t-${a.id}`)
                }
              />
              <Area
                rotulo="Texto"
                value={a.texto}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'abas') {
                      const alvo = el.abas.find((x) => x.id === a.id)
                      if (alvo) alvo.texto = e.target.value
                    }
                  }, `aba-x-${a.id}`)
                }
              />
              <CampoMidia
                rotulo="Imagem"
                lpId={lpId}
                midia={a.imagem}
                rotuloVazio="Escolher imagem"
                aoRemover={() =>
                  mutarNo((el) => {
                    if (el.tipo === 'abas') {
                      const alvo = el.abas.find((x) => x.id === a.id)
                      if (alvo) alvo.imagem = null
                    }
                  })
                }
                aoMudar={(m) =>
                  mutarNo((el) => {
                    if (el.tipo === 'abas') {
                      const alvo = el.abas.find((x) => x.id === a.id)
                      if (alvo) alvo.imagem = m
                    }
                  })
                }
              />
            </ItemCaixa>
          ))}
        </ul>
        <BotaoAdicionar
          rotulo="Nova aba"
          aoClicar={() =>
            mutarNo((el) => {
              if (el.tipo === 'abas') {
                el.abas.push({ id: gerarId(), titulo: 'Nova aba', texto: '', imagem: null })
              }
            })
          }
        />
      </div>
    )
  }

  if (no.tipo === 'carrossel') {
    return (
      <div className="space-y-2.5">
        <ul className="space-y-2.5">
          {no.slides.map((s, i) => (
            <ItemCaixa
              key={s.id}
              rotulo={s.titulo || `Slide ${i + 1}`}
              arrastar={arrastar}
              indice={i}
              total={no.slides.length}
              aoExcluir={() =>
                mutarNo((el) => {
                  if (el.tipo === 'carrossel') el.slides = el.slides.filter((x) => x.id !== s.id)
                })
              }
            >
              <CampoMidia
                rotulo="Imagem"
                lpId={lpId}
                midia={s.imagem}
                rotuloVazio="Escolher imagem"
                aoMudar={(m) =>
                  mutarNo((el) => {
                    if (el.tipo === 'carrossel') {
                      const alvo = el.slides.find((x) => x.id === s.id)
                      if (alvo) alvo.imagem = m
                    }
                  })
                }
              />
              <Texto
                rotulo="Título"
                value={s.titulo ?? ''}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'carrossel') {
                      const alvo = el.slides.find((x) => x.id === s.id)
                      if (alvo) alvo.titulo = e.target.value
                    }
                  }, `slide-t-${s.id}`)
                }
              />
              <Area
                rotulo="Texto"
                value={s.texto ?? ''}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'carrossel') {
                      const alvo = el.slides.find((x) => x.id === s.id)
                      if (alvo) alvo.texto = e.target.value
                    }
                  }, `slide-x-${s.id}`)
                }
              />
            </ItemCaixa>
          ))}
        </ul>
        <BotaoAdicionar
          rotulo="Novo slide"
          aoClicar={() =>
            mutarNo((el) => {
              if (el.tipo === 'carrossel') {
                el.slides.push({ id: gerarId(), imagem: null, titulo: 'Novo slide', texto: '' })
              }
            })
          }
        />
      </div>
    )
  }

  if (no.tipo === 'depoimentos') {
    return (
      <div className="space-y-2.5">
        <ul className="space-y-2.5">
          {no.depoimentos.map((d, i) => (
            <ItemCaixa
              key={d.id}
              rotulo={d.nome || `Depoimento ${i + 1}`}
              arrastar={arrastar}
              indice={i}
              total={no.depoimentos.length}
              aoExcluir={() =>
                mutarNo((el) => {
                  if (el.tipo === 'depoimentos') {
                    el.depoimentos = el.depoimentos.filter((x) => x.id !== d.id)
                  }
                })
              }
            >
              <Area
                rotulo="Depoimento"
                value={d.texto}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'depoimentos') {
                      const alvo = el.depoimentos.find((x) => x.id === d.id)
                      if (alvo) alvo.texto = e.target.value
                    }
                  }, `depo-x-${d.id}`)
                }
              />
              <Texto
                rotulo="Nome"
                value={d.nome}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'depoimentos') {
                      const alvo = el.depoimentos.find((x) => x.id === d.id)
                      if (alvo) alvo.nome = e.target.value
                    }
                  }, `depo-n-${d.id}`)
                }
              />
              <Texto
                rotulo="Cargo ou empresa"
                value={d.cargo ?? ''}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'depoimentos') {
                      const alvo = el.depoimentos.find((x) => x.id === d.id)
                      if (alvo) alvo.cargo = e.target.value
                    }
                  }, `depo-c-${d.id}`)
                }
              />
              <CampoMidia
                rotulo="Foto"
                lpId={lpId}
                midia={d.foto}
                rotuloVazio="Escolher foto"
                aoRemover={() =>
                  mutarNo((el) => {
                    if (el.tipo === 'depoimentos') {
                      const alvo = el.depoimentos.find((x) => x.id === d.id)
                      if (alvo) alvo.foto = null
                    }
                  })
                }
                aoMudar={(m) =>
                  mutarNo((el) => {
                    if (el.tipo === 'depoimentos') {
                      const alvo = el.depoimentos.find((x) => x.id === d.id)
                      if (alvo) alvo.foto = m
                    }
                  })
                }
              />
            </ItemCaixa>
          ))}
        </ul>
        <BotaoAdicionar
          rotulo="Novo depoimento"
          aoClicar={() =>
            mutarNo((el) => {
              if (el.tipo === 'depoimentos') {
                el.depoimentos.push({ id: gerarId(), texto: '', nome: '', foto: null })
              }
            })
          }
        />
      </div>
    )
  }

  if (no.tipo === 'comparacao') {
    return (
      <div className="space-y-3">
        <Area
          rotulo="Características"
          dica="uma por linha"
          value={no.rotulos.join('\n')}
          onChange={(e) =>
            mutarNo((el) => {
              if (el.tipo === 'comparacao') {
                el.rotulos = e.target.value.split('\n')
              }
            }, `comp-rot-${no.id}`)
          }
        />
        <ul className="space-y-2.5">
          {no.colunas.map((c, i) => (
            <ItemCaixa
              key={c.id}
              rotulo={c.titulo || `Coluna ${i + 1}`}
              arrastar={arrastar}
              indice={i}
              total={no.colunas.length}
              aoExcluir={() =>
                mutarNo((el) => {
                  if (el.tipo === 'comparacao') {
                    el.colunas = el.colunas.filter((x) => x.id !== c.id)
                  }
                })
              }
            >
              <Texto
                rotulo="Título da coluna"
                value={c.titulo}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'comparacao') {
                      const alvo = el.colunas.find((x) => x.id === c.id)
                      if (alvo) alvo.titulo = e.target.value
                    }
                  }, `comp-t-${c.id}`)
                }
              />
              <Area
                rotulo="Células"
                dica="uma por característica, na mesma ordem"
                value={c.celulas.join('\n')}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'comparacao') {
                      const alvo = el.colunas.find((x) => x.id === c.id)
                      if (alvo) alvo.celulas = e.target.value.split('\n')
                    }
                  }, `comp-c-${c.id}`)
                }
              />
              <Marcar
                rotulo="Coluna em destaque"
                valor={c.destaque === true}
                aoMudar={(v) =>
                  mutarNo((el) => {
                    if (el.tipo === 'comparacao') {
                      const alvo = el.colunas.find((x) => x.id === c.id)
                      if (alvo) alvo.destaque = v
                    }
                  })
                }
              />
            </ItemCaixa>
          ))}
        </ul>
        <BotaoAdicionar
          rotulo="Nova coluna"
          aoClicar={() =>
            mutarNo((el) => {
              if (el.tipo === 'comparacao') {
                el.colunas.push({ id: gerarId(), titulo: 'Nova coluna', celulas: [] })
              }
            })
          }
        />
      </div>
    )
  }

  if (no.tipo === 'lista') {
    return (
      <div className="space-y-2.5">
        <ul className="space-y-2.5">
          {no.itens.map((it, i) => (
            <ItemCaixa
              key={it.id}
              rotulo={it.texto || `Item ${i + 1}`}
              arrastar={arrastar}
              indice={i}
              total={no.itens.length}
              aoExcluir={() =>
                mutarNo((el) => {
                  if (el.tipo === 'lista') el.itens = el.itens.filter((x) => x.id !== it.id)
                })
              }
            >
              <Texto
                rotulo="Texto"
                value={it.texto}
                onChange={(e) =>
                  mutarNo((el) => {
                    if (el.tipo === 'lista') {
                      const alvo = el.itens.find((x) => x.id === it.id)
                      if (alvo) alvo.texto = e.target.value
                    }
                  }, `lista-${it.id}`)
                }
              />
              <SeletorIcone
                valor={it.icone}
                aoMudar={(nome) =>
                  mutarNo((el) => {
                    if (el.tipo === 'lista') {
                      const alvo = el.itens.find((x) => x.id === it.id)
                      if (alvo) alvo.icone = nome
                    }
                  })
                }
              />
            </ItemCaixa>
          ))}
        </ul>
        <BotaoAdicionar
          rotulo="Novo item"
          aoClicar={() =>
            mutarNo((el) => {
              if (el.tipo === 'lista') {
                el.itens.push({ id: gerarId(), icone: 'check', texto: 'Novo item' })
              }
            })
          }
        />
      </div>
    )
  }

  if (no.tipo === 'formulario') {
    return (
      <div className="space-y-3">
        <Texto
          rotulo="Para onde enviar"
          dica="deixe vazio para não enviar"
          placeholder="https://formspree.io/f/..."
          value={no.destino ?? ''}
          onChange={(e) =>
            mutarNo((el) => {
              if (el.tipo === 'formulario') el.destino = e.target.value
            }, `form-${no.id}`)
          }
        />
        <p className="text-xs text-text-dim">
          Sem endereço o formulário só valida os campos — ele não finge que enviou.
        </p>
      </div>
    )
  }

  return <Vazio>Este elemento não tem lista para editar.</Vazio>
}
