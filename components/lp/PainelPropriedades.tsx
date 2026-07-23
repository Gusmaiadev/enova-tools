'use client'

import { AlignCenter, AlignLeft, AlignRight, ChevronDown, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Alca } from './Alca'
import { Area, Cor, Faixa, Fonte, Marcar, Opcoes, Selecao, Texto, Vazio } from './campos'
import { Aviso } from '@/components/Campo'
import { useArrastar } from './arrastar'
import { SeletorLayout } from './SeletorLayout'
import { SeletorMidia } from './SeletorMidia'
import { infoLayout, novoItem } from '@/lib/lp/layouts'
import { NOMES_ICONES, svgIcone } from '@/lib/lp/icones'
import { reordenar } from './arrastar'
import type {
  AjusteTexto,
  ElementoTexto,
  LpDocumento,
  LpItem,
  LpMidia,
  LpSecao,
  TipoLayout,
} from '@/lib/lp/tipos'
import { gerarId, slugificar } from '@/lib/lp/util'

type Aplicar = (mut: (d: LpDocumento) => void, agrupar?: string) => void

function Grupo({
  titulo,
  aberto: inicial = false,
  children,
}: {
  titulo: string
  aberto?: boolean
  children: ReactNode
}) {
  const [aberto, setAberto] = useState(inicial)
  return (
    <div className="rounded-md border border-border bg-surface-2/40">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          {titulo}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>
      {aberto && <div className="space-y-3 border-t border-border px-3 py-3">{children}</div>}
    </div>
  )
}

function SeletorIcone({
  valor,
  aoMudar,
}: {
  valor: string | null | undefined
  aoMudar: (nome: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">Ícone</span>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm transition-colors hover:border-blue/60"
      >
        <span
          className="grid h-5 w-5 place-items-center text-blue [&_svg]:h-5 [&_svg]:w-5"
          dangerouslySetInnerHTML={{ __html: svgIcone(valor ?? 'check') }}
        />
        <span className="flex-1 truncate text-left">{valor ?? 'check'}</span>
        <ChevronDown className={`h-4 w-4 text-text-dim transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="grid max-h-44 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-border bg-surface-2 p-2">
          {NOMES_ICONES.map((nome) => (
            <button
              key={nome}
              type="button"
              title={nome}
              onClick={() => {
                aoMudar(nome)
                setAberto(false)
              }}
              className={`grid aspect-square place-items-center rounded transition-colors [&_svg]:h-4 [&_svg]:w-4 ${
                valor === nome ? 'bg-blue text-white' : 'text-text-dim hover:bg-surface hover:text-text'
              }`}
              dangerouslySetInnerHTML={{ __html: svgIcone(nome) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CampoMidia({
  rotulo,
  midia,
  aoMudar,
  aoRemover,
}: {
  rotulo: string
  midia: LpMidia | null | undefined
  aoMudar: (m: LpMidia) => void
  aoRemover?: () => void
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">{rotulo}</span>
      {midia ? (
        <div className="overflow-hidden rounded-md border border-border bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={midia.url} alt={midia.alt} className="aspect-video w-full object-cover" />
          <div className="flex items-center gap-1 p-2">
            <button
              type="button"
              onClick={() => setAberto(true)}
              className="flex-1 rounded bg-surface px-2 py-1.5 text-xs transition-colors hover:bg-blue hover:text-white"
            >
              Trocar
            </button>
            {aoRemover && (
              <button
                type="button"
                onClick={aoRemover}
                aria-label="Remover mídia"
                className="rounded p-1.5 text-text-dim transition-colors hover:text-pink"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-dim transition-colors hover:border-blue/60 hover:text-text"
        >
          <ImageIcon className="h-4 w-4" />
          Escolher mídia
        </button>
      )}
      <SeletorMidia
        aberto={aberto}
        midia={midia ?? null}
        aoEscolher={aoMudar}
        aoFechar={() => setAberto(false)}
      />
    </div>
  )
}

function EditorBotao({
  botao,
  aoMudar,
  aoRemover,
  aoCriar,
  agrupar,
}: {
  botao: LpSecao['botao']
  aoMudar: (patch: Partial<NonNullable<LpSecao['botao']>>, agrupar?: string) => void
  aoRemover: () => void
  aoCriar: () => void
  agrupar: string
}) {
  if (!botao) {
    return (
      <button
        type="button"
        onClick={aoCriar}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-text-dim transition-colors hover:border-blue/60 hover:text-text"
      >
        <Plus className="h-4 w-4" />
        Adicionar botão
      </button>
    )
  }
  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Botão</span>
        <button
          type="button"
          onClick={aoRemover}
          aria-label="Remover botão"
          className="rounded p-1 text-text-dim transition-colors hover:text-pink"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <Texto
        rotulo="Texto"
        value={botao.texto}
        onChange={(e) => aoMudar({ texto: e.target.value }, `${agrupar}-texto`)}
        maxLength={80}
      />
      <Texto
        rotulo="Link"
        dica="#secao ou https://"
        value={botao.url}
        onChange={(e) => aoMudar({ url: e.target.value }, `${agrupar}-url`)}
      />
      <Opcoes
        rotulo="Estilo"
        valor={botao.estilo ?? 'solido'}
        aoMudar={(v) => aoMudar({ estilo: v })}
        opcoes={[
          { valor: 'solido' as const, rotulo: 'Preenchido' },
          { valor: 'contorno' as const, rotulo: 'Contorno' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <Cor
          rotulo="Fundo"
          valor={botao.corFundo}
          aoMudar={(v) => aoMudar({ corFundo: v || undefined })}
        />
        <Cor
          rotulo="Texto"
          valor={botao.corTexto}
          aoMudar={(v) => aoMudar({ corTexto: v || undefined })}
        />
      </div>
    </div>
  )
}

function EditorAjuste({
  ajuste,
  aoMudar,
}: {
  ajuste: AjusteTexto
  aoMudar: (patch: AjusteTexto) => void
}) {
  return (
    <div className="space-y-3">
      <Cor rotulo="Cor" valor={ajuste.cor} aoMudar={(v) => aoMudar({ cor: v || undefined })} />
      <Fonte
        rotulo="Fonte"
        valor={ajuste.fonte}
        permitirVazio
        aoMudar={(v) => aoMudar({ fonte: v || undefined })}
      />
      <Texto
        rotulo="Tamanho"
        dica="ex.: 32px"
        placeholder="automático"
        value={ajuste.tamanho ?? ''}
        onChange={(e) => aoMudar({ tamanho: e.target.value || undefined })}
      />
      <Selecao
        rotulo="Peso"
        value={ajuste.peso ?? ''}
        onChange={(e) => aoMudar({ peso: Number(e.target.value) || undefined })}
      >
        <option value="">Automático</option>
        {[300, 400, 500, 600, 700, 800, 900].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Selecao>
      <Opcoes
        rotulo="Alinhamento"
        valor={ajuste.alinhamento ?? 'left'}
        aoMudar={(v) => aoMudar({ alinhamento: v })}
        opcoes={[
          { valor: 'left' as const, rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
          { valor: 'center' as const, rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
          { valor: 'right' as const, rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
        ]}
      />
    </div>
  )
}

function EditorItem({
  secao,
  item,
  campos,
  aplicar,
}: {
  secao: LpSecao
  item: LpItem
  campos: string[]
  aplicar: Aplicar
}) {
  const mudar = (patch: Partial<LpItem>, agrupar?: string) =>
    aplicar((d) => {
      const s = d.secoes.find((x) => x.id === secao.id)
      const i = s?.itens.find((x) => x.id === item.id)
      if (i) Object.assign(i, patch)
    }, agrupar)

  return (
    <div className="space-y-3">
      {campos.includes('icone') && (
        <SeletorIcone valor={item.icone} aoMudar={(nome) => mudar({ icone: nome })} />
      )}
      {campos.includes('imagem') && (
        <CampoMidia
          rotulo="Imagem"
          midia={item.imagem}
          aoMudar={(m) => mudar({ imagem: m })}
          aoRemover={() => mudar({ imagem: null })}
        />
      )}
      {campos.includes('titulo') && (
        <Texto
          rotulo="Título"
          value={item.titulo ?? ''}
          onChange={(e) => mudar({ titulo: e.target.value }, `item-${item.id}-titulo`)}
          maxLength={300}
        />
      )}
      {campos.includes('extra') && (
        <Texto
          rotulo={secao.tipo === 'estatisticas' ? 'Número' : secao.tipo === 'precos' ? 'Preço' : secao.tipo === 'timeline' ? 'Data' : 'Destaque'}
          value={item.extra ?? ''}
          onChange={(e) => mudar({ extra: e.target.value }, `item-${item.id}-extra`)}
          maxLength={300}
        />
      )}
      {campos.includes('detalhe') && (
        <Texto
          rotulo={secao.tipo === 'precos' ? 'Período' : 'Complemento'}
          value={item.detalhe ?? ''}
          onChange={(e) => mudar({ detalhe: e.target.value }, `item-${item.id}-detalhe`)}
          maxLength={300}
        />
      )}
      {campos.includes('texto') && (
        <Area
          rotulo="Texto"
          value={item.texto ?? ''}
          onChange={(e) => mudar({ texto: e.target.value }, `item-${item.id}-texto`)}
          maxLength={2000}
        />
      )}
      {campos.includes('lista') && (
        <Area
          rotulo={secao.tipo === 'comparacao' ? 'Células (uma por linha)' : 'Itens (um por linha)'}
          dica={secao.tipo === 'comparacao' ? 'use sim/não' : undefined}
          value={(item.lista ?? []).join('\n')}
          onChange={(e) =>
            mudar(
              { lista: e.target.value.split('\n').map((l) => l.trim()).filter((l) => l !== '') },
              `item-${item.id}-lista`,
            )
          }
        />
      )}
      {campos.includes('url') && (
        <Texto
          rotulo="Link"
          value={item.url ?? ''}
          onChange={(e) => mudar({ url: e.target.value }, `item-${item.id}-url`)}
        />
      )}
      {campos.includes('botao') && (
        <EditorBotao
          botao={item.botao ?? null}
          agrupar={`item-${item.id}-botao`}
          aoMudar={(patch, agrupar) =>
            mudar({ botao: { ...(item.botao ?? { texto: 'Saiba mais', url: '#' }), ...patch } }, agrupar)
          }
          aoRemover={() => mudar({ botao: null })}
          aoCriar={() => mudar({ botao: { texto: 'Saiba mais', url: '#' } })}
        />
      )}
      {campos.includes('destaque') && (
        <Marcar
          rotulo="Destacar este item"
          valor={item.destaque === true}
          aoMudar={(v) => mudar({ destaque: v })}
        />
      )}
    </div>
  )
}

export function PainelPropriedades({
  doc,
  secaoId,
  itemId,
  aplicar,
  aoSelecionarItem,
}: {
  doc: LpDocumento
  secaoId: string | null
  itemId: string | null
  aplicar: Aplicar
  aoSelecionarItem: (id: string | null) => void
}) {
  const [trocandoLayout, setTrocandoLayout] = useState(false)
  const [elemento, setElemento] = useState<ElementoTexto>('titulo')
  const secao = doc.secoes.find((s) => s.id === secaoId) ?? null

  const arrastarItens = useArrastar((de, para) =>
    aplicar((d) => {
      const s = d.secoes.find((x) => x.id === secaoId)
      if (s) s.itens = reordenar(s.itens, de, para)
    }),
  )

  if (!secao) {
    return (
      <Vazio>
        Clique em qualquer parte da página ao lado para editar. Dê dois cliques em um texto para
        escrever direto nele.
      </Vazio>
    )
  }

  const info = infoLayout(secao.tipo)

  const mudarSecao = (patch: Partial<LpSecao>, agrupar?: string) =>
    aplicar((d) => {
      const s = d.secoes.find((x) => x.id === secao.id)
      if (!s) return
      const nomeAntigo = s.nome
      Object.assign(s, patch)
      // Renomear a seção acompanha o rótulo do menu que ainda usava o nome antigo.
      if (patch.nome !== undefined && s.ancora) {
        for (const m of d.header.menu) {
          if (m.alvo === `#${s.ancora}` && m.rotulo === nomeAntigo) m.rotulo = s.nome
        }
      }
    }, agrupar)

  const mudarAjuste = (patch: AjusteTexto) =>
    aplicar((d) => {
      const s = d.secoes.find((x) => x.id === secao.id)
      if (!s) return
      s.ajustes = { ...s.ajustes, [elemento]: { ...s.ajustes?.[elemento], ...patch } }
    })

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue/40 bg-blue/10 px-3 py-2">
        <p className="text-xs text-blue">
          {secao.nome} · {info.rotulo}
        </p>
      </div>

      <Grupo titulo="Conteúdo" aberto>
        <Texto
          rotulo="Nome da seção"
          value={secao.nome}
          onChange={(e) => mudarSecao({ nome: e.target.value }, 'sec-nome')}
          maxLength={80}
        />
        {secao.titulo !== undefined && (
          <Area
            rotulo="Título"
            value={secao.titulo}
            onChange={(e) => mudarSecao({ titulo: e.target.value }, 'sec-titulo')}
            maxLength={300}
          />
        )}
        {info.campos.subtitulo && (
          <Area
            rotulo="Subtítulo"
            value={secao.subtitulo ?? ''}
            onChange={(e) => mudarSecao({ subtitulo: e.target.value }, 'sec-subtitulo')}
            maxLength={500}
          />
        )}
        {info.campos.texto && (
          <Area
            rotulo="Texto"
            value={secao.texto ?? ''}
            onChange={(e) => mudarSecao({ texto: e.target.value }, 'sec-texto')}
            maxLength={4000}
          />
        )}
        {info.campos.botao && (
          <EditorBotao
            botao={secao.botao ?? null}
            agrupar="sec-botao"
            aoMudar={(patch, agrupar) =>
              mudarSecao(
                { botao: { ...(secao.botao ?? { texto: 'Fale conosco', url: '#' }), ...patch } },
                agrupar,
              )
            }
            aoRemover={() => mudarSecao({ botao: null })}
            aoCriar={() => mudarSecao({ botao: { texto: 'Fale conosco', url: '#' } })}
          />
        )}
        {info.campos.midia && (
          <CampoMidia
            rotulo="Mídia"
            midia={secao.midia}
            aoMudar={(m) => mudarSecao({ midia: m })}
            aoRemover={() => mudarSecao({ midia: null })}
          />
        )}
        {secao.tipo === 'formulario' && (
          <>
            <Texto
              rotulo="Destino das mensagens"
              dica="URL do serviço que recebe o form"
              placeholder="https://formspree.io/f/seucodigo"
              value={secao.destinoForm ?? ''}
              onChange={(e) => mudarSecao({ destinoForm: e.target.value || undefined }, 'sec-destino')}
            />
            {!secao.destinoForm && (
              <Aviso>
                Sem um destino, o formulário só valida os campos — as mensagens não são enviadas para
                lugar nenhum. Cole aqui a URL de um serviço como Formspree ou Web3Forms.
              </Aviso>
            )}
          </>
        )}
      </Grupo>

      {info.itens && (
        <Grupo titulo={`${info.itens.rotulo}s (${secao.itens.length})`} aberto>
          <ul className="space-y-1.5">
            {secao.itens.map((item, i) => {
              const aberto = itemId === item.id
              return (
                <li
                  key={item.id}
                  {...arrastarItens.alvo(i)}
                  className={`rounded-md border bg-surface ${
                    aberto ? 'border-blue' : 'border-border'
                  } ${arrastarItens.classe(i)}`}
                >
                  <div className="flex items-center gap-1.5 px-2 py-2">
                    <Alca
                      arrastar={arrastarItens}
                      indice={i}
                      total={secao.itens.length}
                      rotulo={item.titulo || `${info.itens?.rotulo} ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => aoSelecionarItem(aberto ? null : item.id)}
                      className="min-w-0 flex-1 truncate text-left text-xs"
                    >
                      {item.titulo || item.extra || item.texto || `${info.itens?.rotulo} ${i + 1}`}
                    </button>
                    <button
                      type="button"
                      aria-label="Remover item"
                      onClick={() =>
                        aplicar((d) => {
                          const s = d.secoes.find((x) => x.id === secao.id)
                          if (s) s.itens = s.itens.filter((x) => x.id !== item.id)
                        })
                      }
                      className="shrink-0 rounded p-1 text-text-dim transition-colors hover:text-pink"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-text-dim transition-transform ${aberto ? 'rotate-180' : ''}`}
                    />
                  </div>
                  {aberto && (
                    <div className="border-t border-border px-3 py-3">
                      <EditorItem
                        secao={secao}
                        item={item}
                        campos={info.itens?.campos ?? []}
                        aplicar={aplicar}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={() =>
              aplicar((d) => {
                const s = d.secoes.find((x) => x.id === secao.id)
                if (s) s.itens.push({ ...novoItem(s.tipo), id: gerarId() })
              })
            }
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-text-dim transition-colors hover:border-blue/60 hover:text-text"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar {info.itens.rotulo.toLowerCase()}
          </button>

          {secao.tipo === 'comparacao' && (
            <Area
              rotulo="Linhas da tabela (uma por linha)"
              value={(secao.rotulos ?? []).join('\n')}
              onChange={(e) =>
                mudarSecao(
                  {
                    rotulos: e.target.value
                      .split('\n')
                      .map((l) => l.trim())
                      .filter((l) => l !== ''),
                  },
                  'sec-rotulos',
                )
              }
            />
          )}
        </Grupo>
      )}

      <Grupo titulo="Layout">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">Tipo de layout</span>
          <button
            type="button"
            onClick={() => setTrocandoLayout(true)}
            className="flex h-10 items-center justify-between gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm transition-colors hover:border-blue/60"
          >
            <span className="truncate">{info.rotulo}</span>
            <span className="shrink-0 text-xs text-blue">trocar</span>
          </button>
        </div>
        {info.temColunas && (
          <Selecao
            rotulo="Colunas"
            value={secao.colunas ?? 3}
            onChange={(e) => mudarSecao({ colunas: Number(e.target.value) as 2 | 3 | 4 })}
          >
            <option value={2}>2 colunas</option>
            <option value={3}>3 colunas</option>
            <option value={4}>4 colunas</option>
          </Selecao>
        )}
        {secao.tipo === 'texto-midia' && (
          <Marcar
            rotulo="Inverter (mídia à esquerda)"
            valor={secao.inverter === true}
            aoMudar={(v) => mudarSecao({ inverter: v })}
          />
        )}
        <Opcoes
          rotulo="Largura"
          valor={secao.largura}
          aoMudar={(v) => mudarSecao({ largura: v })}
          opcoes={[
            { valor: 'boxed' as const, rotulo: 'Centralizada' },
            { valor: 'full' as const, rotulo: 'Largura total' },
          ]}
        />
        <Marcar
          rotulo="Aparecer no menu do header"
          valor={secao.ancora !== null}
          aoMudar={(v) =>
            aplicar((d) => {
              const s = d.secoes.find((x) => x.id === secao.id)
              if (!s) return
              if (v) {
                s.ancora = slugificar(s.nome)
                if (!d.header.menu.some((m) => m.alvo === `#${s.ancora}`)) {
                  d.header.menu.push({ id: gerarId(), rotulo: s.nome, alvo: `#${s.ancora}` })
                }
              } else {
                d.header.menu = d.header.menu.filter((m) => m.alvo !== `#${s.ancora}`)
                s.ancora = null
              }
            })
          }
        />
      </Grupo>

      <Grupo titulo="Estilo do texto">
        <Opcoes
          valor={elemento}
          aoMudar={setElemento}
          opcoes={[
            { valor: 'titulo' as const, rotulo: 'Título' },
            { valor: 'subtitulo' as const, rotulo: 'Subtítulo' },
            { valor: 'texto' as const, rotulo: 'Texto' },
          ]}
        />
        <EditorAjuste ajuste={secao.ajustes?.[elemento] ?? {}} aoMudar={mudarAjuste} />
        {secao.ajustes?.[elemento] && (
          <button
            type="button"
            onClick={() =>
              aplicar((d) => {
                const s = d.secoes.find((x) => x.id === secao.id)
                if (s?.ajustes) delete s.ajustes[elemento]
              })
            }
            className="text-xs text-text-dim underline-offset-2 transition-colors hover:text-text hover:underline"
          >
            Voltar ao estilo padrão da página
          </button>
        )}
      </Grupo>

      <Grupo titulo="Espaçamento e fundo">
        <Faixa
          rotulo="Espaço no topo"
          min={0}
          max={240}
          passo={4}
          valor={secao.espacamento?.topo ?? 88}
          aoMudar={(v) =>
            mudarSecao(
              { espacamento: { topo: v, base: secao.espacamento?.base ?? 88 } },
              'sec-pt',
            )
          }
        />
        <Faixa
          rotulo="Espaço embaixo"
          min={0}
          max={240}
          passo={4}
          valor={secao.espacamento?.base ?? 88}
          aoMudar={(v) =>
            mudarSecao(
              { espacamento: { topo: secao.espacamento?.topo ?? 88, base: v } },
              'sec-pb',
            )
          }
        />
        <Cor
          rotulo="Cor de fundo"
          valor={secao.fundo?.cor}
          padrao={doc.tema.cores.fundoPagina}
          aoMudar={(v) => mudarSecao({ fundo: { ...secao.fundo, cor: v || undefined } })}
        />
        <CampoMidia
          rotulo="Imagem ou vídeo de fundo"
          midia={secao.fundo?.midia}
          aoMudar={(m) => mudarSecao({ fundo: { ...secao.fundo, midia: m } })}
          aoRemover={() => mudarSecao({ fundo: { ...secao.fundo, midia: null } })}
        />
        {secao.fundo?.midia && (
          <Faixa
            rotulo="Escurecer o fundo"
            min={0}
            max={90}
            sufixo="%"
            valor={secao.fundo.escurecer ?? 55}
            aoMudar={(v) => mudarSecao({ fundo: { ...secao.fundo, escurecer: v } }, 'sec-veu')}
          />
        )}
      </Grupo>

      <SeletorLayout
        aberto={trocandoLayout}
        atual={secao.tipo}
        aoEscolher={(tipo: TipoLayout) =>
          aplicar((d) => {
            const s = d.secoes.find((x) => x.id === secao.id)
            if (!s) return
            const novoInfo = infoLayout(tipo)
            s.tipo = tipo
            if (novoInfo.itens && s.itens.length === 0) {
              s.itens = [novoItem(tipo), novoItem(tipo), novoItem(tipo)]
            }
            if (!novoInfo.itens) s.itens = []
            if (novoInfo.temColunas && !s.colunas) s.colunas = 3
            if (tipo === 'comparacao' && !s.rotulos) s.rotulos = ['Característica um', 'Característica dois']
          })
        }
        aoFechar={() => setTrocandoLayout(false)}
      />
    </div>
  )
}
