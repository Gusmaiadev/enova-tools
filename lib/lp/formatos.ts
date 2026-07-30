/**
 * Formatos e limites de arquivo aceitos no upload de midia. Modulo puro: o
 * server valida com isto (lib/lp/armazenamento) e o client barra antes de gastar
 * banda com um arquivo que ia ser recusado.
 */

import type { Orientacao, TipoMidia } from './tipos'

/**
 * Video so em mp4/webm: o que o navegador toca sem conversao — .mov e .avi
 * subiriam e a pagina ficaria com um video que nao roda.
 * SVG entra porque logo de cliente quase sempre vem em SVG, e quem envia e a
 * propria equipe autenticada, nao visitante anonimo.
 */
export const FORMATOS: Record<string, { ext: string; tipo: TipoMidia }> = {
  'image/jpeg': { ext: 'jpg', tipo: 'imagem' },
  'image/png': { ext: 'png', tipo: 'imagem' },
  'image/webp': { ext: 'webp', tipo: 'imagem' },
  'image/avif': { ext: 'avif', tipo: 'imagem' },
  'image/gif': { ext: 'gif', tipo: 'imagem' },
  'image/svg+xml': { ext: 'svg', tipo: 'imagem' },
  'video/mp4': { ext: 'mp4', tipo: 'video' },
  'video/webm': { ext: 'webm', tipo: 'video' },
}

/** Valor do accept do <input type="file">. */
export const ACEITA = Object.keys(FORMATOS).join(',')

/** Limite por arquivo. Video maior que isso trava o carregamento da pagina. */
export const LIMITE_BYTES: Record<TipoMidia, number> = {
  imagem: 12 * 1024 * 1024,
  video: 50 * 1024 * 1024,
}

export const ERRO_FORMATO =
  'Formato não aceito. Imagem: JPG, PNG, WebP, AVIF, GIF ou SVG. Vídeo: MP4 ou WebM.'

export const legivel = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`

/** Orientacao deduzida das dimensoes reais — o usuario nao precisa escolher. */
export function orientacaoDe(largura?: number, altura?: number): Orientacao {
  if (!largura || !altura) return 'paisagem'
  const razao = largura / altura
  if (razao > 1.15) return 'paisagem'
  if (razao < 0.87) return 'retrato'
  return 'quadrado'
}

/** Recusa o arquivo antes de enviar. Devolve null quando esta tudo certo. */
export function recusar(mime: string, bytes: number): string | null {
  const formato = FORMATOS[mime]
  if (!formato) return ERRO_FORMATO
  if (bytes === 0) return 'O arquivo está vazio.'
  const limite = LIMITE_BYTES[formato.tipo]
  if (bytes > limite) {
    return `Arquivo de ${legivel(bytes)}. O limite para ${
      formato.tipo === 'video' ? 'vídeo' : 'imagem'
    } é ${legivel(limite)}.`
  }
  return null
}
