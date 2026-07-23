'use client'

import { Loader2, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/Button'
import { Aviso, Erro } from '@/components/Campo'
import { useFocoModal } from '@/components/useFocoModal'
import { Opcoes, Texto } from './campos'
import { placeholderMidia } from '@/lib/lp/placeholder'
import type { LpMidia, Orientacao, TipoMidia } from '@/lib/lp/tipos'

type Props = {
  aberto: boolean
  midia: LpMidia | null
  aoEscolher: (midia: LpMidia) => void
  aoFechar: () => void
}

/**
 * Só monta o conteúdo quando abre — assim os campos já nascem preenchidos com a
 * mídia atual, sem precisar sincronizar estado depois.
 */
export function SeletorMidia(props: Props) {
  if (!props.aberto || typeof document === 'undefined') return null
  return <Conteudo {...props} />
}

function Conteudo({ midia, aoEscolher, aoFechar }: Props) {
  const [busca, setBusca] = useState(midia?.busca ?? '')
  const [tipo, setTipo] = useState<TipoMidia>(midia?.tipo ?? 'imagem')
  const [orientacao, setOrientacao] = useState<Orientacao>(midia?.orientacao ?? 'paisagem')
  const [resultados, setResultados] = useState<LpMidia[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [urlManual, setUrlManual] = useState('')
  const dialogoRef = useRef<HTMLDivElement>(null)
  useFocoModal(dialogoRef, true)

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflow
    }
  }, [aoFechar])

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault()
    if (busca.trim() === '') return
    setCarregando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await fetch('/api/lp/midias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busca, tipo, orientacao }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao buscar mídias.')
      if (d.semChave) {
        setAviso(d.erro)
        setResultados([])
        return
      }
      const achadas: LpMidia[] = d.midias ?? []
      setResultados(achadas)
      if (achadas.length === 0) {
        setAviso('Nenhum resultado. Tente palavras em inglês — o catálogo é indexado em inglês.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao buscar mídias.')
    } finally {
      setCarregando(false)
    }
  }

  function escolher(escolhida: LpMidia) {
    aoEscolher({ ...escolhida, busca, orientacao, tipo })
    aoFechar()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-bg/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={aoFechar}
    >
      <div
        ref={dialogoRef}
        tabIndex={-1}
        role="dialog"
        aria-modal
        aria-label="Escolher mídia"
        className="w-full max-w-4xl rounded-lg border border-border bg-surface p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Trocar mídia</h2>
            <p className="mt-1 text-sm text-text-dim">
              Descreva o que você quer ver. As prévias têm marca d’água — baixe a versão licenciada
              antes de publicar.
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

        <form onSubmit={buscar} className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Texto
                rotulo="O que deve aparecer"
                placeholder="Ex.: modern office team meeting"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={carregando || busca.trim() === ''}>
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Opcoes<TipoMidia>
              rotulo="Tipo"
              valor={tipo}
              aoMudar={setTipo}
              opcoes={[
                { valor: 'imagem', rotulo: 'Imagem' },
                { valor: 'video', rotulo: 'Vídeo' },
              ]}
            />
            <Opcoes<Orientacao>
              rotulo="Formato"
              valor={orientacao}
              aoMudar={setOrientacao}
              opcoes={[
                { valor: 'paisagem', rotulo: 'Paisagem' },
                { valor: 'retrato', rotulo: 'Retrato' },
                { valor: 'quadrado', rotulo: 'Quadrado' },
              ]}
            />
          </div>
        </form>

        <div className="mt-4 space-y-3">
          {erro ? <Erro>{erro}</Erro> : null}
          {aviso ? <Aviso>{aviso}</Aviso> : null}
        </div>

        {resultados.length > 0 && (
          <ul className="mt-4 grid max-h-[46vh] gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {resultados.map((m, i) => (
              <li key={`${m.url}-${i}`}>
                <button
                  type="button"
                  onClick={() => escolher(m)}
                  className="group w-full overflow-hidden rounded-md border border-border bg-surface-2 transition-colors hover:border-blue"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.url}
                    alt={m.alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="block truncate px-2 py-1.5 text-left text-xs text-text-dim">
                    {m.alt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 space-y-3 border-t border-border pt-5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Texto
                rotulo="Ou cole o endereço de uma imagem/vídeo"
                placeholder="https://…"
                value={urlManual}
                onChange={(e) => setUrlManual(e.target.value)}
                inputMode="url"
              />
            </div>
            <Button
              variante="secondary"
              disabled={!/^https?:\/\//i.test(urlManual.trim())}
              onClick={() =>
                escolher({
                  tipo,
                  url: urlManual.trim(),
                  alt: busca || 'Mídia',
                  busca,
                  orientacao,
                })
              }
            >
              Usar
            </Button>
          </div>
          <button
            type="button"
            onClick={() => escolher(placeholderMidia(busca, orientacao, tipo))}
            className="text-xs text-text-dim underline-offset-2 transition-colors hover:text-text hover:underline"
          >
            Usar um espaço reservado por enquanto
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
