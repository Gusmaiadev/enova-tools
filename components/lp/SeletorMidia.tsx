'use client'

import { Loader2, Play, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/Button'
import { Aviso, Erro } from '@/components/Campo'
import { useFocoModal } from '@/components/useFocoModal'
import { Opcoes, Texto } from './campos'
import { EnviarMidia } from './EnviarMidia'
import { placeholderMidia } from '@/lib/lp/placeholder'
import { ROTULO_FONTE } from '@/lib/lp/tipos'
import type { LpMidia, Orientacao, TipoMidia } from '@/lib/lp/tipos'

type Props = {
  aberto: boolean
  /** Projeto dono do arquivo enviado — define a pasta no bucket. */
  lpId: string
  midia: LpMidia | null
  aoEscolher: (midia: LpMidia) => void
  aoFechar: () => void
}

/** Proporção do cartão na grade — acompanha o formato pedido. */
const PROPORCAO: Record<Orientacao, string> = {
  paisagem: 'aspect-[4/3]',
  retrato: 'aspect-[3/4]',
  quadrado: 'aspect-square',
}

const duracaoLegivel = (s: number): string =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Só monta o conteúdo quando abre — assim os campos já nascem preenchidos com a
 * mídia atual, sem precisar sincronizar estado depois.
 */
export function SeletorMidia(props: Props) {
  if (!props.aberto || typeof document === 'undefined') return null
  return <Conteudo {...props} />
}

/**
 * Cartão de resultado. Vídeo mostra o poster estático e só começa a carregar o
 * mp4 quando o mouse entra (48 vídeos baixando de uma vez travaria a modal).
 */
function Cartao({
  midia,
  proporcao,
  aoEscolher,
}: {
  midia: LpMidia
  proporcao: string
  aoEscolher: () => void
}) {
  // `montado` é uma trava: uma vez baixado, o mp4 fica — sair e voltar com o
  // mouse não rebaixa o arquivo. `tocando` só dá play/pause.
  const [montado, setMontado] = useState(false)
  const [tocando, setTocando] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ehVideo = midia.tipo === 'video'

  // Efeito (e não callback do evento): garante que o <video> já está no DOM.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (tocando) {
      v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [tocando, montado])

  function entrar() {
    if (!ehVideo) return
    setMontado(true)
    setTocando(true)
  }

  return (
    <button
      type="button"
      onClick={aoEscolher}
      onMouseEnter={entrar}
      onMouseLeave={() => setTocando(false)}
      onFocus={entrar}
      onBlur={() => setTocando(false)}
      className="group block w-full overflow-hidden rounded-md border border-border bg-surface-2 text-left transition-colors hover:border-blue focus:border-blue focus:outline-none"
    >
      <div className={`relative w-full overflow-hidden ${proporcao}`}>
        {midia.thumb || !ehVideo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={midia.thumb ?? midia.url}
            alt={midia.alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface text-text-dim">
            <Play className="h-6 w-6" />
          </div>
        )}

        {ehVideo && montado && (
          <video
            ref={videoRef}
            src={midia.previa ?? midia.url}
            poster={midia.thumb}
            muted
            loop
            playsInline
            preload="none"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              tocando ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {ehVideo && (
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Play className="h-2.5 w-2.5 fill-current" />
            {midia.duracao ? duracaoLegivel(midia.duracao) : 'Vídeo'}
          </span>
        )}
      </div>

      <span className="block truncate px-2 pt-1.5 text-xs text-text">{midia.alt}</span>
      <span className="block truncate px-2 pb-1.5 text-[11px] text-text-dim">
        {[midia.autor, midia.fonte ? ROTULO_FONTE[midia.fonte] : null].filter(Boolean).join(' · ')}
      </span>
    </button>
  )
}

function Conteudo({ lpId, midia, aoEscolher, aoFechar }: Props) {
  const [busca, setBusca] = useState(midia?.busca ?? '')
  const [tipo, setTipo] = useState<TipoMidia>(midia?.tipo ?? 'imagem')
  const [orientacao, setOrientacao] = useState<Orientacao>(midia?.orientacao ?? 'paisagem')
  const [resultados, setResultados] = useState<LpMidia[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [traducao, setTraducao] = useState<string | null>(null)
  const [pagina, setPagina] = useState(1)
  const [temMais, setTemMais] = useState(false)
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

  /** `proxima` acumula na lista (botão "carregar mais"); senão recomeça. */
  async function buscar(proxima = false) {
    if (busca.trim() === '') return
    const pedida = proxima ? pagina + 1 : 1
    setCarregando(true)
    setErro(null)
    setAviso(null)
    try {
      const r = await fetch('/api/lp/midias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busca, tipo, orientacao, pagina: pedida }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao buscar mídias.')
      if (d.semChave) {
        setAviso(d.erro)
        setResultados([])
        setTemMais(false)
        return
      }
      const achadas: LpMidia[] = d.midias ?? []
      setResultados((antes) => (proxima ? [...antes, ...achadas] : achadas))
      setPagina(pedida)
      // Oferece mais enquanto a página anterior trouxe algo — a API só sabe se
      // sobrou resultado DELA, não se a próxima página das fontes tem conteúdo.
      setTemMais(achadas.length > 0)
      setTraducao(d.traduzido ? (d.termo as string) : null)
      if (achadas.length === 0) {
        setAviso(
          proxima
            ? 'Não há mais resultados para essa busca.'
            : 'Nenhum resultado. Tente descrever com outras palavras — algo mais simples e concreto costuma achar mais.',
        )
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

  /**
   * Arquivo do usuário: tipo e formato são os do arquivo real, não os filtros da
   * busca. O texto digitado, se houver, vira o alt da imagem.
   */
  function usarEnviado(enviada: LpMidia) {
    aoEscolher({ ...enviada, busca, alt: busca || enviada.alt })
    aoFechar()
  }

  /** Trocar tipo/formato invalida a lista — evita achar que o filtro não fez nada. */
  function trocarFiltro(fn: () => void) {
    fn()
    setResultados([])
    setPagina(1)
    setTemMais(false)
    setAviso(null)
  }

  const colunas =
    orientacao === 'retrato'
      ? 'sm:grid-cols-4 lg:grid-cols-5'
      : orientacao === 'quadrado'
        ? 'sm:grid-cols-3 lg:grid-cols-4'
        : 'sm:grid-cols-3 lg:grid-cols-4'

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
        className="w-full max-w-5xl rounded-lg border border-border bg-surface p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Trocar mídia</h2>
            <p className="mt-1 text-sm text-text-dim">
              Descreva em português o que você quer ver — a busca é traduzida automaticamente.
              Passe o mouse num vídeo para ver do que se trata.
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

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void buscar()
          }}
          className="space-y-3"
        >
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Texto
                rotulo="O que deve aparecer"
                placeholder="Ex.: equipe reunida em escritório moderno"
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
              aoMudar={(v) => trocarFiltro(() => setTipo(v))}
              opcoes={[
                { valor: 'imagem', rotulo: 'Imagem' },
                { valor: 'video', rotulo: 'Vídeo' },
              ]}
            />
            <Opcoes<Orientacao>
              rotulo="Formato"
              valor={orientacao}
              aoMudar={(v) => trocarFiltro(() => setOrientacao(v))}
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

        {traducao && resultados.length > 0 && (
          <p className="mt-3 text-xs text-text-dim">
            Buscado como <span className="text-text">“{traducao}”</span> — o acervo é indexado em
            inglês.
          </p>
        )}

        {resultados.length > 0 && (
          <>
            <ul className={`mt-3 grid max-h-[46vh] gap-3 overflow-y-auto ${colunas}`}>
              {resultados.map((m, i) => (
                <li key={`${m.url}-${i}`}>
                  <Cartao
                    midia={m}
                    proporcao={PROPORCAO[orientacao]}
                    aoEscolher={() => escolher(m)}
                  />
                </li>
              ))}
            </ul>
            {temMais && (
              <div className="mt-3 flex justify-center">
                <Button
                  variante="secondary"
                  disabled={carregando}
                  onClick={() => void buscar(true)}
                >
                  {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}

        <div className="mt-6 space-y-4 border-t border-border pt-5">
          <div>
            <p className="mb-2 text-sm text-text-dim">
              Ou envie um arquivo do seu computador — ele vai direto para a página, no lugar da
              busca.
            </p>
            <EnviarMidia
              lpId={lpId}
              arquivo={null}
              aoEnviar={usarEnviado}
              aoRemover={() => {}}
            />
          </div>

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => escolher(placeholderMidia(busca, orientacao, tipo))}
              className="text-xs text-text-dim underline-offset-2 transition-colors hover:text-text hover:underline"
            >
              Usar um espaço reservado por enquanto
            </button>
            {/* Crédito à fonte: exigido pelos termos do Pexels e do Pixabay. */}
            <p className="text-[11px] text-text-dim">
              Fotos e vídeos de{' '}
              <a
                href="https://www.pexels.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-text"
              >
                Pexels
              </a>{' '}
              e{' '}
              <a
                href="https://pixabay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-text"
              >
                Pixabay
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
