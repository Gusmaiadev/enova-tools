'use client'

import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { CampoMidia } from './CampoMidia'
import { CamposBarra } from './CamposBarra'
import { Cor, Faixa, Marcar, Opcoes, Selecao, Texto, Vazio } from './campos'
import { ListaBotoes } from './ListaBotoes'
import { ListaTelefones } from './ListaTelefones'
import { Aviso } from '@/components/Campo'
import { SeletorIcone } from './SeletorIcone'
import { garantirAncora } from '@/lib/lp/documento'
import { infoLayout } from '@/lib/lp/layouts'
import { BREAKPOINT, DISPOSITIVOS, NOME_DISPOSITIVO } from '@/lib/lp/padroes'
import type {
  Alinhamento,
  Dispositivo,
  LpDocumento,
  LpSecao,
  MenuMobile,
} from '@/lib/lp/tipos'
import { gerarId } from '@/lib/lp/util'

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

/** Faixa azul com o nome do que está selecionado no canvas. */
function Selecionado({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-blue/40 bg-blue/10 px-3 py-2">
      <p className="text-xs text-blue">{children}</p>
    </div>
  )
}

/**
 * O menu do celular: quando o menu vira hambúrguer, com que ícone, e como fica a
 * gaveta que ele abre. Só aparece quando o header tem menu ou botões — sem nada
 * para abrir, o hambúrguer não é emitido.
 */
function MenuHamburguer({
  menu,
  aoMudar,
}: {
  menu: MenuMobile | undefined
  aoMudar: (patch: Partial<MenuMobile>, agrupar?: string) => void
}) {
  return (
    <>
      <Selecao
        rotulo="Vira hambúrguer a partir de"
        dica="e abaixo disso"
        value={menu?.apartirDe ?? 'tablet'}
        onChange={(e) => aoMudar({ apartirDe: e.target.value as Dispositivo })}
      >
        {DISPOSITIVOS.filter((d) => BREAKPOINT[d] !== null).map((d) => (
          <option key={d} value={d}>
            {NOME_DISPOSITIVO[d]} (≤{BREAKPOINT[d]}px)
          </option>
        ))}
      </Selecao>
      <SeletorIcone valor={menu?.icone ?? 'menu'} aoMudar={(icone) => aoMudar({ icone })} />
      <div className="grid grid-cols-2 gap-2">
        <Cor
          rotulo="Cor do ícone"
          valor={menu?.cor}
          placeholder="do header"
          aoMudar={(v) => aoMudar({ cor: v || undefined })}
        />
        <Cor
          rotulo="Fundo da gaveta"
          valor={menu?.fundo}
          placeholder="do header"
          aoMudar={(v) => aoMudar({ fundo: v || undefined })}
        />
      </div>
      <Opcoes<Alinhamento>
        rotulo="Itens na gaveta"
        valor={menu?.alinhamento ?? 'esquerda'}
        aoMudar={(v) => aoMudar({ alinhamento: v })}
        opcoes={[
          { valor: 'esquerda', rotulo: 'À esquerda' },
          { valor: 'centro', rotulo: 'Centro' },
          { valor: 'direita', rotulo: 'À direita' },
        ]}
      />
    </>
  )
}

/**
 * Propriedades que NÃO são da árvore: nome e âncora da seção, largura, fundo,
 * espaçamento — e o header e o rodapé inteiros, que não são seção. O conteúdo
 * (títulos, textos, botões, mídia, itens) mora na árvore e se edita pelo
 * PainelWidget, elemento a elemento.
 */
export function PainelPropriedades({
  doc,
  lpId,
  secaoId,
  alvo,
  aplicar,
}: {
  doc: LpDocumento
  lpId: string
  secaoId: string | null
  /** data-lp selecionado no canvas — o rodapé não é seção e vem só por aqui. */
  alvo: string | null
  aplicar: Aplicar
}) {
  const secao = doc.secoes.find((s) => s.id === secaoId) ?? null

  if (!secao) {
    // Header selecionado: o texto da logo se edita no canvas, os botões aqui.
    if (alvo?.startsWith('header')) {
      return (
        <div className="space-y-3">
          <Selecionado>Cabeçalho</Selecionado>
          <Grupo titulo="Aparência" aberto>
            <CamposBarra
              estilo={doc.header.estilo}
              logoImagem={Boolean(doc.header.logo)}
              aoMudar={(patch, chave) =>
                aplicar((d) => {
                  d.header.estilo = { ...d.header.estilo, ...patch }
                }, chave ?? 'header-estilo')
              }
            />
          </Grupo>
          <Grupo titulo="Botões">
            <ListaBotoes
              botoes={doc.header.botoes}
              agrupar="header-botao"
              vazio="Nenhum botão no topo da página."
              aoMudar={(botoes, chave) =>
                aplicar((d) => {
                  d.header.botoes = botoes
                }, chave ?? 'header-botoes')
              }
            />
          </Grupo>
          <Grupo titulo="Menu hambúrguer">
            <MenuHamburguer
              menu={doc.header.menuMobile}
              aoMudar={(patch, chave) =>
                aplicar((d) => {
                  d.header.menuMobile = { ...d.header.menuMobile, ...patch }
                }, chave ?? 'header-menu')
              }
            />
          </Grupo>
        </div>
      )
    }
    // Rodapé selecionado: os textos dele se editam no canvas, mas as listas de
    // telefones e de botões precisam de painel.
    if (alvo?.startsWith('footer')) {
      return (
        <div className="space-y-3">
          <Selecionado>Rodapé</Selecionado>
          <Grupo titulo="Aparência" aberto>
            <CamposBarra
              estilo={doc.footer.estilo}
              // No rodapé a marca é sempre o nome escrito, nunca a imagem.
              logoImagem={false}
              aoMudar={(patch, chave) =>
                aplicar((d) => {
                  d.footer.estilo = { ...d.footer.estilo, ...patch }
                }, chave ?? 'footer-estilo')
              }
            />
          </Grupo>
          <Grupo titulo="Telefones">
            <ListaTelefones
              telefones={doc.footer.telefones ?? []}
              aoMudar={(telefones) =>
                aplicar((d) => {
                  d.footer.telefones = telefones
                }, 'footer-telefones')
              }
            />
          </Grupo>
          <Grupo titulo="Botões">
            <ListaBotoes
              botoes={doc.footer.botoes ?? []}
              agrupar="footer-botao"
              vazio="Nenhum botão no rodapé."
              aoMudar={(botoes, chave) =>
                aplicar((d) => {
                  d.footer.botoes = botoes
                }, chave ?? 'footer-botoes')
              }
            />
          </Grupo>
        </div>
      )
    }
    return (
      <Vazio>
        Clique em qualquer parte da página ao lado para editar. Dê dois cliques em um texto para
        escrever direto nele.
      </Vazio>
    )
  }

  const info = infoLayout(secao.tipo)
  // Mesma regra do compilador: no banner a mídia da seção é o fundo atrás do texto.
  const midiaDeFundo = secao.tipo === 'banner' ? (secao.midia ?? secao.fundo?.midia) : secao.fundo?.midia

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

  /** Item do menu que hoje leva a esta seção (o vínculo, no documento, é a âncora). */
  const itemDoMenu = secao.ancora
    ? doc.header.menu.find((m) => m.alvo === `#${secao.ancora}`)
    : undefined

  /**
   * Move o vínculo para o item escolhido: ele passa a apontar para a âncora
   * desta seção e os que apontavam para cá saem — um item por seção, senão o
   * menu fica com duas opções levando ao mesmo lugar. `''` cria um item novo
   * com o nome da seção (o comportamento de antes).
   */
  const ligarItemDoMenu = (itemId: string) =>
    aplicar((d) => {
      const s = d.secoes.find((x) => x.id === secao.id)
      if (!s) return
      const ancora = garantirAncora(d, s)
      d.header.menu = d.header.menu.filter((m) => m.alvo !== `#${ancora}` || m.id === itemId)
      const item = d.header.menu.find((m) => m.id === itemId)
      if (item) item.alvo = `#${ancora}`
      else d.header.menu.push({ id: gerarId(), rotulo: s.nome, alvo: `#${ancora}` })
    })

  return (
    <div className="space-y-3">
      <Selecionado>
        {secao.nome} · {info.rotulo}
      </Selecionado>

      <Grupo titulo="Seção" aberto>
        <Texto
          rotulo="Nome da seção"
          value={secao.nome}
          onChange={(e) => mudarSecao({ nome: e.target.value }, 'sec-nome')}
          maxLength={80}
        />
        <p className="text-xs text-text-dim">
          O conteúdo — títulos, textos, botões, mídia e itens — se edita clicando em cada
          elemento na página ou na árvore da aba Estrutura.
        </p>
      </Grupo>

      <Grupo titulo="Layout">
        {/* Colunas, lados e troca de layout saíram: a estrutura da seção agora é
            a árvore. Colunas e direção estão no painel do container; trocar o
            layout significaria expandir um preset novo por cima e descartar o
            que o usuário montou — se voltar, tem de ser com confirmação. */}
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
                const ancora = garantirAncora(d, s)
                if (!d.header.menu.some((m) => m.alvo === `#${ancora}`)) {
                  d.header.menu.push({ id: gerarId(), rotulo: s.nome, alvo: `#${ancora}` })
                }
              } else {
                d.header.menu = d.header.menu.filter((m) => m.alvo !== `#${s.ancora}`)
                s.ancora = null
              }
            })
          }
        />
        {secao.ancora !== null && (
          <Selecao
            rotulo="Item do menu que leva a esta seção"
            dica="clicar nele rola até aqui"
            value={itemDoMenu?.id ?? ''}
            onChange={(e) => ligarItemDoMenu(e.target.value)}
          >
            <option value="">Criar um item com o nome da seção</option>
            {doc.header.menu.map((m) => {
              const externo = !m.alvo.startsWith('#')
              const outra = doc.secoes.find(
                (x) => x.id !== secao.id && x.ancora !== null && m.alvo === `#${x.ancora}`,
              )
              return (
                <option key={m.id} value={m.id} disabled={externo || Boolean(outra)}>
                  {m.rotulo}
                  {externo
                    ? ' — vai para um link externo'
                    : outra
                      ? ` — já leva a “${outra.nome}”`
                      : ''}
                </option>
              )
            })}
          </Selecao>
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
          lpId={lpId}
          midia={secao.fundo?.midia}
          deFundo
          aoMudar={(m) => mudarSecao({ fundo: { ...secao.fundo, midia: m } })}
          aoRemover={() => mudarSecao({ fundo: { ...secao.fundo, midia: null } })}
        />
        {midiaDeFundo && (
          <>
            <Faixa
              rotulo="Escurecer o fundo"
              min={0}
              max={90}
              sufixo="%"
              valor={secao.fundo?.escurecer ?? 55}
              aoMudar={(v) => mudarSecao({ fundo: { ...secao.fundo, escurecer: v } }, 'sec-veu')}
            />
            <Marcar
              rotulo="Texto em branco sobre a mídia"
              valor={secao.fundo?.textoClaro !== false}
              aoMudar={(v) =>
                mudarSecao({ fundo: { ...secao.fundo, textoClaro: v ? undefined : false } })
              }
            />
            {secao.fundo?.textoClaro === false && (
              <Aviso>
                Esta seção usa as cores do tema por cima da mídia. Confira o contraste — se ficar
                difícil de ler, aumente o escurecimento ou volte para o texto branco.
              </Aviso>
            )}
          </>
        )}
      </Grupo>
    </div>
  )
}
