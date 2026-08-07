import type { LpElemento } from '@/lib/lp/tipos'

/**
 * Como o painel chama cada tipo de nó da árvore. Vive fora dos painéis porque
 * três deles falam do mesmo elemento — estrutura, caminho do widget e ordem dos
 * blocos — e um nome diferente em cada um faria parecer coisas diferentes.
 */
export const NOME_ELEMENTO: Record<string, string> = {
  container: 'Container',
  titulo: 'Título',
  texto: 'Texto',
  imagem: 'Imagem',
  video: 'Vídeo',
  botao: 'Botão',
  icone: 'Ícone',
  numero: 'Número',
  lista: 'Lista',
  espacador: 'Espaçador',
  divisor: 'Divisor',
  faq: 'FAQ',
  abas: 'Abas',
  carrossel: 'Carrossel',
  depoimentos: 'Depoimentos',
  comparacao: 'Comparação',
  formulario: 'Formulário',
}

/** Trecho do conteúdo do nó, para a linha não ser só o nome do tipo. */
export function resumoNo(el: LpElemento): string {
  switch (el.tipo) {
    case 'titulo':
    case 'texto':
      return el.texto
    case 'botao':
      return el.botao.texto
    case 'numero':
      return `${el.valor} ${el.rotulo}`
    case 'icone':
      return el.nome
    case 'imagem':
    case 'video':
      return el.midia.alt || el.midia.busca
    case 'container':
      return `${el.filhos.length} ${el.filhos.length === 1 ? 'elemento' : 'elementos'}`
    default:
      return ''
  }
}
