'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { PorDispositivo, definir } from './PorDispositivo'
import { CLASSE_CONTROLE, Cor, Faixa, Fonte, Opcoes, Selecao } from './campos'
import { estiloHerdado } from '@/lib/lp/heranca'
import { PROPORCOES_COLUNAS } from '@/lib/lp/padroes'
import type { Dispositivo, LpElemento, LpEstilo, LpTema, PorDisp } from '@/lib/lp/tipos'

export type MutarNo = (mut: (el: LpElemento) => void, agrupar?: string) => void

type Props = {
  no: LpElemento
  tema: LpTema
  mutarNo: MutarNo
  dispositivo: Dispositivo
}

/**
 * Os três seletores de tipografia. Ficam numa lista porque são idênticos em
 * estrutura — só mudam rótulo e catálogo — e assim a aba não vira 90 linhas
 * de JSX repetido.
 */
const LISTAS_FONTE: {
  campo: 'estiloFonte' | 'transformacao' | 'decoracao'
  rotulo: string
  opcoes: { valor: string; rotulo: string }[]
}[] = [
  {
    campo: 'estiloFonte',
    rotulo: 'Estilo',
    opcoes: [
      { valor: 'normal', rotulo: 'Normal' },
      { valor: 'italic', rotulo: 'Itálico' },
      { valor: 'oblique', rotulo: 'Oblíquo' },
    ],
  },
  {
    campo: 'transformacao',
    rotulo: 'Transformação',
    opcoes: [
      { valor: 'uppercase', rotulo: 'MAIÚSCULA' },
      { valor: 'lowercase', rotulo: 'minúscula' },
      { valor: 'capitalize', rotulo: 'Capitalizar' },
      { valor: 'none', rotulo: 'Normal' },
    ],
  },
  {
    campo: 'decoracao',
    rotulo: 'Decoração',
    opcoes: [
      { valor: 'underline', rotulo: 'Sublinhado' },
      { valor: 'overline', rotulo: 'Sobrelinhado' },
      { valor: 'line-through', rotulo: 'Linha através' },
      { valor: 'none', rotulo: 'Nenhum' },
    ],
  },
]

const PROPORCOES: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Original' },
  { valor: '16/9', rotulo: '16:9 — vídeo panorâmico' },
  { valor: '4/3', rotulo: '4:3 — foto clássica' },
  { valor: '1/1', rotulo: '1:1 — quadrado' },
  { valor: '3/4', rotulo: '3:4 — retrato' },
  { valor: '9/16', rotulo: '9:16 — story' },
  { valor: '21/9', rotulo: '21:9 — cinema' },
]

/**
 * Aba "Estilo": as sobreposições que valem para qualquer nó.
 *
 * Cada campo mostra o valor EFETIVO — o que a página está usando. Sem override,
 * o que aparece é o do tema (o que o usuário definiu na Identidade), marcado
 * como "do tema". Mostrar não grava: o override só nasce quando ele mexe no
 * campo, senão cada elemento congelaria uma cópia e pararia de acompanhar o
 * tema quando a Identidade mudasse.
 *
 * Qual dispositivo cada campo escreve vem do seletor único, no topo do painel.
 */
export function CamposEstilo({ no, tema, mutarNo, dispositivo }: Props) {
  const e: LpEstilo = no.estilo ?? {}
  const herdado = estiloHerdado(no, tema)
  const ehMidia = no.tipo === 'imagem' || no.tipo === 'video'

  const mudar = (patch: (est: LpEstilo) => void, agrupar?: string) =>
    mutarNo((el) => {
      const est: LpEstilo = { ...(el.estilo ?? {}) }
      patch(est)
      // Estilo sem chave nenhuma sai do documento — CSS gerado só do que existe.
      el.estilo = Object.keys(est).length > 0 ? est : undefined
    }, agrupar)

  /** Apaga a chave do dispositivo ativo: o campo volta a seguir o tema. */
  const limpar = (chave: keyof LpEstilo) => () =>
    mudar((est) => {
      const atual = est[chave] as Record<string, unknown> | undefined
      const novo = { ...atual }
      delete novo[dispositivo]
      if (Object.keys(novo).length > 0) {
        ;(est as Record<string, unknown>)[chave] = novo
      } else {
        delete est[chave]
      }
    })

  // Container não tem texto próprio: o que importa nele é o tamanho, como as
  // colunas se repartem e o fundo. Fonte e cor de texto pertencem aos filhos.
  if (no.tipo === 'container') {
    const colunas = no.colunas?.[dispositivo] ?? 1
    const proporcoes = PROPORCOES_COLUNAS[colunas]
    return (
      <div className="space-y-3">
        <PorDispositivo
          rotulo="Largura do bloco"
          valor={e.largura}
          ativo={dispositivo}
          aoLimpar={limpar('largura')}
          rotuloHerdado="ocupa tudo"
        >
          <input
            className={CLASSE_CONTROLE}
            placeholder="ex.: 60%, 480px"
            value={e.largura?.[dispositivo] ?? ''}
            onChange={(ev) =>
              mudar((est) => {
                est.largura = definir(est.largura, dispositivo, ev.target.value)
              }, 'cont-largura')
            }
          />
        </PorDispositivo>

        {proporcoes ? (
          <PorDispositivo
            rotulo="Largura das colunas"
            valor={no.proporcaoColunas}
            ativo={dispositivo}
            rotuloHerdado="iguais"
            aoLimpar={() =>
              mutarNo((el) => {
                if (el.tipo === 'container') {
                  el.proporcaoColunas = definir(el.proporcaoColunas, dispositivo, undefined)
                }
              })
            }
          >
            <Selecao
              rotulo=""
              value={no.proporcaoColunas?.[dispositivo] ?? ''}
              onChange={(ev) =>
                mutarNo((el) => {
                  if (el.tipo === 'container') {
                    el.proporcaoColunas = definir(
                      el.proporcaoColunas,
                      dispositivo,
                      ev.target.value,
                    )
                  }
                })
              }
            >
              {proporcoes.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </Selecao>
          </PorDispositivo>
        ) : (
          <p className="text-xs text-text-dim">
            Este bloco está com {colunas === 1 ? 'uma coluna' : `${colunas} colunas`}. Para repartir
            larguras diferentes, deixe-o com 2, 3 ou 4 colunas na aba Conteúdo.
          </p>
        )}

        <PorDispositivo
          rotulo="Cor de fundo"
          valor={e.fundo}
          ativo={dispositivo}
          aoLimpar={limpar('fundo')}
          rotuloHerdado="sem fundo"
        >
          <Cor
            rotulo=""
            valor={e.fundo?.[dispositivo]}
            placeholder="sem fundo"
            aoMudar={(v) => mudar((est) => { est.fundo = definir(est.fundo, dispositivo, v) }, 'cont-fundo')}
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Cantos"
          valor={e.raio}
          ativo={dispositivo}
          aoLimpar={limpar('raio')}
        >
          <Faixa
            rotulo=""
            min={0}
            max={64}
            valor={e.raio?.[dispositivo] ?? tema.raio}
            aoMudar={(v) => mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'cont-raio')}
          />
        </PorDispositivo>

        <p className="text-xs text-text-dim">
          Direção, número de colunas e espaço entre itens ficam na aba{' '}
          <strong className="text-text">Conteúdo</strong>; margem e espaçamento interno, na{' '}
          <strong className="text-text">Avançado</strong>.
        </p>
      </div>
    )
  }

  // Imagem e vídeo não têm fonte, peso nem entrelinha: o que importa neles é o
  // tamanho do quadro, a proporção e como a mídia se encaixa dentro dele.
  if (ehMidia) {
    return (
      <div className="space-y-3">
        <PorDispositivo
          rotulo="Largura"
          valor={e.largura}
          ativo={dispositivo}
          aoLimpar={limpar('largura')}
          rotuloHerdado="automática"
        >
          <input
            className={CLASSE_CONTROLE}
            placeholder="100% da coluna"
            value={e.largura?.[dispositivo] ?? ''}
            onChange={(ev) =>
              mudar((est) => {
                est.largura = definir(est.largura, dispositivo, ev.target.value)
              }, 'midia-largura')
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Proporção"
          valor={e.proporcao}
          ativo={dispositivo}
          aoLimpar={limpar('proporcao')}
          rotuloHerdado="original"
        >
          <Selecao
            rotulo=""
            value={e.proporcao?.[dispositivo] ?? ''}
            onChange={(ev) =>
              mudar((est) => {
                est.proporcao = definir(est.proporcao, dispositivo, ev.target.value)
              })
            }
          >
            {PROPORCOES.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Selecao>
        </PorDispositivo>

        <PorDispositivo
          rotulo="Altura"
          valor={e.altura}
          ativo={dispositivo}
          aoLimpar={limpar('altura')}
          rotuloHerdado="pela proporção"
        >
          <input
            className={CLASSE_CONTROLE}
            placeholder="ex.: 320px"
            value={e.altura?.[dispositivo] ?? ''}
            onChange={(ev) =>
              mudar((est) => {
                est.altura = definir(est.altura, dispositivo, ev.target.value)
              }, 'midia-altura')
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Encaixe"
          valor={e.ajuste}
          ativo={dispositivo}
          aoLimpar={limpar('ajuste')}
          rotuloHerdado="cobrir"
        >
          <Opcoes<'cobrir' | 'conter' | 'preencher'>
            aria="Como a mídia se encaixa no quadro"
            valor={e.ajuste?.[dispositivo] ?? 'cobrir'}
            aoMudar={(v) => mudar((est) => { est.ajuste = definir(est.ajuste, dispositivo, v) })}
            opcoes={[
              { valor: 'cobrir', rotulo: 'Cobrir' },
              { valor: 'conter', rotulo: 'Conter' },
              { valor: 'preencher', rotulo: 'Esticar' },
            ]}
          />
        </PorDispositivo>
        <p className="text-xs text-text-dim">
          <strong className="text-text">Cobrir</strong> preenche o quadro e corta o que sobra —
          é o padrão. <strong className="text-text">Conter</strong> mostra a mídia inteira e deixa
          sobrar espaço. <strong className="text-text">Esticar</strong> deforma para caber.
        </p>

        <PorDispositivo
          rotulo="Alinhamento"
          valor={e.alinhamento}
          ativo={dispositivo}
          aoLimpar={limpar('alinhamento')}
          rotuloHerdado="ocupa a largura"
        >
          <Opcoes<'left' | 'center' | 'right'>
            aria="Alinhamento da mídia"
            valor={e.alinhamento?.[dispositivo] ?? 'center'}
            aoMudar={(v) =>
              mudar((est) => { est.alinhamento = definir(est.alinhamento, dispositivo, v) })
            }
            opcoes={[
              { valor: 'left', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
              { valor: 'center', rotulo: '', aria: 'Centralizada', icone: <AlignCenter className="h-3.5 w-3.5" /> },
              { valor: 'right', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
            ]}
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Cantos"
          valor={e.raio}
          ativo={dispositivo}
          aoLimpar={limpar('raio')}
        >
          <Faixa
            rotulo=""
            min={0}
            max={64}
            valor={e.raio?.[dispositivo] ?? tema.raio}
            aoMudar={(v) => mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'midia-raio')}
          />
        </PorDispositivo>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PorDispositivo
        rotulo="Cor do texto"
        valor={e.cor}
        ativo={dispositivo}
        aoLimpar={limpar('cor')}
      >
        <Cor
          rotulo=""
          valor={e.cor?.[dispositivo]}
          padrao={herdado.cor}
          placeholder={herdado.cor ?? 'automático'}
          aoMudar={(v) => mudar((est) => { est.cor = definir(est.cor, dispositivo, v) }, 'estilo-cor')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Cor de fundo"
        valor={e.fundo}
        ativo={dispositivo}
        aoLimpar={limpar('fundo')}
      >
        <Cor
          rotulo=""
          valor={e.fundo?.[dispositivo]}
          padrao={herdado.fundo}
          placeholder={herdado.fundo ?? 'sem fundo'}
          aoMudar={(v) => mudar((est) => { est.fundo = definir(est.fundo, dispositivo, v) }, 'estilo-fundo')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Fonte"
        valor={e.fonte}
        ativo={dispositivo}
        aoLimpar={limpar('fonte')}
      >
        <Fonte
          rotulo=""
          permitirVazio
          rotuloVazio={herdado.fonte ? `Do tema (${herdado.fonte})` : 'Automático'}
          valor={e.fonte?.[dispositivo]}
          aoMudar={(v) => mudar((est) => { est.fonte = definir(est.fonte, dispositivo, v) })}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Tamanho"
        valor={e.tamanho}
        ativo={dispositivo}
        aoLimpar={limpar('tamanho')}
      >
        <input
          className={CLASSE_CONTROLE}
          placeholder={herdado.tamanho ?? 'automático'}
          value={e.tamanho?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => { est.tamanho = definir(est.tamanho, dispositivo, ev.target.value) }, 'estilo-tamanho')
          }
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Peso"
        valor={e.peso}
        ativo={dispositivo}
        aoLimpar={limpar('peso')}
      >
        <Faixa
          rotulo=""
          sufixo=""
          min={100}
          max={900}
          passo={100}
          valor={e.peso?.[dispositivo] ?? herdado.peso ?? 400}
          aoMudar={(v) => mudar((est) => { est.peso = definir(est.peso, dispositivo, v) }, 'estilo-peso')}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Altura da linha"
        valor={e.alturaLinha}
        ativo={dispositivo}
        aoLimpar={limpar('alturaLinha')}
      >
        <input
          className={CLASSE_CONTROLE}
          placeholder={herdado.alturaLinha ?? 'automática'}
          value={e.alturaLinha?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => {
              est.alturaLinha = definir(est.alturaLinha, dispositivo, ev.target.value)
            }, 'estilo-altura')
          }
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Espaçamento das letras"
        valor={e.espacamentoLetras}
        ativo={dispositivo}
        aoLimpar={limpar('espacamentoLetras')}
      >
        <input
          className={CLASSE_CONTROLE}
          placeholder={herdado.espacamentoLetras ?? 'automático'}
          value={e.espacamentoLetras?.[dispositivo] ?? ''}
          onChange={(ev) =>
            mudar((est) => {
              est.espacamentoLetras = definir(est.espacamentoLetras, dispositivo, ev.target.value)
            }, 'estilo-espaco')
          }
        />
      </PorDispositivo>

      {/* Padrão = a chave não existe, então a cascata decide. Por isso cada
          lista tem também o valor que DESLIGA o que veio do tema ou da
          aparência ('normal' na fonte, 'none' nas outras duas). */}
      {LISTAS_FONTE.map((l) => (
        <PorDispositivo
          key={l.campo}
          rotulo={l.rotulo}
          valor={e[l.campo]}
          ativo={dispositivo}
          aoLimpar={limpar(l.campo)}
          rotuloHerdado="padrão"
        >
          <Selecao
            rotulo=""
            value={e[l.campo]?.[dispositivo] ?? ''}
            onChange={(ev) =>
              mudar((est) => {
                // Mesmo caminho genérico de `limpar`: a chave vem da lista, e o
                // catálogo de valores quem garante é a coerção do servidor.
                const novo = definir(est[l.campo] as PorDisp<string>, dispositivo, ev.target.value)
                if (novo) (est as Record<string, unknown>)[l.campo] = novo
                else delete est[l.campo]
              })
            }
          >
            <option value="">Padrão</option>
            {l.opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Selecao>
        </PorDispositivo>
      ))}

      <PorDispositivo
        rotulo="Alinhamento"
        valor={e.alinhamento}
        ativo={dispositivo}
        aoLimpar={limpar('alinhamento')}
      >
        <Opcoes<'left' | 'center' | 'right'>
          aria="Alinhamento do texto"
          valor={e.alinhamento?.[dispositivo] ?? 'left'}
          aoMudar={(v) => mudar((est) => { est.alinhamento = definir(est.alinhamento, dispositivo, v) })}
          opcoes={[
            { valor: 'left', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
            { valor: 'center', rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
            { valor: 'right', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
          ]}
        />
      </PorDispositivo>

      <PorDispositivo
        rotulo="Cantos"
        valor={e.raio}
        ativo={dispositivo}
        aoLimpar={limpar('raio')}
      >
        <Faixa
          rotulo=""
          min={0}
          max={64}
          valor={e.raio?.[dispositivo] ?? tema.raio}
          aoMudar={(v) => mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'estilo-raio')}
        />
      </PorDispositivo>

      {herdado.fonte && (
        <p className="text-xs text-text-dim">
          Os valores marcados como “do tema” vêm da Identidade do briefing e mudam junto com ela.
          Mexer aqui vale só para este elemento.
        </p>
      )}
    </div>
  )
}
