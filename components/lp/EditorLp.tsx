'use client'

import {
  ArrowLeft,
  Code2,
  Download,
  ExternalLink,
  LayoutList,
  Laptop,
  Monitor,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  Settings2,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/Button'
import { Erro } from '@/components/Campo'
import { ModalConfirmacao } from '@/components/ModalConfirmacao'
import { ModalExportar } from './ModalExportar'
import { ModalPagina } from './ModalPagina'
import { PainelCodigo } from './PainelCodigo'
import { PainelEstrutura } from './PainelEstrutura'
import { PainelPropriedades } from './PainelPropriedades'
import { PainelWidget } from './PainelWidget'
import { PainelTema } from './PainelTema'
import { compilarEditor } from '@/lib/lp/compilador'
import {
  alterarDoc,
  aplicarTexto,
  duplicarSecao,
  inserirSecao,
  moverSecao,
  removerSecao,
  sincronizarLinksPaginas,
} from '@/lib/lp/documento'
import { novaSecao } from '@/lib/lp/layouts'
import { reordenar } from './arrastar'
import type {
  Dispositivo,
  LpDocumento,
  LpProjeto,
  PaginaLegal,
  TipoLayout,
  TipoPaginaLegal,
} from '@/lib/lp/tipos'
import { PAGINAS_LEGAIS, infoPagina } from '@/lib/lp/tipos'
import { BREAKPOINT } from '@/lib/lp/padroes'

type Aba = 'estrutura' | 'editar' | 'tema'

/**
 * Largura simulada de cada breakpoint na prévia. Um por `Dispositivo`, na mesma
 * ordem — escolher aqui é escolher qual conjunto de estilos os painéis editam.
 *
 * A largura fica DENTRO da banda do breakpoint, o que nem sempre bate com o
 * aparelho real: celular deitado do iPhone 14 tem 844px, mas a banda vai até
 * 767px (acima disso é tablet). Usamos 736px, que é celular deitado de verdade
 * e cai na banda certa — senão o botão mostraria estilos de outro breakpoint.
 */
const TELAS: {
  dispositivo: Dispositivo
  nome: string
  largura: string
  icone: typeof Monitor
  /** Ícone girado 90° representa a tela deitada. */
  deitado?: boolean
}[] = [
  { dispositivo: 'desktop', nome: 'Computador', largura: '100%', icone: Monitor },
  { dispositivo: 'notebook', nome: 'Notebook · 1366px', largura: '1366px', icone: Laptop },
  {
    dispositivo: 'tabletDeitado',
    nome: 'Tablet deitado · 1024px',
    largura: '1024px',
    icone: Tablet,
    deitado: true,
  },
  { dispositivo: 'tablet', nome: 'Tablet em pé · 834px', largura: '834px', icone: Tablet },
  {
    dispositivo: 'celularDeitado',
    nome: 'Celular deitado · 736px',
    largura: '736px',
    icone: Smartphone,
    deitado: true,
  },
  { dispositivo: 'celular', nome: 'Celular em pé · 390px', largura: '390px', icone: Smartphone },
]

/** Rótulo do botão: o tamanho simulado e a faixa de CSS que ele edita. */
const rotuloTela = (t: (typeof TELAS)[number]) => {
  const max = BREAKPOINT[t.dispositivo]
  return max === null ? `${t.nome} — estilos base` : `${t.nome} — estilos até ${max}px`
}

const ABAS: { chave: Aba; rotulo: string; icone: typeof LayoutList }[] = [
  { chave: 'estrutura', rotulo: 'Estrutura', icone: LayoutList },
  { chave: 'editar', rotulo: 'Editar', icone: Settings2 },
  { chave: 'tema', rotulo: 'Tema', icone: Palette },
]

/**
 * 'el:ID' é um nó da árvore; 'sec:ID' é a seção inteira, que ainda tem painel
 * próprio para nome, âncora, fundo e espaçamento.
 */
function lerAlvo(alvo: string | null): { secaoId: string | null; noId: string | null } {
  if (alvo?.startsWith('el:')) return { secaoId: null, noId: alvo.slice(3) }
  if (!alvo || !alvo.startsWith('sec:')) return { secaoId: null, noId: null }
  return { secaoId: alvo.split(':')[1] ?? null, noId: null }
}

export function EditorLp({
  projeto,
  avisos: avisosIniciais,
}: {
  projeto: LpProjeto & { documento: LpDocumento }
  avisos: string[]
}) {
  const [doc, setDocEstado] = useState<LpDocumento>(projeto.documento)
  const [srcDoc, setSrcDoc] = useState(() => compilarEditor(projeto.documento))
  const [aba, setAba] = useState<Aba>('estrutura')
  const [dispositivo, setDispositivo] = useState<Dispositivo>('desktop')
  const [secaoId, setSecaoId] = useState<string | null>(null)
  // Nó da árvore selecionado no canvas (formato novo).
  const [noId, setNoId] = useState<string | null>(null)
  // O rodapé não é seção: o painel precisa do alvo cru para editá-lo.
  const [alvo, setAlvo] = useState<string | null>(null)
  const [mostrarCodigo, setMostrarCodigo] = useState(false)
  // Painel da esquerda fechado = a página ocupando a tela inteira.
  const [painelAberto, setPainelAberto] = useState(true)
  const [exportando, setExportando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [avisosVisiveis, setAvisosVisiveis] = useState(true)
  const [paraExcluir, setParaExcluir] = useState<string | null>(null)
  const [paginaAberta, setPaginaAberta] = useState<TipoPaginaLegal | null>(null)
  const [paginaParaExcluir, setPaginaParaExcluir] = useState<TipoPaginaLegal | null>(null)
  const [podeDesfazer, setPodeDesfazer] = useState(false)
  const [podeRefazer, setPodeRefazer] = useState(false)

  // Um estado so para a previa e para os paineis: com dois, a previa mostraria
  // um tamanho e o campo gravaria em outro.
  const larguraPrevia = TELAS.find((t) => t.dispositivo === dispositivo)?.largura ?? '100%'

  const avisos = avisosVisiveis ? avisosIniciais : []

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const docRef = useRef(projeto.documento)
  const historico = useRef<LpDocumento[]>([projeto.documento])
  const posicao = useRef(0)
  const ultimoGrupo = useRef<{ chave: string; quando: number } | null>(null)
  const pularRender = useRef(false)
  const rolagem = useRef(0)
  const alvoSelecionado = useRef<string | null>(null)

  const enviarAoCanvas = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage({ ...msg, lpEditor: true }, '*')
  }, [])

  /** Botões de desfazer/refazer acompanham a pilha (que vive em refs). */
  const sincronizarHistorico = useCallback(() => {
    setPodeDesfazer(posicao.current > 0)
    setPodeRefazer(posicao.current < historico.current.length - 1)
  }, [])

  const definirDoc = useCallback(
    (
      novo: LpDocumento,
      opcoes: { historico?: boolean; agrupar?: string; doIframe?: boolean } = {},
    ) => {
      docRef.current = novo
      if (opcoes.doIframe) pularRender.current = true
      setDocEstado(novo)
      setSalvo(false)

      if (opcoes.historico !== false) {
        const agora = Date.now()
        const anterior = ultimoGrupo.current
        if (
          opcoes.agrupar &&
          anterior &&
          anterior.chave === opcoes.agrupar &&
          agora - anterior.quando < 900
        ) {
          historico.current[posicao.current] = novo
        } else {
          historico.current = [
            ...historico.current.slice(0, posicao.current + 1),
            novo,
          ].slice(-80)
          posicao.current = historico.current.length - 1
        }
        ultimoGrupo.current = opcoes.agrupar ? { chave: opcoes.agrupar, quando: agora } : null
        sincronizarHistorico()
      }
    },
    [sincronizarHistorico],
  )

  /** Mutação imutável do documento (usada por todos os painéis). */
  const aplicar = useCallback(
    (mut: (d: LpDocumento) => void, agrupar?: string) => {
      definirDoc(alterarDoc(docRef.current, mut), { agrupar })
    },
    [definirDoc],
  )

  const desfazer = useCallback(() => {
    if (posicao.current <= 0) return
    posicao.current -= 1
    const alvo = historico.current[posicao.current]
    docRef.current = alvo
    setDocEstado(alvo)
    setSalvo(false)
    ultimoGrupo.current = null
    sincronizarHistorico()
  }, [sincronizarHistorico])

  const refazer = useCallback(() => {
    if (posicao.current >= historico.current.length - 1) return
    posicao.current += 1
    const alvo = historico.current[posicao.current]
    docRef.current = alvo
    setDocEstado(alvo)
    setSalvo(false)
    ultimoGrupo.current = null
    sincronizarHistorico()
  }, [sincronizarHistorico])

  // Recompila o canvas (menos quando a mudança veio de dentro dele).
  useEffect(() => {
    if (pularRender.current) {
      pularRender.current = false
      return
    }
    const timer = setTimeout(() => setSrcDoc(compilarEditor(doc)), 300)
    return () => clearTimeout(timer)
  }, [doc])

  /** Grava o documento agora. Devolve se deu certo (nunca lança). */
  const salvarAgora = useCallback(async (): Promise<boolean> => {
    setSalvando(true)
    try {
      const r = await fetch(`/api/lp/projetos/${projeto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento: docRef.current }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.erro ?? 'Falha ao salvar.')
      }
      setSalvo(true)
      setErro(null)
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar.')
      return false
    } finally {
      setSalvando(false)
    }
  }, [projeto.id])

  // Salvamento automático.
  useEffect(() => {
    if (salvo) return
    const timer = setTimeout(() => void salvarAgora(), 1800)
    return () => clearTimeout(timer)
  }, [doc, salvo, salvarAgora])

  /**
   * Abre só a landing page numa aba nova. Ela é servida a partir do que está
   * gravado, então o que ainda não foi salvo vai antes — e a aba é aberta já no
   * clique (depois do `await` o navegador trataria como pop-up e bloquearia).
   */
  const abrirEmNovaAba = useCallback(async () => {
    const aba = window.open('', '_blank')
    if (!aba) {
      setErro('O navegador bloqueou a aba nova. Libere os pop-ups deste site e tente de novo.')
      return
    }
    if (salvo || (await salvarAgora())) {
      aba.location.replace(`/api/lp/previa/${projeto.id}/index.html`)
    } else {
      aba.close()
    }
  }, [projeto.id, salvo, salvarAgora])

  // Mensagens vindas do canvas.
  useEffect(() => {
    function aoReceber(evento: MessageEvent) {
      // Só o canvas comanda o documento — o iframe é sandbox sem
      // allow-same-origin (origin "null"), então a identidade da janela é o critério.
      if (evento.source !== iframeRef.current?.contentWindow) return
      const m = evento.data as Record<string, unknown> | null
      if (!m || m.lpEditor !== true) return

      if (m.tipo === 'atalho') {
        if (m.acao === 'refazer') refazer()
        else desfazer()
        return
      }
      if (m.tipo === 'pronto') {
        enviarAoCanvas({ tipo: 'ir-scroll', y: rolagem.current })
        if (alvoSelecionado.current) {
          enviarAoCanvas({ tipo: 'destacar', alvo: alvoSelecionado.current })
        }
        return
      }
      if (m.tipo === 'scroll') {
        rolagem.current = Number(m.y) || 0
        return
      }
      if (m.tipo === 'selecionar') {
        const selecionado = typeof m.alvo === 'string' ? m.alvo : null
        alvoSelecionado.current = selecionado
        setAlvo(selecionado)
        const { secaoId: sid, noId: nid } = lerAlvo(selecionado)
        setSecaoId(sid)
        setNoId(nid)
        // Header e rodapé também têm painel próprio (botões, telefones).
        if (sid || nid || /^(header|footer)/.test(selecionado ?? '')) setAba('editar')
        return
      }
      if ((m.tipo === 'texto' || m.tipo === 'texto-fim') && typeof m.alvo === 'string') {
        const valor = typeof m.valor === 'string' ? m.valor : ''
        definirDoc(aplicarTexto(docRef.current, m.alvo, valor), {
          doIframe: true,
          historico: m.tipo === 'texto-fim',
          agrupar: `texto-${m.alvo}`,
        })
        return
      }
      if (m.tipo === 'secao-acao' && typeof m.alvo === 'string') {
        const { secaoId: sid } = lerAlvo(m.alvo)
        if (!sid) return
        if (m.acao === 'subir') definirDoc(moverSecao(docRef.current, sid, -1))
        if (m.acao === 'descer') definirDoc(moverSecao(docRef.current, sid, 1))
        if (m.acao === 'duplicar') definirDoc(duplicarSecao(docRef.current, sid))
        if (m.acao === 'excluir') setParaExcluir(sid)
      }
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [definirDoc, enviarAoCanvas, desfazer, refazer])

  // Atalhos de desfazer/refazer.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      const alvo = e.target as HTMLElement | null
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) refazer()
        else desfazer()
      }
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault()
        refazer()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [desfazer, refazer])

  // A tela do editor ocupa a janela inteira.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const selecionarSecao = useCallback(
    (id: string) => {
      setSecaoId(id)
      setNoId(null)
      setAba('editar')
      setAlvo(`sec:${id}`)
      alvoSelecionado.current = `sec:${id}`
      enviarAoCanvas({ tipo: 'destacar', alvo: `sec:${id}`, rolar: true })
    },
    [enviarAoCanvas],
  )

  /** Seleciona um nó da árvore (canvas ou caminho clicável do painel). */
  const selecionarNo = useCallback(
    (id: string) => {
      setNoId(id)
      setSecaoId(null)
      setAlvo(`el:${id}`)
      alvoSelecionado.current = `el:${id}`
      setAba('editar')
      enviarAoCanvas({ tipo: 'destacar', alvo: `el:${id}`, rolar: true })
    },
    [enviarAoCanvas],
  )

  /**
   * Páginas de texto (termos, privacidade) vivem no documento, fora do canvas:
   * mexer nelas aqui evita ter de gerar de novo — o que substituiria a página.
   */
  const mudarPagina = useCallback(
    (tipo: TipoPaginaLegal, patch: Partial<PaginaLegal>, agrupar?: string) => {
      aplicar((d) => {
        const pagina = d.paginas?.find((p) => p.tipo === tipo)
        if (!pagina) return
        Object.assign(pagina, patch)
        // O rótulo no rodapé acompanha o título da página.
        if (patch.titulo !== undefined) sincronizarLinksPaginas(d)
      }, agrupar)
    },
    [aplicar],
  )

  const adicionarPagina = useCallback(
    (tipo: TipoPaginaLegal) => {
      aplicar((d) => {
        const paginas = [...(d.paginas ?? [])]
        if (paginas.some((p) => p.tipo === tipo)) return
        paginas.push({ tipo, titulo: infoPagina(tipo).titulo, conteudo: '' })
        // Mesma ordem de PAGINAS_LEGAIS, para a lista não depender do clique.
        d.paginas = PAGINAS_LEGAIS.map((info) =>
          paginas.find((p) => p.tipo === info.tipo),
        ).filter((p): p is PaginaLegal => p !== undefined)
        sincronizarLinksPaginas(d)
      })
      setPaginaAberta(tipo)
    },
    [aplicar],
  )

  const nomeExcluir = doc.secoes.find((s) => s.id === paraExcluir)?.nome ?? ''
  const paginaAtual = doc.paginas?.find((p) => p.tipo === paginaAberta) ?? null
  const nomePaginaExcluir =
    doc.paginas?.find((p) => p.tipo === paginaParaExcluir)?.titulo ?? 'esta página'

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col bg-bg">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Link
          href={`/app/lp/${projeto.id}`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Briefing</span>
        </Link>

        <span className="max-w-40 truncate font-display text-sm font-semibold sm:max-w-none">
          {projeto.nome}
        </span>

        <button
          type="button"
          onClick={() => setPainelAberto(!painelAberto)}
          aria-pressed={!painelAberto}
          aria-label={painelAberto ? 'Fechar o painel de edição' : 'Abrir o painel de edição'}
          title={
            painelAberto
              ? 'Fechar o painel e ver só a página'
              : 'Abrir o painel de edição'
          }
          className={`ml-1 hidden rounded-md p-2 transition-colors md:block ${
            painelAberto
              ? 'text-text-dim hover:bg-surface-2 hover:text-text'
              : 'bg-blue/10 text-blue'
          }`}
        >
          {painelAberto ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        <div className="mx-1 flex items-center gap-0.5">
          <button
            type="button"
            onClick={desfazer}
            disabled={!podeDesfazer}
            aria-label="Desfazer"
            title="Desfazer (Ctrl+Z)"
            className="rounded-md p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={refazer}
            disabled={!podeRefazer}
            aria-label="Refazer"
            title="Refazer (Ctrl+Shift+Z)"
            className="rounded-md p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div
          role="group"
          aria-label="Tamanho da prévia"
          className="flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5"
        >
          {TELAS.map((t) => (
            <button
              key={t.dispositivo}
              type="button"
              onClick={() => setDispositivo(t.dispositivo)}
              aria-label={rotuloTela(t)}
              aria-pressed={dispositivo === t.dispositivo}
              title={rotuloTela(t)}
              className={`rounded p-1.5 transition-colors ${
                dispositivo === t.dispositivo ? 'bg-blue text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              <t.icone className={`h-4 w-4 ${t.deitado ? 'rotate-90' : ''}`} />
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-text-dim sm:inline">
            {salvando ? 'Salvando…' : salvo ? 'Salvo' : 'Alterações pendentes'}
          </span>
          <button
            type="button"
            onClick={() => void abrirEmNovaAba()}
            title="Abrir só a landing page numa aba nova"
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Nova aba</span>
          </button>
          <button
            type="button"
            onClick={() => setMostrarCodigo(!mostrarCodigo)}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              mostrarCodigo
                ? 'border-blue bg-blue/10 text-blue'
                : 'border-border bg-surface-2 hover:border-blue/60'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Código</span>
          </button>
          <Button onClick={() => setExportando(true)} className="h-8 px-3 text-xs">
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>
      </header>

      {(erro || avisos.length > 0) && (
        <div className="shrink-0 space-y-2 border-b border-border bg-surface px-3 py-2">
          {erro ? <Erro>{erro}</Erro> : null}
          {avisos.length > 0 && (
            <div className="flex items-start gap-3 rounded-md border border-yellow/30 bg-yellow/5 px-3 py-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-yellow" />
              <p className="flex-1 text-xs text-text-dim">{avisos.join(' ')}</p>
              <button
                type="button"
                onClick={() => setAvisosVisiveis(false)}
                aria-label="Dispensar avisos"
                className="rounded p-1 text-text-dim transition-colors hover:text-text"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      <p className="shrink-0 border-b border-border bg-surface px-3 py-2 text-xs text-text-dim md:hidden">
        Edição disponível no computador. Aqui você pode pré-visualizar e exportar.
      </p>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`w-72 shrink-0 flex-col border-r border-border bg-surface lg:w-80 ${
            painelAberto ? 'hidden md:flex' : 'hidden'
          }`}
        >
          <div className="flex shrink-0 border-b border-border">
            {ABAS.map((a) => (
              <button
                key={a.chave}
                type="button"
                onClick={() => setAba(a.chave)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs font-medium transition-colors ${
                  aba === a.chave
                    ? 'border-blue text-text'
                    : 'border-transparent text-text-dim hover:text-text'
                }`}
              >
                <a.icone className="h-3.5 w-3.5" />
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {aba === 'estrutura' && (
              <PainelEstrutura
                doc={doc}
                selecionadoId={secaoId}
                noSelecionadoId={noId}
                aoSelecionar={selecionarSecao}
                aoSelecionarNo={selecionarNo}
                aoMover={(de, para) =>
                  definirDoc(
                    alterarDoc(docRef.current, (d) => {
                      d.secoes = reordenar(d.secoes, de, para)
                    }),
                  )
                }
                aoDuplicar={(id) => definirDoc(duplicarSecao(docRef.current, id))}
                aoExcluir={(id) => setParaExcluir(id)}
                aoAdicionar={(tipo: TipoLayout, aposId) => {
                  const secao = novaSecao(tipo)
                  definirDoc(inserirSecao(docRef.current, secao, aposId))
                  selecionarSecao(secao.id)
                }}
                aoAbrirPagina={setPaginaAberta}
                aoAdicionarPagina={adicionarPagina}
                aoExcluirPagina={setPaginaParaExcluir}
              />
            )}
            {aba === 'editar' &&
              // Nó da árvore vai para o painel por widget; seção ainda não
              // migrada (e header/rodapé, que não são seção) segue no antigo.
              (noId ? (
                <PainelWidget
                  doc={doc}
                  lpId={projeto.id}
                  noId={noId}
                  aplicar={aplicar}
                  aoSelecionar={selecionarNo}
                  dispositivo={dispositivo}
                  aoTrocarDispositivo={setDispositivo}
                />
              ) : (
                <PainelPropriedades
                  doc={doc}
                  lpId={projeto.id}
                  secaoId={secaoId}
                  alvo={alvo}
                  aplicar={aplicar}
                />
              ))}
            {aba === 'tema' && (
              <PainelTema
                doc={doc}
                lpId={projeto.id}
                aoMudar={(tema) => aplicar((d) => { d.tema = tema }, 'tema')}
                aoMudarLogo={(logo) => aplicar((d) => { d.header.logo = logo })}
              />
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-surface-2/30">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div
              className="mx-auto h-full bg-white shadow-2xl transition-[width] duration-300"
              style={{ width: larguraPrevia, maxWidth: '100%' }}
            >
              <iframe
                ref={iframeRef}
                title="Pré-visualização da landing page"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-popups"
                className="h-full w-full border-0"
              />
            </div>
          </div>
          {mostrarCodigo && <PainelCodigo doc={doc} aoFechar={() => setMostrarCodigo(false)} />}
        </main>
      </div>

      <ModalExportar
        aberto={exportando}
        lpId={projeto.id}
        doc={doc}
        aoFechar={() => setExportando(false)}
      />

      <ModalPagina
        doc={doc}
        pagina={paginaAtual}
        aoMudar={(patch, agrupar) => {
          if (paginaAberta) mudarPagina(paginaAberta, patch, agrupar)
        }}
        aoFechar={() => setPaginaAberta(null)}
      />

      <ModalConfirmacao
        aberto={paginaParaExcluir !== null}
        titulo="Excluir página"
        variante="danger"
        textoConfirmar="Excluir"
        onConfirmar={() => {
          const tipo = paginaParaExcluir
          if (tipo) {
            aplicar((d) => {
              d.paginas = (d.paginas ?? []).filter((p) => p.tipo !== tipo)
              sincronizarLinksPaginas(d)
            })
            if (paginaAberta === tipo) setPaginaAberta(null)
          }
          setPaginaParaExcluir(null)
        }}
        onCancelar={() => setPaginaParaExcluir(null)}
        mensagem={
          <>
            A página <strong className="text-text">{nomePaginaExcluir}</strong> e o texto dela saem
            do projeto, junto com o link no rodapé. Você pode desfazer com Ctrl+Z.
          </>
        }
      />

      <ModalConfirmacao
        aberto={paraExcluir !== null}
        titulo="Excluir seção"
        variante="danger"
        textoConfirmar="Excluir"
        onConfirmar={() => {
          if (paraExcluir) {
            definirDoc(removerSecao(docRef.current, paraExcluir))
            if (secaoId === paraExcluir) {
              setSecaoId(null)
              setAlvo(null)
              alvoSelecionado.current = null
            }
          }
          setParaExcluir(null)
        }}
        onCancelar={() => setParaExcluir(null)}
        mensagem={
          <>
            A seção <strong className="text-text">{nomeExcluir}</strong> será removida da página.
            Você pode desfazer com Ctrl+Z.
          </>
        }
      />
    </div>
  )
}
