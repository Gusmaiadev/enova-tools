'use client'

import { Copy, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { CamposAvancado } from './CamposAvancado'
import { CamposConteudo } from './CamposConteudo'
import { CamposEstilo } from './CamposEstilo'
import { CamposLista } from './CamposLista'
import { SeletorDispositivo } from './PorDispositivo'
import { Vazio } from './campos'
import { NOME_ELEMENTO } from './elementos'
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
  aoDuplicar,
  aoRemover,
  dispositivo,
  aoTrocarDispositivo,
}: {
  doc: LpDocumento
  lpId: string
  noId: string
  aplicar: Aplicar
  aoSelecionar: (id: string) => void
  aoDuplicar: (id: string) => void
  aoRemover: (id: string) => void
  /**
   * Vem do EditorLp, derivado da tela escolhida na barra de cima. Não é estado
   * daqui de propósito: com estado próprio, a prévia mostraria um tamanho e o
   * campo gravaria em outro.
   */
  dispositivo: Dispositivo
  aoTrocarDispositivo: (d: Dispositivo) => void
}) {
  const [aba, setAba] = useState<Aba>('conteudo')

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
  const comuns = { no, mutarNo, dispositivo }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-1">
        <nav
          aria-label="Caminho do elemento"
          className="flex flex-1 flex-wrap items-center gap-0.5 text-xs"
        >
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
        {/* A raiz não: ela é a seção, e duplicar ou excluir seção tem botão
            próprio na aba Estrutura. */}
        {no.id !== secao.raiz.id && (
          <>
            <button
              type="button"
              aria-label={`Duplicar ${NOME_ELEMENTO[no.tipo] ?? no.tipo}`}
              title="Duplicar este elemento"
              onClick={() => aoDuplicar(no.id)}
              className="shrink-0 rounded border border-border p-1.5 text-text-dim transition-colors hover:border-blue/60 hover:text-text"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Remover ${NOME_ELEMENTO[no.tipo] ?? no.tipo}`}
              title="Remover este elemento"
              onClick={() => aoRemover(no.id)}
              className="shrink-0 rounded border border-border p-1.5 text-text-dim transition-colors hover:border-pink/60 hover:text-pink"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

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

      {/* Um seletor para o painel inteiro. Antes cada campo tinha o seu, e a
          coluna virava seis botões repetidos dez vezes. */}
      <SeletorDispositivo ativo={dispositivo} aoTrocar={aoTrocarDispositivo} />

      {aba === 'conteudo' &&
        (COM_LISTA.has(no.tipo) ? (
          <CamposLista no={no} lpId={lpId} mutarNo={mutarNo} />
        ) : (
          <CamposConteudo {...comuns} lpId={lpId} />
        ))}
      {aba === 'estilo' && <CamposEstilo {...comuns} tema={doc.tema} />}
      {aba === 'avancado' && <CamposAvancado {...comuns} />}
    </div>
  )
}
