'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Erro } from '@/components/Campo'
import { ModalConfirmacao } from '@/components/ModalConfirmacao'
import type { UsuarioAdmin } from '@/lib/admin/usuarios'

export function TabelaUsuarios({
  inicial,
  meuUid,
}: {
  inicial: UsuarioAdmin[]
  meuUid: string
}) {
  const [usuarios, setUsuarios] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [paraExcluir, setParaExcluir] = useState<UsuarioAdmin | null>(null)

  async function alternarAdmin(u: UsuarioAdmin) {
    setErro(null)
    setOcupado(u.uid)
    try {
      const r = await fetch(`/api/admin/usuarios/${u.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin: !u.admin }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.erro ?? 'Falha ao atualizar.')
      setUsuarios((lista) =>
        lista.map((x) => (x.uid === u.uid ? { ...x, admin: !u.admin } : x)),
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao atualizar.')
    } finally {
      setOcupado(null)
    }
  }

  async function confirmarExclusao() {
    const u = paraExcluir
    if (!u) return
    setErro(null)
    setOcupado(u.uid)
    try {
      const r = await fetch(`/api/admin/usuarios/${u.uid}`, { method: 'DELETE' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.erro ?? 'Falha ao excluir.')
      setUsuarios((lista) => lista.filter((x) => x.uid !== u.uid))
      setParaExcluir(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao excluir.')
      setParaExcluir(null)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {erro ? <Erro>{erro}</Erro> : null}
      <ul className="divide-y divide-border">
        {usuarios.map((u) => {
          const souEu = u.uid === meuUid
          return (
            <li
              key={u.uid}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{u.name}</span>
                  {u.admin ? (
                    <span className="rounded-full border border-blue/40 bg-blue/10 px-2 py-0.5 text-xs text-blue">
                      admin
                    </span>
                  ) : null}
                  {souEu ? <span className="text-xs text-text-dim">(você)</span> : null}
                </p>
                <p className="truncate font-mono text-sm text-text-dim">{u.email}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variante="secondary"
                  disabled={ocupado === u.uid || (souEu && u.admin)}
                  onClick={() => alternarAdmin(u)}
                >
                  {u.admin ? 'Remover admin' : 'Tornar admin'}
                </Button>
                <Button
                  variante="danger"
                  disabled={ocupado === u.uid || souEu}
                  onClick={() => setParaExcluir(u)}
                >
                  Excluir
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <ModalConfirmacao
        aberto={!!paraExcluir}
        titulo="Excluir usuário"
        variante="danger"
        textoConfirmar="Excluir"
        carregando={!!paraExcluir && ocupado === paraExcluir.uid}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setParaExcluir(null)}
        mensagem={
          <>
            A conta de <strong className="text-text">{paraExcluir?.name}</strong>, o
            acesso e <strong className="text-text">todos os leads</strong> que essa
            pessoa salvou serão apagados. Isso não pode ser desfeito.
          </>
        }
      />
    </div>
  )
}
