'use client'

import {
  ArrowLeft,
  Code2,
  Download,
  LayoutList,
  Monitor,
  Palette,
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
import { PainelCodigo } from './PainelCodigo'
import { PainelEstrutura } from './PainelEstrutura'
import { PainelPropriedades } from './PainelPropriedades'
import { PainelTema } from './PainelTema'
import { compilarEditor } from '@/lib/lp/compilador'
import {
  alterarDoc,
  aplicarTexto,
  duplicarSecao,
  inserirSecao,
  moverSecao,
  removerSecao,
} from '@/lib/lp/documento'
import { novaSecao } from '@/lib/lp/layouts'
import { reordenar } from './arrastar'
import type { LpDocumento, LpProjeto, TipoLayout } from '@/lib/lp/tipos'

type Dispositivo = 'desktop' | 'tablet' | 'mobile'
type Aba = 'estrutura' | 'editar' | 'tema'

const LARGURAS: Record<Dispositivo, string> = {
  desktop: '100%',
  tablet: '834px',
  mobile: '390px',
}

const DISPOSITIVOS: { chave: Dispositivo; rotulo: string; icone: typeof Monitor }[] = [
  { chave: 'desktop', rotulo: 'Computador', icone: Monitor },
  { chave: 'tablet', rotulo: 'Tablet', icone: Tablet },
  { chave: 'mobile', rotulo: 'Celular', icone: Smartphone },
]

const ABAS: { chave: Aba; rotulo: string; icone: typeof LayoutList }[] = [
  { chave: 'estrutura', rotulo: 'Estrutura', icone: LayoutList },
  { chave: 'editar', rotulo: 'Editar', icone: Settings2 },
  { chave: 'tema', rotulo: 'Tema', icone: Palette },
]

/** 'sec:ID:item:IID:campo' -> { secaoId, itemId, campo } */
function lerAlvo(alvo: string | null): { secaoId: string | null; itemId: string | null } {
  if (!alvo || !alvo.startsWith('sec:')) return { secaoId: null, itemId: null }
  const partes = alvo.split(':')
  const secaoId = partes[1] ?? null
  const itemId = partes[2] === 'item' ? (partes[3] ?? null) : null
  return { secaoId, itemId }
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
  const [itemId, setItemId] = useState<string | null>(null)
  const [mostrarCodigo, setMostrarCodigo] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [avisosVisiveis, setAvisosVisiveis] = useState(true)
  const [paraExcluir, setParaExcluir] = useState<string | null>(null)
  const [podeDesfazer, setPodeDesfazer] = useState(false)
  const [podeRefazer, setPodeRefazer] = useState(false)

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

  // Salvamento automático.
  useEffect(() => {
    if (salvo) return
    const timer = setTimeout(async () => {
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
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao salvar.')
      } finally {
        setSalvando(false)
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [doc, salvo, projeto.id])

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
        const alvo = typeof m.alvo === 'string' ? m.alvo : null
        alvoSelecionado.current = alvo
        const { secaoId: sid, itemId: iid } = lerAlvo(alvo)
        setSecaoId(sid)
        setItemId(iid)
        if (sid) setAba('editar')
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
      setItemId(null)
      setAba('editar')
      alvoSelecionado.current = `sec:${id}`
      enviarAoCanvas({ tipo: 'destacar', alvo: `sec:${id}`, rolar: true })
    },
    [enviarAoCanvas],
  )

  const nomeExcluir = doc.secoes.find((s) => s.id === paraExcluir)?.nome ?? ''

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

        <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5">
          {DISPOSITIVOS.map((d) => (
            <button
              key={d.chave}
              type="button"
              onClick={() => setDispositivo(d.chave)}
              aria-label={d.rotulo}
              title={d.rotulo}
              className={`rounded p-1.5 transition-colors ${
                dispositivo === d.chave ? 'bg-blue text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              <d.icone className="h-4 w-4" />
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-text-dim sm:inline">
            {salvando ? 'Salvando…' : salvo ? 'Salvo' : 'Alterações pendentes'}
          </span>
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
        <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-surface md:flex lg:w-80">
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
                aoSelecionar={selecionarSecao}
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
              />
            )}
            {aba === 'editar' && (
              <PainelPropriedades
                doc={doc}
                secaoId={secaoId}
                itemId={itemId}
                aplicar={aplicar}
                aoSelecionarItem={setItemId}
              />
            )}
            {aba === 'tema' && (
              <PainelTema doc={doc} aoMudar={(tema) => aplicar((d) => { d.tema = tema }, 'tema')} />
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-surface-2/30">
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div
              className="mx-auto h-full bg-white shadow-2xl transition-[width] duration-300"
              style={{ width: LARGURAS[dispositivo], maxWidth: '100%' }}
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
              setItemId(null)
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
