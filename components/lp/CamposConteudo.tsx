'use client'

import { Alca } from './Alca'
import { CampoMidia } from './CampoMidia'
import { CamposBotao } from './CamposBotao'
import { PorDispositivo, definir } from './PorDispositivo'
import { SeletorIcone } from './SeletorIcone'
import type { MutarNo } from './CamposEstilo'
import { reordenar, useArrastar } from './arrastar'
import { Area, Faixa, Marcar, Opcoes, Selecao, Texto, Vazio } from './campos'
import { NOME_ELEMENTO, resumoNo } from './elementos'
import { Aviso } from '@/components/Campo'
import { definirQuantidadeFilhos } from '@/lib/lp/arvore'
import { LIMITE_TITULO, nivelDoNo, nivelEhTitulo } from '@/lib/lp/niveis'
import { GAP_PADRAO, valorEfetivo } from '@/lib/lp/padroes'
import type { Aparencia, Dispositivo, LpContainer, LpElemento } from '@/lib/lp/tipos'

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

/**
 * Ordem dos blocos dentro do container — é por aqui que se troca o lado do
 * conteúdo e da mídia.
 *
 * No modelo de árvore não existe mais um campo "inverter" na seção: o lado é a
 * POSIÇÃO do filho (ver `pTextoMidia` em lib/lp/presets/simples.ts), e quem
 * divide a linha entre dois blocos troca de lado trocando a ordem. A lista é
 * sempre vertical, mesmo com o container lado a lado — daí o texto explicando
 * que o primeiro da lista é o que fica à esquerda.
 */
function OrdemDosBlocos({ no, mutarNo }: { no: LpContainer; mutarNo: MutarNo }) {
  const arrastar = useArrastar((de, para) =>
    mutarNo((el) => {
      if (el.tipo === 'container') el.filhos = reordenar(el.filhos, de, para)
    }),
  )
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-dim">Ordem dos blocos</span>
      <ul className="space-y-1">
        {no.filhos.map((f, i) => {
          const nome = NOME_ELEMENTO[f.tipo] ?? f.tipo
          const resumo = resumoNo(f)
          return (
            <li
              key={f.id}
              {...arrastar.alvo(i)}
              className={`flex items-center gap-1 rounded-md border bg-surface-2/40 py-1 pr-1.5 transition-colors ${
                arrastar.classe(i) || 'border-border'
              }`}
            >
              <Alca arrastar={arrastar} indice={i} total={no.filhos.length} rotulo={nome} />
              <span className="shrink-0 text-[11px] font-medium">{nome}</span>
              {/* min-w-0: sem isso o item flex não encolhe abaixo do conteúdo e
                  o resumo longo vaza da linha em vez de cortar. */}
              {resumo && (
                <span className="min-w-0 truncate text-[11px] text-text-dim">{resumo}</span>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-text-dim">
        Com o bloco <strong className="text-text">lado a lado</strong>, o primeiro da lista é o que
        fica à esquerda — mova a mídia para o topo para ela trocar de lado com o texto.
      </p>
    </div>
  )
}

/** Aba "Conteúdo" dos widgets simples e do container. */
export function CamposConteudo({ no, lpId, mutarNo, dispositivo }: Props) {
  switch (no.tipo) {
    // Título e texto dividem o mesmo campo: para quem escreve os dois são texto,
    // e o que muda entre eles — o NÍVEL — é escolha de tipografia e mora na aba
    // Estilo, junto da fonte e do tamanho.
    case 'titulo':
    case 'texto': {
      const nivel = nivelDoNo(no) ?? 'paragrafo'
      return (
        <div className="space-y-3">
          <Area
            rotulo="Texto"
            className={nivelEhTitulo(nivel) ? undefined : 'min-h-32'}
            value={no.texto}
            onChange={(e) =>
              mutarNo((el) => {
                if (el.tipo === 'titulo' || el.tipo === 'texto') el.texto = e.target.value
              }, `texto-${no.id}`)
            }
          />
          {/* O aviso fica com o texto, não com o campo de nível: é aqui que o
              tamanho dele muda e que dá para encurtar. */}
          {nivelEhTitulo(nivel) && no.texto.length > LIMITE_TITULO && (
            <Aviso>
              Título guarda até {LIMITE_TITULO} caracteres e este tem {no.texto.length}. Encurte o
              texto ou passe o nível para Parágrafo, na aba Estilo — senão o resto se perde ao
              salvar.
            </Aviso>
          )}
          <p className="text-xs text-text-dim">
            O nível — h1 a h4, subtítulo ou parágrafo — fica na aba{' '}
            <strong className="text-text">Estilo</strong>, junto da fonte e do tamanho.
          </p>
        </div>
      )
    }

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

    case 'container': {
      const colunasEfetivas = valorEfetivo(no.colunas, dispositivo) ?? 1
      const linhas = Math.ceil(no.filhos.length / Math.max(1, colunasEfetivas))
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

          {/* Container vazio não tem o que multiplicar: sem um bloco de modelo,
              a quantidade não teria de onde tirar a cópia. */}
          {no.filhos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Faixa
                rotulo="Quantidade de blocos"
                sufixo=""
                min={1}
                max={24}
                valor={no.filhos.length}
                aoMudar={(v) =>
                  mutarNo((el) => {
                    if (el.tipo === 'container') definirQuantidadeFilhos(el, v)
                  }, `qtd-${no.id}`)
                }
              />
              <p className="text-xs text-text-dim">
                Aumentar copia o último bloco; diminuir tira do fim. Para um bloco diferente dos
                outros, duplique o que mais se parece com ele e edite a cópia.
              </p>
            </div>
          )}

          {/* Só faz sentido com mais de um bloco — e a ordem vem logo depois da
              direção, que é quem decide se ela se lê nos lados ou de cima para
              baixo. */}
          {no.filhos.length > 1 && <OrdemDosBlocos no={no} mutarNo={mutarNo} />}

          <PorDispositivo
            rotulo="Colunas"
            valor={no.colunas}
            ativo={dispositivo}
          >
            {/* Mostra o valor EFETIVO, e não só o próprio deste dispositivo:
                herdado do desktop, o campo diria "1 coluna" enquanto a página
                sai com três — e a conta de linhas abaixo mentiria junto. */}
            <Faixa
              rotulo=""
              sufixo=""
              min={1}
              max={6}
              valor={colunasEfetivas}
              aoMudar={(v) =>
                mutarNo((el) => {
                  if (el.tipo === 'container') el.colunas = definir(el.colunas, dispositivo, v)
                })
              }
            />
          </PorDispositivo>
          {no.filhos.length > 0 && (
            <p className="text-xs text-text-dim">
              {no.filhos.length} {no.filhos.length === 1 ? 'bloco' : 'blocos'} em{' '}
              {colunasEfetivas} {colunasEfetivas === 1 ? 'coluna' : 'colunas'} ={' '}
              <strong className="text-text">
                {linhas} {linhas === 1 ? 'linha' : 'linhas'}
              </strong>
              . É por aqui que se divide em linhas: as colunas você escolhe, as linhas saem da
              conta.
            </p>
          )}

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

          <div className="flex flex-col gap-1.5">
            <Marcar
              rotulo="Botões na mesma altura"
              valor={no.botoesNaBase === true}
              aoMudar={(v) =>
                mutarNo((el) => {
                  if (el.tipo === 'container') el.botoesNaBase = v || undefined
                })
              }
            />
            <p className="text-xs text-text-dim">
              Cola o botão na base de cada bloco. Com textos de tamanhos diferentes, é o que deixa
              todos os botões na mesma linha em vez de cada um logo abaixo do seu texto.
            </p>
          </div>

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
    }

    default:
      return null
  }
}
