import 'server-only'

/**
 * fetch para URLs fornecidas pelo usuário (mídias do documento, sites de
 * referência) com proteção contra SSRF: recusa host que resolve para rede
 * interna/loopback/metadados e revalida cada salto de redirecionamento.
 *
 * Ressalva conhecida: há uma janela TOCTOU entre resolver o DNS e o fetch
 * resolver de novo. É proporcional ao risco aqui (bloqueia os alvos óbvios —
 * 127.0.0.1, 169.254.169.254, redes privadas); pinar o IP exigiria reimplementar
 * o cliente HTTP.
 */

import dns from 'node:dns/promises'
import net from 'node:net'

function ipPrivado(ipBruto: string): boolean {
  // Desembrulha IPv4-mapeado (::ffff:a.b.c.d).
  const mapeado = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ipBruto)
  const ip = mapeado ? mapeado[1] : ipBruto

  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true // link-local / metadados
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    return false
  }
  if (net.isIPv6(ip)) {
    const baixo = ip.toLowerCase()
    if (baixo === '::1' || baixo === '::') return true
    if (baixo.startsWith('fc') || baixo.startsWith('fd')) return true // ULA
    if (baixo.startsWith('fe80')) return true // link-local
    return false
  }
  return true // formato inesperado: bloqueia por precaução
}

async function hostSeguro(host: string): Promise<boolean> {
  if (net.isIP(host)) return !ipPrivado(host)
  try {
    const enderecos = await dns.lookup(host, { all: true })
    return enderecos.length > 0 && enderecos.every((e) => !ipPrivado(e.address))
  } catch {
    return false
  }
}

export async function fetchExternoSeguro(url: string, init: RequestInit = {}): Promise<Response> {
  let atual = url
  for (let salto = 0; salto < 4; salto++) {
    let u: URL
    try {
      u = new URL(atual)
    } catch {
      throw new Error('URL inválida')
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error('Protocolo não permitido')
    }
    if (!(await hostSeguro(u.hostname))) throw new Error('Host não permitido')

    const resp = await fetch(atual, { ...init, redirect: 'manual' })
    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location')
      if (!location) return resp
      atual = new URL(location, atual).toString()
      continue
    }
    return resp
  }
  throw new Error('Redirecionamentos demais')
}
