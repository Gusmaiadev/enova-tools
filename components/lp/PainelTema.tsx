'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Cor, Faixa, Fonte, Selecao, Texto } from './campos'
import { fontePorNome } from '@/lib/lp/fontes'
import type { CategoriaTexto, CoresTema, LpDocumento, LpTema } from '@/lib/lp/tipos'

const CATEGORIAS: { chave: CategoriaTexto; rotulo: string }[] = [
  { chave: 'titulos', rotulo: 'Títulos' },
  { chave: 'subtitulos', rotulo: 'Subtítulos' },
  { chave: 'textos', rotulo: 'Textos' },
  { chave: 'botoes', rotulo: 'Botões' },
]

const CORES: { chave: keyof CoresTema; rotulo: string }[] = [
  { chave: 'principal', rotulo: 'Principal' },
  { chave: 'secundaria', rotulo: 'Secundária' },
  { chave: 'titulos', rotulo: 'Títulos' },
  { chave: 'subtitulos', rotulo: 'Subtítulos' },
  { chave: 'textos', rotulo: 'Textos' },
  { chave: 'fundoBotoes', rotulo: 'Fundo dos botões' },
  { chave: 'botoes', rotulo: 'Texto dos botões' },
  { chave: 'header', rotulo: 'Header' },
  { chave: 'footer', rotulo: 'Footer' },
  { chave: 'fundoPagina', rotulo: 'Fundo da página' },
]

export function PainelTema({
  doc,
  aoMudar,
}: {
  doc: LpDocumento
  aoMudar: (tema: LpTema) => void
}) {
  const [aberta, setAberta] = useState<CategoriaTexto | null>('titulos')

  const mudarCor = (chave: keyof CoresTema, valor: string) =>
    aoMudar({ ...doc.tema, cores: { ...doc.tema.cores, [chave]: valor || doc.tema.cores[chave] } })

  const mudarTipografia = (cat: CategoriaTexto, patch: Record<string, string | number>) =>
    aoMudar({
      ...doc.tema,
      tipografia: {
        ...doc.tema.tipografia,
        [cat]: { ...doc.tema.tipografia[cat], ...patch },
      },
    })

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Cores</p>
        <div className="space-y-3">
          {CORES.map((c) => (
            <Cor
              key={c.chave}
              rotulo={c.rotulo}
              valor={doc.tema.cores[c.chave]}
              padrao={doc.tema.cores[c.chave]}
              aoMudar={(v) => mudarCor(c.chave, v)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.28em] text-text-dim">
          Tipografia
        </p>
        <div className="space-y-2">
          {CATEGORIAS.map((cat) => {
            const estilo = doc.tema.tipografia[cat.chave]
            const expandida = aberta === cat.chave
            const pesos = fontePorNome(estilo.fonte)?.pesos ?? [400, 500, 600, 700]
            return (
              <div key={cat.chave} className="rounded-md border border-border bg-surface-2/50">
                <button
                  type="button"
                  onClick={() => setAberta(expandida ? null : cat.chave)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{cat.rotulo}</span>
                    <span className="block truncate text-[11px] text-text-dim">
                      {estilo.fonte} · {estilo.peso} · {estilo.tamanho}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-text-dim transition-transform ${expandida ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandida && (
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    <Fonte
                      rotulo="Fonte"
                      valor={estilo.fonte}
                      aoMudar={(v) => mudarTipografia(cat.chave, { fonte: v })}
                    />
                    <Selecao
                      rotulo="Peso"
                      value={estilo.peso}
                      onChange={(e) => mudarTipografia(cat.chave, { peso: Number(e.target.value) })}
                    >
                      {pesos.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Selecao>
                    <Faixa
                      rotulo="Tamanho"
                      min={10}
                      max={cat.chave === 'titulos' ? 96 : 40}
                      valor={parseInt(estilo.tamanho, 10) || 16}
                      aoMudar={(v) => mudarTipografia(cat.chave, { tamanho: `${v}px` })}
                    />
                    <Texto
                      rotulo="Altura da linha"
                      value={estilo.alturaLinha}
                      onChange={(e) => mudarTipografia(cat.chave, { alturaLinha: e.target.value })}
                    />
                    <Texto
                      rotulo="Espaçamento das letras"
                      value={estilo.espacamentoLetras}
                      onChange={(e) =>
                        mudarTipografia(cat.chave, { espacamentoLetras: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.28em] text-text-dim">Detalhes</p>
        <Faixa
          rotulo="Arredondamento das bordas"
          min={0}
          max={32}
          valor={doc.tema.raio}
          aoMudar={(v) => aoMudar({ ...doc.tema, raio: v })}
        />
      </div>
    </div>
  )
}
