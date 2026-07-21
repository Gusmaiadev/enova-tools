import { LeadsTabs } from '@/components/leads/LeadsTabs'
import { ferramentaPorSlug } from '@/lib/ferramentas'

export default function LeadsPage() {
  const Icone = ferramentaPorSlug('leads')!.icone

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface-2 text-blue">
          <Icone className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight">
            Buscador de Leads
          </h1>
          <p className="text-sm text-text-dim">
            Empresas que ainda não têm site — as melhores para prospectar.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <LeadsTabs />
      </div>
    </div>
  )
}
