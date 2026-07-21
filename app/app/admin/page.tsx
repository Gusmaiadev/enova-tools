import { headers } from 'next/headers'
import { ControleCadastro } from '@/components/admin/ControleCadastro'
import { TabelaUsuarios } from '@/components/admin/TabelaUsuarios'
import { lerConfig } from '@/lib/admin/config'
import { listarLogs, ROTULO_ACAO } from '@/lib/admin/log'
import { listarUsuarios } from '@/lib/admin/usuarios'
import { exigirAdmin } from '@/lib/auth/usuarioAtual'

export const dynamic = 'force-dynamic'

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string
  descricao?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">{titulo}</h2>
      {descricao ? <p className="mt-1 mb-4 text-sm text-text-dim">{descricao}</p> : <div className="mb-4" />}
      {children}
    </section>
  )
}

export default async function Admin() {
  const usuario = await exigirAdmin()

  const [usuarios, logs, config, h] = await Promise.all([
    listarUsuarios(usuario.teamId),
    listarLogs(usuario.teamId),
    lerConfig(),
    headers(),
  ])

  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  const urlCadastro = `${proto}://${host}/cadastro`

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-display text-2xl font-semibold">Painel</h1>

      <div className="space-y-6">
        <Secao titulo="Cadastro" descricao="Controle quem pode criar conta e compartilhe o link.">
          <ControleCadastro abertoInicial={config.cadastroAberto} urlCadastro={urlCadastro} />
        </Secao>

        <Secao
          titulo="Usuários"
          descricao="Promova a admin, remova o acesso ou exclua contas da equipe."
        >
          <TabelaUsuarios inicial={usuarios} meuUid={usuario.uid} />
        </Secao>

        <Secao
          titulo="Atividade"
          descricao="O que a equipe fez nas ferramentas, do mais recente ao mais antigo."
        >
          {logs.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhuma atividade registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l, i) => (
                <li key={i} className="flex flex-col gap-0.5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{l.nome}</span>
                    <span className="shrink-0 font-mono text-xs text-text-dim">
                      {new Date(l.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <span className="text-sm text-text-dim">
                    {ROTULO_ACAO[l.acao] ?? l.acao}
                    {l.detalhe ? ` · ${l.detalhe}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>
    </div>
  )
}
