import { describe, expect, it } from 'vitest'
import {
  corContraste,
  corSegura,
  linkTelefone,
  luminancia,
  normalizarBotoes,
  normalizarTelefones,
  normalizarUrl,
  slugificar,
  urlSegura,
} from './util'

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
  it('aceita http, mailto, tel, âncora, página do pacote e data:image', () => {
    expect(urlSegura('https://x.com')).toBe('https://x.com')
    expect(urlSegura('#secao')).toBe('#secao')
    expect(urlSegura('termos.html')).toBe('termos.html')
    expect(urlSegura('index.html#contato')).toBe('index.html#contato')
    expect(urlSegura('mailto:a@b.com')).toBe('mailto:a@b.com')
    expect(urlSegura('data:image/svg+xml;utf8,<svg/>')).toBe('data:image/svg+xml;utf8,<svg/>')
  })
})

describe('linkTelefone', () => {
  it('põe o DDI 55 no número brasileiro escrito sem ele', () => {
    expect(linkTelefone('(11) 99999-9999', true)).toBe('https://wa.me/5511999999999')
    expect(linkTelefone('(11) 3333-4444', false)).toBe('tel:+551133334444')
  })

  it('respeita o número que já veio com DDI', () => {
    expect(linkTelefone('+351 912 345 678', true)).toBe('https://wa.me/351912345678')
    expect(linkTelefone('5511999999999', true)).toBe('https://wa.me/5511999999999')
  })

  it('não inventa DDI para 0800 nem para número local', () => {
    expect(linkTelefone('0800 123 4567', false)).toBe('tel:08001234567')
    expect(linkTelefone('3333-4444', false)).toBe('tel:33334444')
  })

  it('sem dígito nenhum não vira link', () => {
    expect(linkTelefone('ligue para nós', true)).toBe('')
    expect(linkTelefone('', false)).toBe('')
  })
})

describe('normalizarTelefones', () => {
  it('converte o formato antigo (string com vários números) em lista', () => {
    const lista = normalizarTelefones('(11) 3333-4444 / (11) 99999-9999')
    expect(lista.map((t) => t.numero)).toEqual(['(11) 3333-4444', '(11) 99999-9999'])
    expect(lista.every((t) => t.whatsapp === false)).toBe(true)
    expect(lista[0].id).not.toBe(lista[1].id)
  })

  it('mantém a lista nova e descarta número vazio', () => {
    const lista = normalizarTelefones([
      { id: 't1', numero: '(11) 99999-9999', whatsapp: true },
      { id: 't2', numero: '   ' },
    ])
    expect(lista).toEqual([{ id: 't1', numero: '(11) 99999-9999', whatsapp: true }])
  })

  it('sanea o id (vira data-lp no editor) e limita a 6 números', () => {
    expect(normalizarTelefones([{ id: '" onclick=x', numero: '1' }])[0].id).toBe('onclickx')
    expect(normalizarTelefones(Array.from({ length: 10 }, (_, i) => `1199${i}`))).toHaveLength(6)
  })

  it('devolve lista vazia para o que não é telefone', () => {
    expect(normalizarTelefones(undefined)).toEqual([])
    expect(normalizarTelefones(42)).toEqual([])
    expect(normalizarTelefones([null, 7])).toEqual([])
  })
})

describe('normalizarBotoes', () => {
  it('aceita o formato antigo (um botão só, sem id) e dá id a ele', () => {
    const lista = normalizarBotoes({ texto: 'Fale conosco', url: '#contato' })
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ texto: 'Fale conosco', url: '#contato' })
    expect(lista[0].id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('mantém id, estilo e cores de quem já tem', () => {
    expect(
      normalizarBotoes([{ id: 'b1', texto: 'A', url: '#a', estilo: 'contorno', corFundo: '#fff' }]),
    ).toEqual([{ id: 'b1', texto: 'A', url: '#a', estilo: 'contorno', corFundo: '#fff' }])
  })

  it('descarta botão sem texto e limita a 4', () => {
    expect(normalizarBotoes([{ url: '#' }, { texto: '   ', url: '#' }])).toEqual([])
    expect(
      normalizarBotoes(Array.from({ length: 9 }, (_, i) => ({ texto: `B${i}`, url: '#' }))),
    ).toHaveLength(4)
  })

  it('devolve lista vazia para o que não é botão', () => {
    expect(normalizarBotoes(undefined)).toEqual([])
    expect(normalizarBotoes(null)).toEqual([])
    expect(normalizarBotoes('Fale conosco')).toEqual([])
  })
})

describe('slugificar', () => {
  it('vira minúsculas sem acento com hífen', () => {
    expect(slugificar('Quem Somos')).toBe('quem-somos')
    expect(slugificar('Ação & Reação!')).toBe('acao-reacao')
    expect(slugificar('   ')).toBe('secao')
  })
})
