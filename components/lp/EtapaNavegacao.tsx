'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Alca } from './Alca'
import { Area, Bloco, Marcar, Selecao, Texto, Vazio } from './campos'
import { CamposBarra } from './CamposBarra'
import { ListaTelefones } from './ListaTelefones'
import { reordenar, useArrastar } from './arrastar'
import { gerarId } from '@/lib/lp/util'
import type { LpBriefing, Rede, RedeSocial } from '@/lib/lp/tipos'
import { ROTULO_REDE } from '@/lib/lp/tipos'

const SUGESTOES_MENU = ['Home', 'Quem Somos', 'Serviços', 'Benefícios', 'Depoimentos', 'FAQ', 'Contato']

const PLACEHOLDER_REDE: Record<Rede, string> = {
  facebook: 'https://facebook.com/suapagina',
  instagram: 'https://instagram.com/seuperfil',
  linkedin: 'https://linkedin.com/company/suaempresa',
  tiktok: 'https://tiktok.com/@seuperfil',
  youtube: 'https://youtube.com/@seucanal',
  x: 'https://x.com/seuperfil',
  pinterest: 'https://pinterest.com/seuperfil',
  whatsapp: 'https://wa.me/5511999999999',
}

export function EtapaNavegacao({
  briefing,
  aoMudar,
}: {
  briefing: LpBriefing
  aoMudar: (patch: Partial<LpBriefing>) => void
}) {
  const arrastarMenu = useArrastar((de, para) =>
    aoMudar({ menu: reordenar(briefing.menu, de, para) }),
  )

  const mudarMenu = (id: string, patch: { rotulo?: string; url?: string }) =>
    aoMudar({ menu: briefing.menu.map((m) => (m.id === id ? { ...m, ...patch } : m)) })

  const mudarFooter = (patch: Partial<LpBriefing['footer']>) =>
    aoMudar({ footer: { ...briefing.footer, ...patch } })

  const adicionarRede = () => {
    const usadas = new Set(briefing.redes.map((r) => r.rede))
    const livre = (Object.keys(ROTULO_REDE) as Rede[]).find((r) => !usadas.has(r)) ?? 'instagram'
    aoMudar({ redes: [...briefing.redes, { id: gerarId(), rede: livre, url: '' }] })
  }

  const mudarRede = (id: string, patch: Partial<RedeSocial>) =>
    aoMudar({ redes: briefing.redes.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  return (
    <div className="space-y-5">
      <Bloco
        titulo="Menu do header"
        descricao="Os itens do topo da página. Deixe a URL em branco para o item rolar até a seção com o mesmo nome."
        acao={
          <button
            type="button"
            onClick={() =>
              aoMudar({ menu: [...briefing.menu, { id: gerarId(), rotulo: '', url: '' }] })
            }
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar item
          </button>
        }
      >
        {briefing.menu.length === 0 ? (
          <div className="space-y-3">
            <Vazio>Nenhum item no menu ainda.</Vazio>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-dim">Sugestões:</span>
              {SUGESTOES_MENU.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    aoMudar({ menu: [...briefing.menu, { id: gerarId(), rotulo: s, url: '' }] })
                  }
                  className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs transition-colors hover:border-blue/60"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {briefing.menu.map((m, i) => (
              <li
                key={m.id}
                {...arrastarMenu.alvo(i)}
                className={`flex items-center gap-2 rounded-md border border-border bg-surface-2/50 p-2 ${arrastarMenu.classe(i)}`}
              >
                <Alca arrastar={arrastarMenu} indice={i} total={briefing.menu.length} rotulo={m.rotulo || 'item'} />
                <input
                  className="h-9 w-40 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                  placeholder="Nome do item"
                  value={m.rotulo}
                  onChange={(e) => mudarMenu(m.id, { rotulo: e.target.value })}
                  maxLength={40}
                />
                <input
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                  placeholder="URL externa (opcional)"
                  value={m.url}
                  onChange={(e) => mudarMenu(m.id, { url: e.target.value })}
                  inputMode="url"
                />
                <button
                  type="button"
                  aria-label={`Remover ${m.rotulo || 'item'}`}
                  onClick={() => aoMudar({ menu: briefing.menu.filter((x) => x.id !== m.id) })}
                  className="shrink-0 rounded-md p-2 text-text-dim transition-colors hover:text-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium">Aparência do topo</p>
          <CamposBarra
            estilo={briefing.estiloHeader}
            // A logo enviada na Identidade manda: com imagem, o tamanho é altura.
            logoImagem={Boolean(briefing.logo)}
            aoMudar={(patch) =>
              aoMudar({ estiloHeader: { ...briefing.estiloHeader, ...patch } })
            }
          />
        </div>
      </Bloco>

      <Bloco titulo="Footer" descricao="Tudo é opcional — preencha o que fizer sentido para o projeto.">
        <div className="space-y-4">
          <Area
            rotulo="Texto institucional"
            placeholder="Uma ou duas frases sobre a empresa."
            value={briefing.footer.textoInstitucional}
            onChange={(e) => mudarFooter({ textoInstitucional: e.target.value })}
            maxLength={600}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Texto
              rotulo="Direitos autorais"
              placeholder="© 2026 Sua Empresa. Todos os direitos reservados."
              value={briefing.footer.direitos}
              onChange={(e) => mudarFooter({ direitos: e.target.value })}
              maxLength={200}
            />
            <Texto
              rotulo="Endereço"
              placeholder="Rua Exemplo, 123 — São Paulo/SP"
              value={briefing.footer.endereco}
              onChange={(e) => mudarFooter({ endereco: e.target.value })}
              maxLength={300}
            />
            <Texto
              rotulo="E-mail"
              placeholder="contato@suaempresa.com.br"
              value={briefing.footer.email}
              onChange={(e) => mudarFooter({ email: e.target.value })}
              inputMode="email"
              maxLength={120}
            />
          </div>

          <ListaTelefones
            telefones={briefing.footer.telefones}
            aoMudar={(telefones) => mudarFooter({ telefones })}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-text-dim">Links úteis</span>
              <button
                type="button"
                onClick={() =>
                  mudarFooter({
                    linksUteis: [
                      ...briefing.footer.linksUteis,
                      { id: gerarId(), rotulo: '', url: '' },
                    ],
                  })
                }
                className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar link
              </button>
            </div>
            {briefing.footer.linksUteis.length === 0 ? (
              <Vazio>Nenhum link útil. Ex.: Política de Privacidade, Trabalhe Conosco.</Vazio>
            ) : (
              <ul className="space-y-2">
                {briefing.footer.linksUteis.map((l) => (
                  <li key={l.id} className="flex items-center gap-2">
                    <input
                      className="h-9 w-40 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                      placeholder="Nome do link"
                      value={l.rotulo}
                      onChange={(e) =>
                        mudarFooter({
                          linksUteis: briefing.footer.linksUteis.map((x) =>
                            x.id === l.id ? { ...x, rotulo: e.target.value } : x,
                          ),
                        })
                      }
                      maxLength={60}
                    />
                    <input
                      className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-text-dim/60 focus:border-blue focus:outline-none"
                      placeholder="https://…"
                      value={l.url}
                      onChange={(e) =>
                        mudarFooter({
                          linksUteis: briefing.footer.linksUteis.map((x) =>
                            x.id === l.id ? { ...x, url: e.target.value } : x,
                          ),
                        })
                      }
                      inputMode="url"
                    />
                    <button
                      type="button"
                      aria-label={`Remover ${l.rotulo || 'link'}`}
                      onClick={() =>
                        mudarFooter({
                          linksUteis: briefing.footer.linksUteis.filter((x) => x.id !== l.id),
                        })
                      }
                      className="shrink-0 rounded-md p-2 text-text-dim transition-colors hover:text-pink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Marcar
            rotulo="Repetir o menu do header no rodapé"
            valor={briefing.footer.menuSecundario}
            aoMudar={(v) => mudarFooter({ menuSecundario: v })}
          />

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-medium">Aparência do rodapé</p>
            <CamposBarra
              estilo={briefing.footer.estilo}
              // O rodapé repete a logo do topo: com imagem enviada, o tamanho
              // daqui é a altura dela; sem, é o corpo do nome escrito.
              logoImagem={Boolean(briefing.logo)}
              aoMudar={(patch) =>
                mudarFooter({ estilo: { ...briefing.footer.estilo, ...patch } })
              }
            />
          </div>
        </div>
      </Bloco>

      <Bloco
        titulo="Redes sociais"
        descricao="Os ícones são inseridos automaticamente no rodapé."
        acao={
          briefing.redes.length < 8 ? (
            <button
              type="button"
              onClick={adicionarRede}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs transition-colors hover:border-blue/60"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar rede
            </button>
          ) : null
        }
      >
        {briefing.redes.length === 0 ? (
          <Vazio>Nenhuma rede social adicionada.</Vazio>
        ) : (
          <ul className="space-y-2">
            {briefing.redes.map((r) => (
              <li key={r.id} className="flex items-end gap-2">
                <div className="w-40 shrink-0">
                  <Selecao
                    rotulo="Rede"
                    value={r.rede}
                    onChange={(e) => mudarRede(r.id, { rede: e.target.value as Rede })}
                  >
                    {(Object.keys(ROTULO_REDE) as Rede[]).map((rede) => (
                      <option key={rede} value={rede}>
                        {ROTULO_REDE[rede]}
                      </option>
                    ))}
                  </Selecao>
                </div>
                <div className="min-w-0 flex-1">
                  <Texto
                    rotulo="Endereço do perfil"
                    placeholder={PLACEHOLDER_REDE[r.rede]}
                    value={r.url}
                    onChange={(e) => mudarRede(r.id, { url: e.target.value })}
                    inputMode="url"
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remover ${ROTULO_REDE[r.rede]}`}
                  onClick={() => aoMudar({ redes: briefing.redes.filter((x) => x.id !== r.id) })}
                  className="mb-0 h-10 shrink-0 rounded-md px-2 text-text-dim transition-colors hover:text-pink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </div>
  )
}
