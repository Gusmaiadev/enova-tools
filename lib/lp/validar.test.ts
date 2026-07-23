import { describe, expect, it } from 'vitest'
import { coergirBriefing, coergirDocumento, coergirDocumentoIA } from './validar'
import { briefingVazio } from './tipos'
import { aplicarTexto, documentoBase, duplicarSecao, moverSecao, removerSecao } from './documento'
import { novaSecao } from './layouts'
import { gerarZip } from './zip'

/** Resposta plausível da IA, com sujeira típica de LLM. */
const respostaIA = {
  seo: { titulo: 'Clínica Vida', descricao: 'Cuidado de verdade.' },
  tema: {
    tipografia: { titulos: { fonte: 'Fonte Que Não Existe', peso: 999 } },
    cores: { principal: '#0d9488', titulos: 'javascript:alert(1)' },
    raio: 500,
  },
  header: { logoTexto: 'Clínica Vida', menu: [{ rotulo: 'Início', alvo: '#inicio' }] },
  secoes: [
    {
      id: 's1',
      tipo: 'hero',
      nome: 'Início',
      ancora: 'Início Bonito!',
      titulo: 'Sua saúde em primeiro lugar',
      itens: [],
      espacamento: { topo: 9999, base: -50 },
      midia: { busca: 'medical clinic', tipo: 'imagem', orientacao: 'paisagem' },
    },
    { id: 's2', tipo: 'layout-inventado-pela-ia', nome: 'X', itens: [] },
    {
      id: 's3',
      tipo: 'cards',
      nome: 'Serviços',
      ancora: 'início bonito',
      itens: [{ id: 'i1', icone: 'icone-inexistente', titulo: 'Consulta', texto: 'Atendimento.' }],
    },
  ],
  footer: { direitos: '© 2026', linksUteis: [] },
  redes: [
    { rede: 'instagram', url: 'https://instagram.com/clinica' },
    { rede: 'orkut', url: 'https://orkut.com/x' },
  ],
}

describe('coergirDocumento', () => {
  it('descarta seções de tipo desconhecido e mantém as válidas', () => {
    const doc = coergirDocumento(respostaIA)
    expect(doc).not.toBeNull()
    expect(doc?.secoes.map((s) => s.tipo)).toEqual(['hero', 'cards'])
  })

  it('normaliza âncoras duplicadas e com acento', () => {
    const doc = coergirDocumento(respostaIA)
    expect(doc?.secoes[0].ancora).toBe('inicio-bonito')
    expect(doc?.secoes[1].ancora).toBe('inicio-bonito-2')
  })

  it('limita valores fora de faixa e rejeita cor inválida', () => {
    const doc = coergirDocumento(respostaIA)
    expect(doc?.secoes[0].espacamento).toEqual({ topo: 240, base: 0 })
    expect(doc?.tema.raio).toBe(32)
    expect(doc?.tema.cores.titulos).not.toContain('javascript')
  })

  it('ignora fonte e ícone fora do catálogo', () => {
    const doc = coergirDocumento(respostaIA)
    expect(doc?.tema.tipografia.titulos.fonte).toBe('Sora')
    expect(doc?.secoes[1].itens[0].icone).toBeUndefined()
  })

  it('descarta rede social desconhecida', () => {
    const doc = coergirDocumento(respostaIA)
    expect(doc?.redes).toHaveLength(1)
    expect(doc?.redes[0].rede).toBe('instagram')
  })

  it('vira placeholder quando a mídia não tem URL', () => {
    const doc = coergirDocumento(respostaIA)
    expect(doc?.secoes[0].midia?.url.startsWith('data:image/svg+xml')).toBe(true)
    expect(doc?.secoes[0].midia?.busca).toBe('medical clinic')
  })

  it('devolve null quando não sobra nenhuma seção válida', () => {
    expect(coergirDocumento({ secoes: [{ tipo: 'nada' }] })).toBeNull()
    expect(coergirDocumento(null)).toBeNull()
    expect(coergirDocumento('texto solto')).toBeNull()
  })

  it('sanea o id de seção e de item para conter só [A-Za-z0-9_-]', () => {
    const doc = coergirDocumento({
      secoes: [
        { id: '" onclick=x', tipo: 'cards', nome: 'A', itens: [{ id: '</style>', titulo: 'T' }] },
      ],
    })!
    expect(doc.secoes[0].id).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(doc.secoes[0].itens[0].id).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('preserva o alt em português quando a mídia vira placeholder', () => {
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's',
          tipo: 'texto-midia',
          nome: 'X',
          midia: { busca: 'office team', alt: 'Equipe no escritório', orientacao: 'paisagem' },
        },
      ],
    })!
    expect(doc.secoes[0].midia?.url.startsWith('data:image')).toBe(true)
    expect(doc.secoes[0].midia?.alt).toBe('Equipe no escritório')
  })

  it('preserva as escolhas do usuário sobre as da IA', () => {
    const briefing = {
      ...briefingVazio('Clínica Vida'),
      cores: { principal: '#ff00ff' },
      tipografia: { titulos: { fonte: 'Poppins' } },
    }
    const doc = coergirDocumentoIA(respostaIA, briefing)
    expect(doc?.tema.cores.principal).toBe('#ff00ff')
    expect(doc?.tema.tipografia.titulos.fonte).toBe('Poppins')
  })
})

describe('coergirBriefing', () => {
  it('limpa entradas inválidas do cliente', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Projeto',
        referencias: ['https://ok.com', 'javascript:alert(1)', 'ftp://x.com'],
        cores: { principal: '#123456', inventada: '#fff' },
        secoes: [
          { id: 's1', nome: 'A', layout: 'cards', colunas: 3, vincularMenu: true },
          { id: 's2', nome: 'B', layout: 'inexistente' },
        ],
        redes: [{ rede: 'tiktok', url: 'https://tiktok.com/@x' }, { rede: 'x' }],
      },
      'Antigo',
    )
    expect(briefing.referencias).toEqual(['https://ok.com'])
    expect(briefing.secoes).toHaveLength(1)
    expect(briefing.redes).toHaveLength(1)
    expect(briefing.cores.principal).toBe('#123456')
    expect('inventada' in briefing.cores).toBe(false)
  })

  it('mantém o nome atual quando o enviado é vazio', () => {
    expect(coergirBriefing({ nome: '   ' }, 'Nome Atual').nome).toBe('Nome Atual')
  })

  it('prefixa https:// em referência sem esquema e mantém o filtro de segurança', () => {
    const briefing = coergirBriefing(
      { nome: 'P', referencias: ['www.exemplo.com.br', 'javascript:alert(1)', 'ftp://x'] },
      'P',
    )
    expect(briefing.referencias).toEqual(['https://www.exemplo.com.br'])
  })
})

describe('operações do editor', () => {
  const base = () => {
    const doc = documentoBase(briefingVazio('Teste'))
    doc.secoes = [novaSecao('hero'), novaSecao('cards'), novaSecao('cta')]
    return doc
  }

  it('move seção sem alterar o original', () => {
    const doc = base()
    const movido = moverSecao(doc, doc.secoes[0].id, 1)
    expect(movido.secoes[1].id).toBe(doc.secoes[0].id)
    expect(doc.secoes[0].tipo).toBe('hero')
  })

  it('não move para fora da lista', () => {
    const doc = base()
    expect(moverSecao(doc, doc.secoes[0].id, -1).secoes[0].id).toBe(doc.secoes[0].id)
  })

  it('duplica com ids novos para a seção e seus itens', () => {
    const doc = base()
    const dup = duplicarSecao(doc, doc.secoes[1].id)
    expect(dup.secoes).toHaveLength(4)
    expect(dup.secoes[2].id).not.toBe(dup.secoes[1].id)
    const idsOriginais = dup.secoes[1].itens.map((i) => i.id)
    for (const item of dup.secoes[2].itens) expect(idsOriginais).not.toContain(item.id)
  })

  it('remove a seção e o item de menu que apontava para ela', () => {
    const doc = base()
    doc.secoes[0].ancora = 'inicio'
    doc.header.menu = [{ id: 'm1', rotulo: 'Início', alvo: '#inicio' }]
    const sem = removerSecao(doc, doc.secoes[0].id)
    expect(sem.secoes).toHaveLength(2)
    expect(sem.header.menu).toHaveLength(0)
  })

  it('aplica edição de texto no alvo certo', () => {
    const doc = base()
    const id = doc.secoes[1].id
    const itemId = doc.secoes[1].itens[0].id

    expect(aplicarTexto(doc, `sec:${id}:titulo`, 'Novo título').secoes[1].titulo).toBe('Novo título')
    expect(
      aplicarTexto(doc, `sec:${id}:item:${itemId}:texto`, 'Novo texto').secoes[1].itens[0].texto,
    ).toBe('Novo texto')
    expect(aplicarTexto(doc, 'header:logo', 'Marca').header.logoTexto).toBe('Marca')
    expect(aplicarTexto(doc, 'footer:email', 'a@b.com').footer.email).toBe('a@b.com')
  })

  it('ignora alvo inexistente sem quebrar', () => {
    const doc = base()
    expect(() => aplicarTexto(doc, 'sec:nao-existe:titulo', 'x')).not.toThrow()
    expect(() => aplicarTexto(doc, 'lixo', 'x')).not.toThrow()
  })
})

describe('zip', () => {
  it('monta um arquivo com assinatura e diretório central válidos', () => {
    const dados = new TextEncoder().encode('<h1>oi</h1>')
    const zip = gerarZip([{ caminho: 'index.html', dados }])

    // Assinatura do cabeçalho local.
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    // Assinatura do fim do diretório central (últimos 22 bytes).
    const fim = zip.slice(zip.length - 22)
    expect(Array.from(fim.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06])
    // Um arquivo registrado.
    expect(new DataView(fim.buffer, fim.byteOffset).getUint16(10, true)).toBe(1)
  })
})
