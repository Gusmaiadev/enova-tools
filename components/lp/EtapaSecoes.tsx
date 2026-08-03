'use client'

import { ChevronDown, Copy, ImageIcon, Images, Plus, Search, Trash2, Upload, Video } from 'lucide-react'
import { useState } from 'react'
import { Alca } from './Alca'
import { CampoMidia } from './CampoMidia'
import { CamposBotao } from './CamposBotao'
import { ItensSecao } from './ItensSecao'
import { Area, Bloco, Marcar, Opcoes, Selecao, Texto, Vazio } from './campos'
import { reordenar, useArrastar } from './arrastar'
import { apagarArquivo, EnviarMidia } from './EnviarMidia'
import { OpcoesVideo } from './OpcoesVideo'
import { SeletorLado } from './SeletorLado'
import { SeletorLayout } from './SeletorLayout'
import { mesclarMidiaBriefing } from '@/lib/lp/documento'
import { infoLayout, temLados } from '@/lib/lp/layouts'
import type {
  LpBriefing,
  LpMidia,
  MidiaBriefing,
  Orientacao,
  SecaoBriefing,
  TipoLayout,
  TipoMidia,
} from '@/lib/lp/tipos'
import { gerarId } from '@/lib/lp/util'

/** De onde vem a mídia da seção: a IA busca, eu escolho no banco ou eu envio. */
type ModoMidia = 'buscar' | 'biblioteca' | 'enviar'

/**
 * Em que modo a caixa reabre depois de salvar e recarregar o briefing: mídia de
 * banco não tem caminho no bucket; arquivo enviado por nós sempre tem.
 */
const modoDaMidia = (m: MidiaBriefing | null | undefined): ModoMidia =>
  !m?.arquivo ? 'buscar' : m.arquivo.caminho ? 'enviar' : 'biblioteca'

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
  lpId,
  briefing,
  aoMudar,
}: {
  lpId: string
  briefing: LpBriefing
  aoMudar: (patch: Partial<LpBriefing>) => void
}) {
  const [expandida, setExpandida] = useState<string | null>(briefing.secoes[0]?.id ?? null)
  const [trocandoLayout, setTrocandoLayout] = useState<string | null>(null)
  const [adicionando, setAdicionando] = useState(false)
  // Modo escolhido à mão em cada seção: sem isso quem clicou em "Biblioteca" ou
  // "Enviar arquivo" e ainda não escolheu nada voltaria para a busca da IA a cada
  // tecla digitada.
  const [modoMidia, setModoMidia] = useState<Record<string, ModoMidia>>({})

  const arrastar = useArrastar((de, para) =>
    aoMudar({ secoes: reordenar(briefing.secoes, de, para) }),
  )

  const mudarSecao = (id: string, patch: Partial<SecaoBriefing>) =>
    aoMudar({ secoes: briefing.secoes.map((s) => (s.id === id ? { ...s, ...patch } : s)) })

  /** Patch na mídia da seção, preservando o que já existe (inclusive o arquivo). */
  const mudarMidia = (s: SecaoBriefing, patch: Partial<MidiaBriefing>) =>
    mudarSecao(s.id, { midia: mesclarMidiaBriefing(s.midia, patch) })

  /**
   * Seção duplicada copia o arquivo junto: as duas apontam para o mesmo objeto
   * no bucket. Só quem é a última referência pode apagar de verdade.
   */
  const usoUnico = (caminho: string | undefined) =>
    !caminho ||
    briefing.secoes.filter((x) => x.midia?.arquivo?.caminho === caminho).length <= 1

  const modoDaSecao = (s: SecaoBriefing): ModoMidia => modoMidia[s.id] ?? modoDaMidia(s.midia)

  /**
   * Trocar de modo descarta a mídia do modo anterior — e tira o arquivo do
   * bucket, quando era um envio e nenhuma outra seção aponta para ele.
   */
  const trocarModoMidia = (s: SecaoBriefing, modo: ModoMidia) => {
    if (modoDaSecao(s) === modo) return
    setModoMidia((m) => ({ ...m, [s.id]: modo }))
    if (!s.midia?.arquivo) return
    const caminho = s.midia.arquivo.caminho
    const sozinho = usoUnico(caminho)
    mudarMidia(s, { arquivo: null })
    if (caminho && sozinho) void apagarArquivo(caminho)
  }

  /**
   * Mídia escolhida no banco: entra no mesmo lugar do arquivo enviado, porque
   * vale a mesma regra — o que o usuário escolheu vence a busca da IA.
   */
  const usarDaBiblioteca = (s: SecaoBriefing, m: LpMidia) =>
    mudarMidia(s, {
      arquivo: m,
      tipo: m.tipo,
      orientacao: m.orientacao,
      busca: m.busca || s.midia?.busca || '',
    })

  const remover = (s: SecaoBriefing) => {
    const caminho = s.midia?.arquivo?.caminho
    const sozinho = usoUnico(caminho)
    aoMudar({ secoes: briefing.secoes.filter((x) => x.id !== s.id) })
    // O arquivo da seção removida não serve mais a ninguém: sai do bucket.
    if (caminho && sozinho) void apagarArquivo(caminho)
  }

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
              const modo = modoDaSecao(s)

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
                      onClick={() => remover(s)}
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

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Texto
                          rotulo="Título"
                          dica="opcional — a IA escreve se ficar vazio"
                          placeholder="Ex.: O que fazemos por você"
                          value={s.titulo}
                          onChange={(e) => mudarSecao(s.id, { titulo: e.target.value })}
                          maxLength={300}
                        />
                        <Texto
                          rotulo="Subtítulo"
                          dica="linha de apoio, também opcional"
                          placeholder="Ex.: Soluções sob medida para a sua obra"
                          value={s.subtitulo ?? ''}
                          onChange={(e) => mudarSecao(s.id, { subtitulo: e.target.value })}
                          maxLength={500}
                        />
                      </div>

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
                          // Desmarcar solta o item do menu que estava reservado.
                          aoMudar={(v) =>
                            mudarSecao(s.id, { vincularMenu: v, itemMenu: v ? s.itemMenu : null })
                          }
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
                        {temLados(s.layout) && (
                          <div className="w-56">
                            <SeletorLado
                              tipo={s.layout}
                              inverter={s.inverter === true}
                              aoMudar={(v) => mudarSecao(s.id, { inverter: v })}
                            />
                          </div>
                        )}
                      </div>

                      {s.vincularMenu &&
                        (briefing.menu.length === 0 ? (
                          <p className="text-xs text-text-dim">
                            Seu menu ainda não tem itens. Cadastre em “Header e Footer” (etapa 2)
                            para escolher qual deles leva a esta seção — enquanto isso, o item é
                            criado com o nome da seção.
                          </p>
                        ) : (
                          <div className="sm:max-w-sm">
                            <Selecao
                              rotulo="Item do menu que leva a esta seção"
                              dica="clicar nele rola até aqui"
                              value={s.itemMenu ?? ''}
                              onChange={(e) =>
                                mudarSecao(s.id, { itemMenu: e.target.value || null })
                              }
                            >
                              <option value="">
                                Criar um item novo com o nome da seção
                              </option>
                              {briefing.menu.map((m) => {
                                const dona = briefing.secoes.find(
                                  (x) => x.id !== s.id && x.vincularMenu && x.itemMenu === m.id,
                                )
                                const externo = m.url.trim() !== ''
                                return (
                                  <option key={m.id} value={m.id} disabled={externo || Boolean(dona)}>
                                    {m.rotulo}
                                    {externo
                                      ? ' — vai para um link externo'
                                      : dona
                                        ? ` — já leva a “${dona.nome || 'outra seção'}”`
                                        : ''}
                                  </option>
                                )
                              })}
                            </Selecao>
                          </div>
                        ))}

                      {info.itens && (
                        <ItensSecao
                          tipo={s.layout}
                          rotulo={info.itens.rotulo}
                          campos={info.itens.campos}
                          itens={s.itens ?? []}
                          aoMudar={(itens) => mudarSecao(s.id, { itens })}
                        />
                      )}

                      <div className="rounded-md border border-border bg-surface p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium">Botão</p>
                          {s.botao && (
                            <button
                              type="button"
                              onClick={() => mudarSecao(s.id, { botao: null })}
                              className="flex items-center gap-1.5 text-xs text-text-dim transition-colors hover:text-pink"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          )}
                        </div>
                        {s.botao ? (
                          <div className="space-y-3">
                            <CamposBotao
                              botao={s.botao}
                              aoMudar={(patch) =>
                                mudarSecao(s.id, { botao: { ...s.botao!, ...patch } })
                              }
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              mudarSecao(s.id, {
                                botao: { texto: 'Fale conosco', url: '#contato' },
                              })
                            }
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-dim transition-colors hover:border-blue/60 hover:text-text"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar botão nesta seção
                          </button>
                        )}
                      </div>

                      {temMidia && (
                        <div className="rounded-md border border-border bg-surface p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-medium">Imagem ou vídeo</p>
                            <div className="w-full sm:w-auto">
                              <Opcoes<ModoMidia>
                                valor={modo}
                                aoMudar={(v) => trocarModoMidia(s, v)}
                                opcoes={[
                                  {
                                    valor: 'buscar',
                                    rotulo: 'A IA busca',
                                    icone: <Search className="h-3.5 w-3.5" />,
                                  },
                                  {
                                    valor: 'biblioteca',
                                    rotulo: 'Biblioteca',
                                    aria: 'Escolher na biblioteca (Pexels e Pixabay)',
                                    icone: <Images className="h-3.5 w-3.5" />,
                                  },
                                  {
                                    valor: 'enviar',
                                    rotulo: 'Enviar arquivo',
                                    icone: <Upload className="h-3.5 w-3.5" />,
                                  },
                                ]}
                              />
                            </div>
                          </div>

                          {modo === 'enviar' ? (
                            <div className="space-y-3">
                              <EnviarMidia
                                lpId={lpId}
                                arquivo={s.midia?.arquivo ?? null}
                                apagarNoServidor={usoUnico(s.midia?.arquivo?.caminho)}
                                aoEnviar={(m) =>
                                  mudarMidia(s, {
                                    arquivo: m,
                                    tipo: m.tipo,
                                    orientacao: m.orientacao,
                                  })
                                }
                                aoRemover={() => mudarMidia(s, { arquivo: null })}
                              />
                              {s.midia?.arquivo && (
                                <Texto
                                  rotulo="Descrição da imagem"
                                  dica="texto alternativo — ajuda no Google e em leitores de tela"
                                  placeholder="Ex.: fachada da loja em dia de sol"
                                  value={s.midia.busca}
                                  onChange={(e) => mudarMidia(s, { busca: e.target.value })}
                                  maxLength={200}
                                />
                              )}
                            </div>
                          ) : modo === 'biblioteca' ? (
                            <div className="space-y-3">
                              <p className="text-xs text-text-dim">
                                Você mesmo escolhe a foto ou o vídeo no acervo do Pexels e do
                                Pixabay. O que escolher aqui vai para a página exatamente assim — a
                                IA não troca a mídia desta seção.
                              </p>
                              <CampoMidia
                                lpId={lpId}
                                midia={s.midia?.arquivo ?? null}
                                comOpcoesVideo={false}
                                rotuloVazio="Abrir a biblioteca (Pexels e Pixabay)"
                                filtros={{
                                  busca: s.midia?.busca ?? '',
                                  tipo: s.midia?.tipo ?? 'imagem',
                                  orientacao: s.midia?.orientacao ?? 'paisagem',
                                }}
                                aoMudar={(m) => usarDaBiblioteca(s, m)}
                                aoRemover={() => mudarMidia(s, { arquivo: null })}
                              />
                              {s.midia?.arquivo ? (
                                <Texto
                                  rotulo="Descrição da imagem"
                                  dica="texto alternativo — ajuda no Google e em leitores de tela"
                                  placeholder="Ex.: fachada da loja em dia de sol"
                                  value={s.midia.busca}
                                  onChange={(e) => mudarMidia(s, { busca: e.target.value })}
                                  maxLength={200}
                                />
                              ) : (
                                <>
                                  <Texto
                                    rotulo="O que você procura"
                                    dica="a biblioteca já abre com essa busca"
                                    placeholder="Ex.: pessoa usando notebook em escritório moderno"
                                    value={s.midia?.busca ?? ''}
                                    onChange={(e) => mudarMidia(s, { busca: e.target.value })}
                                    maxLength={200}
                                  />
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <Opcoes<TipoMidia>
                                      rotulo="Tipo"
                                      valor={s.midia?.tipo ?? 'imagem'}
                                      aoMudar={(v) => mudarMidia(s, { tipo: v })}
                                      opcoes={[
                                        { valor: 'imagem', rotulo: 'Imagem', icone: <ImageIcon className="h-3.5 w-3.5" /> },
                                        { valor: 'video', rotulo: 'Vídeo', icone: <Video className="h-3.5 w-3.5" /> },
                                      ]}
                                    />
                                    <Opcoes<Orientacao>
                                      rotulo="Formato"
                                      valor={s.midia?.orientacao ?? 'paisagem'}
                                      aoMudar={(v) => mudarMidia(s, { orientacao: v })}
                                      opcoes={[
                                        { valor: 'paisagem', rotulo: 'Paisagem' },
                                        { valor: 'retrato', rotulo: 'Retrato' },
                                        { valor: 'quadrado', rotulo: 'Quadrado' },
                                      ]}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <Texto
                                rotulo="Descreva o que deve aparecer"
                                dica="a IA busca a mídia"
                                placeholder="Ex.: pessoa usando notebook em escritório moderno"
                                value={s.midia?.busca ?? ''}
                                onChange={(e) => mudarMidia(s, { busca: e.target.value })}
                                maxLength={200}
                              />
                              {s.midia && s.midia.busca !== '' && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Opcoes<TipoMidia>
                                    rotulo="Tipo"
                                    valor={s.midia.tipo}
                                    aoMudar={(v) => mudarMidia(s, { tipo: v })}
                                    opcoes={[
                                      { valor: 'imagem', rotulo: 'Imagem', icone: <ImageIcon className="h-3.5 w-3.5" /> },
                                      { valor: 'video', rotulo: 'Vídeo', icone: <Video className="h-3.5 w-3.5" /> },
                                    ]}
                                  />
                                  <Opcoes<Orientacao>
                                    rotulo="Formato"
                                    valor={s.midia.orientacao}
                                    aoMudar={(v) => mudarMidia(s, { orientacao: v })}
                                    opcoes={[
                                      { valor: 'paisagem', rotulo: 'Paisagem' },
                                      { valor: 'retrato', rotulo: 'Retrato' },
                                      { valor: 'quadrado', rotulo: 'Quadrado' },
                                    ]}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {s.midia?.tipo === 'video' && (
                            <div className="mt-3">
                              <OpcoesVideo
                                valor={s.midia}
                                deFundo={s.layout === 'banner'}
                                aoMudar={(patch) => mudarMidia(s, patch)}
                              />
                              {s.layout === 'hero' && (
                                <p className="mt-2 text-xs text-text-dim">
                                  Se a IA usar o vídeo como fundo do hero, ele entra sem som e sem
                                  controles — o resto vale igual.
                                </p>
                              )}
                            </div>
                          )}

                          {info.itens?.campos.includes('imagem') && (
                            <p className="mt-3 text-xs text-text-dim">
                              Neste layout cada item tem a própria imagem: a mídia definida aqui
                              entra como a primeira. As outras você ajusta no editor, depois de
                              gerar a página.
                            </p>
                          )}
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
            // Layout sem lados (galeria, FAQ…) não carrega a escolha antiga.
            ...(temLados(layout) ? {} : { inverter: undefined }),
          })
        }}
        aoFechar={() => setTrocandoLayout(null)}
      />
    </div>
  )
}
