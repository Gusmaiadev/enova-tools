'use client'

import { useState } from 'react'
import { Button } from '@/components/Button'
import { Erro } from '@/components/Campo'

export function ControleCadastro({
  abertoInicial,
  urlCadastro,
}: {
  abertoInicial: boolean
  urlCadastro: string
}) {
  const [aberto, setAberto] = useState(abertoInicial)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function alternar() {
    setErro(null)
    setSalvando(true)
    try {
      const r = await fetch('/api/admin/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aberto: !aberto }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.erro ?? 'Falha ao atualizar.')
      setAberto(!aberto)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao atualizar.')
    } finally {
      setSalvando(false)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(urlCadastro)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não foi possível copiar. Copie o link manualmente.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">
            Cadastro{' '}
            <span className={aberto ? 'text-blue' : 'text-pink'}>
              {aberto ? 'aberto' : 'fechado'}
            </span>
          </p>
          <p className="text-sm text-text-dim">
            {aberto
              ? 'Qualquer pessoa com o link pode criar uma conta.'
              : 'A página de criação de conta está desativada.'}
          </p>
        </div>
        <Button
          variante={aberto ? 'danger' : 'primary'}
          disabled={salvando}
          onClick={alternar}
        >
          {aberto ? 'Desabilitar' : 'Habilitar'}
        </Button>
      </div>

      {aberto ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-dim">Link de cadastro</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={urlCadastro}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 flex-1 rounded-md border border-border bg-surface-2 px-3 font-mono text-sm text-text"
            />
            <Button variante="secondary" onClick={copiar}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>
      ) : null}

      {erro ? <Erro>{erro}</Erro> : null}
    </div>
  )
}
