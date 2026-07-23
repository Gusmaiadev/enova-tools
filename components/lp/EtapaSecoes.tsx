'use client'

import { ChevronDown, Copy, ImageIcon, Plus, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { Alca } from './Alca'
import { Area, Bloco, Marcar, Opcoes, Selecao, Texto, Vazio } from './campos'
import { reordenar, useArrastar } from './arrastar'
import { SeletorLayout } from './SeletorLayout'
import { infoLayout } from '@/lib/lp/layouts'
import type { LpBriefing, Orientacao, SecaoBriefing, TipoLayout, TipoMidia } from '@/lib/lp/tipos'
import { gerarId } from '@/lib/lp/util'

/** Estruturas prontas para quem não sabe por onde começar. */
const MODELOS: { nome: string; descricao: string; secoes: [string, TipoLayout][] }[] = [
  {
    nome: 'Página de serviços',
    descricao: 'Apresenta a empresa, o que ela faz e converte no fim.',
    secoes: [
      ['Início', 'hero'],
      ['Quem Somos', 'texto-midia'],
      ['Serviços', 'cards'],
      ['Benefícios', 'lista-beneficios'],
      ['Depoimentos', 'depoimentos'],
      ['FAQ', 'faq'],
      ['Contato', 'formulario'],
    ],
  },
  {
    nome: 'Captura de leads',
    descricao: 'Curta e direta, focada em preencher o formulário.',
    secoes: [
      ['Início', 'hero'],
      ['Benefícios', 'lista-beneficios'],
      ['Números', 'estatisticas'],
      ['Depoimentos', 'depoimentos'],
      ['Contato', 'formulario'],
    ],
  },
  {
    nome: 'Produto ou infoproduto',
    descricao: 'Explica o produto, mostra planos e responde objeções.',
    secoes: [
      ['Início', 'hero'],
      ['Como funciona', 'blocos-alternados'],
      ['O que você recebe', 'cards'],
      ['Planos', 'precos'],
      ['Depoimentos', 'depoimentos'],
      ['Dúvidas', 'faq'],
      ['Comece agora', 'cta'],
    ],
  },
  {
    nome: 'Portfólio',
    descricao: 'Para estúdios, fotógrafos e criativos.',
    secoes: [
      ['Início', 'hero'],
      ['Sobre', 'texto-midia'],
      ['Trabalhos', 'galeria'],
      ['Clientes', 'logos'],
      ['Trajetória', 'timeline'],
      ['Contato', 'formulario'],
    ],
  },
]

function novaSecaoBriefing(nome: string, layout: TipoLayout): SecaoBriefing {
  const info = infoLayout(layout)
  return {
    id: gerarId(),
    nome,
    vincularMenu: true,
    titulo: '',
    conteudo: '',
    layout,
    ...(info.temColunas ? { colunas: 3 as const } : {}),
    midia: null,
  }
}

export function EtapaSecoes({
  briefing,
  aoMudar,
}: {
  briefing: LpBriefing
  aoMudar: (patch: Partial<LpBriefing>) => void
}) {
  const [expandida, setExpandida] = useState<string | null>(briefing.secoes[0]?.id ?? null)
  const [trocandoLayout, setTrocandoLayout] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)

  const arrastar = useArrastar((de, para) =>
    aoMudar({ secoes: reordenar(briefing.secoes, de, para) }),
  )

  const mudarSecao = (id: string, patch: Partial<SecaoBriefing>) =>
    aoMudar({ secoes: briefing.secoes.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

  const adicionar = (layout: TipoLayout) => {
    const secao = novaSecaoBriefing(infoLayout(layout).rotulo, layout)
    aoMudar({ secoes: [...briefing.secoes, secao] })
    setExpandida(secao.id)
  }

  const duplicar = (id: string) => {
    const i = briefing.secoes.findIndex((s) => s.id === id)
    if (i === -1) return
    const copia = { ...briefing.secoes[i], id: gerarId(), nome: `${briefing.secoes[i].nome} (cópia)` }
    const secoes = [...briefing.secoes]
    secoes.splice(i + 1, 0, copia)
    aoMudar({ secoes })
  }

  const aplicarModelo = (modelo: (typeof MODELOS)[number]) =>
    aoMudar({
      secoes: modelo.secoes.map(([nome, layout]) => novaSecaoBriefing(nome, layout)),
      menu:
        briefing.menu.length > 0
          ? briefing.menu
          : modelo.secoes.map(([nome]) => ({ id: gerarId(), rotulo: nome, url: '' })),
    })

  return (
    <div className="space-y-5">
      {briefing.secoes.length === 0 && (
        <Bloco
          titulo="Comece por uma estrutura pronta"
          descricao="Escolha o tipo de página mais próximo do seu objetivo. Você ajusta tudo depois."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {MODELOS.map((m) => (
              <button
                key={m.nome}
                type="button"
                onClick={() => aplicarModelo(m)}
                className="rounded-lg border border-border bg-surface-2/50 p-4 text-left transition-colors hover:border-blue/60 hover:bg-surface-2"
              >
                <p className="font-medium">{m.nome}</p>
                <p className="mt-1 text-xs text-text-dim">{m.descricao}</p>
                <p className="mt-2 text-xs text-text-dim/80">
                  {m.secoes.map(([nome]) => nome).join(' · ')}
                </p>
              </button>
            ))}
          </div>
        </Bloco>
      )}

      <Bloco
        titulo="Seções da página"
        descricao="Arraste ou use as setas para reordenar. Cada seção vira um bloco da landing page, de cima para baixo."
        acao={
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova seção
          </button>
        }
      >
        {briefing.secoes.length === 0 ? (
          <Vazio>
            Nenhuma seção ainda. Use uma estrutura pronta acima ou clique em “Nova seção”.
          </Vazio>
        ) : (
          <ul className="space-y-2">
            {briefing.secoes.map((s, i) => {
              const info = infoLayout(s.layout)
              const aberta = expandida === s.id
              const temMidia = info.campos.midia || Boolean(info.itens?.campos.includes('imagem'))

              return (
                <li
                  key={s.id}
                  {...arrastar.alvo(i)}
                  className={`rounded-md border border-border bg-surface-2/50 ${arrastar.classe(i)}`}
                >
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Alca arrastar={arrastar} indice={i} total={briefing.secoes.length} rotulo={s.nome} />
                    <button
                      type="button"
                      onClick={() => setExpandida(aberta ? null : s.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-surface text-xs font-mono text-text-dim">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {s.nome || 'Seção sem nome'}
                        </span>
                        <span className="block truncate text-xs text-text-dim">
                          {info.rotulo}
                          {s.vincularMenu ? ' · no menu' : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Duplicar ${s.nome}`}
                      onClick={() => duplicar(s.id)}
                      className="shrink-0 rounded-md p-2 text-text-dim transition-colors hover:text-text"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${s.nome}`}
                      onClick={() =>
                        aoMudar({ secoes: briefing.secoes.filter((x) => x.id !== s.id) })
                      }
                      className="shrink-0 rounded-md p-2 text-text-dim transition-colors hover:text-pink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${aberta ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {aberta && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Texto
                          rotulo="Nome da seção"
                          dica="uso interno e menu"
                          placeholder="Ex.: Serviços"
                          value={s.nome}
                          onChange={(e) => mudarSecao(s.id, { nome: e.target.value })}
                          maxLength={80}
                        />
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm text-text-dim">Layout</span>
                          <button
                            type="button"
                            onClick={() => setTrocandoLayout(s.id)}
                            className="flex h-10 items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm transition-colors hover:border-blue/60"
                          >
                            <span className="truncate">{info.rotulo}</span>
                            <span className="shrink-0 text-xs text-blue">trocar</span>
                          </button>
                        </div>
                      </div>

                      <Texto
                        rotulo="Título"
                        dica="opcional — a IA escreve se ficar vazio"
                        placeholder="Ex.: O que fazemos por você"
                        value={s.titulo}
                        onChange={(e) => mudarSecao(s.id, { titulo: e.target.value })}
                        maxLength={300}
                      />

                      <Area
                        rotulo="Conteúdo"
                        dica="o que essa seção precisa comunicar"
                        placeholder="Escreva em tópicos ou em texto corrido o que você quer dizer aqui. A IA transforma isso em copy profissional."
                        value={s.conteudo}
                        onChange={(e) => mudarSecao(s.id, { conteudo: e.target.value })}
                        maxLength={3000}
                      />

                      <div className="flex flex-wrap items-center gap-6">
                        <Marcar
                          rotulo="Vincular ao menu do header"
                          valor={s.vincularMenu}
                          aoMudar={(v) => mudarSecao(s.id, { vincularMenu: v })}
                        />
                        {info.temColunas && (
                          <div className="w-40">
                            <Selecao
                              rotulo="Colunas"
                              value={s.colunas ?? 3}
                              onChange={(e) =>
                                mudarSecao(s.id, {
                                  colunas: Number(e.target.value) as 2 | 3 | 4,
                                })
                              }
                            >
                              <option value={2}>2 colunas</option>
                              <option value={3}>3 colunas</option>
                              <option value={4}>4 colunas</option>
                            </Selecao>
                          </div>
                        )}
                      </div>

                      {temMidia && (
                        <div className="rounded-md border border-border bg-surface p-4">
                          <p className="mb-3 text-sm font-medium">Imagem ou vídeo</p>
                          <div className="space-y-3">
                            <Texto
                              rotulo="Descreva o que deve aparecer"
                              dica="a IA busca a mídia"
                              placeholder="Ex.: pessoa usando notebook em escritório moderno"
                              value={s.midia?.busca ?? ''}
                              onChange={(e) =>
                                mudarSecao(s.id, {
                                  midia: {
                                    busca: e.target.value,
                                    tipo: s.midia?.tipo ?? 'imagem',
                                    orientacao: s.midia?.orientacao ?? 'paisagem',
                                  },
                                })
                              }
                              maxLength={200}
                            />
                            {s.midia && s.midia.busca !== '' && (
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Opcoes<TipoMidia>
                                  rotulo="Tipo"
                                  valor={s.midia.tipo}
                                  aoMudar={(v) =>
                                    mudarSecao(s.id, { midia: { ...s.midia!, tipo: v } })
                                  }
                                  opcoes={[
                                    { valor: 'imagem', rotulo: 'Imagem', icone: <ImageIcon className="h-3.5 w-3.5" /> },
                                    { valor: 'video', rotulo: 'Vídeo', icone: <Video className="h-3.5 w-3.5" /> },
                                  ]}
                                />
                                <Opcoes<Orientacao>
                                  rotulo="Formato"
                                  valor={s.midia.orientacao}
                                  aoMudar={(v) =>
                                    mudarSecao(s.id, { midia: { ...s.midia!, orientacao: v } })
                                  }
                                  opcoes={[
                                    { valor: 'paisagem', rotulo: 'Paisagem' },
                                    { valor: 'retrato', rotulo: 'Retrato' },
                                    { valor: 'quadrado', rotulo: 'Quadrado' },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Bloco>

      <SeletorLayout
        aberto={adicionando}
        aoEscolher={adicionar}
        aoFechar={() => setAdicionando(false)}
      />
      <SeletorLayout
        aberto={trocandoLayout !== null}
        atual={briefing.secoes.find((s) => s.id === trocandoLayout)?.layout}
        aoEscolher={(layout) => {
          if (!trocandoLayout) return
          const info = infoLayout(layout)
          mudarSecao(trocandoLayout, {
            layout,
            ...(info.temColunas ? { colunas: 3 as const } : { colunas: undefined }),
          })
        }}
        aoFechar={() => setTrocandoLayout(null)}
      />
    </div>
  )
}
