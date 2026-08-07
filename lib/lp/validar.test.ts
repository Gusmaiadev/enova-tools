import { describe, expect, it } from 'vitest'
import { coergirBriefing, coergirDocumento, coergirDocumentoIA } from './validar'
import { briefingVazio } from './tipos'
import type { LpDocumento } from './tipos'
import { orientacaoDe, recusar } from './formatos'
import {
  aplicarArquivos,
  aplicarBotoes,
  aplicarEstiloBarras,
  aplicarItens,
  aplicarLados,
  aplicarMenu,
  aplicarPaginas,
  aplicarTextos,
  aplicarTexto,
  arquivosUsados,
  documentoBase,
  garantirAncora,
  mesclarMidiaBriefing,
  paginasGeradas,
  TEMA_PADRAO,
  duplicarSecao,
  moverSecao,
  removerSecao,
  sincronizarLinksPaginas,
} from './documento'
import { novaSecao, novoItem, periodoPreco, rotuloItem } from './layouts'
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

  it('os telefones do briefing (com o WhatsApp marcado) vencem os da IA', () => {
    const base = briefingVazio('Clínica Vida')
    const briefing = {
      ...base,
      footer: {
        ...base.footer,
        telefones: [{ id: 't1', numero: '(11) 99999-9999', whatsapp: true }],
      },
    }
    // A IA reescreveu o número e esqueceu o "whatsapp".
    const bruto = {
      ...respostaIA,
      footer: { telefones: [{ numero: '11 99999-9999' }], linksUteis: [] },
    }
    const doc = coergirDocumentoIA(bruto, briefing)
    expect(doc?.footer.telefones).toEqual([
      { id: 't1', numero: '(11) 99999-9999', whatsapp: true },
    ])
  })

  it('as redes do briefing sobrevivem à IA que as esqueceu', () => {
    const briefing = {
      ...briefingVazio('Clínica Vida'),
      redes: [
        { id: 'r1', rede: 'instagram' as const, url: 'https://instagram.com/clinica' },
        { id: 'r2', rede: 'facebook' as const, url: 'https://facebook.com/clinica' },
      ],
    }
    // A IA devolveu o documento sem a chave `redes` — o caso comum.
    const semRedes: Record<string, unknown> = { ...respostaIA }
    delete semRedes.redes
    const doc = coergirDocumentoIA(semRedes, briefing)
    expect(doc?.redes).toEqual(briefing.redes)
  })

  it('a logo enviada sobrevive à IA, que não tem como escrevê-la', () => {
    const briefing = {
      ...briefingVazio('Clínica Vida'),
      logo: {
        tipo: 'imagem' as const,
        url: 'https://cdn/logo.png',
        alt: 'logo.png',
        busca: '',
        orientacao: 'paisagem' as const,
      },
    }
    const doc = coergirDocumentoIA(respostaIA, briefing)
    expect(doc?.header.logo?.url).toBe('https://cdn/logo.png')
  })

  it('limpa os ajustes de header e rodapé', () => {
    const doc = coergirDocumento({
      ...respostaIA,
      header: {
        logoTexto: 'Clínica',
        estilo: {
          menu: { fonte: 'Fonte Inventada', tamanho: '18px', cor: 'javascript:alert(1)' },
          // Logo gigante empurraria o menu para fora da barra.
          logo: 900,
          alinhamento: 'diagonal',
        },
      },
      footer: { linksUteis: [], estilo: { logo: 28, alinhamento: 'centro' } },
    })
    expect(doc?.header.estilo?.logo).toBe(160)
    expect(doc?.header.estilo?.alinhamento).toBeUndefined()
    expect(doc?.header.estilo?.menu?.fonte).toBeUndefined()
    expect(doc?.header.estilo?.menu?.tamanho).toBe('18px')
    expect(doc?.header.estilo?.menu?.cor).not.toContain('javascript')
    expect(doc?.footer.estilo).toEqual({ logo: 28, alinhamento: 'centro' })
  })

  it('barra sem ajuste nenhum não guarda objeto vazio', () => {
    const doc = coergirDocumento({ ...respostaIA, header: { logoTexto: 'X', estilo: {} } })
    expect(doc?.header.estilo).toBeUndefined()
  })

  it('aceita o botão único antigo do header e transforma em lista', () => {
    const doc = coergirDocumento({
      ...respostaIA,
      header: { logoTexto: 'Clínica', botao: { texto: 'Agendar', url: '#contato' } },
    })
    expect(doc?.header.botoes).toEqual([
      { id: expect.any(String), texto: 'Agendar', url: '#contato' },
    ])
  })

  it('limpa os botões de header e rodapé e limita a quantidade', () => {
    const doc = coergirDocumento({
      ...respostaIA,
      header: {
        logoTexto: 'Clínica',
        botoes: [
          { id: '" onclick=x', texto: 'Agendar', url: '#contato', estilo: 'neon' },
          { url: '#sem-texto' },
        ],
      },
      footer: {
        linksUteis: [],
        botoes: Array.from({ length: 7 }, (_, i) => ({ texto: `B${i}`, url: '#' })),
      },
    })
    // Botão sem texto sai; o id vira data-lp, então só [A-Za-z0-9_-].
    expect(doc?.header.botoes).toHaveLength(1)
    expect(doc?.header.botoes[0].id).toBe('onclickx')
    expect(doc?.header.botoes[0].estilo).toBeUndefined()
    expect(doc?.footer.botoes).toHaveLength(4)
  })

  it('aceita telefones em lista e no formato antigo (string única)', () => {
    const emLista = coergirDocumento({
      ...respostaIA,
      footer: { telefones: [{ numero: '(11) 99999-9999', whatsapp: true }], linksUteis: [] },
    })
    expect(emLista?.footer.telefones).toEqual([
      { id: expect.any(String), numero: '(11) 99999-9999', whatsapp: true },
    ])

    const antigo = coergirDocumento({
      ...respostaIA,
      footer: { telefones: '(11) 3333-4444 / (11) 99999-9999', linksUteis: [] },
    })
    expect(antigo?.footer.telefones?.map((t) => t.numero)).toEqual([
      '(11) 3333-4444',
      '(11) 99999-9999',
    ])
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

  it('não guarda colunas: quem decide é o preset, e depois o editor', () => {
    // O campo saiu do briefing. Um 2|3|4 escolhido antes de a página existir só
    // competia com o número que o preset já tira do layout e da quantidade de
    // itens — e que no editor se muda por container e por dispositivo.
    const briefing = coergirBriefing(
      { nome: 'P', secoes: [{ id: 's1', nome: 'A', layout: 'cards', colunas: 4 }] },
      'P',
    )
    expect(briefing.secoes[0]).not.toHaveProperty('colunas')
    // Documento gerado sem IA também não carimba número nenhum na seção.
    expect(documentoBase(briefing).secoes[0].colunas).toBeUndefined()
  })

  it('prefixa https:// em referência sem esquema e mantém o filtro de segurança', () => {
    const briefing = coergirBriefing(
      { nome: 'P', referencias: ['www.exemplo.com.br', 'javascript:alert(1)', 'ftp://x'] },
      'P',
    )
    expect(briefing.referencias).toEqual(['https://www.exemplo.com.br'])
  })
})

describe('mídia definida pelo usuário (arquivo ou banco)', () => {
  /** Como a mídia volta de POST /api/lp/upload. */
  const enviada = {
    tipo: 'imagem',
    url: 'https://firebasestorage.googleapis.com/v0/b/e-nova.firebasestorage.app/o/lp%2Ftrinca%2Flp1%2Fabc.jpg?alt=media&token=t',
    caminho: 'lp/trinca/lp1/abc.jpg',
    alt: 'fachada.jpg',
    busca: '',
    orientacao: 'paisagem',
    largura: 1600,
    altura: 900,
  }

  const briefingCom = (arquivo: unknown, busca = '') =>
    coergirBriefing(
      {
        nome: 'P',
        secoes: [
          {
            id: 's1',
            nome: 'Início',
            layout: 'hero',
            vincularMenu: true,
            midia: { busca, tipo: 'video', orientacao: 'retrato', arquivo },
          },
        ],
      },
      'P',
    )

  it('guarda o arquivo mesmo sem descrição, e tira tipo/formato dele', () => {
    const midia = briefingCom(enviada).secoes[0].midia
    expect(midia?.arquivo?.caminho).toBe('lp/trinca/lp1/abc.jpg')
    expect(midia?.arquivo?.largura).toBe(1600)
    // O client mandou video/retrato; vale o que o arquivo é de verdade.
    expect(midia?.tipo).toBe('imagem')
    expect(midia?.orientacao).toBe('paisagem')
  })

  it('descarta caminho fora da árvore do bucket sem perder a mídia', () => {
    const arquivo = briefingCom({ ...enviada, caminho: '../../outro-time/x.jpg' }).secoes[0].midia
      ?.arquivo
    expect(arquivo?.url).toBe(enviada.url)
    expect(arquivo?.caminho).toBeUndefined()
  })

  it('documentoBase usa o arquivo em vez de placeholder', () => {
    const midia = documentoBase(briefingCom(enviada, 'fachada da loja')).secoes[0].midia
    expect(midia?.url).toBe(enviada.url)
    expect(midia?.alt).toBe('fachada da loja')
  })

  it('vence a mídia que a IA descreveu, casando por id', () => {
    const briefing = briefingCom(enviada)
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'hero',
          nome: 'Início',
          itens: [],
          midia: { busca: 'stock photo', tipo: 'imagem', orientacao: 'paisagem' },
        },
      ],
    })!
    expect(aplicarArquivos(doc, briefing)).toEqual({ aplicadas: 1, perdidas: 0 })
    expect(doc.secoes[0].midia?.url).toBe(enviada.url)
  })

  /** Como a mídia volta do seletor quando escolhida no Pexels/Pixabay. */
  const doBanco = {
    tipo: 'imagem',
    url: 'https://images.pexels.com/photos/1/foto.jpg',
    thumb: 'https://images.pexels.com/photos/1/mini.jpg',
    alt: 'Team meeting',
    busca: 'equipe reunida',
    orientacao: 'paisagem',
    autor: 'Fulano de Tal',
    fonte: 'pexels',
    largura: 1920,
    altura: 1080,
  }

  const briefingGaleria = (arquivo: unknown) =>
    coergirBriefing(
      {
        nome: 'P',
        secoes: [
          {
            id: 's1',
            nome: 'Trabalhos',
            layout: 'galeria',
            vincularMenu: true,
            midia: { busca: 'obras entregues', tipo: 'imagem', orientacao: 'paisagem', arquivo },
          },
        ],
      },
      'P',
    )

  it('guarda a mídia escolhida no banco com miniatura e crédito, sem caminho', () => {
    const midia = briefingCom(doBanco, 'equipe reunida').secoes[0].midia
    expect(midia?.arquivo?.url).toBe(doBanco.url)
    expect(midia?.arquivo?.thumb).toBe(doBanco.thumb)
    expect(midia?.arquivo?.fonte).toBe('pexels')
    expect(midia?.arquivo?.autor).toBe('Fulano de Tal')
    expect(midia?.arquivo?.caminho).toBeUndefined()
  })

  it('mídia do banco vence a busca da IA e não deixa nada no bucket', () => {
    const briefing = briefingCom(doBanco, 'equipe reunida')
    const documento = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'hero',
          nome: 'Início',
          itens: [],
          midia: { busca: 'stock photo', tipo: 'imagem', orientacao: 'paisagem' },
        },
      ],
    })!
    expect(aplicarArquivos(documento, briefing)).toEqual({ aplicadas: 1, perdidas: 0 })
    expect(documento.secoes[0].midia?.url).toBe(doBanco.url)
    expect(documento.secoes[0].midia?.alt).toBe('equipe reunida')
    expect(arquivosUsados({ documento, briefing }).size).toBe(0)
  })

  it('vai para o fundo quando a IA montou o hero com imagem de fundo', () => {
    const briefing = briefingCom(doBanco, 'equipe reunida')
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'hero',
          nome: 'Início',
          itens: [],
          fundo: { midia: { busca: 'stock photo', tipo: 'imagem', orientacao: 'paisagem' } },
        },
      ],
    })!
    aplicarArquivos(doc, briefing)
    expect(doc.secoes[0].fundo?.midia?.url).toBe(doBanco.url)
    expect(doc.secoes[0].midia).toBeUndefined()
  })

  it('em layout só com imagem por item, entra como a imagem do primeiro item', () => {
    const briefing = briefingGaleria(doBanco)
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'galeria',
          nome: 'Trabalhos',
          itens: [
            { id: 'i1', imagem: { busca: 'gallery photo', tipo: 'imagem', orientacao: 'paisagem' } },
            { id: 'i2', imagem: { busca: 'outra foto', tipo: 'imagem', orientacao: 'paisagem' } },
          ],
        },
      ],
    })!
    expect(aplicarArquivos(doc, briefing)).toEqual({ aplicadas: 1, perdidas: 0 })
    expect(doc.secoes[0].itens[0].imagem?.url).toBe(doBanco.url)
    // A seção não ganha mídia solta: o layout de galeria não renderiza isso.
    expect(doc.secoes[0].midia).toBeUndefined()
    expect(doc.secoes[0].itens[1].imagem?.url).not.toBe(doBanco.url)
  })

  it('documentoBase também põe a mídia da galeria no primeiro item', () => {
    const secao = documentoBase(briefingGaleria(enviada)).secoes[0]
    expect(secao.itens[0].imagem?.url).toBe(enviada.url)
    expect(secao.itens[1].imagem?.url).not.toBe(enviada.url)
    expect(secao.midia).toBeUndefined()
  })

  it('casa pela posição quando a IA trocou o id, e só se o layout confere', () => {
    const briefing = briefingCom(enviada)
    const doc = coergirDocumento({
      secoes: [{ id: 'outro', tipo: 'hero', nome: 'Início', itens: [] }],
    })!
    expect(aplicarArquivos(doc, briefing)).toEqual({ aplicadas: 1, perdidas: 0 })
    expect(doc.secoes[0].midia?.url).toBe(enviada.url)

    const trocado = coergirDocumento({
      secoes: [{ id: 'outro', tipo: 'cards', nome: 'Serviços', itens: [] }],
    })!
    expect(aplicarArquivos(trocado, briefing)).toEqual({ aplicadas: 0, perdidas: 1 })
  })

  it('lista os arquivos que o projeto ainda usa, do documento e do briefing', () => {
    const briefing = briefingCom(enviada)
    const documento = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'cards',
          nome: 'Serviços',
          midia: { url: 'https://x/a.jpg', caminho: 'lp/trinca/lp1/no-doc.jpg', alt: 'a', busca: 'a' },
          fundo: {
            midia: { url: 'https://x/b.jpg', caminho: 'lp/trinca/lp1/no-fundo.jpg', alt: 'b', busca: 'b' },
          },
          itens: [
            {
              id: 'i1',
              imagem: { url: 'https://x/c.jpg', caminho: 'lp/trinca/lp1/no-item.jpg', alt: 'c', busca: 'c' },
            },
            // Foto de banco não tem caminho: nada a apagar no bucket.
            { id: 'i2', imagem: { url: 'https://pexels.com/d.jpg', alt: 'd', busca: 'd' } },
          ],
        },
      ],
    })!

    expect([...arquivosUsados({ documento, briefing })].sort()).toEqual([
      'lp/trinca/lp1/abc.jpg',
      'lp/trinca/lp1/no-doc.jpg',
      'lp/trinca/lp1/no-fundo.jpg',
      'lp/trinca/lp1/no-item.jpg',
    ])
    expect(arquivosUsados({ documento: null, briefing: null }).size).toBe(0)
  })

  it('recusa formato e tamanho antes de enviar', () => {
    expect(recusar('image/jpeg', 1024)).toBeNull()
    expect(recusar('video/quicktime', 1024)).toMatch(/Formato não aceito/)
    expect(recusar('video/mp4', 80 * 1024 * 1024)).toMatch(/limite/)
    expect(recusar('image/png', 0)).toMatch(/vazio/)
    expect(orientacaoDe(900, 900)).toBe('quadrado')
    expect(orientacaoDe(800, 1200)).toBe('retrato')
  })
})

describe('itens escritos no briefing', () => {
  const briefingCards = (itens: unknown) =>
    coergirBriefing(
      {
        nome: 'Felix',
        secoes: [
          { id: 's1', nome: 'Serviços', layout: 'cards', vincularMenu: false, itens },
        ],
      },
      'Felix',
    )

  const cards = [
    {
      id: 'i1',
      titulo: 'Reforma completa',
      extra: 'a partir de 30 dias',
      texto: 'Do projeto à entrega.',
      botao: { texto: 'Quero esta', url: '#contato' },
    },
    { id: 'i2', titulo: 'Manutenção predial' },
  ]

  it('guarda o que foi escrito e mantém o item em branco como pedido à IA', () => {
    // O item vazio é o usuário pedindo mais um card para a IA escrever — a tela
    // promete isso ("o que deixar em branco a IA preenche"). Descartá-lo aqui
    // encolhia a seção: o prompt pede o número de itens que o briefing tem.
    const secao = briefingCards([...cards, { id: 'i3' }, { id: 'i4', titulo: '   ' }]).secoes[0]
    expect(secao.itens).toHaveLength(4)
    expect(secao.itens?.[0].extra).toBe('a partir de 30 dias')
    expect(secao.itens?.[0].botao?.texto).toBe('Quero esta')
    expect(secao.itens?.[1].titulo).toBe('Manutenção predial')
    // Em branco é em branco: nada de string vazia herdada do campo do formulário.
    expect(secao.itens?.[2].titulo).toBeUndefined()
    expect(secao.itens?.[3].titulo).toBeUndefined()
  })

  it('item em branco que a IA não escreveu sai da página em vez de virar card vazio', () => {
    const briefing = briefingCards([...cards, { id: 'i3' }])
    const doc = coergirDocumento(
      {
        secoes: [
          {
            id: 's1',
            tipo: 'cards',
            nome: 'Serviços',
            itens: [{ id: 'a' }, { id: 'b' }],
          },
        ],
      },
      TEMA_PADRAO,
    ) as LpDocumento
    const vazios = aplicarItens(doc, briefing)
    expect(doc.secoes[0].itens).toHaveLength(2)
    expect(vazios).toBe(1)
  })

  it('a lista do usuário define quais e quantos; a IA preenche os buracos', () => {
    const briefing = briefingCards(cards)
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'cards',
          nome: 'Serviços',
          itens: [
            { id: 'a', icone: 'check', titulo: 'Outro título', texto: 'Texto da IA um' },
            { id: 'b', icone: 'estrela', titulo: 'Mais um', texto: 'Texto da IA dois' },
            { id: 'c', icone: 'check', titulo: 'Sobrando', texto: 'Texto da IA três' },
          ],
        },
      ],
    })!
    aplicarItens(doc, briefing)

    const itens = doc.secoes[0].itens
    expect(itens).toHaveLength(2)
    expect(itens[0].titulo).toBe('Reforma completa')
    expect(itens[0].extra).toBe('a partir de 30 dias')
    expect(itens[0].botao?.texto).toBe('Quero esta')
    // Deixou em branco: fica o texto que a IA escreveu para a mesma posição.
    expect(itens[1].titulo).toBe('Manutenção predial')
    expect(itens[1].texto).toBe('Texto da IA dois')
    // Ícone nunca vem do briefing: segue o da IA.
    expect(itens[1].icone).toBe('estrela')
  })

  it('documentoBase monta a lista do usuário mesmo sem IA', () => {
    const secao = documentoBase(briefingCards(cards)).secoes[0]
    expect(secao.itens).toHaveLength(2)
    expect(secao.itens[0].titulo).toBe('Reforma completa')
    // Ícone não vem do briefing: fica o do item de exemplo daquela posição.
    expect(secao.itens[0].icone).toBe(novoItem('cards', 0).icone)
    // Sem itens no briefing continuam os três de exemplo.
    expect(documentoBase(briefingCards([])).secoes[0].itens).toHaveLength(3)
  })

  it('big numbers: os números escritos no briefing viram os itens da seção', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Felix',
        secoes: [
          {
            id: 's1',
            nome: 'Números',
            layout: 'estatisticas',
            vincularMenu: false,
            titulo: 'Nossos números',
            subtitulo: 'Vinte anos construindo',
            conteudo: 'Cada número aqui é obra entregue.',
            itens: [
              { id: 'n1', extra: '+500', titulo: 'Obras entregues' },
              { id: 'n2', extra: '20 anos', titulo: 'De mercado' },
            ],
          },
        ],
      },
      'Felix',
    )
    const secao = documentoBase(briefing).secoes[0]
    expect(secao.titulo).toBe('Nossos números')
    expect(secao.subtitulo).toBe('Vinte anos construindo')
    expect(secao.texto).toBe('Cada número aqui é obra entregue.')
    expect(secao.itens.map((i) => [i.extra, i.titulo])).toEqual([
      ['+500', 'Obras entregues'],
      ['20 anos', 'De mercado'],
    ])
  })

  it('encaixa o período do plano no catálogo do select', () => {
    expect(periodoPreco('/mês')).toBe('/mês')
    expect(periodoPreco('/mes')).toBe('/mês')
    expect(periodoPreco('por mês')).toBe('/mês')
    expect(periodoPreco('Mensal')).toBe('/mês')
    expect(periodoPreco('/ANO')).toBe('/ano')
    expect(periodoPreco('semestral')).toBe('/semestre')
    // "trimestre" e "semestre" contêm "mes": encaixar por pedaço viraria mensal
    // — trocar o período de um plano é mudar o preço dele.
    expect(periodoPreco('/trimestre')).toBe('/trimestre')
    expect(periodoPreco('trimestral')).toBe('/trimestre')
  })

  it('não chuta período fora do catálogo', () => {
    expect(periodoPreco('quinzenal')).toBeNull()
    expect(periodoPreco('por 30 dias')).toBeNull()
    expect(periodoPreco('')).toBeNull()
  })

  it('o período que a IA escreveu à mão vira a opção do select', () => {
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'precos',
          nome: 'Planos',
          itens: [
            { id: 'p1', titulo: 'Básico', extra: 'R$ 99', detalhe: 'por mês' },
            // Fora do catálogo: continua como veio, e o select mostra como
            // "personalizado" em vez de trocar o período sozinho.
            { id: 'p2', titulo: 'Sazonal', extra: 'R$ 290', detalhe: 'por 30 dias' },
          ],
        },
        // Fora do Pricing Table, `detalhe` é texto livre (cargo, empresa…).
        {
          id: 's2',
          tipo: 'depoimentos',
          nome: 'Clientes',
          itens: [{ id: 'd1', titulo: 'Ótimo', detalhe: 'Diretora, Acme' }],
        },
      ],
    })
    expect(doc?.secoes[0].itens.map((i) => i.detalhe)).toEqual(['/mês', 'por 30 dias'])
    expect(doc?.secoes[1].itens[0].detalhe).toBe('Diretora, Acme')
  })

  it('a aparência das barras escrita no briefing chega ao documento', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Projeto',
        estiloHeader: { logo: 70, alinhamento: 'centro', menu: { fonte: 'Poppins' } },
        footer: { estilo: { logo: 28, alinhamento: 'diagonal' } },
        secoes: [{ id: 's1', nome: 'Início', layout: 'hero' }],
      },
      'Antigo',
    )
    expect(briefing.estiloHeader).toEqual({
      menu: { fonte: 'Poppins' },
      logo: 70,
      alinhamento: 'centro',
    })
    // Alinhamento inválido sai; o resto do estilo fica.
    expect(briefing.footer.estilo).toEqual({ logo: 28 })

    const doc = documentoBase(briefing)
    expect(doc.header.estilo?.alinhamento).toBe('centro')
    expect(doc.footer.estilo?.logo).toBe(28)

    // No caminho da IA (que não escreve esses campos) a escolha é reimposta.
    const daIA = documentoBase({
      ...briefing,
      estiloHeader: undefined,
      footer: { ...briefing.footer, estilo: undefined },
    })
    expect(daIA.header.estilo).toBeUndefined()
    aplicarEstiloBarras(daIA, briefing)
    expect(daIA.header.estilo?.logo).toBe(70)
    expect(daIA.footer.estilo?.logo).toBe(28)
  })

  it('lado da mídia do briefing só vale no layout que tem lados', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Projeto',
        secoes: [
          { id: 's1', nome: 'Início', layout: 'hero', inverter: true },
          { id: 's2', nome: 'Sobre', layout: 'texto-midia', inverter: true },
          // Galeria não põe conteúdo e mídia lado a lado: a escolha não existe.
          { id: 's3', nome: 'Fotos', layout: 'galeria', inverter: true },
        ],
      },
      'Antigo',
    )
    expect(briefing.secoes.map((s) => s.inverter)).toEqual([true, true, undefined])
  })

  it('o lado escolhido no briefing vence o documento da IA', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Projeto',
        secoes: [
          { id: 's1', nome: 'Sobre', layout: 'texto-midia', inverter: true },
          { id: 's2', nome: 'Serviços', layout: 'texto-midia' },
        ],
      },
      'Antigo',
    )
    const doc = documentoBase(briefing)
    // A IA devolveu o contrário do que o usuário marcou nas duas seções.
    doc.secoes[0].inverter = undefined
    doc.secoes[1].inverter = true
    aplicarLados(doc, briefing)
    expect(doc.secoes.map((s) => s.inverter)).toEqual([true, undefined])
  })

  it('rótulo do campo do item acompanha o layout', () => {
    expect(rotuloItem('estatisticas', 'extra')).toBe('Número')
    expect(rotuloItem('estatisticas', 'titulo')).toBe('Informação')
    expect(rotuloItem('cards', 'extra')).toBe('Subtítulo')
    expect(rotuloItem('precos', 'detalhe')).toBe('Período')
    expect(rotuloItem('faq', 'titulo')).toBe('Título')
  })

  it('destaque passa a ser escolha da lista do usuário', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Felix',
        secoes: [
          {
            id: 's1',
            nome: 'Planos',
            layout: 'precos',
            vincularMenu: false,
            itens: [
              { id: 'p1', titulo: 'Básico' },
              { id: 'p2', titulo: 'Completo', destaque: true },
            ],
          },
        ],
      },
      'Felix',
    )
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'precos',
          nome: 'Planos',
          itens: [
            { id: 'a', titulo: 'Um', destaque: true },
            { id: 'b', titulo: 'Dois' },
          ],
        },
      ],
    })!
    aplicarItens(doc, briefing)
    expect(doc.secoes[0].itens[0].destaque).toBeUndefined()
    expect(doc.secoes[0].itens[1].destaque).toBe(true)
  })
})

describe('título e subtítulo escritos no briefing', () => {
  const briefingTextos = (subtitulo?: string) =>
    coergirBriefing(
      {
        nome: 'Felix',
        secoes: [
          {
            id: 's1',
            nome: 'Serviços',
            layout: 'cards',
            vincularMenu: false,
            titulo: 'O que fazemos por você',
            subtitulo,
          },
          { id: 's2', nome: 'Números', layout: 'estatisticas', vincularMenu: false },
        ],
      },
      'Felix',
    )

  it('guarda o subtítulo e ignora o vazio', () => {
    expect(briefingTextos('Obras entregues no prazo').secoes[0].subtitulo).toBe(
      'Obras entregues no prazo',
    )
    expect(briefingTextos('   ').secoes[0].subtitulo).toBeUndefined()
    expect(briefingTextos().secoes[0].subtitulo).toBeUndefined()
  })

  it('documentoBase leva os dois para a seção', () => {
    const secao = documentoBase(briefingTextos('Obras entregues no prazo')).secoes[0]
    expect(secao.titulo).toBe('O que fazemos por você')
    expect(secao.subtitulo).toBe('Obras entregues no prazo')
  })

  it('vencem o texto da IA, e o que ficou vazio continua sendo dela', () => {
    const briefing = briefingTextos('Obras entregues no prazo')
    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'cards',
          nome: 'Serviços',
          titulo: 'Soluções completas',
          subtitulo: 'Do projeto à entrega',
          itens: [],
        },
        {
          id: 's2',
          tipo: 'estatisticas',
          nome: 'Números',
          titulo: 'Nossos números',
          subtitulo: 'Feitos por quem entende',
          itens: [],
        },
      ],
    })!
    aplicarTextos(doc, briefing)
    expect(doc.secoes[0].titulo).toBe('O que fazemos por você')
    expect(doc.secoes[0].subtitulo).toBe('Obras entregues no prazo')
    // Seção sem título/subtítulo no briefing fica com o que a IA escreveu.
    expect(doc.secoes[1].titulo).toBe('Nossos números')
    expect(doc.secoes[1].subtitulo).toBe('Feitos por quem entende')
  })
})

describe('campo em branco que a IA não deve escrever', () => {
  const briefingSemIa = (semIa: unknown, escrito: Record<string, string> = {}) =>
    coergirBriefing(
      {
        nome: 'Felix',
        secoes: [
          {
            id: 's1',
            nome: 'Serviços',
            layout: 'cards',
            vincularMenu: false,
            titulo: '',
            subtitulo: '',
            conteudo: '',
            ...escrito,
            semIa,
          },
          { id: 's2', nome: 'Números', layout: 'estatisticas', vincularMenu: false },
        ],
      },
      'Felix',
    )

  const daIA = () =>
    coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'cards',
          nome: 'Serviços',
          titulo: 'Soluções completas',
          subtitulo: 'Do projeto à entrega',
          texto: 'Cuidamos de cada etapa da obra.',
          itens: [],
        },
        {
          id: 's2',
          tipo: 'estatisticas',
          nome: 'Números',
          titulo: 'Nossos números',
          subtitulo: 'Feitos por quem entende',
          texto: 'Anos de estrada.',
          itens: [],
        },
      ],
    })!

  it('guarda só as marcações verdadeiras dos campos conhecidos', () => {
    expect(briefingSemIa({ titulo: true, conteudo: true }).secoes[0].semIa).toEqual({
      titulo: true,
      conteudo: true,
    })
    expect(briefingSemIa({ titulo: false, nome: true }).secoes[0].semIa).toBeUndefined()
    expect(briefingSemIa(undefined).secoes[0].semIa).toBeUndefined()
  })

  it('some quando o campo foi preenchido — o texto do usuário é a resposta', () => {
    const secao = briefingSemIa(
      { titulo: true, subtitulo: true, conteudo: true },
      { titulo: 'O que fazemos por você' },
    ).secoes[0]
    expect(secao.titulo).toBe('O que fazemos por você')
    expect(secao.semIa).toEqual({ subtitulo: true, conteudo: true })
  })

  it('apaga o que a IA escreveu assim mesmo, sem tocar nas outras seções', () => {
    const doc = daIA()
    aplicarTextos(doc, briefingSemIa({ titulo: true, subtitulo: true, conteudo: true }))
    expect(doc.secoes[0].titulo).toBeUndefined()
    expect(doc.secoes[0].subtitulo).toBeUndefined()
    expect(doc.secoes[0].texto).toBeUndefined()
    expect(doc.secoes[1].titulo).toBe('Nossos números')
    expect(doc.secoes[1].subtitulo).toBe('Feitos por quem entende')
    expect(doc.secoes[1].texto).toBe('Anos de estrada.')
  })

  it('apaga só o campo dispensado', () => {
    const doc = daIA()
    aplicarTextos(doc, briefingSemIa({ subtitulo: true }))
    expect(doc.secoes[0].titulo).toBe('Soluções completas')
    expect(doc.secoes[0].subtitulo).toBeUndefined()
    expect(doc.secoes[0].texto).toBe('Cuidamos de cada etapa da obra.')
  })

  it('sem IA nenhuma, o título dispensado não vira o nome da seção', () => {
    const secao = documentoBase(briefingSemIa({ titulo: true, conteudo: true })).secoes[0]
    expect(secao.titulo).toBeUndefined()
    expect(secao.texto).toBeUndefined()
    // Sem marcação, o comportamento de sempre: o nome da seção vira título.
    expect(documentoBase(briefingSemIa(undefined)).secoes[0].titulo).toBe('Serviços')
  })
})

describe('botão da seção definido no briefing', () => {
  const botao = {
    texto: 'Peça um orçamento',
    url: '#contato',
    posicao: 'direita',
    hover: 'crescer',
    animacao: 'pulsar',
  }

  const comBotao = (b: unknown) =>
    coergirBriefing(
      {
        nome: 'Felix',
        secoes: [
          { id: 's1', nome: 'Serviços', layout: 'cards', vincularMenu: false, botao: b },
          { id: 's2', nome: 'Início', layout: 'hero', vincularMenu: false },
        ],
      },
      'Felix',
    )

  it('guarda texto, link, posição, hover e animação', () => {
    expect(comBotao(botao).secoes[0].botao).toEqual(botao)
  })

  it('descarta valores fora do catálogo e botão sem texto', () => {
    const b = comBotao({ ...botao, posicao: 'meio', hover: 'explodir', animacao: 'girar' })
      .secoes[0].botao
    expect(b?.texto).toBe('Peça um orçamento')
    expect(b?.posicao).toBeUndefined()
    expect(b?.hover).toBeUndefined()
    expect(b?.animacao).toBeUndefined()
    expect(comBotao({ texto: '   ', url: '#x' }).secoes[0].botao).toBeUndefined()
  })

  it('entra na página inclusive em layout que a IA não propõe botão', () => {
    const briefing = comBotao(botao)
    expect(documentoBase(briefing).secoes[0].botao?.texto).toBe('Peça um orçamento')

    const documento = coergirDocumento({
      secoes: [
        // A IA inventou outro botão aqui; o do usuário vence.
        { id: 's1', tipo: 'cards', nome: 'Serviços', itens: [], botao: { texto: 'Saiba mais', url: '#' } },
        { id: 's2', tipo: 'hero', nome: 'Início', itens: [] },
      ],
    })!
    aplicarBotoes(documento, briefing)
    expect(documento.secoes[0].botao?.texto).toBe('Peça um orçamento')
    expect(documento.secoes[0].botao?.animacao).toBe('pulsar')
    // Seção sem botão no briefing fica como a IA deixou.
    expect(documento.secoes[1].botao).toBeUndefined()
  })

  it('vence o botão padrão que hero e CTA ganham sem IA', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Felix',
        secoes: [{ id: 's1', nome: 'Início', layout: 'hero', vincularMenu: false, botao }],
      },
      'Felix',
    )
    expect(documentoBase(briefing).secoes[0].botao?.texto).toBe('Peça um orçamento')
  })
})

describe('menu do header ancorado nas seções', () => {
  /** Menu com nomes que NÃO batem com o nome das seções — o caso que quebrava. */
  const briefingMenu = () =>
    coergirBriefing(
      {
        nome: 'Felix',
        menu: [
          { id: 'm1', rotulo: 'Home', url: '' },
          { id: 'm2', rotulo: 'Quem Somos', url: '' },
          { id: 'm3', rotulo: 'Blog', url: 'https://blog.felix.com.br' },
        ],
        secoes: [
          { id: 's1', nome: 'Abertura', layout: 'hero', vincularMenu: true, itemMenu: 'm1' },
          { id: 's2', nome: 'Sobre nós', layout: 'texto-midia', vincularMenu: true, itemMenu: 'm2' },
          { id: 's3', nome: 'Contato', layout: 'formulario', vincularMenu: true },
        ],
      },
      'Felix',
    )

  it('guarda o item escolhido e descarta o que não existe no menu', () => {
    const b = briefingMenu()
    expect(b.secoes[0].itemMenu).toBe('m1')
    expect(b.secoes[2].itemMenu).toBeUndefined()

    const inventado = coergirBriefing(
      {
        nome: 'Felix',
        menu: [{ id: 'm1', rotulo: 'Home', url: '' }],
        secoes: [
          { id: 's1', nome: 'Abertura', layout: 'hero', vincularMenu: true, itemMenu: 'm9' },
          { id: 's2', nome: 'Fora', layout: 'cta', vincularMenu: false, itemMenu: 'm1' },
        ],
      },
      'Felix',
    )
    expect(inventado.secoes[0].itemMenu).toBeUndefined()
    // Seção fora do menu não reserva item nenhum.
    expect(inventado.secoes[1].itemMenu).toBeUndefined()
  })

  it('documentoBase leva cada item para a seção escolhida, não para a de nome parecido', () => {
    const doc = documentoBase(briefingMenu())
    const alvo = (rotulo: string) => doc.header.menu.find((m) => m.rotulo === rotulo)?.alvo
    const ancora = (nome: string) => doc.secoes.find((s) => s.nome === nome)?.ancora

    expect(alvo('Home')).toBe(`#${ancora('Abertura')}`)
    expect(alvo('Quem Somos')).toBe(`#${ancora('Sobre nós')}`)
    // Item com URL externa continua indo para fora.
    expect(alvo('Blog')).toBe('https://blog.felix.com.br')
    // Seção no menu que nenhum item reivindicou entra no fim, pelo nome dela.
    expect(alvo('Contato')).toBe(`#${ancora('Contato')}`)
    expect(doc.header.menu.every((m) => m.alvo !== '#topo')).toBe(true)
  })

  it('reimpõe o menu por cima do que a IA devolveu, criando âncora se faltar', () => {
    const briefing = briefingMenu()
    const doc = coergirDocumento({
      header: { logoTexto: 'Felix', menu: [{ rotulo: 'Início', alvo: '#nao-existe' }] },
      secoes: [
        { id: 's1', tipo: 'hero', nome: 'Abertura', ancora: 'abertura', itens: [] },
        // A IA esqueceu a âncora desta: o menu não teria para onde apontar.
        { id: 's2', tipo: 'texto-midia', nome: 'Sobre nós', itens: [] },
        { id: 's3', tipo: 'formulario', nome: 'Contato', ancora: 'contato', itens: [] },
      ],
    })!
    aplicarMenu(doc, briefing)

    expect(doc.header.menu.map((m) => m.rotulo)).toEqual([
      'Home',
      'Quem Somos',
      'Blog',
      'Contato',
    ])
    expect(doc.header.menu[0].alvo).toBe('#abertura')
    expect(doc.secoes[1].ancora).toBe('sobre-nos')
    expect(doc.header.menu[1].alvo).toBe('#sobre-nos')
    expect(doc.header.menu[2].alvo).toBe('https://blog.felix.com.br')
    expect(doc.header.menu[3].alvo).toBe('#contato')
  })

  it('sem itens no briefing, o menu da IA fica de pé', () => {
    const briefing = coergirBriefing(
      {
        nome: 'Felix',
        secoes: [{ id: 's1', nome: 'Abertura', layout: 'hero', vincularMenu: true }],
      },
      'Felix',
    )
    const doc = coergirDocumento({
      header: { logoTexto: 'Felix', menu: [{ rotulo: 'Início', alvo: '#abertura' }] },
      secoes: [{ id: 's1', tipo: 'hero', nome: 'Abertura', ancora: 'abertura', itens: [] }],
    })!
    aplicarMenu(doc, briefing)
    expect(doc.header.menu).toHaveLength(1)
    expect(doc.header.menu[0].rotulo).toBe('Início')
  })
})

describe('logo da Identidade', () => {
  const logo = {
    tipo: 'imagem',
    url: 'https://firebasestorage.googleapis.com/v0/b/e-nova/o/lp%2Ftrinca%2Flp1%2Flogo.png?alt=media',
    caminho: 'lp/trinca/lp1/logo.png',
    alt: 'logo.png',
    busca: '',
    orientacao: 'quadrado',
    largura: 500,
    altura: 320,
  }

  const comLogo = (l: unknown) =>
    coergirBriefing(
      {
        nome: 'Felix',
        logo: l,
        secoes: [{ id: 's1', nome: 'Início', layout: 'hero', vincularMenu: true }],
      },
      'Felix',
    )

  it('guarda a imagem enviada, com o caminho no bucket', () => {
    const b = comLogo(logo)
    expect(b.logo?.url).toBe(logo.url)
    expect(b.logo?.caminho).toBe('lp/trinca/lp1/logo.png')
  })

  it('recusa vídeo como logo', () => {
    expect(comLogo({ ...logo, tipo: 'video' }).logo).toBeUndefined()
    expect(comLogo(null).logo).toBeUndefined()
  })

  it('vai para o header da página e não é confundida com órfã no bucket', () => {
    const briefing = comLogo(logo)
    expect(documentoBase(briefing).header.logo?.url).toBe(logo.url)

    // Documento da IA (que não conhece a logo): o briefing reimpõe.
    const documento = coergirDocumento({
      secoes: [{ id: 's1', tipo: 'hero', nome: 'Início', itens: [] }],
    })!
    aplicarArquivos(documento, briefing)
    expect(documento.header.logo?.caminho).toBe('lp/trinca/lp1/logo.png')
    expect([...arquivosUsados({ documento, briefing })]).toContain('lp/trinca/lp1/logo.png')
  })

  it('sobrevive à gravação do documento pelo editor', () => {
    const salvo = coergirDocumento({
      header: { logoTexto: 'Felix', logo },
      secoes: [{ id: 's1', tipo: 'hero', nome: 'Início', itens: [] }],
    })!
    expect(salvo.header.logo?.url).toBe(logo.url)
  })
})

describe('identidade visual do briefing', () => {
  const briefingIdentidade = () =>
    coergirBriefing(
      {
        nome: 'Felix',
        tipografia: {
          titulos: { fonte: 'Poppins', peso: 800, tamanho: '20px' },
          textos: { fonte: 'Poppins', peso: 400, tamanho: '16px' },
        },
        cores: { principal: '#0d9488', titulos: '#134e4a', fundoPagina: '#f8fafc' },
        secoes: [{ id: 's1', nome: 'Início', layout: 'hero', vincularMenu: true }],
      },
      'Felix',
    )

  it('guarda fontes e cores escolhidas', () => {
    const b = briefingIdentidade()
    expect(b.tipografia.titulos).toEqual({ fonte: 'Poppins', peso: 800, tamanho: '20px' })
    expect(b.cores.principal).toBe('#0d9488')
  })

  it('vence a escolha da IA no documento gerado', () => {
    const b = briefingIdentidade()
    const doc = coergirDocumentoIA(
      {
        tema: {
          tipografia: { titulos: { fonte: 'Sora', peso: 700, tamanho: '42px' } },
          cores: { principal: '#2563eb', titulos: '#0f172a', fundoPagina: '#ffffff' },
        },
        secoes: [{ id: 's1', tipo: 'hero', nome: 'Início', titulo: 'Oi', itens: [] }],
      },
      b,
    )!
    expect(doc.tema.tipografia.titulos.fonte).toBe('Poppins')
    expect(doc.tema.tipografia.titulos.peso).toBe(800)
    expect(doc.tema.tipografia.titulos.tamanho).toBe('20px')
    expect(doc.tema.cores.principal).toBe('#0d9488')
    expect(doc.tema.cores.titulos).toBe('#134e4a')
    expect(doc.tema.cores.fundoPagina).toBe('#f8fafc')
    // O que o usuário não definiu continua por conta da IA.
    expect(doc.tema.tipografia.subtitulos.fonte).toBe(TEMA_PADRAO.tipografia.subtitulos.fonte)
  })

  it('guarda o texto do tema sobre mídia de fundo só quando é `false`', () => {
    const comFalse = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'hero',
          nome: 'Início',
          itens: [],
          fundo: { midia: { url: 'https://x/a.jpg', busca: 'a' }, textoClaro: false },
        },
      ],
    })!
    expect(comFalse.secoes[0].fundo?.textoClaro).toBe(false)

    const padrao = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'hero',
          nome: 'Início',
          itens: [],
          fundo: { midia: { url: 'https://x/a.jpg', busca: 'a' }, textoClaro: true },
        },
      ],
    })!
    expect(padrao.secoes[0].fundo?.textoClaro).toBeUndefined()
  })
})

describe('mídia da seção no briefing', () => {
  it('cada mudança preserva o que já estava escolhido', () => {
    // Bug real: a etapa remontava a mídia campo a campo e as opções de vídeo
    // ficavam de fora — marcar loop apagava o autoplay, e só uma parava em pé.
    let midia = mesclarMidiaBriefing(null, { busca: 'obra em andamento', tipo: 'video' })
    midia = mesclarMidiaBriefing(midia, { loop: true })
    midia = mesclarMidiaBriefing(midia, { autoplay: true })
    midia = mesclarMidiaBriefing(midia, { controles: false })
    midia = mesclarMidiaBriefing(midia, { orientacao: 'retrato' })

    expect(midia).toEqual({
      busca: 'obra em andamento',
      tipo: 'video',
      orientacao: 'retrato',
      loop: true,
      autoplay: true,
      controles: false,
    })
  })

  it('mantém o arquivo escolhido e aceita limpá-lo', () => {
    const arquivo = {
      tipo: 'imagem' as const,
      url: 'https://x/a.jpg',
      alt: 'a',
      busca: 'a',
      orientacao: 'paisagem' as const,
    }
    const comArquivo = mesclarMidiaBriefing({ busca: 'a', tipo: 'imagem', orientacao: 'paisagem' }, { arquivo })
    expect(mesclarMidiaBriefing(comArquivo, { busca: 'outra coisa' }).arquivo).toEqual(arquivo)
    expect(mesclarMidiaBriefing(comArquivo, { arquivo: null }).arquivo).toBeNull()
  })
})

describe('opções de reprodução do vídeo', () => {
  const secaoIA = (midia: unknown) =>
    coergirDocumento({
      secoes: [{ id: 's1', tipo: 'hero', nome: 'Início', itens: [], midia }],
    })!.secoes[0]

  it('sobrevivem no placeholder que a busca em banco ainda vai preencher', () => {
    const midia = secaoIA({
      busca: 'cidade à noite',
      tipo: 'video',
      orientacao: 'paisagem',
      controles: false,
      loop: true,
    }).midia
    expect(midia?.url).toMatch(/^data:image\/svg/)
    expect(midia?.controles).toBe(false)
    expect(midia?.loop).toBe(true)
    expect(midia?.autoplay).toBeUndefined()
  })

  it('não grudam em mídia de imagem, onde não significam nada', () => {
    const midia = secaoIA({
      url: 'https://x/a.jpg',
      busca: 'fachada',
      tipo: 'imagem',
      orientacao: 'paisagem',
      loop: true,
    }).midia
    expect(midia?.loop).toBeUndefined()
  })

  it('descarta valor que não é booleano', () => {
    const midia = secaoIA({
      url: 'https://x/a.mp4',
      busca: 'filme',
      tipo: 'video',
      orientacao: 'paisagem',
      loop: 'sim',
      autoplay: 1,
    }).midia
    expect(midia?.loop).toBeUndefined()
    expect(midia?.autoplay).toBeUndefined()
  })

  it('as do briefing valem para a mídia que a IA descreveu', () => {
    const briefing = coergirBriefing(
      {
        nome: 'P',
        secoes: [
          {
            id: 's1',
            nome: 'Início',
            layout: 'hero',
            vincularMenu: true,
            midia: {
              busca: 'cidade à noite',
              tipo: 'video',
              orientacao: 'paisagem',
              autoplay: true,
              loop: true,
            },
          },
        ],
      },
      'P',
    )
    expect(briefing.secoes[0].midia?.autoplay).toBe(true)

    const doc = coergirDocumento({
      secoes: [
        {
          id: 's1',
          tipo: 'hero',
          nome: 'Início',
          itens: [],
          midia: { busca: 'city at night', tipo: 'video', orientacao: 'paisagem' },
        },
      ],
    })!
    // Nenhum arquivo para reimpor — só as opções de reprodução.
    expect(aplicarArquivos(doc, briefing)).toEqual({ aplicadas: 0, perdidas: 0 })
    expect(doc.secoes[0].midia?.autoplay).toBe(true)
    expect(doc.secoes[0].midia?.loop).toBe(true)
    expect(doc.secoes[0].midia?.busca).toBe('city at night')
  })
})

describe('operações do editor', () => {
  const base = () => {
    const doc = documentoBase(briefingVazio('Teste'))
    doc.secoes = [novaSecao('hero'), novaSecao('cards'), novaSecao('cta')]
    return doc
  }

  it('item novo nasce com exemplo que combina com o layout', () => {
    // `extra` muda de sentido por layout: antes a timeline nascia com "R$ 99".
    // As expectativas são pelo formato, não pelo texto — o exemplo é conteúdo de
    // produto e vai mudando; o que não pode mudar é o que ele significa ali.
    expect(novoItem('timeline').extra).toMatch(/^\d{4}$/)
    expect(novoItem('estatisticas').extra).toMatch(/\d/)
    expect(novoItem('precos').extra).toMatch(/^R\$/)
    expect(novoItem('precos').detalhe).toMatch(/^\//)
    expect(novoItem('grid-produtos').extra).toMatch(/^R\$/)
    expect(novoItem('cards').extra).not.toBe('')
    expect(novoItem('cards').botao?.texto).not.toBe('')
  })

  it('itens da mesma seção nascem diferentes uns dos outros', () => {
    // Três cards com o mesmo texto é o que o usuário teria de apagar à mão.
    const titulos = [0, 1, 2].map((i) => novoItem('cards', i).titulo)
    expect(new Set(titulos).size).toBe(3)
    // Passar do fim da lista volta ao começo em vez de devolver item vazio.
    expect(novoItem('cards', 3).titulo).toBe(titulos[0])
  })

  it('âncora criada no editor não colide com a de outra seção', () => {
    const doc = documentoBase(briefingVazio('Teste'))
    doc.secoes = [novaSecao('cards'), novaSecao('cards')]
    doc.secoes[1].ancora = null
    // Duas âncoras iguais fariam o item do menu levar sempre à primeira seção.
    expect(garantirAncora(doc, doc.secoes[1])).toBe('cards-2')
    expect(garantirAncora(doc, doc.secoes[0])).toBe('cards')
  })

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

  it('gera a página de texto marcada e põe o link dela no rodapé', () => {
    const briefing = briefingVazio('Clínica Vida')
    briefing.paginas = [
      { tipo: 'termos', titulo: 'Termos de Uso', conteudo: 'Regras de uso.' },
      // Sem texto: a página não existe (sairia um arquivo em branco no ar).
      { tipo: 'privacidade', titulo: 'Política de Privacidade', conteudo: '   ' },
    ]
    const doc = documentoBase(briefing)
    // O rascunho sem texto continua no documento (dá para escrever depois)…
    expect(doc.paginas?.map((p) => p.tipo)).toEqual(['termos', 'privacidade'])
    // …mas só a página escrita vira arquivo e link no rodapé.
    expect(paginasGeradas(doc).map((p) => p.tipo)).toEqual(['termos'])
    expect(doc.footer.linksUteis.map((l) => [l.rotulo, l.url])).toEqual([
      ['Termos de Uso', 'termos.html'],
    ])
  })

  it('substitui o link de privacidade que a IA inventou e preserva os outros', () => {
    const briefing = briefingVazio('Clínica Vida')
    briefing.paginas = [
      { tipo: 'privacidade', titulo: 'Política de Privacidade', conteudo: 'Como tratamos dados.' },
    ]
    const doc = documentoBase(briefing)
    doc.footer.linksUteis = [
      { id: 'l1', rotulo: 'Trabalhe conosco', url: 'https://vagas.exemplo.com' },
      { id: 'l2', rotulo: 'Política de privacidade', url: '#' },
    ]
    aplicarPaginas(doc, briefing)
    expect(doc.footer.linksUteis.map((l) => l.url)).toEqual([
      'https://vagas.exemplo.com',
      'privacidade.html',
    ])
  })

  it('renomear e remover a página no editor acompanham o link do rodapé', () => {
    const briefing = briefingVazio('Clínica Vida')
    briefing.paginas = [{ tipo: 'termos', titulo: 'Termos de Uso', conteudo: 'Regras de uso.' }]
    const doc = documentoBase(briefing)
    const idOriginal = doc.footer.linksUteis[0].id

    doc.paginas![0].titulo = 'Termos e Condições'
    sincronizarLinksPaginas(doc)
    // Mesmo item do rodapé, só o rótulo muda — o id não dança a cada tecla.
    expect(doc.footer.linksUteis).toEqual([
      { id: idOriginal, rotulo: 'Termos e Condições', url: 'termos.html' },
    ])

    doc.paginas = []
    sincronizarLinksPaginas(doc)
    expect(doc.footer.linksUteis).toEqual([])
  })

  it('coerção do documento descarta página de tipo inválido e repetida', () => {
    const doc = coergirDocumento({
      ...respostaIA,
      paginas: [
        { tipo: 'termos', conteudo: 'Texto.' },
        { tipo: 'termos', titulo: 'Duplicada', conteudo: 'Outro.' },
        { tipo: 'cookies', conteudo: 'Texto.' },
        { tipo: 'privacidade', conteudo: '' },
      ],
    })
    // Título ausente vira o padrão; repetida e desconhecida saem; a que ainda
    // não tem texto fica guardada como rascunho.
    expect(doc?.paginas).toEqual([
      { tipo: 'termos', titulo: 'Termos de Uso', conteudo: 'Texto.' },
      { tipo: 'privacidade', titulo: 'Política de Privacidade', conteudo: '' },
    ])
  })

  it('edita o texto do botão do header e do rodapé pelo id', () => {
    const doc = base()
    doc.header.botoes = [{ id: 'b1', texto: 'Fale conosco', url: '#' }]
    doc.footer.botoes = [{ id: 'f1', texto: 'Orçamento', url: '#' }]
    expect(aplicarTexto(doc, 'header:botao:b1', 'Contato').header.botoes[0].texto).toBe('Contato')
    expect(aplicarTexto(doc, 'footer:botao:f1', 'Peça já').footer.botoes?.[0].texto).toBe('Peça já')
    // Apagar tudo sumiria com o botão e não haveria onde clicar de volta.
    expect(aplicarTexto(doc, 'header:botao:b1', '  ').header.botoes[0].texto).toBe('Fale conosco')
    expect(() => aplicarTexto(doc, 'header:botao:nao-existe', 'x')).not.toThrow()
  })

  it('edita o telefone do rodapé pelo id, sem apagá-lo quando fica vazio', () => {
    const doc = base()
    doc.footer.telefones = [{ id: 't1', numero: '(11) 3333-4444', whatsapp: false }]
    expect(aplicarTexto(doc, 'footer:telefone:t1', '(11) 90000-0000').footer.telefones).toEqual([
      { id: 't1', numero: '(11) 90000-0000', whatsapp: false },
    ])
    // Apagar tudo no canvas sumiria com a linha e não haveria onde clicar de volta.
    expect(aplicarTexto(doc, 'footer:telefone:t1', '  ').footer.telefones?.[0].numero).toBe(
      '(11) 3333-4444',
    )
    expect(() => aplicarTexto(doc, 'footer:telefone:nao-existe', 'x')).not.toThrow()
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

describe('não mostrar em — seção', () => {
  const secaoCom = (oculto: unknown) =>
    coergirDocumento({ secoes: [{ id: 'a', tipo: 'cta', nome: 'X', oculto }] })?.secoes[0]

  it('guarda só as telas marcadas', () => {
    expect(secaoCom({ celular: true, tablet: true })).toMatchObject({
      oculto: { celular: true, tablet: true },
    })
  })

  it('descarta tela inventada e valor que não é true', () => {
    expect(secaoCom({ relogio: true, celular: 'sim', tablet: false })?.oculto).toBeUndefined()
  })
})
