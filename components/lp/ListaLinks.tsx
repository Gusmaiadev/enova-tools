'use client'

import { Lock, Plus, Trash2 } from 'lucide-react'
import { Alca } from './Alca'
import { Vazio } from './campos'
import { reordenar, useArrastar } from './arrastar'
import { linksUteisOrdenados, ordemLegal } from '@/lib/lp/documento'
import type { LinkFooter } from '@/lib/lp/tipos'
import { gerarId } from '@/lib/lp/util'

const MAX_LINKS = 12

/**
 * Links úteis do rodapé, na mesma ordem em que saem na página. Os links das
 * páginas legais aparecem travados no fim: quem os move é sincronizarLinksPaginas
 * e o rodapé os ordena assim de qualquer jeito — dar alça neles seria arrastar
 * algo que volta para o lugar.
 */
export function ListaLinks({
  links,
  aoMudar,
}: {
  links: LinkFooter[]
  aoMudar: (links: LinkFooter[], chave?: string) => void
}) {
  // A lista exibida é a ordenada; gravar de volta nessa ordem também normaliza
  // o que está salvo, então o documento passa a bater com a página.
  const ordenados = linksUteisOrdenados(links)
  const fixo = (l: LinkFooter) => ordemLegal(l.url, l.rotulo) >= 0
  const moveis = ordenados.filter((l) => !fixo(l)).length

  const arrastar = useArrastar((de, para) => aoMudar(reordenar(ordenados, de, para)))

  const mudar = (id: string, patch: Partial<LinkFooter>, chave: string) =>
    aoMudar(
      ordenados.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      chave,
    )

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-text-dim">Links úteis</span>
        {ordenados.length < MAX_LINKS && (
          <button
            type="button"
            onClick={() => aoMudar([...ordenados, { id: gerarId(), rotulo: '', url: '' }])}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar link
          </button>
        )}
      </div>
      {ordenados.length === 0 ? (
        <Vazio>Nenhum link útil. Ex.: Blog, Trabalhe Conosco.</Vazio>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((l, i) => {
            const travado = fixo(l)
            return (
              <li
                key={l.id}
                {...(travado ? {} : arrastar.alvo(i))}
                className={`space-y-2 rounded-md border border-border bg-surface-2/50 p-2 ${
                  travado ? '' : arrastar.classe(i)
                }`}
              >
                <div className="flex items-center gap-2">
                  {travado ? (
                    <span
                      className="flex w-16 shrink-0 justify-center text-text-dim/60"
                      title="Páginas legais ficam sempre no fim da lista"
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <Alca
                      arrastar={arrastar}
                      indice={i}
                      total={moveis}
                      rotulo={l.rotulo || 'link'}
                    />
                  )}
                  <input
                    className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                    placeholder="Nome do link"
                    value={l.rotulo}
                    onChange={(e) => mudar(l.id, { rotulo: e.target.value }, `link-rotulo-${l.id}`)}
                    maxLength={60}
                  />
                  <button
                    type="button"
                    aria-label={`Remover ${l.rotulo || 'link'}`}
                    onClick={() => aoMudar(ordenados.filter((x) => x.id !== l.id))}
                    className="shrink-0 rounded-md p-2 text-text-dim transition-colors hover:text-pink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  className="h-9 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                  placeholder="https://… ou #secao"
                  value={l.url}
                  onChange={(e) => mudar(l.id, { url: e.target.value }, `link-url-${l.id}`)}
                  inputMode="url"
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
