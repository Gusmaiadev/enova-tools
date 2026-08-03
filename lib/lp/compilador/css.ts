/**
 * Gera o style.css da landing page a partir do tema + secoes usadas. So emite
 * o CSS dos layouts presentes no documento. Puro (roda no client e no server).
 */

import { paginasGeradas } from '../documento'
import { familiaCss } from '../fontes'
import type { AjusteTexto, LpDocumento, LpSecao, TipoLayout } from '../tipos'
import { corContraste, corSegura, escCss, slugificar } from '../util'

/** Id de HTML/CSS de uma secao (ancora do menu ou fallback estavel). */
export function idHtmlSecao(secao: LpSecao, usados: Set<string>): string {
  let base = secao.ancora || `s-${secao.id}`
  // Ancora pode começar com dígito; id pode ter vindo cru — garante [a-z0-9-].
  if (!/^[a-z][a-z0-9-]*$/i.test(base)) base = `s-${slugificar(secao.id)}`
  let id = base
  let n = 2
  while (usados.has(id)) id = `${base}-${n++}`
  usados.add(id)
  return id
}

function varsTema(doc: LpDocumento): string {
  const { tipografia: t, cores: c, raio } = doc.tema
  const linhas: string[] = []
  const cats = ['titulos', 'subtitulos', 'textos', 'botoes'] as const
  for (const cat of cats) {
    const e = t[cat]
    linhas.push(
      `  --fonte-${cat}: ${familiaCss(e.fonte)};`,
      `  --peso-${cat}: ${e.peso};`,
      `  --tamanho-${cat}: ${escCss(e.tamanho)};`,
      `  --altura-${cat}: ${escCss(e.alturaLinha)};`,
      `  --espaco-${cat}: ${escCss(e.espacamentoLetras)};`,
    )
  }
  const pares: [string, string][] = [
    ['principal', c.principal],
    ['secundaria', c.secundaria],
    ['titulos', c.titulos],
    ['subtitulos', c.subtitulos],
    ['textos', c.textos],
    ['botoes', c.botoes],
    ['fundo-botoes', c.fundoBotoes],
    ['header', c.header],
    ['footer', c.footer],
    ['fundo', c.fundoPagina],
  ]
  for (const [nome, cor] of pares) linhas.push(`  --cor-${nome}: ${escCss(cor)};`)
  linhas.push(`  --raio: ${raio}px;`, '  --largura: 1140px;')
  // Footer padrão é escuro (texto claro); header padrão é claro (texto escuro).
  linhas.push(`  --texto-footer: ${corContraste(corSegura(c.footer, '#111318'), '#ffffff')};`)
  linhas.push(`  --texto-header: ${corContraste(corSegura(c.header, '#ffffff'), '#111318')};`)
  return `:root{\n${linhas.join('\n')}\n}`
}

/*
 * Titulos sao fluidos (clamp): o piso e o teto saem os DOIS de --tamanho-titulos,
 * nunca de um rem fixo. Com piso fixo, quem escolhia um tamanho pequeno na
 * Identidade (ex.: 20px) via o piso vencer — o clamp devolve o minimo quando o
 * maximo fica abaixo dele — e a pagina saia com o tamanho padrao, como se a
 * escolha nao existisse.
 */
const BASE = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;scroll-padding-top:84px}
body{background:var(--cor-fundo);color:var(--cor-textos);font-family:var(--fonte-textos);font-weight:var(--peso-textos);font-size:var(--tamanho-textos);line-height:var(--altura-textos);letter-spacing:var(--espaco-textos);-webkit-font-smoothing:antialiased}
img,video{max-width:100%;display:block}
a{color:var(--cor-principal);text-decoration:none}
.lp-container{max-width:var(--largura);margin-inline:auto;padding-inline:24px}
.lp-secao.full>.lp-container{max-width:none}
h1,h2,h3{font-family:var(--fonte-titulos);font-weight:var(--peso-titulos);line-height:var(--altura-titulos);letter-spacing:var(--espaco-titulos);color:var(--cor-titulos)}
h1{font-size:clamp(calc(var(--tamanho-titulos) * 0.78),5.2vw,calc(var(--tamanho-titulos) * 1.45))}
h2{font-size:clamp(calc(var(--tamanho-titulos) * 0.62),3.6vw,var(--tamanho-titulos))}
h3{font-size:clamp(calc(var(--tamanho-titulos) * 0.4),2vw,calc(var(--tamanho-titulos) * 0.55))}
.lp-subtitulo{font-family:var(--fonte-subtitulos);font-weight:var(--peso-subtitulos);font-size:var(--tamanho-subtitulos);line-height:var(--altura-subtitulos);letter-spacing:var(--espaco-subtitulos);color:var(--cor-subtitulos)}
.lp-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--fonte-botoes);font-weight:var(--peso-botoes);font-size:var(--tamanho-botoes);letter-spacing:var(--espaco-botoes);color:var(--cor-botoes);background:var(--cor-fundo-botoes);border:2px solid var(--cor-fundo-botoes);border-radius:var(--raio);padding:12px 28px;cursor:pointer;transition:filter .2s,transform .2s;text-decoration:none}
.lp-btn:hover{filter:brightness(1.12);transform:translateY(-1px)}
.lp-btn.contorno{background:transparent;color:var(--cor-fundo-botoes)}
.lp-btn.contorno:hover{background:var(--cor-fundo-botoes);color:var(--cor-botoes)}
.lp-acao{display:flex;flex-wrap:wrap;gap:16px;margin-top:28px}
.lp-acao.pos-esquerda{justify-content:flex-start}
.lp-acao.pos-centro{justify-content:center}
.lp-acao.pos-direita{justify-content:flex-end}
/* Efeitos de hover: só transform/filter/sombra, porque cor de botão personalizada
   vai inline no HTML e venceria qualquer regra daqui. */
.lp-btn.hover-nenhum:hover{filter:none;transform:none}
.lp-btn.hover-brilho:hover{filter:brightness(1.3);transform:none}
.lp-btn.hover-crescer:hover{filter:none;transform:scale(1.06)}
.lp-btn.hover-sombra:hover{filter:none;transform:none;box-shadow:0 12px 28px -10px color-mix(in srgb,var(--cor-fundo-botoes) 75%,transparent)}
@keyframes lp-pulsar{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
@keyframes lp-flutuar{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes lp-brilhar{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--cor-fundo-botoes) 55%,transparent)}70%{box-shadow:0 0 0 14px transparent}100%{box-shadow:0 0 0 0 transparent}}
.lp-btn.anim-pulsar{animation:lp-pulsar 2.4s ease-in-out infinite}
.lp-btn.anim-flutuar{animation:lp-flutuar 3s ease-in-out infinite}
.lp-btn.anim-brilho{animation:lp-brilhar 2.2s ease-out infinite}
/* Passar o mouse pausa a animação: senão o keyframe sobrescreve o transform do
   hover e o botão não responde ao ponteiro. */
.lp-btn[class*="anim-"]:hover{animation-play-state:paused}
.lp-secao{position:relative;padding-top:var(--pt,80px);padding-bottom:var(--pb,80px);background:var(--fundo-secao,transparent);overflow:hidden}
.lp-fundo-midia{position:absolute;inset:0;z-index:0}
.lp-fundo-midia img,.lp-fundo-midia video{width:100%;height:100%;object-fit:cover}
.lp-veu{position:absolute;inset:0;z-index:1;background:rgba(8,10,16,var(--veu,0.55))}
.lp-secao>.lp-container{position:relative;z-index:2}
.lp-cabeca{max-width:720px;margin:0 auto 48px;text-align:center}
.lp-cabeca .lp-subtitulo{margin-top:12px}
.lp-cabeca .lp-texto{margin-top:14px}
.lp-sobre-midia h1,.lp-sobre-midia h2,.lp-sobre-midia h3,.lp-sobre-midia .lp-subtitulo,.lp-sobre-midia p,.lp-sobre-midia .lp-stat-valor,.lp-sobre-midia .lp-stat-rotulo,.lp-sobre-midia .lp-tl-data,.lp-sobre-midia .lp-tl-titulo,.lp-sobre-midia .lp-benef-titulo{color:#fff}
.lp-midia{border-radius:var(--raio);overflow:hidden}
.lp-midia img,.lp-midia video{width:100%;height:100%;object-fit:cover}
.lp-icone{display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:calc(var(--raio) * 0.75);background:color-mix(in srgb,var(--cor-principal) 14%,transparent);color:var(--cor-principal);flex:none}
.lp-icone svg{width:24px;height:24px}
.lp-reveal{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease}
.lp-vis{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.lp-reveal{opacity:1;transform:none;transition:none}.lp-btn{animation:none!important}}
`

const HEADER = `
.lp-header{position:sticky;top:0;z-index:50;background:var(--cor-header);color:var(--texto-header);box-shadow:0 1px 0 rgba(0,0,0,.06)}
.lp-header.rolou{box-shadow:0 6px 24px -12px rgba(0,0,0,.35)}
.lp-header .lp-container{display:flex;align-items:center;justify-content:space-between;gap:24px;height:72px}
.lp-logo{font-family:var(--fonte-titulos);font-weight:700;font-size:1.35rem;color:inherit}
.lp-logo-img{display:flex;align-items:center;flex:none}
.lp-logo-img img{max-height:44px;max-width:220px;width:auto;height:auto;object-fit:contain}
.lp-nav{display:flex;align-items:center;gap:28px}
.lp-nav ul{display:flex;gap:28px;list-style:none}
.lp-nav a{color:inherit;font-weight:500;font-size:.95rem;opacity:.85;transition:opacity .2s}
.lp-nav a:hover{opacity:1;color:var(--cor-principal)}
.lp-header-acoes{display:flex;align-items:center;gap:12px}
/* Botao de header e menor que o do corpo da pagina: 72px de altura nao comportam
   o padding padrao. As cores tambem sao reafirmadas: dentro do <nav>, a regra
   .lp-nav a (mais especifica que .lp-btn) pintaria o botao de cor de menu. */
.lp-header-acoes .lp-btn{padding:10px 22px;font-size:.9rem;color:var(--cor-botoes);opacity:1}
.lp-header-acoes .lp-btn:hover{color:var(--cor-botoes)}
.lp-header-acoes .lp-btn.contorno{color:var(--cor-fundo-botoes)}
.lp-header-acoes .lp-btn.contorno:hover{color:var(--cor-botoes)}
.lp-menu-btn{display:none;background:none;border:0;color:inherit;cursor:pointer;padding:8px}
.lp-menu-btn svg{width:26px;height:26px}
@media (max-width:900px){
.lp-menu-btn{display:block}
.lp-nav{position:fixed;inset:72px 0 auto 0;flex-direction:column;align-items:stretch;gap:16px;background:var(--cor-header);padding:16px 24px 24px;transform:translateY(-130%);transition:transform .3s ease;box-shadow:0 20px 40px -20px rgba(0,0,0,.4)}
.lp-nav.aberto{transform:none}
.lp-nav ul{flex-direction:column;gap:16px}
.lp-header-acoes{flex-direction:column;align-items:stretch}
}
`

const FOOTER = `
.lp-footer{background:var(--cor-footer);color:var(--texto-footer);padding:64px 0 0;font-size:.95rem}
.lp-footer a{color:inherit;opacity:.8}
.lp-footer a:hover{opacity:1;color:var(--cor-principal)}
.lp-footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:48px;padding-bottom:48px}
.lp-footer h4{font-family:var(--fonte-titulos);font-size:1rem;margin-bottom:16px;color:inherit}
.lp-footer ul{list-style:none;display:grid;gap:10px}
.lp-footer p{opacity:.8;line-height:1.7}
.lp-contato li{display:flex;gap:10px;align-items:flex-start}
.lp-contato svg{width:18px;height:18px;flex:none;margin-top:3px;color:var(--cor-principal)}
/* Mesma correcao do header: .lp-footer a venceria as cores do .lp-btn. */
.lp-footer-acoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.lp-footer-acoes .lp-btn{color:var(--cor-botoes);opacity:1}
.lp-footer-acoes .lp-btn:hover{color:var(--cor-botoes)}
.lp-footer-acoes .lp-btn.contorno{color:var(--cor-fundo-botoes)}
.lp-footer-acoes .lp-btn.contorno:hover{color:var(--cor-botoes)}
.lp-redes{display:flex;gap:12px;margin-top:20px}
.lp-redes a{display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:50%;border:1px solid color-mix(in srgb,currentColor 25%,transparent);opacity:1}
.lp-redes a:hover{background:var(--cor-principal);border-color:var(--cor-principal);color:#fff}
.lp-redes svg{width:18px;height:18px}
.lp-footer-base{border-top:1px solid color-mix(in srgb,currentColor 15%,transparent);padding:20px 0;display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between;font-size:.85rem;opacity:.75}
.lp-footer-base ul{display:flex;gap:20px;list-style:none}
@media (max-width:900px){.lp-footer-grid{grid-template-columns:1fr;gap:32px}}
`

/** Paginas de texto corrido (termos de uso, politica de privacidade). */
const LEGAL = `
.lp-legal{padding:72px 0 96px}
.lp-legal .lp-container{max-width:820px}
.lp-legal h1{margin-bottom:8px}
.lp-legal h2{font-size:clamp(calc(var(--tamanho-titulos) * 0.4),2vw,calc(var(--tamanho-titulos) * 0.58));margin:36px 0 12px}
.lp-legal p{margin-top:14px}
.lp-legal p+p{margin-top:12px}
`

/** CSS especifico de cada layout — emitido so quando o layout aparece na pagina. */
const POR_LAYOUT: Record<TipoLayout, string> = {
  hero: `
.lp-hero{display:flex;align-items:center;min-height:min(88vh,860px)}
.lp-hero .lp-container{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.lp-hero.centrado .lp-container{grid-template-columns:1fr;text-align:center;max-width:860px}
.lp-hero.inv .lp-hero-texto{order:2}
.lp-hero.inv .lp-midia{order:1}
.lp-hero h1{margin-bottom:20px}
.lp-hero .lp-subtitulo{font-size:calc(var(--tamanho-subtitulos) * 1.1)}
.lp-hero p.lp-texto{margin-top:18px;max-width:560px}
.lp-hero.centrado p.lp-texto{margin-inline:auto}
.lp-hero-acoes{display:flex;gap:16px;margin-top:32px;flex-wrap:wrap}
.lp-hero .lp-midia{aspect-ratio:4/3}
/* No celular o hero inteiro centraliza, botão junto — por isso este seletor
   precisa vencer o .lp-acao.pos-* que o compilador emite. */
@media (max-width:900px){.lp-hero .lp-container{grid-template-columns:1fr;text-align:center}.lp-hero .lp-acao{justify-content:center}.lp-hero p.lp-texto{margin-inline:auto}.lp-hero.inv .lp-hero-texto{order:1}.lp-hero.inv .lp-midia{order:2}}
`,
  'texto-midia': `
.lp-tm{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.lp-tm.inv .lp-tm-texto{order:2}
.lp-tm.inv .lp-midia{order:1}
.lp-tm h2{margin-bottom:16px}
.lp-tm .lp-subtitulo{margin-bottom:12px}
.lp-tm p{margin-bottom:12px}
.lp-tm .lp-btn{margin-top:16px}
.lp-tm .lp-midia{aspect-ratio:4/3}
@media (max-width:900px){.lp-tm{grid-template-columns:1fr;gap:32px}.lp-tm.inv .lp-tm-texto{order:1}.lp-tm.inv .lp-midia{order:2}}
`,
  'texto-centralizado': `
.lp-central{max-width:760px;margin:0 auto;text-align:center}
.lp-central h2{margin-bottom:16px}
.lp-central .lp-subtitulo{margin-bottom:16px}
.lp-central p{margin-bottom:14px}
.lp-central .lp-btn{margin-top:20px}
`,
  cards: `
.lp-cards{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:28px}
.lp-card{display:flex;flex-direction:column;background:color-mix(in srgb,var(--cor-titulos) 4%,transparent);border:1px solid color-mix(in srgb,var(--cor-titulos) 10%,transparent);border-radius:var(--raio);padding:32px 28px;transition:transform .25s,box-shadow .25s}
.lp-card:hover{transform:translateY(-6px);box-shadow:0 24px 48px -24px color-mix(in srgb,var(--cor-principal) 45%,transparent)}
.lp-card h3{margin:18px 0 10px}
.lp-card-subtitulo{font-family:var(--fonte-subtitulos);font-weight:var(--peso-subtitulos);color:var(--cor-subtitulos);font-size:.95rem;margin-bottom:10px}
/* margin-top:auto encosta o botão na base: cards de alturas diferentes na mesma
   linha ficam com os botões alinhados. */
.lp-card-acao{margin-top:auto;padding-top:20px}
@media (max-width:900px){.lp-cards{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.lp-cards{grid-template-columns:1fr}}
`,
  galeria: `
.lp-galeria{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:16px}
.lp-galeria figure{position:relative;border-radius:var(--raio);overflow:hidden;aspect-ratio:4/3}
.lp-galeria img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.lp-galeria figure:hover img{transform:scale(1.05)}
.lp-galeria figcaption{position:absolute;inset:auto 0 0 0;padding:24px 16px 12px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;font-size:.9rem}
@media (max-width:900px){.lp-galeria{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.lp-galeria{grid-template-columns:1fr}}
`,
  masonry: `
.lp-masonry{columns:var(--cols,3);column-gap:16px}
.lp-masonry figure{position:relative;break-inside:avoid;margin-bottom:16px;border-radius:var(--raio);overflow:hidden}
.lp-masonry figcaption{position:absolute;inset:auto 0 0 0;padding:24px 16px 12px;background:linear-gradient(transparent,rgba(0,0,0,.7));color:#fff;font-size:.9rem}
@media (max-width:900px){.lp-masonry{columns:2}}
@media (max-width:640px){.lp-masonry{columns:1}}
`,
  timeline: `
.lp-timeline{position:relative;max-width:760px;margin:0 auto;padding-left:36px}
.lp-timeline::before{content:'';position:absolute;left:9px;top:6px;bottom:6px;width:2px;background:color-mix(in srgb,var(--cor-principal) 40%,transparent)}
.lp-tl-item{position:relative;padding-bottom:40px}
.lp-tl-item:last-child{padding-bottom:0}
.lp-tl-item::before{content:'';position:absolute;left:-33px;top:6px;width:14px;height:14px;border-radius:50%;background:var(--cor-principal);box-shadow:0 0 0 4px color-mix(in srgb,var(--cor-principal) 25%,transparent)}
.lp-tl-data{font-size:.85rem;font-weight:600;color:var(--cor-principal);text-transform:uppercase;letter-spacing:.08em}
.lp-tl-item h3{margin:6px 0 8px}
`,
  faq: `
.lp-faq{max-width:760px;margin:0 auto;display:grid;gap:12px}
.lp-faq details{border:1px solid color-mix(in srgb,var(--cor-titulos) 12%,transparent);border-radius:var(--raio);background:color-mix(in srgb,var(--cor-titulos) 3%,transparent)}
.lp-faq summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;cursor:pointer;font-family:var(--fonte-subtitulos);font-weight:600;color:var(--cor-titulos);list-style:none}
.lp-faq summary::-webkit-details-marker{display:none}
.lp-faq summary svg{width:20px;height:20px;flex:none;transition:transform .3s;color:var(--cor-principal)}
.lp-faq details[open] summary svg{transform:rotate(180deg)}
.lp-faq .lp-faq-corpo{padding:0 22px 18px}
`,
  depoimentos: `
.lp-depo .lp-slider{max-width:820px;margin:0 auto}
.lp-depo blockquote{font-size:1.15rem;line-height:1.8;text-align:center}
.lp-depo blockquote svg{width:36px;height:36px;color:var(--cor-principal);margin:0 auto 20px}
.lp-depo .lp-depo-autor{margin-top:24px;text-align:center}
.lp-depo .lp-depo-autor img{width:56px;height:56px;border-radius:50%;object-fit:cover;margin:0 auto 10px}
.lp-depo .lp-depo-nome{font-weight:700;color:var(--cor-titulos)}
.lp-depo .lp-depo-cargo{font-size:.9rem;opacity:.75}
`,
  logos: `
.lp-logos{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:48px}
.lp-logos img{height:44px;width:auto;filter:grayscale(1);opacity:.55;transition:filter .3s,opacity .3s}
.lp-logos a:hover img,.lp-logos li:hover img{filter:none;opacity:1}
.lp-logos ul{display:contents;list-style:none}
.lp-logos .lp-logo-nome{font-family:var(--fonte-titulos);font-weight:700;font-size:1.2rem;opacity:.55}
`,
  estatisticas: `
.lp-stats{display:grid;grid-template-columns:repeat(var(--cols,4),1fr);gap:32px;text-align:center}
.lp-stat-valor{font-family:var(--fonte-titulos);font-weight:800;font-size:clamp(calc(var(--tamanho-titulos) * 0.76),4.5vw,calc(var(--tamanho-titulos) * 1.22));color:var(--cor-principal);line-height:1.1}
.lp-stat-rotulo{margin-top:8px;font-size:.95rem;opacity:.85}
@media (max-width:900px){.lp-stats{grid-template-columns:repeat(2,1fr)}}
`,
  cta: `
.lp-cta-caixa{background:linear-gradient(135deg,var(--cor-principal),var(--cor-secundaria));border-radius:calc(var(--raio) * 1.5);padding:64px 48px;text-align:center;color:#fff}
.lp-cta-caixa h2,.lp-cta-caixa .lp-subtitulo,.lp-cta-caixa p{color:#fff}
.lp-cta-caixa .lp-subtitulo{margin-top:14px;opacity:.9}
.lp-cta-caixa p{margin-top:12px;opacity:.9;max-width:560px;margin-inline:auto}
.lp-cta-caixa .lp-btn{margin-top:28px;background:#fff;border-color:#fff;color:var(--cor-principal)}
@media (max-width:640px){.lp-cta-caixa{padding:48px 24px}}
`,
  banner: `
.lp-banner{max-width:860px;margin-inline:auto;text-align:center}
.lp-banner h2{margin-bottom:14px}
.lp-banner .lp-btn{margin-top:26px}
`,
  formulario: `
.lp-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
.lp-form-grid.sozinho{grid-template-columns:1fr;max-width:640px;margin:0 auto}
.lp-form{display:grid;gap:16px}
.lp-form label{display:grid;gap:6px;font-size:.9rem;font-weight:600;color:var(--cor-titulos)}
.lp-form input,.lp-form textarea{width:100%;border:1px solid color-mix(in srgb,var(--cor-titulos) 18%,transparent);background:color-mix(in srgb,var(--cor-titulos) 3%,transparent);border-radius:calc(var(--raio) * 0.75);padding:12px 14px;font:inherit;color:var(--cor-textos)}
.lp-form input:focus,.lp-form textarea:focus{outline:2px solid var(--cor-principal);outline-offset:1px;border-color:transparent}
.lp-form textarea{min-height:130px;resize:vertical}
.lp-form-ok{display:none;border:1px solid color-mix(in srgb,var(--cor-principal) 45%,transparent);background:color-mix(in srgb,var(--cor-principal) 10%,transparent);border-radius:var(--raio);padding:14px 18px;font-weight:600;color:var(--cor-titulos)}
.lp-form-ok.mostrar{display:block}
.lp-form .lp-mel{position:absolute;left:-9999px;opacity:0}
@media (max-width:900px){.lp-form-grid{grid-template-columns:1fr;gap:32px}}
`,
  precos: `
.lp-precos{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:28px;align-items:stretch}
.lp-preco{display:flex;flex-direction:column;border:1px solid color-mix(in srgb,var(--cor-titulos) 12%,transparent);border-radius:var(--raio);padding:36px 30px;background:color-mix(in srgb,var(--cor-titulos) 3%,transparent)}
.lp-preco.destaque{border-color:var(--cor-principal);box-shadow:0 24px 60px -28px color-mix(in srgb,var(--cor-principal) 55%,transparent);position:relative}
.lp-preco.destaque::before{content:'Mais popular';position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--cor-principal);color:#fff;font-size:.75rem;font-weight:700;padding:4px 14px;border-radius:999px;letter-spacing:.04em}
.lp-preco-valor{font-family:var(--fonte-titulos);font-size:2.6rem;font-weight:800;color:var(--cor-titulos);margin:14px 0 4px}
.lp-preco-periodo{font-size:.9rem;opacity:.7}
.lp-preco ul{list-style:none;display:grid;gap:12px;margin:24px 0;flex:1}
.lp-preco li{display:flex;gap:10px;align-items:flex-start}
.lp-preco li svg{width:18px;height:18px;flex:none;margin-top:3px;color:var(--cor-principal)}
@media (max-width:900px){.lp-precos{grid-template-columns:1fr;max-width:420px;margin-inline:auto}}
`,
  comparacao: `
.lp-comp{overflow-x:auto}
.lp-comp table{width:100%;border-collapse:collapse;min-width:560px}
.lp-comp th,.lp-comp td{padding:16px 20px;text-align:center;border-bottom:1px solid color-mix(in srgb,var(--cor-titulos) 10%,transparent)}
.lp-comp th{font-family:var(--fonte-titulos);color:var(--cor-titulos);font-size:1.05rem}
.lp-comp td:first-child,.lp-comp th:first-child{text-align:left;font-weight:600;color:var(--cor-titulos)}
.lp-comp .destaque{background:color-mix(in srgb,var(--cor-principal) 7%,transparent)}
.lp-comp svg{width:20px;height:20px;display:inline-block;vertical-align:middle}
.lp-comp .sim{color:var(--cor-principal)}
.lp-comp .nao{opacity:.35}
`,
  'grid-produtos': `
.lp-produtos{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:28px}
.lp-produto{border:1px solid color-mix(in srgb,var(--cor-titulos) 10%,transparent);border-radius:var(--raio);overflow:hidden;background:color-mix(in srgb,var(--cor-titulos) 3%,transparent);display:flex;flex-direction:column}
.lp-produto .lp-midia{border-radius:0;aspect-ratio:1}
.lp-produto-corpo{padding:20px 22px 24px;display:flex;flex-direction:column;gap:8px;flex:1}
.lp-produto-preco{font-weight:800;color:var(--cor-principal);font-size:1.2rem}
.lp-produto .lp-btn{margin-top:auto;align-self:flex-start;padding:9px 20px;font-size:.9rem}
@media (max-width:900px){.lp-produtos{grid-template-columns:repeat(2,1fr)}}
@media (max-width:640px){.lp-produtos{grid-template-columns:1fr}}
`,
  'lista-beneficios': `
.lp-benef{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.lp-benef.sozinho{grid-template-columns:1fr;max-width:720px;margin:0 auto}
.lp-benef ul{list-style:none;display:grid;gap:22px;margin-top:8px}
.lp-benef li{display:flex;gap:16px;align-items:flex-start}
.lp-benef li h3{font-size:1.05rem;margin-bottom:4px}
.lp-benef .lp-midia{aspect-ratio:4/3}
.lp-benef .lp-btn{margin-top:24px}
@media (max-width:900px){.lp-benef{grid-template-columns:1fr;gap:32px}}
`,
  'blocos-alternados': `
.lp-blocos{display:grid;gap:72px}
.lp-bloco{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}
.lp-bloco:nth-child(even) .lp-bloco-texto{order:2}
.lp-bloco:nth-child(even) .lp-midia{order:1}
/* .inv começa a alternância pelo outro lado: a mídia do 1º bloco à esquerda. */
.lp-blocos.inv .lp-bloco:nth-child(even) .lp-bloco-texto{order:1}
.lp-blocos.inv .lp-bloco:nth-child(even) .lp-midia{order:2}
.lp-blocos.inv .lp-bloco:nth-child(odd) .lp-bloco-texto{order:2}
.lp-blocos.inv .lp-bloco:nth-child(odd) .lp-midia{order:1}
.lp-bloco h3{font-size:clamp(calc(var(--tamanho-titulos) * 0.5),2.4vw,calc(var(--tamanho-titulos) * 0.7));margin-bottom:12px}
.lp-bloco .lp-btn{margin-top:18px}
.lp-bloco .lp-midia{aspect-ratio:4/3}
/* No celular o texto vem sempre antes da imagem, invertido ou não. O
   :nth-child(n) não filtra nada — está aí só para empatar a especificidade das
   regras de .inv acima; empatando, vence a última, que é esta. */
@media (max-width:900px){.lp-bloco{grid-template-columns:1fr;gap:24px}.lp-bloco:nth-child(even) .lp-bloco-texto{order:1}.lp-bloco:nth-child(even) .lp-midia{order:2}.lp-blocos.inv .lp-bloco:nth-child(n) .lp-bloco-texto{order:1}.lp-blocos.inv .lp-bloco:nth-child(n) .lp-midia{order:2}}
`,
  tabs: `
.lp-tabs-nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:36px}
.lp-tabs-nav button{font:inherit;font-weight:600;color:var(--cor-textos);background:none;border:1px solid color-mix(in srgb,var(--cor-titulos) 15%,transparent);border-radius:999px;padding:10px 22px;cursor:pointer;transition:all .2s}
.lp-tabs-nav button.ativo{background:var(--cor-principal);border-color:var(--cor-principal);color:#fff}
.lp-tab-painel{display:none;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.lp-tab-painel.ativo{display:grid}
.lp-tab-painel.sozinho{grid-template-columns:1fr;max-width:720px;margin:0 auto;text-align:center}
.lp-tab-painel h3{margin-bottom:12px}
.lp-tab-painel .lp-midia{aspect-ratio:4/3}
@media (max-width:900px){.lp-tab-painel{grid-template-columns:1fr;gap:24px}}
`,
  carrossel: `
.lp-carrossel .lp-slide{display:grid;grid-template-columns:1fr;gap:0;text-align:center}
.lp-carrossel .lp-midia{aspect-ratio:16/9}
.lp-carrossel .lp-slide h3{margin:20px 0 8px}
`,
}

/** CSS do mecanismo de slider (compartilhado por depoimentos e carrossel). */
const SLIDER = `
.lp-slider{position:relative}
.lp-slider-janela{overflow:hidden}
.lp-slider-trilho{display:flex;transition:transform .5s ease}
.lp-slide{flex:0 0 100%;min-width:0;padding:4px}
.lp-slider-nav{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:28px}
.lp-slider-nav button{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;border:1px solid color-mix(in srgb,var(--cor-titulos) 20%,transparent);background:none;color:var(--cor-titulos);cursor:pointer;transition:all .2s}
.lp-slider-nav button:hover{background:var(--cor-principal);border-color:var(--cor-principal);color:#fff}
.lp-slider-nav svg{width:20px;height:20px}
.lp-pontos{display:flex;gap:8px}
.lp-pontos button{width:9px;height:9px;padding:0;border-radius:50%;border:0;background:color-mix(in srgb,var(--cor-titulos) 25%,transparent);cursor:pointer}
.lp-pontos button.ativo{background:var(--cor-principal)}
`

function ajusteParaCss(seletor: string, a: AjusteTexto): string {
  const regras: string[] = []
  if (a.cor) regras.push(`color:${escCss(corSegura(a.cor, 'inherit'))}`)
  if (a.fonte) regras.push(`font-family:${familiaCss(a.fonte)}`)
  if (a.tamanho) regras.push(`font-size:${escCss(a.tamanho)}`)
  if (a.peso) regras.push(`font-weight:${a.peso}`)
  if (a.alturaLinha) regras.push(`line-height:${escCss(a.alturaLinha)}`)
  if (a.espacamentoLetras) regras.push(`letter-spacing:${escCss(a.espacamentoLetras)}`)
  if (a.alinhamento) regras.push(`text-align:${a.alinhamento}`)
  if (regras.length === 0) return ''
  return `${seletor}{${regras.join(';')}}\n`
}

const SELETOR_ELEMENTO = {
  titulo: '.lp-el-titulo',
  subtitulo: '.lp-el-subtitulo',
  texto: '.lp-el-texto',
} as const

/**
 * Regras do header e do rodapé que saem dos ajustes do usuário: fonte do menu,
 * tamanho da logo e alinhamento. Sem ajuste nenhum não sai regra nenhuma — a
 * página continua com o visual do tema.
 */
function cssBarras(doc: LpDocumento): string {
  let css = ''
  const h = doc.header.estilo
  if (h?.menu) css += ajusteParaCss('.lp-nav a', h.menu)
  if (h?.logo) {
    // A logo em imagem cresce pela altura; o nome escrito, pelo corpo da fonte.
    // O max-width acompanha a altura (mesma proporção do padrão: 44px → 220px),
    // senão uma logo deitada empacaria no limite de largura de sempre.
    css += doc.header.logo
      ? `.lp-logo-img img{max-height:${h.logo}px;max-width:${h.logo * 5}px}\n`
      : `.lp-logo{font-size:${h.logo}px}\n`
  }
  if (h?.alinhamento) {
    // O <nav> ocupa o espaço entre a logo e os botões; a margem automática do
    // <ul> decide onde os links caem dentro dele. No celular o nav vira gaveta e
    // a margem tem de sumir — por isso o reset, que precisa vir depois daqui.
    const margem = { esquerda: 'margin-right:auto', centro: 'margin-inline:auto', direita: 'margin-left:auto' }
    css += `.lp-nav{flex:1}\n.lp-nav ul{${margem[h.alinhamento]}}\n@media (max-width:900px){.lp-nav ul{margin:0}}\n`
  }

  const f = doc.footer.estilo
  // Menu do rodapé são as colunas de links; a coluna de contato (endereço,
  // telefone, e-mail) não é menu e fica com a fonte do tema.
  if (f?.menu) css += ajusteParaCss('.lp-footer ul:not(.lp-contato) a', f.menu)
  if (f?.logo) css += `.lp-logo-footer{font-size:${f.logo}px}\n`
  if (f?.alinhamento && f.alinhamento !== 'esquerda') {
    const texto = f.alinhamento === 'centro' ? 'center' : 'right'
    const flex = f.alinhamento === 'centro' ? 'center' : 'flex-end'
    css +=
      `.lp-footer-grid{text-align:${texto}}\n` +
      `.lp-footer .lp-contato li,.lp-redes,.lp-footer-acoes{justify-content:${flex}}\n`
  }
  return css
}

/**
 * Regras extras por secao (só ajustes de texto). As cores próprias de botão vão
 * inline no HTML (htmlBotao), porque uma regra por seção pintaria também os
 * botões dos itens da seção.
 */
function cssDaSecao(secao: LpSecao, idHtml: string): string {
  let css = ''
  if (secao.ajustes) {
    for (const el of ['titulo', 'subtitulo', 'texto'] as const) {
      const ajuste = secao.ajustes[el]
      if (ajuste) css += ajusteParaCss(`#${idHtml} ${SELETOR_ELEMENTO[el]}`, ajuste)
    }
  }
  return css
}

/**
 * Compila o CSS completo. `idsPorSecao` deve vir do compilador de HTML para os
 * seletores por secao baterem com os ids emitidos.
 */
export function compilarCss(doc: LpDocumento, idsPorSecao: Map<string, string>): string {
  const usados = new Set<TipoLayout>(doc.secoes.map((s) => s.tipo))
  const partes: string[] = [varsTema(doc), BASE, HEADER, FOOTER]
  // Uma folha de estilo so serve o index e as paginas de texto.
  if (paginasGeradas(doc).length > 0) partes.push(LEGAL)
  if (usados.has('depoimentos') || usados.has('carrossel')) partes.push(SLIDER)
  for (const layout of LAYOUTS_ORDENADOS) {
    if (usados.has(layout)) partes.push(POR_LAYOUT[layout])
  }
  const barras = cssBarras(doc)
  if (barras) partes.push(barras)
  for (const secao of doc.secoes) {
    const idHtml = idsPorSecao.get(secao.id)
    if (idHtml) {
      const extra = cssDaSecao(secao, idHtml)
      if (extra) partes.push(extra)
    }
  }
  return partes.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

const LAYOUTS_ORDENADOS = Object.keys(POR_LAYOUT) as TipoLayout[]
