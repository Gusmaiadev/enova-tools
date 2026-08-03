/**
 * Presets sem itens repetiveis. A ordem dos elementos reproduz o que as funcoes
 * lHero, lTextoMidia, lTextoCentralizado, lCta, lBanner e lFormulario do
 * compilador atual emitem — a migracao nao pode mudar a pagina de lugar.
 */

import type { LpContainer, LpElemento, LpSecao } from '../tipos'
import { gerarId } from '../util'
import { COL, LINHA, botaoSecao, cabeca, container, wMidia } from './comum'

export function pHero(s: LpSecao): LpContainer {
  const texto = container([...cabeca(s, 'h1'), ...botaoSecao(s)])
  // Hero com midia de fundo mostra so o texto: a midia lateral e o outro modo.
  const lateral = !s.fundo?.midia && s.midia ? [wMidia(s.midia)] : []
  const filhos = lateral.length > 0 ? [texto, ...lateral] : [texto]
  return container(filhos, {
    direcao: lateral.length > 0 ? LINHA : COL,
    colunas: lateral.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
    alinhar: { desktop: 'centro' },
  })
}

export function pTextoMidia(s: LpSecao): LpContainer {
  const texto = container([...cabeca(s), ...botaoSecao(s)])
  const midia = s.midia ? [wMidia(s.midia)] : []
  // `inverter` significava "midia antes do texto"; agora e a ordem dos filhos.
  const filhos = s.inverter ? [...midia, texto] : [texto, ...midia]
  return container(filhos, {
    direcao: midia.length > 0 ? LINHA : COL,
    colunas: midia.length > 0 ? { desktop: 2, tablet: 1 } : undefined,
    alinhar: { desktop: 'centro' },
  })
}

export function pTextoCentralizado(s: LpSecao): LpContainer {
  return container([...cabeca(s), ...botaoSecao(s)], { alinhar: { desktop: 'centro' } })
}

export function pCta(s: LpSecao): LpContainer {
  // A caixa em gradiente com cantos arredondados era o .lp-cta-caixa do layout.
  return container([...cabeca(s), ...botaoSecao(s)], {
    alinhar: { desktop: 'centro' },
    aparencia: 'caixa-cta',
  })
}

export function pBanner(s: LpSecao): LpContainer {
  // A midia ja foi movida para o fundo por ajustarSecao(), em expandir.ts —
  // aqui ela nao existe mais como campo da secao.
  return container([...cabeca(s), ...botaoSecao(s)], { alinhar: { desktop: 'centro' } })
}

export function pFormulario(s: LpSecao): LpContainer {
  const lado: LpElemento[] = [...cabeca(s), ...(s.midia ? [wMidia(s.midia)] : []), ...botaoSecao(s)]
  const form: LpElemento = { id: gerarId(), tipo: 'formulario', destino: s.destinoForm }
  if (lado.length === 0) return container([form])
  return container([container(lado), form], {
    direcao: LINHA,
    colunas: { desktop: 2, tablet: 1 },
  })
}
