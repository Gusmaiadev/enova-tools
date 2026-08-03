'use client'

import { FileText, Wand2 } from 'lucide-react'
import { Aviso } from '@/components/Campo'
import { Bloco, Texto, Vazio } from './campos'
import { modeloPagina } from '@/lib/lp/legais'
import type { LpBriefing, PaginaLegal } from '@/lib/lp/tipos'
import { infoPagina } from '@/lib/lp/tipos'

/**
 * Etapa dos textos das páginas de Termos de Uso e Política de Privacidade —
 * aparece só quando alguma foi marcada na etapa Identidade. O texto vai inteiro
 * para o arquivo gerado (termos.html, privacidade.html): a IA não escreve nem
 * reescreve nada aqui.
 */
export function EtapaPaginas({
  briefing,
  aoMudar,
}: {
  briefing: LpBriefing
  aoMudar: (patch: Partial<LpBriefing>) => void
}) {
  const mudar = (tipo: PaginaLegal['tipo'], patch: Partial<PaginaLegal>) =>
    aoMudar({
      paginas: briefing.paginas.map((p) => (p.tipo === tipo ? { ...p, ...patch } : p)),
    })

  if (briefing.paginas.length === 0) {
    return (
      <Bloco titulo="Páginas" descricao="Nenhuma página de texto marcada.">
        <Vazio>
          Volte à etapa 1 e marque “Termos de Uso” ou “Política de Privacidade” para escrever o
          texto delas aqui.
        </Vazio>
      </Bloco>
    )
  }

  return (
    <div className="space-y-5">
      <Aviso>
        Os modelos são um ponto de partida genérico, não uma peça jurídica pronta. Leia, adapte ao
        seu negócio e, em caso de dúvida, mostre a alguém do direito antes de publicar.
      </Aviso>

      {briefing.paginas.map((p) => {
        const info = infoPagina(p.tipo)
        const caracteres = p.conteudo.trim().length
        return (
          <Bloco
            key={p.tipo}
            titulo={info.titulo}
            descricao={`Vira o arquivo ${info.arquivo}, com o mesmo cabeçalho e rodapé da landing page. O link entra sozinho nos “Links úteis”.`}
            acao={
              <button
                type="button"
                onClick={() =>
                  mudar(p.tipo, {
                    conteudo: modeloPagina(p.tipo, {
                      marca: briefing.nome.trim() || 'nossa empresa',
                      email: briefing.footer.email.trim() || undefined,
                      endereco: briefing.footer.endereco.trim() || undefined,
                    }),
                  })
                }
                className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {caracteres > 0 ? 'Substituir pelo modelo' : 'Usar modelo'}
              </button>
            }
          >
            <div className="space-y-4">
              <Texto
                rotulo="Título da página"
                placeholder={info.titulo}
                value={p.titulo}
                onChange={(e) => mudar(p.tipo, { titulo: e.target.value })}
                maxLength={80}
              />
              <label className="flex flex-col gap-1.5">
                <span className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-dim">
                  <span>
                    Texto da página
                    <span className="ml-1 text-xs text-text-dim/70">
                      (linha em branco separa parágrafo; comece a linha com “## ” para um subtítulo)
                    </span>
                  </span>
                  <span className="font-mono text-xs text-text-dim/70">
                    {caracteres.toLocaleString('pt-BR')} caracteres
                  </span>
                </span>
                <textarea
                  className="min-h-[420px] w-full rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-[13px] leading-relaxed text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                  placeholder={`Cole aqui o texto ${
                    p.tipo === 'termos' ? 'dos termos de uso' : 'da política de privacidade'
                  } ou clique em “Usar modelo”.`}
                  value={p.conteudo}
                  onChange={(e) => mudar(p.tipo, { conteudo: e.target.value })}
                  maxLength={60000}
                  spellCheck
                />
              </label>
              {caracteres === 0 && (
                <p className="flex items-center gap-1.5 text-xs text-text-dim">
                  <FileText className="h-3.5 w-3.5" />
                  Sem texto, esta página não é gerada.
                </p>
              )}
            </div>
          </Bloco>
        )
      })}
    </div>
  )
}
