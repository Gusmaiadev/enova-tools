'use client'

import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Bloco, Cor, Fonte, Selecao, Texto, Vazio } from './campos'
import { TEMA_PADRAO } from '@/lib/lp/documento'
import { fontePorNome } from '@/lib/lp/fontes'
import type { CategoriaTexto, CoresTema, LpBriefing } from '@/lib/lp/tipos'

const CATEGORIAS: { chave: CategoriaTexto; rotulo: string; exemplo: string }[] = [
  { chave: 'titulos', rotulo: 'Títulos', exemplo: 'Transforme seu negócio' },
  { chave: 'subtitulos', rotulo: 'Subtítulos', exemplo: 'A solução completa para sua empresa' },
  { chave: 'textos', rotulo: 'Textos', exemplo: 'Nosso time cuida de tudo para você.' },
  { chave: 'botoes', rotulo: 'Botões', exemplo: 'Fale conosco' },
]

const CORES: { chave: keyof CoresTema; rotulo: string }[] = [
  { chave: 'principal', rotulo: 'Cor principal' },
  { chave: 'secundaria', rotulo: 'Cor secundária' },
  { chave: 'titulos', rotulo: 'Títulos' },
  { chave: 'subtitulos', rotulo: 'Subtítulos' },
  { chave: 'textos', rotulo: 'Textos' },
  { chave: 'fundoBotoes', rotulo: 'Fundo dos botões' },
  { chave: 'botoes', rotulo: 'Texto dos botões' },
  { chave: 'header', rotulo: 'Header' },
  { chave: 'footer', rotulo: 'Footer' },
  { chave: 'fundoPagina', rotulo: 'Fundo da página' },
]

const PALETAS: { nome: string; cores: Partial<CoresTema> }[] = [
  {
    nome: 'Corporativo',
    cores: {
      principal: '#2563eb', secundaria: '#0ea5e9', titulos: '#0f172a', subtitulos: '#334155',
      textos: '#475569', botoes: '#ffffff', fundoBotoes: '#2563eb', header: '#ffffff',
      footer: '#0f172a', fundoPagina: '#ffffff',
    },
  },
  {
    nome: 'Elegante escuro',
    cores: {
      principal: '#c8a45c', secundaria: '#7c6134', titulos: '#f5f5f4', subtitulos: '#d6d3d1',
      textos: '#a8a29e', botoes: '#1c1917', fundoBotoes: '#c8a45c', header: '#1c1917',
      footer: '#0c0a09', fundoPagina: '#1c1917',
    },
  },
  {
    nome: 'Saúde',
    cores: {
      principal: '#0d9488', secundaria: '#14b8a6', titulos: '#134e4a', subtitulos: '#115e59',
      textos: '#475569', botoes: '#ffffff', fundoBotoes: '#0d9488', header: '#ffffff',
      footer: '#134e4a', fundoPagina: '#f8fafc',
    },
  },
  {
    nome: 'Vibrante',
    cores: {
      principal: '#e11d48', secundaria: '#f97316', titulos: '#18181b', subtitulos: '#3f3f46',
      textos: '#52525b', botoes: '#ffffff', fundoBotoes: '#e11d48', header: '#ffffff',
      footer: '#18181b', fundoPagina: '#fffbf7',
    },
  },
  {
    nome: 'Natural',
    cores: {
      principal: '#4d7c0f', secundaria: '#84cc16', titulos: '#1a2e05', subtitulos: '#3f6212',
      textos: '#57534e', botoes: '#ffffff', fundoBotoes: '#4d7c0f', header: '#fefce8',
      footer: '#1a2e05', fundoPagina: '#fefdf8',
    },
  },
]

export function EtapaIdentidade({
  briefing,
  aoMudar,
}: {
  briefing: LpBriefing
  aoMudar: (patch: Partial<LpBriefing>) => void
}) {
  const [aberta, setAberta] = useState<CategoriaTexto | null>(null)

  const mudarTipografia = (cat: CategoriaTexto, campo: string, valor: string | number) => {
    const atual = briefing.tipografia[cat] ?? {}
    const proximo = { ...atual, [campo]: valor }
    if (valor === '' || valor === 0) delete (proximo as Record<string, unknown>)[campo]
    const tipografia = { ...briefing.tipografia, [cat]: proximo }
    if (Object.keys(proximo).length === 0) delete tipografia[cat]
    aoMudar({ tipografia })
  }

  const mudarCor = (chave: keyof CoresTema, valor: string) => {
    const cores = { ...briefing.cores }
    if (valor === '') delete cores[chave]
    else cores[chave] = valor
    aoMudar({ cores })
  }

  const aplicarPaleta = (cores: Partial<CoresTema>) => aoMudar({ cores: { ...cores } })

  const mudarReferencia = (i: number, valor: string) => {
    const referencias = [...briefing.referencias]
    referencias[i] = valor
    aoMudar({ referencias })
  }

  return (
    <div className="space-y-5">
      <Bloco
        titulo="Nome do projeto"
        descricao="Aparece como nome da marca no topo da página e no título da aba do navegador."
      >
        <Texto
          rotulo="Nome"
          placeholder="Ex.: Clínica Vida"
          value={briefing.nome}
          onChange={(e) => aoMudar({ nome: e.target.value })}
          maxLength={80}
        />
      </Bloco>

      <Bloco
        titulo="Tipografia"
        descricao="Opcional. O que você não definir, a IA escolhe combinando com o estilo da página."
      >
        <div className="space-y-2">
          {CATEGORIAS.map((cat) => {
            const atual = briefing.tipografia[cat.chave] ?? {}
            const definido = Object.keys(atual).length > 0
            const expandida = aberta === cat.chave
            const fonte = atual.fonte ?? TEMA_PADRAO.tipografia[cat.chave].fonte
            const pesos = fontePorNome(fonte)?.pesos ?? [400, 500, 600, 700]

            return (
              <div key={cat.chave} className="rounded-md border border-border bg-surface-2/50">
                <button
                  type="button"
                  onClick={() => setAberta(expandida ? null : cat.chave)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-sm font-medium">{cat.rotulo}</span>
                    <span className="truncate text-xs text-text-dim">
                      {definido
                        ? [atual.fonte, atual.peso, atual.tamanho].filter(Boolean).join(' · ')
                        : 'Automático'}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${expandida ? 'rotate-180' : ''}`}
                  />
                </button>

                {expandida && (
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    <p
                      className="rounded bg-surface px-3 py-2 text-text"
                      style={{
                        fontFamily: atual.fonte ? `'${atual.fonte}', sans-serif` : undefined,
                        fontWeight: atual.peso,
                        fontSize: atual.tamanho,
                        lineHeight: atual.alturaLinha,
                        letterSpacing: atual.espacamentoLetras,
                      }}
                    >
                      {cat.exemplo}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Fonte
                        rotulo="Fonte"
                        valor={atual.fonte}
                        permitirVazio
                        aoMudar={(v) => mudarTipografia(cat.chave, 'fonte', v)}
                      />
                      <Selecao
                        rotulo="Peso"
                        value={atual.peso ?? ''}
                        onChange={(e) =>
                          mudarTipografia(cat.chave, 'peso', Number(e.target.value) || 0)
                        }
                      >
                        <option value="">Automático</option>
                        {pesos.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Selecao>
                      <Texto
                        rotulo="Tamanho"
                        dica="px"
                        placeholder="automático"
                        value={(atual.tamanho ?? '').replace('px', '')}
                        onChange={(e) =>
                          mudarTipografia(
                            cat.chave,
                            'tamanho',
                            e.target.value.trim() === '' ? '' : `${e.target.value.replace(/\D/g, '')}px`,
                          )
                        }
                        inputMode="numeric"
                      />
                      <Texto
                        rotulo="Altura da linha"
                        dica="ex.: 1.5"
                        placeholder="automático"
                        value={atual.alturaLinha ?? ''}
                        onChange={(e) => mudarTipografia(cat.chave, 'alturaLinha', e.target.value)}
                      />
                      <Texto
                        rotulo="Espaçamento das letras"
                        dica="ex.: 0.02em"
                        placeholder="automático"
                        value={atual.espacamentoLetras ?? ''}
                        onChange={(e) =>
                          mudarTipografia(cat.chave, 'espacamentoLetras', e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Bloco>

      <Bloco
        titulo="Cores"
        descricao="Opcional. Comece por uma paleta pronta e ajuste o que quiser — ou deixe tudo automático."
      >
        <div className="mb-5 flex flex-wrap gap-2">
          {PALETAS.map((p) => (
            <button
              key={p.nome}
              type="button"
              onClick={() => aplicarPaleta(p.cores)}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-xs transition-colors hover:border-blue/60"
            >
              <span className="flex">
                {[p.cores.principal, p.cores.secundaria, p.cores.fundoPagina, p.cores.footer].map(
                  (c, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full border border-border/60"
                      style={{ background: c, marginLeft: i === 0 ? 0 : -6 }}
                    />
                  ),
                )}
              </span>
              {p.nome}
            </button>
          ))}
          {Object.keys(briefing.cores).length > 0 && (
            <button
              type="button"
              onClick={() => aoMudar({ cores: {} })}
              className="rounded-md px-3 py-2 text-xs text-text-dim transition-colors hover:bg-surface-2 hover:text-text"
            >
              Limpar tudo
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CORES.map((c) => (
            <Cor
              key={c.chave}
              rotulo={c.rotulo}
              valor={briefing.cores[c.chave]}
              padrao={TEMA_PADRAO.cores[c.chave]}
              aoMudar={(v) => mudarCor(c.chave, v)}
            />
          ))}
        </div>
      </Bloco>

      <Bloco
        titulo="Sites de referência"
        descricao="Até 5 sites que você gosta. A IA lê o estilo deles como inspiração — nunca copia conteúdo."
        acao={
          briefing.referencias.length < 5 ? (
            <button
              type="button"
              onClick={() => aoMudar({ referencias: [...briefing.referencias, ''] })}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          ) : null
        }
      >
        {briefing.referencias.length === 0 ? (
          <Vazio>Nenhum site de referência. É opcional, mas ajuda muito no resultado.</Vazio>
        ) : (
          <div className="space-y-2">
            {briefing.referencias.map((url, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Texto
                    rotulo={`Referência ${i + 1}`}
                    placeholder="https://exemplo.com.br"
                    value={url}
                    onChange={(e) => mudarReferencia(i, e.target.value)}
                    inputMode="url"
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remover referência ${i + 1}`}
                  onClick={() =>
                    aoMudar({ referencias: briefing.referencias.filter((_, j) => j !== i) })
                  }
                  className="mb-0 h-10 rounded-md px-2 text-text-dim transition-colors hover:text-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Bloco>
    </div>
  )
}
