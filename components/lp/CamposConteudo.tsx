'use client'

import { CampoMidia } from './CampoMidia'
import { CamposBotao } from './CamposBotao'
import { PorDispositivo, definir } from './PorDispositivo'
import { SeletorIcone } from './SeletorIcone'
import type { MutarNo } from './CamposEstilo'
import { Area, Faixa, Opcoes, Selecao, Texto, Vazio } from './campos'
import { GAP_PADRAO } from '@/lib/lp/padroes'
import type { Aparencia, Dispositivo, LpElemento } from '@/lib/lp/tipos'

type Props = {
  no: LpElemento
  lpId: string
  mutarNo: MutarNo
  dispositivo: Dispositivo
}

const APARENCIAS: { valor: Aparencia | ''; rotulo: string }[] = [
  { valor: '', rotulo: 'Nenhuma' },
  { valor: 'card', rotulo: 'Card' },
  { valor: 'plano', rotulo: 'Plano' },
  { valor: 'plano-destaque', rotulo: 'Plano em destaque' },
  { valor: 'produto', rotulo: 'Produto' },
  { valor: 'bloco', rotulo: 'Bloco' },
  { valor: 'figura', rotulo: 'Figura' },
  { valor: 'beneficio', rotulo: 'Benefício' },
  { valor: 'marco', rotulo: 'Marco da timeline' },
  { valor: 'caixa-cta', rotulo: 'Caixa de destaque' },
]

/** Aba "Conteúdo" dos widgets simples e do container. */
export function CamposConteudo({ no, lpId, mutarNo, dispositivo }: Props) {
  switch (no.tipo) {
    case 'titulo':
      return (
        <div className="space-y-3">
          <Area
            rotulo="Texto"
            value={no.texto}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'titulo') el.texto = e.target.value
              }, `titulo-${no.id}`)
            }
          />
          <Selecao
            rotulo="Nível"
            dica="h1 é o título principal da página"
            value={no.nivel}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'titulo') el.nivel = e.target.value as typeof no.nivel
              })
            }
          >
            <option value="h1">h1 — principal</option>
            <option value="h2">h2 — de seção</option>
            <option value="h3">h3 — de bloco</option>
            <option value="h4">h4 — menor</option>
          </Selecao>
        </div>
      )

    case 'texto':
      return (
        <div className="space-y-3">
          <Area
            rotulo="Texto"
            className="min-h-32"
            value={no.texto}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'texto') el.texto = e.target.value
              }, `texto-${no.id}`)
            }
          />
          <Opcoes<'subtitulo' | 'corpo'>
            rotulo="Papel"
            valor={no.papel}
            aoMudar={(v) =>
              mutarNo((el) => {
                if (el.tipo === 'texto') el.papel = v
              })
            }
            opcoes={[
              { valor: 'subtitulo', rotulo: 'Subtítulo' },
              { valor: 'corpo', rotulo: 'Corpo' },
            ]}
          />
          <p className="text-xs text-text-dim">
            O papel escolhe a tipografia do tema: subtítulo usa a família e o tamanho de
            subtítulos; corpo usa a de textos.
          </p>
        </div>
      )

    case 'imagem':
    case 'video':
      return (
        <CampoMidia
          lpId={lpId}
          midia={no.midia}
          aoMudar={(m) =>
            mutarNo((el) => {
              if (el.tipo === 'imagem' || el.tipo === 'video') {
                el.midia = m
                // O tipo do nó acompanha a mídia escolhida — trocar foto por
                // vídeo no seletor tem de trocar a tag na página também.
                el.tipo = m.tipo === 'video' ? 'video' : 'imagem'
              }
            })
          }
        />
      )

    case 'botao':
      return (
        <CamposBotao
          botao={no.botao}
          comPosicao={false}
          agrupar={`botao-${no.id}`}
          aoMudar={(patch, agrupar) =>
            mutarNo((el) => {
              if (el.tipo === 'botao') el.botao = { ...el.botao, ...patch }
            }, agrupar)
          }
        />
      )

    case 'icone':
      return (
        <SeletorIcone
          valor={no.nome}
          aoMudar={(nome) =>
            mutarNo((el) => {
              if (el.tipo === 'icone') el.nome = nome
            })
          }
        />
      )

    case 'numero':
      return (
        <div className="space-y-3">
          <Texto
            rotulo="Número"
            dica="a contagem anima até ele"
            value={no.valor}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'numero') el.valor = e.target.value
              }, `numero-${no.id}`)
            }
          />
          <Texto
            rotulo="Informação"
            placeholder="Ex.: Clientes atendidos"
            value={no.rotulo}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'numero') el.rotulo = e.target.value
              }, `numero-rotulo-${no.id}`)
            }
          />
        </div>
      )

    case 'espacador':
      return (
        <PorDispositivo
          rotulo="Altura"
          valor={no.altura}
          ativo={dispositivo}
        >
          <Faixa
            rotulo=""
            min={0}
            max={200}
            valor={no.altura[dispositivo] ?? 40}
            aoMudar={(v) =>
              mutarNo((el) => {
                if (el.tipo === 'espacador') {
                  el.altura = definir(el.altura, dispositivo, v) ?? { desktop: v }
                }
              }, `espacador-${no.id}`)
            }
          />
        </PorDispositivo>
      )

    case 'divisor':
      return <Vazio>O divisor não tem conteúdo. Ajuste a aparência na aba Estilo.</Vazio>

    case 'container':
      return (
        <div className="space-y-3">
          <PorDispositivo
            rotulo="Direção"
            valor={no.direcao}
            ativo={dispositivo}
          >
            <Opcoes<'linha' | 'coluna'>
              aria="Direção do container"
              valor={no.direcao[dispositivo] ?? 'coluna'}
              aoMudar={(v) =>
                mutarNo((el) => {
                  if (el.tipo === 'container') {
                    el.direcao = definir(el.direcao, dispositivo, v) ?? { desktop: v }
                  }
                })
              }
              opcoes={[
                { valor: 'coluna', rotulo: 'Empilhado' },
                { valor: 'linha', rotulo: 'Lado a lado' },
              ]}
            />
          </PorDispositivo>

          <PorDispositivo
            rotulo="Colunas"
            valor={no.colunas}
            ativo={dispositivo}
          >
            <Faixa
              rotulo=""
              sufixo=""
              min={1}
              max={6}
              valor={no.colunas?.[dispositivo] ?? 1}
              aoMudar={(v) =>
                mutarNo((el) => {
                  if (el.tipo === 'container') el.colunas = definir(el.colunas, dispositivo, v)
                })
              }
            />
          </PorDispositivo>

          <PorDispositivo
            rotulo="Espaço entre itens"
            valor={no.gap}
            ativo={dispositivo}
            rotuloHerdado="padrão"
            aoLimpar={() =>
              mutarNo((el) => {
                if (el.tipo === 'container') el.gap = definir(el.gap, dispositivo, undefined)
              })
            }
          >
            <Faixa
              rotulo=""
              min={0}
              max={96}
              // Mostra o padrão que o CSS base aplica: assim o campo diz o que
              // está valendo, e arrastar para 0 grava zero de verdade.
              valor={no.gap?.[dispositivo] ?? GAP_PADRAO}
              aoMudar={(v) =>
                mutarNo((el) => {
                  if (el.tipo === 'container') el.gap = definir(el.gap, dispositivo, v)
                }, `gap-${no.id}`)
              }
            />
          </PorDispositivo>

          <Selecao
            rotulo="Aparência"
            dica="borda, fundo e hover prontos"
            value={no.aparencia ?? ''}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'container') {
                  el.aparencia = (e.target.value || undefined) as Aparencia | undefined
                }
              })
            }
          >
            {APARENCIAS.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.rotulo}
              </option>
            ))}
          </Selecao>
        </div>
      )

    default:
      return null
  }
}
