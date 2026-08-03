/**
 * Gera o script.js da landing page. Modulos vanilla independentes, incluidos
 * apenas quando o layout que os usa existe no documento. Puro.
 */

import type { LpDocumento } from '../tipos'

const NAV = `
// Menu mobile, sombra do header e animacao de entrada
(function () {
  var header = document.querySelector('.lp-header')
  var botao = document.querySelector('.lp-menu-btn')
  var nav = document.querySelector('.lp-nav')
  if (botao && nav) {
    botao.addEventListener('click', function () {
      var aberto = nav.classList.toggle('aberto')
      botao.setAttribute('aria-expanded', String(aberto))
    })
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) nav.classList.remove('aberto')
    })
  }
  if (header) {
    var aoRolar = function () {
      header.classList.toggle('rolou', window.scrollY > 8)
    }
    window.addEventListener('scroll', aoRolar, { passive: true })
    aoRolar()
  }
  var reveladas = document.querySelectorAll('.lp-reveal')
  if ('IntersectionObserver' in window && reveladas.length) {
    var io = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('lp-vis')
            io.unobserve(en.target)
          }
        })
      },
      { threshold: 0.15 },
    )
    reveladas.forEach(function (el) { io.observe(el) })
  } else {
    reveladas.forEach(function (el) { el.classList.add('lp-vis') })
  }
})();
`

const SLIDER = `
// Sliders (depoimentos e carrossel)
(function () {
  document.querySelectorAll('.lp-slider').forEach(function (slider) {
    var trilho = slider.querySelector('.lp-slider-trilho')
    var slides = trilho ? trilho.children : []
    var pontos = slider.querySelectorAll('.lp-pontos button')
    if (!trilho || slides.length < 2) return
    var atual = 0
    var timer = null
    function ir(n) {
      atual = (n + slides.length) % slides.length
      trilho.style.transform = 'translateX(-' + atual * 100 + '%)'
      pontos.forEach(function (p, i) { p.classList.toggle('ativo', i === atual) })
    }
    function auto() {
      clearInterval(timer)
      timer = setInterval(function () { ir(atual + 1) }, 6000)
    }
    var ant = slider.querySelector('.lp-ant')
    var prox = slider.querySelector('.lp-prox')
    if (ant) ant.addEventListener('click', function () { ir(atual - 1); auto() })
    if (prox) prox.addEventListener('click', function () { ir(atual + 1); auto() })
    pontos.forEach(function (p, i) {
      p.addEventListener('click', function () { ir(i); auto() })
    })
    slider.addEventListener('mouseenter', function () { clearInterval(timer) })
    slider.addEventListener('mouseleave', auto)
    auto()
  })
})();
`

const TABS = `
// Abas
(function () {
  document.querySelectorAll('.lp-tabs').forEach(function (tabs) {
    var botoes = tabs.querySelectorAll('.lp-tabs-nav button')
    var paineis = tabs.querySelectorAll('.lp-tab-painel')
    botoes.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = b.getAttribute('data-tab')
        botoes.forEach(function (o) { o.classList.toggle('ativo', o === b) })
        paineis.forEach(function (p) {
          p.classList.toggle('ativo', p.getAttribute('data-painel') === n)
        })
      })
    })
  })
})();
`

const CONTADOR = `
// Contagem animada das estatisticas
(function () {
  var els = document.querySelectorAll('[data-contar]')
  if (!els.length) return
  function animar(el) {
    var bruto = el.textContent || ''
    var m = bruto.match(/[\\d.,]+/)
    if (!m) return
    var alvoNum = parseFloat(m[0].replace(/\\./g, '').replace(',', '.'))
    if (!isFinite(alvoNum)) return
    var prefixo = bruto.slice(0, m.index)
    var sufixo = bruto.slice(m.index + m[0].length)
    var inteiro = m[0].indexOf(',') === -1
    var inicio = null
    var dur = 1400
    function passo(ts) {
      if (inicio === null) inicio = ts
      var p = Math.min(1, (ts - inicio) / dur)
      var suave = 1 - Math.pow(1 - p, 3)
      var valor = alvoNum * suave
      var texto = inteiro
        ? Math.round(valor).toLocaleString('pt-BR')
        : valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      el.textContent = prefixo + texto + sufixo
      if (p < 1) requestAnimationFrame(passo)
      else el.textContent = bruto
    }
    requestAnimationFrame(passo)
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) {
          animar(en.target)
          io.unobserve(en.target)
        }
      })
    }, { threshold: 0.5 })
    els.forEach(function (el) { io.observe(el) })
  }
})();
`

const FORM = `
// Formulario de contato. Com destino configurado (data-destino) envia via POST
// e so confirma apos sucesso; sem destino, apenas valida — nao finge que enviou.
(function () {
  document.querySelectorAll('.lp-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      var mel = form.querySelector('.lp-mel')
      if (mel && mel.value) return // honeypot: bot preencheu
      if (!form.checkValidity()) {
        form.reportValidity()
        return
      }
      var destino = form.getAttribute('data-destino')
      var ok = form.querySelector('.lp-form-ok')
      if (!destino) return // sem destino, nao ha o que enviar nem o que confirmar
      var botao = form.querySelector('button[type=submit]')
      if (botao) botao.disabled = true
      fetch(destino, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('falha')
          if (ok) ok.classList.add('mostrar')
          form.reset()
        })
        .catch(function () {
          alert('Nao foi possivel enviar agora. Tente novamente em instantes.')
        })
        .finally(function () {
          if (botao) botao.disabled = false
        })
    })
  })
})();
`

/** Compila o script.js — so os modulos usados pelos layouts do documento. */
export function compilarJs(doc: LpDocumento, modo: 'editor' | 'export' = 'export'): string {
  const tipos = new Set(doc.secoes.map((s) => s.tipo))
  // Os ponto e vírgula aqui e no fim de cada módulo não são estilo: sem eles a
  // inserção automática do JS lê `'use strict'\n(function(){…})()` como chamada
  // da string ("use strict" is not a function) e o script inteiro morre na
  // primeira linha — sem revelar as seções, sem slider, sem menu no celular.
  const partes = ["'use strict';", NAV]
  if (tipos.has('depoimentos') || tipos.has('carrossel')) partes.push(SLIDER)
  if (tipos.has('tabs')) partes.push(TABS)
  // No editor o contador reescreveria o número (editável inline) e o form daria
  // reset/submit — esses só entram na página final.
  if (modo === 'export') {
    if (tipos.has('estatisticas')) partes.push(CONTADOR)
    if (tipos.has('formulario')) partes.push(FORM)
  }
  return partes.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
