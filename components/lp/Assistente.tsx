'use client'

import { ArrowLeft, ArrowRight, Check, Loader2, PencilRuler, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Button, ButtonLink } from '@/components/Button'
import { Aviso, Erro } from '@/components/Campo'
import { EtapaIdentidade } from './EtapaIdentidade'
import { EtapaNavegacao } from './EtapaNavegacao'
import { EtapaSecoes } from './EtapaSecoes'
import type { LpBriefing, LpProjeto } from '@/lib/lp/tipos'

const PASSOS = [
  { n: 1, titulo: 'Identidade', descricao: 'Nome, fontes, cores e referências' },
  { n: 2, titulo: 'Header e Footer', descricao: 'Menu, rodapé e redes sociais' },
  { n: 3, titulo: 'Seções', descricao: 'Os blocos da página, na ordem' },
] as const

/** Etapas do que o servidor faz enquanto a geração roda. */
const ETAPAS_GERACAO = [
  'Analisando os sites de referência…',
  'Escrevendo o conteúdo com a IA…',
  'Buscando as imagens e os vídeos…',
  'Montando o HTML, o CSS e o JavaScript…',
]

export function Assistente({ projeto }: { projeto: LpProjeto }) {
  const router = useRouter()
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [briefing, setBriefing] = useState<LpBriefing>(projeto.briefing)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)
  const [etapaGeracao, setEtapaGeracao] = useState(0)

  const aoMudar = useCallback((patch: Partial<LpBriefing>) => {
    setBriefing((b) => ({ ...b, ...patch }))
    setSalvo(false)
  }, [])

  // Salvamento automático (1,2s depois da última alteração).
  useEffect(() => {
    if (salvo) return
    const timer = setTimeout(async () => {
      setSalvando(true)
      try {
        const r = await fetch(`/api/lp/projetos/${projeto.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: briefing.nome.trim().length >= 2 ? briefing.nome : undefined,
            briefing,
          }),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          throw new Error(d.erro ?? 'Falha ao salvar.')
        }
        setSalvo(true)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao salvar.')
      } finally {
        setSalvando(false)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [briefing, salvo, projeto.id])

  // Avança as mensagens de progresso enquanto a geração roda.
  useEffect(() => {
    if (!gerando) return
    const timer = setInterval(() => {
      setEtapaGeracao((n) => Math.min(n + 1, ETAPAS_GERACAO.length - 1))
    }, 9000)
    return () => clearInterval(timer)
  }, [gerando])

  const problemas: string[] = []
  if (briefing.nome.trim().length < 2) problemas.push('Dê um nome ao projeto na etapa 1.')
  if (briefing.secoes.length === 0) problemas.push('Adicione pelo menos uma seção na etapa 3.')

  async function gerar() {
    if (problemas.length > 0) {
      setErro(problemas[0])
      return
    }
    setErro(null)
    // Sem referências, a primeira etapa (analisar sites) não acontece.
    setEtapaGeracao(briefing.referencias.length > 0 ? 0 : 1)
    setGerando(true)
    try {
      const r = await fetch('/api/lp/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lpId: projeto.id, briefing }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.erro ?? 'Falha ao gerar a página.')
      const avisos: string[] = Array.isArray(d.avisos) ? d.avisos : []
      const query = avisos.length > 0 ? `?avisos=${encodeURIComponent(avisos.join('|'))}` : ''
      router.push(`/app/lp/${projeto.id}/editor${query}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao gerar a página.')
      setGerando(false)
    }
  }

  return (
    <div className="space-y-6">
      {projeto.documento && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue/40 bg-blue/10 px-4 py-3">
          <p className="text-sm text-blue">
            Esta página já foi gerada. Alterar o briefing e gerar de novo substitui o que estiver no
            editor.
          </p>
          <ButtonLink href={`/app/lp/${projeto.id}/editor`} variante="secondary">
            <PencilRuler className="h-4 w-4" />
            Abrir editor
          </ButtonLink>
        </div>
      )}

      <nav aria-label="Etapas" className="grid gap-2 sm:grid-cols-3">
        {PASSOS.map((p) => {
          const ativo = passo === p.n
          const concluido = passo > p.n
          return (
            <button
              key={p.n}
              type="button"
              onClick={() => setPasso(p.n)}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                ativo
                  ? 'border-blue bg-surface-2'
                  : 'border-border bg-surface/80 hover:border-blue/50'
              }`}
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  ativo ? 'bg-blue text-white' : concluido ? 'bg-blue/20 text-blue' : 'bg-surface-2 text-text-dim'
                }`}
              >
                {concluido ? <Check className="h-4 w-4" /> : p.n}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{p.titulo}</span>
                <span className="block truncate text-xs text-text-dim">{p.descricao}</span>
              </span>
            </button>
          )
        })}
      </nav>

      {erro ? <Erro>{erro}</Erro> : null}

      {passo === 1 && <EtapaIdentidade briefing={briefing} aoMudar={aoMudar} />}
      {passo === 2 && <EtapaNavegacao briefing={briefing} aoMudar={aoMudar} />}
      {passo === 3 && <EtapaSecoes lpId={projeto.id} briefing={briefing} aoMudar={aoMudar} />}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <span className="text-xs text-text-dim">
          {salvando ? 'Salvando…' : salvo ? 'Tudo salvo automaticamente' : 'Alterações pendentes…'}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {passo > 1 && (
            <Button
              variante="secondary"
              onClick={() => setPasso((p) => (p - 1) as 1 | 2)}
              disabled={gerando}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          {passo < 3 ? (
            <Button onClick={() => setPasso((p) => (p + 1) as 2 | 3)}>
              Avançar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={gerar} disabled={gerando || problemas.length > 0}>
              {gerando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Landing Page
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {passo === 3 && problemas.length > 0 && !gerando && (
        <Aviso>{problemas.join(' ')}</Aviso>
      )}

      {gerando && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-bg/85 p-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-2xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue" />
            <p className="mt-5 font-display text-lg font-semibold">Criando sua landing page</p>
            <p className="mt-2 text-sm text-text-dim">{ETAPAS_GERACAO[etapaGeracao]}</p>
            <ul className="mt-6 space-y-2 text-left">
              {ETAPAS_GERACAO.map((etapa, i) => (
                <li
                  key={etapa}
                  className={`flex items-center gap-2 text-xs ${
                    i < etapaGeracao ? 'text-text-dim line-through' : i === etapaGeracao ? 'text-text' : 'text-text-dim/50'
                  }`}
                >
                  {i < etapaGeracao ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-blue" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
                  )}
                  {etapa}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-text-dim">
              Costuma levar de 30 segundos a 2 minutos. Não feche esta aba.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
