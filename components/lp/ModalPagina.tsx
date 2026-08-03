'use client'

import { Wand2, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Aviso } from '@/components/Campo'
import { useFocoModal } from '@/components/useFocoModal'
import { CLASSE_CONTROLE } from './campos'
import { modeloPagina } from '@/lib/lp/legais'
import type { LpDocumento, PaginaLegal } from '@/lib/lp/tipos'
import { infoPagina } from '@/lib/lp/tipos'

type Props = {
  doc: LpDocumento
  /** Página aberta; null mantém o modal fechado. */
  pagina: PaginaLegal | null
  aoMudar: (patch: Partial<PaginaLegal>, agrupar?: string) => void
  aoFechar: () => void
}

/**
 * Edita o texto de uma página auxiliar (termos de uso, política de privacidade)
 * sem passar pelo briefing — gerar de novo substituiria a página inteira. Modal
 * porque documento jurídico não cabe na coluna do painel.
 */
export function ModalPagina(props: Props) {
  if (props.pagina === null || typeof document === 'undefined') return null
  return <Conteudo {...props} pagina={props.pagina} />
}

function Conteudo({ doc, pagina, aoMudar, aoFechar }: Props & { pagina: PaginaLegal }) {
  const dialogoRef = useRef<HTMLDivElement>(null)
  useFocoModal(dialogoRef, true)
  const info = infoPagina(pagina.tipo)
  const caracteres = pagina.conteudo.trim().length

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-label={`Editar ${info.titulo}`}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-surface p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">{pagina.titulo || info.titulo}</h2>
            <p className="mt-1 text-sm text-text-dim">
              Vira o arquivo <span className="font-mono text-xs">{info.arquivo}</span> na exportação,
              com o mesmo cabeçalho e rodapé da página. Salva junto com o projeto — não precisa
              gerar de novo.
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-md p-2 text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-dim">Título da página</span>
            <input
              className={CLASSE_CONTROLE}
              placeholder={info.titulo}
              value={pagina.titulo}
              onChange={(e) => aoMudar({ titulo: e.target.value }, `pagina-${pagina.tipo}-titulo`)}
              maxLength={80}
            />
          </label>

          <label className="flex min-h-0 flex-1 flex-col gap-1.5">
            <span className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-dim">
              <span>
                Texto
                <span className="ml-1 text-xs text-text-dim/70">
                  (linha em branco separa parágrafo; “## ” no começo da linha vira subtítulo)
                </span>
              </span>
              <span className="font-mono text-xs text-text-dim/70">
                {caracteres.toLocaleString('pt-BR')} caracteres
              </span>
            </span>
            <textarea
              className="min-h-[45vh] w-full flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
              placeholder="Cole aqui o texto da página ou clique em “Usar modelo”."
              value={pagina.conteudo}
              onChange={(e) => aoMudar({ conteudo: e.target.value }, `pagina-${pagina.tipo}-texto`)}
              maxLength={60000}
              spellCheck
            />
          </label>

          {caracteres === 0 && (
            <Aviso>
              Sem texto, esta página não é gerada nem entra no .zip — e o link some do rodapé.
            </Aviso>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() =>
              aoMudar({
                conteudo: modeloPagina(pagina.tipo, {
                  marca: doc.header.logoTexto.trim() || 'nossa empresa',
                  email: doc.footer.email?.trim() || undefined,
                  endereco: doc.footer.endereco?.trim() || undefined,
                }),
              })
            }
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            <Wand2 className="h-3.5 w-3.5" />
            {caracteres > 0 ? 'Substituir pelo modelo' : 'Usar modelo'}
          </button>
          <p className="text-xs text-text-dim">
            O modelo é um ponto de partida genérico — adapte ao seu negócio antes de publicar.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
