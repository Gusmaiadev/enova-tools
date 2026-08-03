'use client'

import { useState } from 'react'
import { CamposAvancado } from './CamposAvancado'
import { CamposConteudo } from './CamposConteudo'
import { CamposEstilo } from './CamposEstilo'
import { CamposLista } from './CamposLista'
import { Vazio } from './campos'
import { acharNo } from '@/lib/lp/arvore'
import type { Dispositivo, LpContainer, LpDocumento, LpElemento } from '@/lib/lp/tipos'

type Aplicar = (mut: (d: LpDocumento) => void, agrupar?: string) => void
type Aba = 'conteudo' | 'estilo' | 'avancado'

const ABAS: { chave: Aba; rotulo: string }[] = [
  { chave: 'conteudo', rotulo: 'Conteúdo' },
  { chave: 'estilo', rotulo: 'Estilo' },
  { chave: 'avancado', rotulo: 'Avançado' },
]

/** Widgets cujo conteúdo é uma lista própria (ver CamposLista). */
const COM_LISTA = new Set([
  'faq',
  'abas',
  'carrossel',
  'depoimentos',
  'comparacao',
  'lista',
  'formulario',
])

export const NOME_ELEMENTO: Record<string, string> = {
  container: 'Container',
  titulo: 'Título',
  texto: 'Texto',
  imagem: 'Imagem',
  video: 'Vídeo',
  botao: 'Botão',
  icone: 'Ícone',
  numero: 'Número',
  lista: 'Lista',
  espacador: 'Espaçador',
  divisor: 'Divisor',
  faq: 'FAQ',
  abas: 'Abas',
  carrossel: 'Carrossel',
  depoimentos: 'Depoimentos',
  comparacao: 'Comparação',
  formulario: 'Formulário',
}

/** Ancestrais do nó, da raiz até ele — alimenta o caminho clicável. */
function caminhoAte(raiz: LpContainer, id: string): LpElemento[] {
  const trilha: LpElemento[] = []
  const desce = (el: LpElemento): boolean => {
    trilha.push(el)
    if (el.id === id) return true
    if (el.tipo === 'container' && el.filhos.some(desce)) return true
    trilha.pop()
    return false
  }
  desce(raiz)
  return trilha
}

/**
 * Painel do elemento selecionado no canvas. Substitui, para seções em árvore, o
 * PainelPropriedades — que editava a seção inteira de uma vez.
 */
export function PainelWidget({
  doc,
  lpId,
  noId,
  aplicar,
  aoSelecionar,
}: {
  doc: LpDocumento
  lpId: string
  noId: string
  aplicar: Aplicar
  aoSelecionar: (id: string) => void
}) {
  const [aba, setAba] = useState<Aba>('conteudo')
  const [dispositivo, setDispositivo] = useState<Dispositivo>('desktop')

  const secao = doc.secoes.find((s) => s.raiz && acharNo(s.raiz, noId))
  const no = secao?.raiz ? acharNo(secao.raiz, noId) : null
  if (!secao?.raiz || !no) {
    return <Vazio>Selecione um elemento na página para editar.</Vazio>
  }

  /**
   * Muta o nó selecionado. `d` já é uma cópia (alterarDoc clona), então mexer no
   * nó aqui dentro não toca no documento que está no histórico de desfazer.
   */
  const mutarNo = (mut: (el: LpElemento) => void, agrupar?: string) =>
    aplicar((d) => {
      for (const s of d.secoes) {
        if (!s.raiz) continue
        const alvo = acharNo(s.raiz, noId)
        if (alvo) {
          mut(alvo)
          return
        }
      }
    }, agrupar)

  const trilha = caminhoAte(secao.raiz, noId)
  const comuns = { no, mutarNo, dispositivo, aoTrocarDispositivo: setDispositivo }

  return (
    <div className="space-y-3">
      <nav aria-label="Caminho do elemento" className="flex flex-wrap items-center gap-0.5 text-xs">
        {trilha.map((p, i) => (
          <span key={p.id} className="flex items-center gap-0.5">
            {i > 0 && (
              <span aria-hidden className="text-text-dim">
                ›
              </span>
            )}
            <button
              type="button"
              onClick={() => aoSelecionar(p.id)}
              aria-current={p.id === noId ? 'true' : undefined}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                p.id === noId ? 'bg-blue/15 text-blue' : 'text-text-dim hover:text-text'
              }`}
            >
              {NOME_ELEMENTO[p.tipo] ?? p.tipo}
            </button>
          </span>
        ))}
      </nav>

      <div className="flex border-b border-border">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            onClick={() => setAba(a.chave)}
            aria-pressed={aba === a.chave}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors ${
              aba === a.chave
                ? 'border-blue text-text'
                : 'border-transparent text-text-dim hover:text-text'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'conteudo' &&
        (COM_LISTA.has(no.tipo) ? (
          <CamposLista no={no} lpId={lpId} mutarNo={mutarNo} />
        ) : (
          <CamposConteudo {...comuns} lpId={lpId} />
        ))}
      {aba === 'estilo' && <CamposEstilo {...comuns} />}
      {aba === 'avancado' && <CamposAvancado {...comuns} />}
    </div>
  )
}
