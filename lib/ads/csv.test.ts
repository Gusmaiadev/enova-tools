import { describe, expect, it } from 'vitest'
import { parseNumero, parseRelatorio } from './csv'
import type { LinhaCampanha, LinhaTermo } from './tipos'

describe('parseNumero', () => {
  it('lê decimais pt-BR e en', () => {
    expect(parseNumero('1.234,56')).toBeCloseTo(1234.56)
    expect(parseNumero('1,234.56')).toBeCloseTo(1234.56)
  })
  it('lê milhares pt-BR sem decimal', () => {
    expect(parseNumero('1.234')).toBe(1234)
    expect(parseNumero('12.345.678')).toBe(12345678)
  })
  it('lê só vírgula como decimal', () => {
    expect(parseNumero('45,2')).toBeCloseTo(45.2)
  })
  it('ignora moeda e porcentagem', () => {
    expect(parseNumero('R$ 1.999,90')).toBeCloseTo(1999.9)
    expect(parseNumero('3,45%')).toBeCloseTo(3.45)
  })
  it('vazio ou traço → 0', () => {
    expect(parseNumero('')).toBe(0)
    expect(parseNumero(' -- ')).toBe(0)
  })
})

describe('parseRelatorio — campanhas', () => {
  it('parseia CSV pt-BR com título e total, e soma agregados', () => {
    const csv = [
      'Relatório de campanhas',
      '01/07/2026 a 21/07/2026',
      'Campanha,Status,Impressões,Cliques,Custo,Conversões',
      'Marca,Ativada,"1.000","100","R$ 200,00","10"',
      'Genérica,Ativada,"2.000","50","R$ 150,50","5"',
      'Total: conta,,"3.000","150","R$ 350,50","15"',
    ].join('\n')

    const r = parseRelatorio(csv, 'campanhas')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.total).toBe(2) // a linha de Total é ignorada
    expect(r.agregados.custo).toBeCloseTo(350.5)
    expect(r.agregados.cliques).toBe(150)
    const primeira = r.linhas[0] as LinhaCampanha
    expect(primeira.campanha).toBe('Marca') // ordenado por custo desc
  })
})

describe('parseRelatorio — termos', () => {
  it('parseia relatório de termos (tab, en)', () => {
    const csv = [
      'Search term\tCampaign\tImpressions\tClicks\tCost\tConversions',
      'sapato barato\tGenérica\t500\t20\t80.00\t2',
      'loja de sapato\tMarca\t300\t30\t60.00\t4',
    ].join('\n')

    const r = parseRelatorio(csv, 'termos')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.total).toBe(2)
    expect(r.agregados.cliques).toBe(50)
    const termos = r.linhas as LinhaTermo[]
    expect(termos.map((t) => t.termo)).toContain('sapato barato')
  })

  it('erro claro quando falta a coluna-chave', () => {
    const r = parseRelatorio('Campaign,Cost\nMarca,10', 'termos')
    expect(r.ok).toBe(false)
  })
})
