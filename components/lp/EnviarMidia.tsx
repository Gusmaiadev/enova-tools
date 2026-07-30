'use client'

import { Loader2, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Erro } from '@/components/Campo'
import { ACEITA, LIMITE_BYTES, legivel, recusar } from '@/lib/lp/formatos'
import type { LpMidia } from '@/lib/lp/tipos'

type Props = {
  lpId: string
  /** Arquivo já enviado, ou null. */
  arquivo: LpMidia | null
  aoEnviar: (midia: LpMidia) => void
  aoRemover: () => void
  /**
   * Se o arquivo antigo deve sair do bucket ao trocar/remover. Falso quando
   * outra seção aponta para o mesmo arquivo (seção duplicada) — apagar ali
   * quebraria a outra.
   */
  apagarNoServidor?: boolean
}

type Medidas = { largura?: number; altura?: number; duracao?: number }

/**
 * Dimensões e duração reais, lidas no browser antes de enviar: o servidor não
 * abre o arquivo, e sem isso a mídia iria para a página sem largura/altura.
 * Falha em silêncio — SVG sem viewBox ou codec que o browser não abre ainda
 * podem ser enviados, só sem metadado.
 */
async function medir(arquivo: File): Promise<Medidas> {
  const url = URL.createObjectURL(arquivo)
  try {
    if (arquivo.type.startsWith('video/')) {
      const v = document.createElement('video')
      v.preload = 'metadata'
      await new Promise<void>((ok, falha) => {
        v.onloadedmetadata = () => ok()
        v.onerror = () => falha(new Error('metadados'))
        v.src = url
      })
      return {
        largura: v.videoWidth || undefined,
        altura: v.videoHeight || undefined,
        duracao: Number.isFinite(v.duration) ? Math.round(v.duration) : undefined,
      }
    }
    const img = new Image()
    await new Promise<void>((ok, falha) => {
      img.onload = () => ok()
      img.onerror = () => falha(new Error('metadados'))
      img.src = url
    })
    return { largura: img.naturalWidth || undefined, altura: img.naturalHeight || undefined }
  } catch {
    return {}
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * XMLHttpRequest e não fetch: só ele informa o progresso do upload, e um vídeo
 * de 40 MB numa conexão comum leva tempo suficiente para a barra importar.
 */
function enviarArquivo(
  arquivo: File,
  lpId: string,
  medidas: Medidas,
  aoProgredir: (pct: number) => void,
): Promise<LpMidia> {
  return new Promise((ok, falha) => {
    const corpo = new FormData()
    corpo.set('arquivo', arquivo)
    corpo.set('lpId', lpId)
    for (const [chave, valor] of Object.entries(medidas)) {
      if (valor) corpo.set(chave, String(valor))
    }

    const req = new XMLHttpRequest()
    req.open('POST', '/api/lp/upload')
    req.upload.onprogress = (e) => {
      if (e.lengthComputable) aoProgredir(Math.round((e.loaded / e.total) * 100))
    }
    req.onload = () => {
      let dados: { ok?: boolean; midia?: LpMidia; erro?: string } = {}
      try {
        dados = JSON.parse(req.responseText)
      } catch {
        /* resposta não-JSON (proxy, 502) cai no erro genérico abaixo */
      }
      if (req.status === 200 && dados.midia) ok(dados.midia)
      else falha(new Error(dados.erro ?? 'Falha ao enviar o arquivo.'))
    }
    req.onerror = () => falha(new Error('Falha de conexão ao enviar o arquivo.'))
    req.onabort = () => falha(new Error('Envio cancelado.'))
    req.send(corpo)
  })
}

/** Tira o arquivo do bucket. Usado aqui e por quem troca de modo na etapa 3. */
export async function apagarArquivo(caminho: string) {
  try {
    await fetch('/api/lp/upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho }),
    })
  } catch {
    // Arquivo órfão no bucket não é motivo para atrapalhar quem está editando.
  }
}

export function EnviarMidia({
  lpId,
  arquivo,
  aoEnviar,
  aoRemover,
  apagarNoServidor = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [arrastando, setArrastando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function receber(escolhido: File | undefined) {
    if (!escolhido || enviando) return
    const recusa = recusar(escolhido.type, escolhido.size)
    if (recusa) {
      setErro(recusa)
      return
    }
    setErro(null)
    setProgresso(0)
    setEnviando(true)
    const anterior = arquivo?.caminho
    try {
      const midia = await enviarArquivo(escolhido, lpId, await medir(escolhido), setProgresso)
      aoEnviar(midia)
      // Só depois de o novo entrar: se o envio falhar, o antigo continua servindo.
      if (anterior && apagarNoServidor) void apagarArquivo(anterior)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar o arquivo.')
    } finally {
      setEnviando(false)
    }
  }

  function remover() {
    const caminho = arquivo?.caminho
    setErro(null)
    aoRemover()
    if (caminho && apagarNoServidor) void apagarArquivo(caminho)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACEITA}
        className="hidden"
        onChange={(e) => {
          const escolhido = e.target.files?.[0]
          e.target.value = '' // permite reenviar o mesmo arquivo depois
          void receber(escolhido)
        }}
      />

      {enviando ? (
        <div className="rounded-md border border-border bg-surface-2 px-3 py-3">
          <div className="flex items-center gap-2 text-sm text-text-dim">
            <Loader2 className="h-4 w-4 animate-spin text-blue" />
            Enviando… {progresso}%
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-blue transition-[width] duration-200"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      ) : arquivo ? (
        <div className="overflow-hidden rounded-md border border-border bg-surface-2">
          {arquivo.tipo === 'video' ? (
            <video
              src={arquivo.url}
              controls
              muted
              playsInline
              preload="metadata"
              className="max-h-56 w-full bg-surface object-contain"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={arquivo.url}
              alt={arquivo.alt}
              className="max-h-56 w-full bg-surface object-contain"
            />
          )}
          <div className="flex items-center gap-2 border-t border-border px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-text">{arquivo.alt}</span>
              <span className="block text-[11px] text-text-dim">
                {arquivo.tipo === 'video' ? 'Vídeo enviado' : 'Imagem enviada'} por você
                {arquivo.largura && arquivo.altura
                  ? ` · ${arquivo.largura}×${arquivo.altura}`
                  : ''}
                {arquivo.duracao ? ` · ${arquivo.duracao}s` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="shrink-0 rounded bg-surface px-2 py-1.5 text-xs transition-colors hover:bg-blue hover:text-white"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={remover}
              aria-label="Remover arquivo enviado"
              className="shrink-0 rounded p-1.5 text-text-dim transition-colors hover:text-pink"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault()
            setArrastando(false)
            void receber(e.dataTransfer.files?.[0])
          }}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors ${
            arrastando
              ? 'border-blue bg-blue/10 text-text'
              : 'border-border text-text-dim hover:border-blue/60 hover:text-text'
          }`}
        >
          <span className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4" />
            Escolher arquivo do computador
          </span>
          <span className="text-xs text-text-dim">
            ou arraste aqui — imagem até {legivel(LIMITE_BYTES.imagem)}, vídeo MP4/WebM até{' '}
            {legivel(LIMITE_BYTES.video)}
          </span>
        </button>
      )}

      {erro ? <Erro>{erro}</Erro> : null}
    </div>
  )
}
