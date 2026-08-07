/**
 * Partes editaveis dos widgets compostos.
 *
 * Um widget composto e UM no da arvore com varios textos dentro, e a folha base
 * escreve cor, fonte, peso e tamanho direto neles (.lp-stat-valor, summary,
 * .lp-depo-nome…). Regra direta no filho vence heranca, entao o `estilo` do no
 * — que sai como `.lp-e-<id>{…}` — nunca alcancava nenhum desses textos: o
 * campo existia no painel e nao fazia nada.
 *
 * Este catalogo e a lista do que da para editar em cada um. Vale para dois
 * consumidores que nao podem divergir: o compilador, que monta o seletor, e o
 * painel, que monta os campos. Parte fora daqui nao existe — a coercao descarta.
 *
 * Os seletores sao literais DAQUI, nunca do documento: eles entram no CSS, e o
 * que vem do cliente e so o valor de cada propriedade, que passa pela mesma
 * coercao de qualquer estilo da arvore.
 */

export type ParteWidget = {
  chave: string
  rotulo: string
  /** Seletores dentro do no. Cada um recebe a classe do no na frente. */
  seletores: string[]
  /**
   * Parte desenhada em SVG: so a cor faz sentido. Fonte, peso e tamanho nao
   * mexem num desenho — o tamanho dele vem de width/height na folha base.
   */
  soCor?: boolean
  /**
   * Parte que e imagem, e nao texto: os campos passam a ser proporcao, encaixe,
   * cantos e tamanho. `quadro` = o seletor pega a moldura (.lp-midia), e o
   * encaixe vai para o <img>/<video> de dentro; `foto` = o seletor JA e a
   * imagem, e o encaixe entra na mesma regra.
   */
  midia?: 'quadro' | 'foto'
}

const PARTES: Record<string, ParteWidget[]> = {
  numero: [
    { chave: 'valor', rotulo: 'Número', seletores: ['.lp-stat-valor'] },
    { chave: 'rotulo', rotulo: 'Informação', seletores: ['.lp-stat-rotulo'] },
  ],
  faq: [
    { chave: 'pergunta', rotulo: 'Pergunta', seletores: ['summary'] },
    { chave: 'resposta', rotulo: 'Resposta', seletores: ['.lp-faq-resposta'] },
    { chave: 'seta', rotulo: 'Seta', seletores: ['summary svg'], soCor: true },
  ],
  abas: [
    // `:not(.ativo)` de proposito: a aba selecionada e branca sobre a cor
    // principal, e pintar as duas com a mesma cor a deixaria ilegivel.
    { chave: 'titulo', rotulo: 'Título da aba', seletores: ['.lp-tabs-nav button:not(.ativo)'] },
    { chave: 'texto', rotulo: 'Texto', seletores: ['.lp-tab-texto'] },
    {
      chave: 'imagem',
      rotulo: 'Imagem',
      seletores: ['.lp-tab-painel .lp-midia'],
      midia: 'quadro',
    },
  ],
  carrossel: [
    { chave: 'titulo', rotulo: 'Título do slide', seletores: ['.lp-slide-titulo'] },
    { chave: 'texto', rotulo: 'Texto do slide', seletores: ['.lp-slide-texto'] },
    { chave: 'imagem', rotulo: 'Imagem do slide', seletores: ['.lp-midia'], midia: 'quadro' },
  ],
  depoimentos: [
    { chave: 'fala', rotulo: 'Depoimento', seletores: ['.lp-depo-fala'] },
    { chave: 'nome', rotulo: 'Nome', seletores: ['.lp-depo-nome'] },
    { chave: 'cargo', rotulo: 'Cargo', seletores: ['.lp-depo-cargo'] },
    { chave: 'aspas', rotulo: 'Aspas', seletores: ['blockquote svg'], soCor: true },
    // Aqui o seletor ja e a propria foto: ela nao vem com moldura .lp-midia.
    { chave: 'foto', rotulo: 'Foto', seletores: ['.lp-depo-autor img'], midia: 'foto' },
  ],
  comparacao: [
    { chave: 'cabecalho', rotulo: 'Cabeçalho das colunas', seletores: ['th'] },
    { chave: 'rotulos', rotulo: 'Rótulos das linhas', seletores: ['td:first-child'] },
    { chave: 'celulas', rotulo: 'Células', seletores: ['td'] },
  ],
  formulario: [
    { chave: 'rotulos', rotulo: 'Rótulos dos campos', seletores: ['label'] },
    { chave: 'campos', rotulo: 'Campos', seletores: ['input', 'textarea'] },
  ],
  lista: [
    { chave: 'texto', rotulo: 'Texto do item', seletores: ['li span'] },
    { chave: 'icone', rotulo: 'Ícone', seletores: ['li svg'], soCor: true },
  ],
}

export const partesDe = (tipo: string): ParteWidget[] => PARTES[tipo] ?? []

/** Widgets que tem partes — o teste usa para cobrir todos. */
export const TIPOS_COM_PARTES = Object.keys(PARTES)

/** Widget com partes proprias — o painel troca a tipografia solta por elas. */
export const temPartes = (tipo: string): boolean => partesDe(tipo).length > 0
