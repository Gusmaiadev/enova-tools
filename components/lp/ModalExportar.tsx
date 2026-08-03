'use client'

import { FileCode, FolderTree, Loader2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Aviso, Erro } from '@/components/Campo'
import { useFocoModal } from '@/components/useFocoModal'
import { paginasGeradas } from '@/lib/lp/documento'
import type { FormatoExport } from '@/lib/lp/exportar'
import type { LpDocumento } from '@/lib/lp/tipos'
import { infoPagina } from '@/lib/lp/tipos'

const OPCOES: {
  formato: FormatoExport
  titulo: string
  descricao: string
  estrutura: string[]
  icone: typeof FileCode
}[] = [
  {
    formato: 'unico',
    titulo: 'Arquivo único',
    descricao: 'Tudo em um index.html só, com o CSS e o JavaScript dentro. Ideal para hospedagem simples.',
    // '@paginas' vira termos.html / privacidade.html quando o projeto tem.
    estrutura: ['index.html', '@paginas', 'assets/images/', 'assets/videos/'],
    icone: FileCode,
  },
  {
    formato: 'projeto',
    titulo: 'Projeto separado',
    descricao: 'Arquivos organizados, com as fontes baixadas junto. Ideal para continuar editando o código.',
    estrutura: ['index.html', 'style.css', 'script.js', '@paginas', 'assets/images/', 'assets/videos/', 'assets/fonts/'],
    icone: FolderTree,
  },
]

type Props = {
  aberto: boolean
  lpId: string
  doc: LpDocumento
  aoFechar: () => void
}

/** Monta só quando abre — erros e avisos da exportação anterior não sobrevivem. */
export function ModalExportar(props: Props) {
  if (!props.aberto || typeof document === 'undefined') return null
  return <Conteudo {...props} />
}

function Conteudo({ lpId, doc, aoFechar }: Props) {
  const [baixando, setBaixando] = useState<FormatoExport | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])
  const dialogoRef = useRef<HTMLDivElement>(null)
  useFocoModal(dialogoRef, true)

  const arquivosPaginas = paginasGeradas(doc).map((p) => infoPagina(p.tipo).arquivo)

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !baixando) aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar, baixando])

  async function exportar(formato: FormatoExport) {
    setBaixando(formato)
    setErro(null)
    setAvisos([])
    try {
      const r = await fetch('/api/lp/exportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lpId, formato, documento: doc }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.erro ?? 'Falha ao exportar.')
      }

      const cabecalho = r.headers.get('X-Lp-Avisos')
      if (cabecalho) {
        const lista = decodeURIComponent(cabecalho).split('|').filter(Boolean)
        if (lista.length > 0) setAvisos(lista)
      }

      const nome =
        /filename="([^"]+)"/.exec(r.headers.get('Content-Disposition') ?? '')?.[1] ??
        'landing-page.zip'
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nome
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao exportar.')
    } finally {
      setBaixando(null)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm"
      onClick={() => !baixando && aoFechar()}
    >
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-label="Exportar landing page"
        className="w-full max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Exportar</h2>
            <p className="mt-1 text-sm text-text-dim">
              O .zip traz a página e as mídias usadas. Basta subir na hospedagem.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            disabled={baixando !== null}
            aria-label="Fechar"
            className="rounded-md p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPCOES.map((o) => (
            <button
              key={o.formato}
              type="button"
              onClick={() => exportar(o.formato)}
              disabled={baixando !== null}
              className="rounded-lg border border-border bg-surface-2/50 p-4 text-left transition-colors hover:border-blue/60 hover:bg-surface-2 disabled:opacity-50"
            >
              <span className="flex items-center gap-2 text-blue">
                {baixando === o.formato ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <o.icone className="h-5 w-5" strokeWidth={1.75} />
                )}
                <span className="font-display font-semibold text-text">{o.titulo}</span>
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-text-dim">
                {o.descricao}
              </span>
              <span className="mt-3 block font-mono text-[11px] text-text-dim/80">
                {o.estrutura.flatMap((l) => (l === '@paginas' ? arquivosPaginas : [l])).join('\n')}
              </span>
            </button>
          ))}
        </div>

        {doc.secoes.some((s) => s.tipo === 'formulario' && !s.destinoForm) && (
          <div className="mt-4">
            <Aviso>
              O formulário de contato ainda não envia as mensagens para lugar nenhum. Configure um
              destino no painel da seção antes de publicar.
            </Aviso>
          </div>
        )}

        {baixando && (
          <p className="mt-4 text-center text-xs text-text-dim">
            Baixando as mídias e montando o pacote… isso pode levar alguns segundos.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {erro ? <Erro>{erro}</Erro> : null}
          {avisos.length > 0 ? <Aviso>{avisos.join(' ')}</Aviso> : null}
        </div>

        <p className="mt-5 border-t border-border pt-4 text-xs text-text-dim">
          As imagens e os vídeos são prévias do banco de mídias e têm marca d’água. Antes de
          publicar, baixe as versões licenciadas na sua conta e substitua os arquivos na pasta
          assets.
        </p>
      </div>
    </div>,
    document.body,
  )
}
