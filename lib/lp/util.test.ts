import { describe, expect, it } from 'vitest'
import { corContraste, corSegura, luminancia, normalizarUrl, slugificar, urlSegura } from './util'

describe('corSegura', () => {
  it('normaliza hex curto para #rrggbb', () => {
    expect(corSegura('#fff', '#000000')).toBe('#ffffff')
    expect(corSegura('#F00', '#000000')).toBe('#ff0000')
    expect(corSegura('#abcd', '#000000')).toBe('#aabbcc') // alfa descartado
  })

  it('aceita hex de 6/8, rgb, hsl e nome', () => {
    expect(corSegura('#1a2b3c', '#000')).toBe('#1a2b3c')
    expect(corSegura('rgb(255, 0, 0)', '#000')).toBe('rgb(255, 0, 0)')
    expect(corSegura('white', '#000')).toBe('white')
  })

  it('rejeita injeção e devolve o fallback', () => {
    expect(corSegura('red; } body { display:none', '#123456')).toBe('#123456')
    expect(corSegura('#12', '#123456')).toBe('#123456')
    expect(corSegura(undefined, '#123456')).toBe('#123456')
  })
})

describe('luminancia / corContraste', () => {
  it('mede hex de 6 e 8 dígitos e rgb', () => {
    expect(luminancia('#ffffff')).toBeCloseTo(1)
    expect(luminancia('#000000')).toBeCloseTo(0)
    expect(luminancia('rgb(255,255,255)')).toBeCloseTo(1)
    expect(luminancia('#ffffffcc')).toBeCloseTo(1)
  })

  it('devolve null para o que não dá para medir', () => {
    expect(luminancia('white')).toBeNull()
    expect(luminancia('hsl(0,0%,100%)')).toBeNull()
  })

  it('cai no fallback informado quando a cor é imensurável', () => {
    expect(corContraste('white', '#111318')).toBe('#111318')
    expect(corContraste('#ffffff', '#111318')).toBe('#111318')
    expect(corContraste('#000000', '#ffffff')).toBe('#ffffff')
  })
})

describe('normalizarUrl', () => {
  it('prefixa https:// só quando falta esquema', () => {
    expect(normalizarUrl('www.exemplo.com.br')).toBe('https://www.exemplo.com.br')
    expect(normalizarUrl('https://x.com')).toBe('https://x.com')
    expect(normalizarUrl('javascript:alert(1)')).toBe('javascript:alert(1)')
    expect(normalizarUrl('')).toBe('')
  })
})

describe('urlSegura', () => {
  it('barra esquemas executáveis', () => {
    expect(urlSegura('javascript:alert(1)')).toBe('#')
    expect(urlSegura('vbscript:x')).toBe('#')
    expect(urlSegura('data:text/html,<script>')).toBe('#')
  })
  it('aceita http, mailto, tel, âncora e data:image', () => {
    expect(urlSegura('https://x.com')).toBe('https://x.com')
    expect(urlSegura('#secao')).toBe('#secao')
    expect(urlSegura('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(urlSegura('data:image/svg+xml;utf8,<svg/>')).toBe('data:image/svg+xml;utf8,<svg/>')
  })
})

describe('slugificar', () => {
  it('vira minúsculas sem acento com hífen', () => {
    expect(slugificar('Quem Somos')).toBe('quem-somos')
    expect(slugificar('Ação & Reação!')).toBe('acao-reacao')
    expect(slugificar('   ')).toBe('secao')
  })
})
