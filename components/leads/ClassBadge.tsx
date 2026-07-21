import type { Classificacao } from '@/lib/places/classificar'

/**
 * O amarelo (ouro) so aparece em lead_quente (secao 4/8.3). sem_nada e neutro;
 * tem_site e apagado. Se houver amarelo em mais de um lugar por tela, e bug.
 */
const CONFIG: Record<Classificacao, { rotulo: string; classe: string }> = {
  lead_quente: {
    rotulo: 'Sem site — só rede social',
    classe: 'border-yellow/50 bg-yellow/10 text-yellow',
  },
  sem_nada: {
    rotulo: 'Sem site',
    classe: 'border-border bg-surface-2 text-text',
  },
  tem_site: {
    rotulo: 'Já tem site',
    classe: 'border-border bg-transparent text-text-dim',
  },
}

export function ClassBadge({ classificacao }: { classificacao: Classificacao }) {
  const c = CONFIG[classificacao]
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.classe}`}>
      {c.rotulo}
    </span>
  )
}
