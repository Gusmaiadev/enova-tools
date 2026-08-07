'use client'

import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { PorDispositivo, definir } from './PorDispositivo'
import { CLASSE_CONTROLE, Cor, Faixa, Fonte, Marcar, Opcoes, Selecao } from './campos'
import { estiloHerdado } from '@/lib/lp/heranca'
import { NIVEIS_TEXTO, aplicarNivel, nivelDoNo, type NivelTexto } from '@/lib/lp/niveis'
import { PROPORCOES_COLUNAS, TAMANHO_ICONE } from '@/lib/lp/padroes'
import { partesDe } from '@/lib/lp/partes'
import type {
  Dispositivo,
  EstiloHover,
  LpElemento,
  LpEstilo,
  LpTema,
  PorDisp,
  Sombra,
} from '@/lib/lp/tipos'
import { ROTULO_SOMBRA, SOMBRAS } from '@/lib/lp/tipos'

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
 * Tipografia de uma PARTE de um widget composto — hoje as duas metades do big
 * number. São os quatro campos que decidem a aparência de um número numa página:
 * cor, fonte, tamanho e peso. Entrelinha e espaçamento de letras ficam de fora
 * porque em um valor de uma linha não mudam nada visível.
 */
function TipografiaDaParte({
  titulo,
  estilo,
  dispositivo,
  soCor = false,
  ehMidia = false,
  aoMudar,
}: {
  titulo: string
  estilo: LpEstilo
  dispositivo: Dispositivo
  /** Parte desenhada em SVG: fonte, tamanho e peso não mexem num desenho. */
  soCor?: boolean
  /** Parte que é imagem: os campos passam a ser os do quadro, não os do texto. */
  ehMidia?: boolean
  aoMudar: (patch: (e: LpEstilo) => void, agrupar?: string) => void
}) {
  const limpar = (chave: keyof LpEstilo) => () =>
    aoMudar((e) => {
      const atual = e[chave] as Record<string, unknown> | undefined
      const novo = { ...atual }
      delete novo[dispositivo]
      if (Object.keys(novo).length > 0) (e as Record<string, unknown>)[chave] = novo
      else delete e[chave]
    })

  if (ehMidia) {
    return (
      <div className="space-y-3 rounded-md border border-border bg-surface-2/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">{titulo}</p>

        <PorDispositivo
          rotulo="Proporção"
          valor={estilo.proporcao}
          ativo={dispositivo}
          aoLimpar={limpar('proporcao')}
          rotuloHerdado="como está"
        >
          <Selecao
            rotulo=""
            value={estilo.proporcao?.[dispositivo] ?? ''}
            onChange={(ev) =>
              aoMudar((e) => {
                e.proporcao = definir(e.proporcao, dispositivo, ev.target.value)
              })
            }
          >
            <option value="">Como está</option>
            {PROPORCOES.filter((p) => p.valor).map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Selecao>
        </PorDispositivo>

        <PorDispositivo
          rotulo="Encaixe"
          valor={estilo.ajuste}
          ativo={dispositivo}
          aoLimpar={limpar('ajuste')}
          rotuloHerdado="cobrir"
        >
          <Opcoes<'cobrir' | 'conter' | 'preencher'>
            aria={`Encaixe — ${titulo}`}
            valor={estilo.ajuste?.[dispositivo] ?? 'cobrir'}
            aoMudar={(v) => aoMudar((e) => { e.ajuste = definir(e.ajuste, dispositivo, v) })}
            opcoes={[
              { valor: 'cobrir', rotulo: 'Cobrir' },
              { valor: 'conter', rotulo: 'Conter' },
              { valor: 'preencher', rotulo: 'Esticar' },
            ]}
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Largura"
          valor={estilo.largura}
          ativo={dispositivo}
          aoLimpar={limpar('largura')}
          rotuloHerdado="como está"
        >
          <input
            className={CLASSE_CONTROLE}
            placeholder="ex.: 80px, 100%"
            value={estilo.largura?.[dispositivo] ?? ''}
            onChange={(ev) =>
              aoMudar((e) => {
                e.largura = definir(e.largura, dispositivo, ev.target.value)
              }, `${titulo}-largura`)
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Altura"
          valor={estilo.altura}
          ativo={dispositivo}
          aoLimpar={limpar('altura')}
          rotuloHerdado="pela proporção"
        >
          <input
            className={CLASSE_CONTROLE}
            placeholder="ex.: 80px"
            value={estilo.altura?.[dispositivo] ?? ''}
            onChange={(ev) =>
              aoMudar((e) => {
                e.altura = definir(e.altura, dispositivo, ev.target.value)
              }, `${titulo}-altura`)
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Cantos"
          valor={estilo.raio}
          ativo={dispositivo}
          aoLimpar={limpar('raio')}
          rotuloHerdado="como está"
        >
          <Faixa
            rotulo=""
            min={0}
            max={200}
            valor={estilo.raio?.[dispositivo] ?? 0}
            aoMudar={(v) => aoMudar((e) => { e.raio = definir(e.raio, dispositivo, v) }, `${titulo}-raio`)}
          />
        </PorDispositivo>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface-2/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">{titulo}</p>

      <PorDispositivo
        rotulo="Cor"
        valor={estilo.cor}
        ativo={dispositivo}
        aoLimpar={limpar('cor')}
        rotuloHerdado="como está"
      >
        <Cor
          rotulo=""
          valor={estilo.cor?.[dispositivo]}
          placeholder="como está"
          aoMudar={(v) => aoMudar((e) => { e.cor = definir(e.cor, dispositivo, v) }, `${titulo}-cor`)}
        />
      </PorDispositivo>

      {!soCor && (
        <>
          <PorDispositivo
            rotulo="Fonte"
            valor={estilo.fonte}
            ativo={dispositivo}
            aoLimpar={limpar('fonte')}
            rotuloHerdado="como está"
          >
            <Fonte
              rotulo=""
              permitirVazio
              rotuloVazio="Como está"
              valor={estilo.fonte?.[dispositivo]}
              aoMudar={(v) => aoMudar((e) => { e.fonte = definir(e.fonte, dispositivo, v) })}
            />
          </PorDispositivo>

          <PorDispositivo
            rotulo="Tamanho"
            valor={estilo.tamanho}
            ativo={dispositivo}
            aoLimpar={limpar('tamanho')}
            rotuloHerdado="como está"
          >
            <input
              className={CLASSE_CONTROLE}
              placeholder="ex.: 20px"
              value={estilo.tamanho?.[dispositivo] ?? ''}
              onChange={(ev) =>
                aoMudar((e) => {
                  e.tamanho = definir(e.tamanho, dispositivo, ev.target.value)
                }, `${titulo}-tamanho`)
              }
            />
          </PorDispositivo>

          <PorDispositivo
            rotulo="Peso"
            valor={estilo.peso}
            ativo={dispositivo}
            aoLimpar={limpar('peso')}
            rotuloHerdado="como está"
          >
            <Faixa
              rotulo=""
              sufixo=""
              min={100}
              max={900}
              passo={100}
              valor={estilo.peso?.[dispositivo] ?? 400}
              aoMudar={(v) =>
                aoMudar((e) => { e.peso = definir(e.peso, dispositivo, v) }, `${titulo}-peso`)
              }
            />
          </PorDispositivo>

          <PorDispositivo
            rotulo="Alinhamento"
            valor={estilo.alinhamento}
            ativo={dispositivo}
            aoLimpar={limpar('alinhamento')}
            rotuloHerdado="como está"
          >
            <Opcoes<'left' | 'center' | 'right'>
              aria={`Alinhamento — ${titulo}`}
              valor={estilo.alinhamento?.[dispositivo] ?? 'left'}
              aoMudar={(v) =>
                aoMudar((e) => { e.alinhamento = definir(e.alinhamento, dispositivo, v) })
              }
              opcoes={[
                { valor: 'left', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
                { valor: 'center', rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
                { valor: 'right', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
              ]}
            />
          </PorDispositivo>
        </>
      )}
    </div>
  )
}

/**
 * O que muda ao passar o mouse. Fica fora do seletor de dispositivo de propósito:
 * hover não existe em tela de toque, então o valor é um só para a página inteira
 * — guardar um por breakpoint encheria o documento com o que nenhum celular usa.
 *
 * No botão o movimento não entra: ele já tem "Efeito ao passar o mouse" na aba
 * Conteúdo, e dois controles mexendo no mesmo transform brigariam no CSS.
 */
function CamposHover({
  no,
  tema,
  mutarNo,
}: {
  no: LpElemento
  tema: LpTema
  mutarNo: MutarNo
}) {
  const h = no.estilo?.hover ?? {}
  const ehMidia = no.tipo === 'imagem' || no.tipo === 'video'
  const ehBotao = no.tipo === 'botao'
  const ehIcone = no.tipo === 'icone'
  const ligado = Boolean(no.estilo?.hover) && h.ativo !== false

  // Cada campo se chama pelo nome do que ele muda NESTE elemento — o mesmo
  // vocabulário do estado normal logo acima. "Cor do texto" num container ou
  // num ícone é um rótulo que não descreve nada do que está selecionado.
  const rotuloCor = ehIcone
    ? 'Cor do ícone'
    : no.tipo === 'container'
      ? 'Cor do texto de dentro'
      : 'Cor do texto'
  const rotuloFundo = ehIcone ? 'Pastilha atrás' : 'Cor de fundo'

  const mudar = (patch: (x: EstiloHover) => void, agrupar?: string) =>
    mutarNo((el) => {
      const hover: EstiloHover = { ...(el.estilo?.hover ?? {}) }
      patch(hover)
      const estilo: LpEstilo = { ...(el.estilo ?? {}) }
      // Hover sem nenhuma chave sai do documento — nada para animar, nada para
      // emitir, e a transição no estado normal também deixa de sair.
      if (Object.keys(hover).length > 0) estilo.hover = hover
      else delete estilo.hover
      el.estilo = Object.keys(estilo).length > 0 ? estilo : undefined
    }, agrupar)

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="font-mono text-xs uppercase tracking-[0.28em] text-text-dim">
        Ao passar o mouse
      </p>

      {/* Desligar guarda o ajuste em vez de apagá-lo: `ativo: false` fica no
          documento com os valores, e religar traz tudo de volta. */}
      <Marcar
        rotulo="Ativar efeito"
        valor={ligado}
        aoMudar={(v) => mudar((x) => { x.ativo = v })}
      />

      {ligado ? (
        <>
          {!ehMidia && (
            <Cor
              rotulo={rotuloCor}
              valor={h.cor}
              padrao={tema.cores.principal}
              placeholder="não muda"
              aoMudar={(v) => mudar((x) => { if (v) x.cor = v; else delete x.cor }, 'hover-cor')}
            />
          )}

          <Cor
            rotulo={rotuloFundo}
            valor={h.fundo}
            padrao={tema.cores.principal}
            placeholder="não muda"
            aoMudar={(v) => mudar((x) => { if (v) x.fundo = v; else delete x.fundo }, 'hover-fundo')}
          />

          <Selecao
            rotulo="Sombra"
            value={h.sombra ?? ''}
            onChange={(ev) =>
              mudar((x) => {
                const v = ev.target.value as Sombra | ''
                if (v) x.sombra = v
                else delete x.sombra
              })
            }
          >
            <option value="">Não muda</option>
            {SOMBRAS.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SOMBRA[s]}
              </option>
            ))}
          </Selecao>

          {!ehBotao && (
            <>
              <Faixa
                rotulo="Subir"
                min={0}
                max={40}
                valor={h.subir ?? 0}
                aoMudar={(v) =>
                  mudar((x) => { if (v > 0) x.subir = v; else delete x.subir }, 'hover-subir')
                }
              />
              <Faixa
                rotulo="Crescer"
                sufixo="%"
                min={50}
                max={150}
                valor={h.escala ?? 100}
                aoMudar={(v) =>
                  mudar((x) => { if (v !== 100) x.escala = v; else delete x.escala }, 'hover-escala')
                }
              />
            </>
          )}

          <p className="text-xs text-text-dim">
            {ehBotao
              ? 'O movimento do botão (subir, crescer, brilho) fica em “Efeito ao passar o mouse”, na aba Conteúdo.'
              : 'Só o que estiver preenchido muda; o resto continua igual ao estado normal.'}
          </p>
        </>
      ) : (
        <p className="text-xs text-text-dim">
          {no.estilo?.hover
            ? 'Desligado. O que você ajustou está guardado e volta ao religar.'
            : 'Nada muda quando o mouse passa por cima deste elemento.'}
        </p>
      )}
    </div>
  )
}

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

        {/* Alinhamento do container é text-align, e text-align HERDA: uma
            escolha aqui alinha todo o texto de dentro de uma vez, em vez de
            campo por campo. Quem quiser um elemento fora do padrão sobrepõe no
            Alinhamento dele — regra direta no filho vence valor herdado. */}
        <PorDispositivo
          rotulo="Alinhamento do conteúdo"
          valor={e.alinhamento}
          ativo={dispositivo}
          aoLimpar={limpar('alinhamento')}
          rotuloHerdado="à esquerda"
        >
          <Opcoes<'left' | 'center' | 'right'>
            aria="Alinhamento do texto do bloco"
            valor={e.alinhamento?.[dispositivo] ?? 'left'}
            aoMudar={(v) =>
              mudar((est) => { est.alinhamento = definir(est.alinhamento, dispositivo, v) })
            }
            opcoes={[
              { valor: 'left', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
              { valor: 'center', rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
              { valor: 'right', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
            ]}
          />
        </PorDispositivo>

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
          Direção, ordem dos blocos, número de colunas e espaço entre itens ficam na aba{' '}
          <strong className="text-text">Conteúdo</strong>; margem e espaçamento interno, na{' '}
          <strong className="text-text">Avançado</strong>.
        </p>

        <CamposHover no={no} tema={tema} mutarNo={mutarNo} />
      </div>
    )
  }

  /*
   * Ícone é desenho, não texto: fonte, peso, entrelinha, espaçamento de letras,
   * caixa alta e sublinhado não fazem nada nele. O que existe para ajustar é o
   * tamanho, a cor do traço, a pastilha atrás e onde ele fica na coluna.
   *
   * "Tamanho" grava em `estilo.tamanho`, o mesmo campo que nos textos vira
   * font-size — e no ícone o font-size é justamente o que mede o desenho e a
   * pastilha (ver .lp-icone no CSS base). Um campo do modelo, dois sentidos que
   * não se cruzam, e o valor por dispositivo sai de graça.
   */
  if (no.tipo === 'icone') {
    const tamanho = Number.parseInt(e.tamanho?.[dispositivo] ?? '', 10)
    return (
      <div className="space-y-3">
        <PorDispositivo
          rotulo="Tamanho"
          valor={e.tamanho}
          ativo={dispositivo}
          aoLimpar={limpar('tamanho')}
          rotuloHerdado="padrão"
        >
          <Faixa
            rotulo=""
            min={12}
            max={96}
            valor={Number.isFinite(tamanho) ? tamanho : TAMANHO_ICONE}
            aoMudar={(v) =>
              mudar((est) => {
                est.tamanho = definir(est.tamanho, dispositivo, `${v}px`)
              }, 'icone-tamanho')
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Cor do ícone"
          valor={e.cor}
          ativo={dispositivo}
          aoLimpar={limpar('cor')}
          rotuloHerdado="cor principal"
        >
          <Cor
            rotulo=""
            valor={e.cor?.[dispositivo]}
            padrao={tema.cores.principal}
            placeholder={tema.cores.principal}
            aoMudar={(v) => mudar((est) => { est.cor = definir(est.cor, dispositivo, v) }, 'icone-cor')}
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Pastilha atrás"
          valor={e.fundo}
          ativo={dispositivo}
          aoLimpar={limpar('fundo')}
          rotuloHerdado="cor principal clara"
        >
          <Cor
            rotulo=""
            valor={e.fundo?.[dispositivo]}
            padrao={tema.cores.principal}
            placeholder="da cor principal"
            aoMudar={(v) => mudar((est) => { est.fundo = definir(est.fundo, dispositivo, v) }, 'icone-fundo')}
          />
        </PorDispositivo>
        <p className="text-xs text-text-dim">
          Para o ícone sem pastilha, ponha nela a mesma cor do fundo da seção.
        </p>

        <PorDispositivo
          rotulo="Cantos da pastilha"
          valor={e.raio}
          ativo={dispositivo}
          aoLimpar={limpar('raio')}
        >
          <Faixa
            rotulo=""
            min={0}
            max={64}
            valor={e.raio?.[dispositivo] ?? Math.round(tema.raio * 0.75)}
            aoMudar={(v) => mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'icone-raio')}
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Alinhamento"
          valor={e.alinhamento}
          ativo={dispositivo}
          aoLimpar={limpar('alinhamento')}
          rotuloHerdado="o do bloco"
        >
          <Opcoes<'left' | 'center' | 'right'>
            aria="Alinhamento do ícone"
            valor={e.alinhamento?.[dispositivo] ?? 'left'}
            aoMudar={(v) =>
              mudar((est) => { est.alinhamento = definir(est.alinhamento, dispositivo, v) })
            }
            opcoes={[
              { valor: 'left', rotulo: '', aria: 'À esquerda', icone: <AlignLeft className="h-3.5 w-3.5" /> },
              { valor: 'center', rotulo: '', aria: 'Centralizado', icone: <AlignCenter className="h-3.5 w-3.5" /> },
              { valor: 'right', rotulo: '', aria: 'À direita', icone: <AlignRight className="h-3.5 w-3.5" /> },
            ]}
          />
        </PorDispositivo>

        <CamposHover no={no} tema={tema} mutarNo={mutarNo} />
      </div>
    )
  }

  /*
   * Widget composto: um nó, vários textos dentro. Mexer no estilo do nó não
   * alcançava nenhum deles — a folha base escreve cor, fonte, peso e tamanho
   * direto em .lp-stat-valor, summary, .lp-depo-nome e companhia, e regra no
   * filho vence herança. Era por isso que trocar a cor não fazia nada.
   *
   * Então aqui a tipografia solta dá lugar às PARTES (lib/lp/partes.ts), uma
   * caixa por texto editável, e o estilo do nó fica com o que de fato é da
   * caixa: fundo, cantos e o efeito de mouse.
   */
  const partes = partesDe(no.tipo)
  if (partes.length > 0) {
    const aoMudarParte =
      (chave: string) =>
      (patch: (est: LpEstilo) => void, agrupar?: string) =>
        mutarNo((el) => {
          const atual: LpEstilo = { ...(el.partes?.[chave] ?? {}) }
          patch(atual)
          const todas = { ...(el.partes ?? {}) }
          if (Object.keys(atual).length > 0) todas[chave] = atual
          else delete todas[chave]
          el.partes = Object.keys(todas).length > 0 ? todas : undefined
        }, agrupar)

    return (
      <div className="space-y-3">
        {partes.map((p) => (
          <TipografiaDaParte
            key={p.chave}
            titulo={p.rotulo}
            estilo={no.partes?.[p.chave] ?? {}}
            dispositivo={dispositivo}
            soCor={p.soCor}
            ehMidia={Boolean(p.midia)}
            aoMudar={aoMudarParte(p.chave)}
          />
        ))}

        {/* FAQ e depoimentos vêm com uma largura máxima de fábrica (760px e
            820px). Escrever aqui vence esse limite — é o único jeito de deixar
            um deles mais largo. */}
        <PorDispositivo
          rotulo="Largura da caixa"
          valor={e.largura}
          ativo={dispositivo}
          aoLimpar={limpar('largura')}
          rotuloHerdado="a do widget"
        >
          <input
            className={CLASSE_CONTROLE}
            placeholder="ex.: 100%, 960px"
            value={e.largura?.[dispositivo] ?? ''}
            onChange={(ev) =>
              mudar((est) => {
                est.largura = definir(est.largura, dispositivo, ev.target.value)
              }, 'parte-largura')
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Cor de fundo da caixa"
          valor={e.fundo}
          ativo={dispositivo}
          aoLimpar={limpar('fundo')}
          rotuloHerdado="sem fundo"
        >
          <Cor
            rotulo=""
            valor={e.fundo?.[dispositivo]}
            placeholder="sem fundo"
            aoMudar={(v) =>
              mudar((est) => { est.fundo = definir(est.fundo, dispositivo, v) }, 'parte-fundo')
            }
          />
        </PorDispositivo>

        <PorDispositivo
          rotulo="Cantos da caixa"
          valor={e.raio}
          ativo={dispositivo}
          aoLimpar={limpar('raio')}
        >
          <Faixa
            rotulo=""
            min={0}
            max={64}
            valor={e.raio?.[dispositivo] ?? tema.raio}
            aoMudar={(v) =>
              mudar((est) => { est.raio = definir(est.raio, dispositivo, v) }, 'parte-raio')
            }
          />
        </PorDispositivo>

        <p className="text-xs text-text-dim">
          Campo em branco deixa a parte como está. Fundo, cantos e o efeito de mouse valem para a
          caixa inteira, não para cada texto.
        </p>

        <CamposHover no={no} tema={tema} mutarNo={mutarNo} />
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

        <CamposHover no={no} tema={tema} mutarNo={mutarNo} />
      </div>
    )
  }

  const nivel = nivelDoNo(no)

  return (
    <div className="space-y-3">
      {/* Primeiro campo do texto de propósito: o nível é quem decide de qual
          categoria do tema vêm os valores "do tema" mostrados abaixo. Não é por
          dispositivo — a tag na página é uma só, em toda tela. */}
      {nivel && (
        <>
          <Selecao
            rotulo="Nível"
            dica="a tag na página e a tipografia do tema"
            value={nivel}
            onChange={(ev) => mutarNo((el) => aplicarNivel(el, ev.target.value as NivelTexto))}
          >
            {NIVEIS_TEXTO.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.rotulo}
              </option>
            ))}
          </Selecao>
          <p className="text-xs text-text-dim">
            h1 a h4 usam a tipografia de títulos; subtítulo e parágrafo saem em &lt;p&gt;, com a de
            subtítulos e a de textos. Use um h1 só por página.
          </p>
        </>
      )}

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

      <CamposHover no={no} tema={tema} mutarNo={mutarNo} />
    </div>
  )
}
