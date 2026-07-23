import { LayoutTemplate, LineChart, type LucideIcon, Radar } from 'lucide-react'

/**
 * Registro de ferramentas. Adicionar a segunda ferramenta = adicionar uma entrada
 * aqui e criar a rota correspondente em app/app/{href}. Nada mais.
 */
export type Ferramenta = {
  slug: string
  nome: string
  descricao: string
  href: string
  disponivel: boolean
  icone: LucideIcon
}

export const FERRAMENTAS: Ferramenta[] = [
  {
    slug: 'leads',
    nome: 'Buscador de Leads',
    descricao: 'Encontra empresas que ainda não têm site.',
    href: '/app/leads',
    disponivel: true,
    icone: Radar,
  },
  {
    slug: 'ads',
    nome: 'Acompanhamento Google Ads',
    descricao: 'Importa relatórios, mostra métricas e sugere melhorias com IA.',
    href: '/app/ads',
    disponivel: true,
    icone: LineChart,
  },
  {
    slug: 'lp',
    nome: 'Criador de Landing Pages',
    descricao: 'A IA monta a página e você ajusta tudo num editor visual.',
    href: '/app/lp',
    disponivel: true,
    icone: LayoutTemplate,
  },
]

export function ferramentaPorSlug(slug: string): Ferramenta | undefined {
  return FERRAMENTAS.find((f) => f.slug === slug)
}
