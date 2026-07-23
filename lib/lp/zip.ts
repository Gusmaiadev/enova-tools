/**
 * Gerador de ZIP minimo, sem dependencias (metodo store, sem compressao —
 * codigo e pequeno e as midias ja vem comprimidas). Roda no browser e no node.
 */

export type ArquivoZip = {
  /** Caminho dentro do zip, com '/' (ex.: 'assets/images/foto.jpg'). */
  caminho: string
  dados: Uint8Array
}

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  return tabela
})()

export function crc32(dados: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < dados.length; i++) {
    crc = TABELA_CRC[(crc ^ dados[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Data fixa (01/01/2026) para zips deterministicos.
const DOS_DATA = ((2026 - 1980) << 9) | (1 << 5) | 1
const DOS_HORA = 0

export function gerarZip(arquivos: ArquivoZip[]): Uint8Array {
  const codificador = new TextEncoder()
  const locais: Uint8Array[] = []
  const centrais: Uint8Array[] = []
  let deslocamento = 0

  for (const arquivo of arquivos) {
    const nome = codificador.encode(arquivo.caminho)
    const crc = crc32(arquivo.dados)
    const tamanho = arquivo.dados.length

    const local = new Uint8Array(30 + nome.length + tamanho)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // versao minima
    lv.setUint16(6, 0x0800, true) // flag: nomes em UTF-8
    lv.setUint16(8, 0, true) // metodo store
    lv.setUint16(10, DOS_HORA, true)
    lv.setUint16(12, DOS_DATA, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, tamanho, true)
    lv.setUint32(22, tamanho, true)
    lv.setUint16(26, nome.length, true)
    lv.setUint16(28, 0, true)
    local.set(nome, 30)
    local.set(arquivo.dados, 30 + nome.length)
    locais.push(local)

    const central = new Uint8Array(46 + nome.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // criado por
    cv.setUint16(6, 20, true) // versao minima
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_HORA, true)
    cv.setUint16(14, DOS_DATA, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, tamanho, true)
    cv.setUint32(24, tamanho, true)
    cv.setUint16(28, nome.length, true)
    cv.setUint32(42, deslocamento, true)
    central.set(nome, 46)
    centrais.push(central)

    deslocamento += local.length
  }

  const tamanhoCentral = centrais.reduce((soma, c) => soma + c.length, 0)
  const fim = new Uint8Array(22)
  const fv = new DataView(fim.buffer)
  fv.setUint32(0, 0x06054b50, true)
  fv.setUint16(8, arquivos.length, true)
  fv.setUint16(10, arquivos.length, true)
  fv.setUint32(12, tamanhoCentral, true)
  fv.setUint32(16, deslocamento, true)

  const total = deslocamento + tamanhoCentral + 22
  const zip = new Uint8Array(total)
  let pos = 0
  for (const parte of [...locais, ...centrais, fim]) {
    zip.set(parte, pos)
    pos += parte.length
  }
  return zip
}
