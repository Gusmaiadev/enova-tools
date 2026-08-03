import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { escalar, escalarLadoMaior, orientacaoDe } from './util'
import { traduzirPeloDicionario } from './traduzir'

describe('escalar', () => {
  it('reduz preservando a proporção', () => {
    expect(escalar(4000, 3000, 1920)).toEqual({ largura: 1920, altura: 1440 })
  })

  it('não amplia o que já é menor que o teto', () => {
    expect(escalar(800, 600, 1920)).toEqual({ largura: 800, altura: 600 })
  })

  it('devolve vazio quando a fonte não informou dimensão', () => {
    expect(escalar(undefined, 600, 1920)).toEqual({})
    expect(escalar(800, undefined, 1920)).toEqual({})
  })
})

describe('escalarLadoMaior', () => {
  it('limita o lado maior, não a largura (regra do largeImageURL do Pixabay)', () => {
    expect(escalarLadoMaior(5000, 3333, 1280)).toEqual({ largura: 1280, altura: 853 })
    // Em pé: 1280 vai para a ALTURA — escalar() daria 1280x1920, errado.
    expect(escalarLadoMaior(3333, 5000, 1280)).toEqual({ largura: 853, altura: 1280 })
  })

  it('não amplia o que já cabe', () => {
    expect(escalarLadoMaior(640, 480, 1280)).toEqual({ largura: 640, altura: 480 })
  })
})

describe('orientacaoDe', () => {
  it('classifica paisagem, retrato e quadrado', () => {
    expect(orientacaoDe(1920, 1080)).toBe('paisagem')
    expect(orientacaoDe(1080, 1920)).toBe('retrato')
    expect(orientacaoDe(1000, 1000)).toBe('quadrado')
  })

  it('trata 4:5 e 5:4 como quadrado (faixa larga de propósito)', () => {
    expect(orientacaoDe(1000, 1100)).toBe('quadrado')
    expect(orientacaoDe(1100, 1000)).toBe('quadrado')
  })

  it('devolve null sem dimensões', () => {
    expect(orientacaoDe(undefined, undefined)).toBeNull()
  })
})

describe('traduzirPeloDicionario', () => {
  it('traduz palavra a palavra e descarta as estruturais', () => {
    expect(traduzirPeloDicionario('reunião de equipe').termo).toBe('meeting team')
    expect(traduzirPeloDicionario('escritório moderno').termo).toBe('office modern')
  })

  it('ignora acentos e maiúsculas', () => {
    expect(traduzirPeloDicionario('MÉDICO').termo).toBe('doctor')
  })

  it('deixa passar o que não está no dicionário, sem acento', () => {
    const r = traduzirPeloDicionario('São Paulo skyline')
    expect(r.termo).toBe('sao paulo skyline')
    expect(r.cobertas).toBe(0)
  })

  it('conta cobertura para decidir se vale chamar a IA', () => {
    const r = traduzirPeloDicionario('advogado no escritório')
    expect(r.palavras).toBe(2)
    expect(r.cobertas).toBe(2)
  })

  it('não devolve vazio quando só há palavras estruturais', () => {
    expect(traduzirPeloDicionario('de para com').termo).toBe('de para com')
  })

  it('remove palavras repetidas depois de traduzir', () => {
    // 'time' e 'equipe' viram os dois 'team'.
    expect(traduzirPeloDicionario('time e equipe').termo).toBe('team')
  })
})

/* --------------------------- provedores (fetch mock) --------------------------- */

const FOTO_PEXELS = {
  photos: [
    {
      width: 4000,
      height: 3000,
      url: 'https://www.pexels.com/photo/123/',
      alt: 'Equipe em reunião',
      photographer: 'Fulano',
      photographer_url: 'https://www.pexels.com/@fulano',
      src: {
        original: 'https://images.pexels.com/photos/123/foto.jpeg',
        large2x: 'https://images.pexels.com/photos/123/foto.jpeg?w=940&h=650&dpr=2',
      },
    },
  ],
}

const VIDEO_PEXELS = {
  videos: [
    {
      image: 'https://images.pexels.com/videos/9/poster.jpeg',
      url: 'https://www.pexels.com/video/9/',
      duration: 32,
      user: { name: 'Ciclano', url: 'https://www.pexels.com/@ciclano' },
      video_files: [
        { link: 'https://videos.pexels.com/4k.mp4', file_type: 'video/mp4', width: 3840, height: 2160 },
        { link: 'https://videos.pexels.com/hd.mp4', file_type: 'video/mp4', width: 1920, height: 1080 },
        { link: 'https://videos.pexels.com/sd.mp4', file_type: 'video/mp4', width: 640, height: 360 },
      ],
    },
  ],
}

const IMAGEM_PIXABAY = {
  hits: [
    {
      pageURL: 'https://pixabay.com/photos/abc-1/',
      tags: 'office, team, meeting',
      previewURL: 'https://cdn.pixabay.com/abc_150.jpg',
      webformatURL: 'https://cdn.pixabay.com/abc_640.jpg',
      largeImageURL: 'https://cdn.pixabay.com/abc_1280.jpg',
      imageWidth: 5000,
      imageHeight: 3333,
      user: 'Beltrano',
      user_id: 42,
    },
  ],
}

const VIDEO_PIXABAY = {
  hits: [
    {
      pageURL: 'https://pixabay.com/videos/xyz-2/',
      tags: 'city, night',
      duration: 15,
      user: 'Beltrano',
      user_id: 42,
      videos: {
        large: { url: 'https://cdn.pixabay.com/4k.mp4', width: 3840, height: 2160, thumbnail: 'https://cdn.pixabay.com/4k.jpg' },
        medium: { url: 'https://cdn.pixabay.com/fhd.mp4', width: 1920, height: 1080, thumbnail: 'https://cdn.pixabay.com/fhd.jpg' },
        tiny: { url: 'https://cdn.pixabay.com/tiny.mp4', width: 640, height: 360, thumbnail: 'https://cdn.pixabay.com/tiny.jpg' },
      },
    },
  ],
}

function responder(corpo: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(corpo) } as Response)
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('PEXELS_API_KEY', 'chave-pexels')
  vi.stubEnv('PIXABAY_API_KEY', 'chave-pixabay')
  vi.stubEnv('ENVATO_TOKEN', '')
  // Sem chave de IA: a tradução fica só no dicionário (determinística).
  vi.stubEnv('GROQ_API_KEY', '')
  vi.stubEnv('GEMINI_API_KEY', '')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('preencherMidias', () => {
  it('troca o placeholder pelo resultado do banco sem perder as opções de vídeo', async () => {
    const { preencherMidias } = await import('../midias')
    const { documentoBase } = await import('../documento')
    const { novaSecao } = await import('../layouts')
    const { briefingVazio } = await import('../tipos')
    fetchMock.mockReturnValue(responder(VIDEO_PEXELS))

    const doc = documentoBase(briefingVazio('Teste'))
    const secao = novaSecao('texto-midia')
    secao.midia = {
      tipo: 'video',
      url: '',
      alt: 'Cidade à noite',
      busca: 'cidade à noite',
      orientacao: 'paisagem',
      controles: false,
      autoplay: true,
      loop: true,
    }
    doc.secoes = [secao]

    expect((await preencherMidias(doc)).preenchidas).toBe(1)
    const midia = doc.secoes[0].midia
    expect(midia?.url).toBe('https://videos.pexels.com/hd.mp4')
    // Reprodução é do lugar na página: o arquivo achado não a redefine.
    expect(midia?.controles).toBe(false)
    expect(midia?.autoplay).toBe(true)
    expect(midia?.loop).toBe(true)
    expect(midia?.busca).toBe('cidade à noite')
  })
})

describe('buscarNoPexels', () => {
  it('monta a URL da foto na largura da página, sem cortar', async () => {
    const { buscarNoPexels } = await import('./pexels')
    fetchMock.mockReturnValue(responder(FOTO_PEXELS))

    const r = await buscarNoPexels('team meeting', 'imagem', 'paisagem', 10)
    expect(r.ok).toBe(true)
    const m = (r as { midias: import('../tipos').LpMidia[] }).midias[0]
    // Sem `h` na query: redimensiona preservando a proporção (large2x cortaria).
    expect(m.url).toBe('https://images.pexels.com/photos/123/foto.jpeg?auto=compress&cs=tinysrgb&w=1920')
    expect(m.thumb).toBe('https://images.pexels.com/photos/123/foto.jpeg?auto=compress&cs=tinysrgb&w=600')
    expect(m.largura).toBe(1920)
    expect(m.altura).toBe(1440)
    expect(m.autor).toBe('Fulano')
    expect(m.fonte).toBe('pexels')
  })

  it('passa orientação e página para a API', async () => {
    const { buscarNoPexels } = await import('./pexels')
    fetchMock.mockReturnValue(responder(FOTO_PEXELS))

    await buscarNoPexels('team', 'imagem', 'retrato', 10, 3)
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('orientation=portrait')
    expect(url).toContain('page=3')
  })

  it('escolhe Full HD para a página e o menor mp4 para a prévia', async () => {
    const { buscarNoPexels } = await import('./pexels')
    fetchMock.mockReturnValue(responder(VIDEO_PEXELS))

    const r = await buscarNoPexels('city', 'video', 'paisagem', 5)
    const m = (r as { midias: import('../tipos').LpMidia[] }).midias[0]
    expect(m.url).toBe('https://videos.pexels.com/hd.mp4') // 4K descartado
    expect(m.previa).toBe('https://videos.pexels.com/sd.mp4')
    expect(m.thumb).toBe('https://images.pexels.com/videos/9/poster.jpeg')
    expect(m.duracao).toBe(32)
  })

  it('reporta chave inválida em 401', async () => {
    const { buscarNoPexels } = await import('./pexels')
    fetchMock.mockReturnValue(
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) } as Response),
    )
    expect(await buscarNoPexels('x', 'imagem', 'paisagem', 5)).toEqual({
      ok: false,
      chaveInvalida: true,
    })
  })
})

describe('buscarNoPixabay', () => {
  it('usa largeImageURL na página (webformatURL expira em 24h)', async () => {
    const { buscarNoPixabay } = await import('./pixabay')
    fetchMock.mockReturnValue(responder(IMAGEM_PIXABAY))

    const r = await buscarNoPixabay('team meeting', 'imagem', 'paisagem', 10)
    const m = (r as { midias: import('../tipos').LpMidia[] }).midias[0]
    expect(m.url).toBe('https://cdn.pixabay.com/abc_1280.jpg')
    expect(m.thumb).toBe('https://cdn.pixabay.com/abc_640.jpg')
    expect(m.alt).toBe('Office, team, meeting')
    expect(m.autorUrl).toBe('https://pixabay.com/users/Beltrano-42/')
    // 5000x3333 reduzido para 1280 no lado maior.
    expect(m.largura).toBe(1280)
    expect(m.altura).toBe(853)
  })

  it('traduz orientação e omite o parâmetro em quadrado (a API não tem)', async () => {
    const { buscarNoPixabay } = await import('./pixabay')
    fetchMock.mockReturnValue(responder(IMAGEM_PIXABAY))

    await buscarNoPixabay('x', 'imagem', 'retrato', 5)
    expect(String(fetchMock.mock.calls[0][0])).toContain('orientation=vertical')

    fetchMock.mockClear()
    await buscarNoPixabay('x', 'imagem', 'quadrado', 5)
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('orientation=')
  })

  it('prefere Full HD ao 4K no vídeo e leva o thumbnail', async () => {
    const { buscarNoPixabay } = await import('./pixabay')
    fetchMock.mockReturnValue(responder(VIDEO_PIXABAY))

    const r = await buscarNoPixabay('city', 'video', 'paisagem', 5)
    const m = (r as { midias: import('../tipos').LpMidia[] }).midias[0]
    expect(m.url).toBe('https://cdn.pixabay.com/fhd.mp4')
    expect(m.previa).toBe('https://cdn.pixabay.com/tiny.mp4')
    expect(m.thumb).toBe('https://cdn.pixabay.com/fhd.jpg')
  })
})

describe('buscarMidias (orquestrador)', () => {
  it('traduz o termo, soma as fontes e intercala os resultados', async () => {
    const { buscarMidias } = await import('./index')
    fetchMock.mockImplementation((url: string) =>
      responder(String(url).includes('pexels') ? FOTO_PEXELS : IMAGEM_PIXABAY),
    )

    const r = await buscarMidias('reunião de equipe', 'imagem', 'paisagem', { limite: 10 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.traduzido).toBe(true)
    expect(r.termo).toBe('meeting team')
    expect(r.original).toBe('reunião de equipe')
    expect(r.fontes).toEqual(['pexels', 'pixabay'])
    expect(r.midias).toHaveLength(2)
    // Intercalado: um de cada fonte por rodada.
    expect(r.midias.map((m) => m.fonte)).toEqual(['pexels', 'pixabay'])
    // O `busca` guardado é o termo traduzido enviado à API; o editor sobrescreve
    // com o texto do usuário ao escolher/preencher.
    expect(r.midias[0].busca).toBe('meeting team')
  })

  it('deixa o Envato de fora quando existe fonte principal', async () => {
    vi.stubEnv('ENVATO_TOKEN', 'token-envato')
    const { bancosAtivos } = await import('./index')
    expect(bancosAtivos()).toEqual(['pexels', 'pixabay'])
  })

  it('usa o Envato como reserva quando é a única fonte com chave', async () => {
    vi.stubEnv('PEXELS_API_KEY', '')
    vi.stubEnv('PIXABAY_API_KEY', '')
    vi.stubEnv('ENVATO_TOKEN', 'token-envato')
    const { bancosAtivos } = await import('./index')
    expect(bancosAtivos()).toEqual(['envato'])
  })

  it('avisa semChave quando nenhuma fonte está configurada', async () => {
    vi.stubEnv('PEXELS_API_KEY', '')
    vi.stubEnv('PIXABAY_API_KEY', '')
    const { buscarMidias } = await import('./index')

    const r = await buscarMidias('office', 'imagem', 'paisagem')
    expect(r).toMatchObject({ ok: false, semChave: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('erra só quando TODAS as fontes falham', async () => {
    const { buscarMidias } = await import('./index')
    fetchMock.mockReturnValue(
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response),
    )

    const r = await buscarMidias('office building', 'imagem', 'paisagem')
    expect(r.ok).toBe(false)
  })

  it('não descarta resultado sem dimensão conhecida no filtro de formato', async () => {
    vi.stubEnv('PIXABAY_API_KEY', '')
    const { buscarMidias } = await import('./index')
    // Foto sem width/height: a fonte já filtrou por orientação, então fica.
    fetchMock.mockReturnValue(
      responder({ photos: [{ src: { original: 'https://images.pexels.com/photos/1/a.jpeg' } }] }),
    )

    const r = await buscarMidias('office building', 'imagem', 'retrato')
    expect(r.ok && r.midias).toHaveLength(1)
  })

  it('remove repetidos pela mesma página de origem', async () => {
    vi.stubEnv('PIXABAY_API_KEY', '')
    const { buscarMidias } = await import('./index')
    fetchMock.mockReturnValue(
      responder({
        photos: [
          { url: 'https://www.pexels.com/photo/1/', src: { original: 'https://a/1.jpg' } },
          { url: 'https://www.pexels.com/photo/1/', src: { original: 'https://a/2.jpg' } },
        ],
      }),
    )

    const r = await buscarMidias('office building', 'imagem', 'paisagem')
    expect(r.ok && r.midias).toHaveLength(1)
  })
})
