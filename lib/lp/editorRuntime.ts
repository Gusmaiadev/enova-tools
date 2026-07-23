/**
 * Script injetado no iframe do editor visual (modo editor do compilador).
 * Conversa com o EditorLp (parent) via postMessage:
 *   iframe -> parent: selecionar, texto, secao-acao, scroll
 *   parent -> iframe: destacar, ir-scroll, ir-secao
 * Puro texto — nao depende do documento.
 */

export const CSS_EDITOR = `
[data-lp]{cursor:default}
a[data-lp],button[data-lp]{cursor:pointer}
.lpe-hover{outline:1.5px dashed rgba(46,107,255,.75);outline-offset:2px}
.lpe-sel{outline:2px solid #2e6bff !important;outline-offset:2px}
[contenteditable="true"],[contenteditable="plaintext-only"]{outline:2px solid #ffd60a !important;outline-offset:2px;cursor:text}
.lpe-barra{position:absolute;z-index:9999;display:flex;gap:2px;background:#12121a;border:1px solid #2a2a3a;border-radius:8px;padding:3px;box-shadow:0 8px 24px rgba(0,0,0,.45);font-family:system-ui,sans-serif}
.lpe-barra button{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:6px;background:none;color:#e8e8f0;cursor:pointer;font-size:14px;line-height:1}
.lpe-barra button:hover{background:#2e6bff}
.lpe-barra .lpe-rotulo{display:flex;align-items:center;color:#8b8ba0;font-size:11px;padding:0 8px;max-width:160px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
`

export const EDITOR_RUNTIME = `
(function () {
  'use strict'
  var pai = window.parent
  function enviar(msg) {
    msg.lpEditor = true
    pai.postMessage(msg, '*')
  }

  var EDITAVEIS = /:(titulo|subtitulo|texto|extra|detalhe|botao|logo|institucional|direitos|endereco|telefones|email)$/

  var selecionado = null
  var editando = null

  // ---- hover ----
  var hover = null
  document.addEventListener('mouseover', function (e) {
    if (editando) return
    var el = e.target.closest('[data-lp]')
    if (hover && hover !== el) hover.classList.remove('lpe-hover')
    if (el && el !== selecionado) {
      el.classList.add('lpe-hover')
      hover = el
    }
  })
  document.addEventListener('mouseout', function () {
    if (hover) hover.classList.remove('lpe-hover')
    hover = null
  })

  // ---- selecao ----
  function selecionar(el) {
    if (selecionado) selecionado.classList.remove('lpe-sel')
    selecionado = el
    if (el) {
      el.classList.remove('lpe-hover')
      el.classList.add('lpe-sel')
    }
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a')
    if (link && !(link.getAttribute('href') || '').startsWith('#')) e.preventDefault()
    if (editando) return
    var el = e.target.closest('[data-lp]')
    if (el) {
      if (link && el.contains(link)) e.preventDefault()
      selecionar(el)
      enviar({ tipo: 'selecionar', alvo: el.getAttribute('data-lp') })
    } else {
      selecionar(null)
      enviar({ tipo: 'selecionar', alvo: null })
    }
  })

  // ---- edicao inline ----
  document.addEventListener('dblclick', function (e) {
    var el = e.target.closest('[data-lp]')
    if (!el) return
    var alvo = el.getAttribute('data-lp')
    if (!EDITAVEIS.test(alvo) && alvo !== 'header:logo') return
    e.preventDefault()
    iniciarEdicao(el)
  })
  function iniciarEdicao(el) {
    if (editando) pararEdicao()
    editando = el
    try {
      el.contentEditable = 'plaintext-only'
    } catch (_) {
      el.contentEditable = 'true'
    }
    el.focus()
    var sel = window.getSelection()
    if (sel) {
      var range = document.createRange()
      range.selectNodeContents(el)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    el.addEventListener('input', aoDigitar)
    el.addEventListener('blur', pararEdicao)
    el.addEventListener('keydown', teclaEdicao)
  }
  function aoDigitar() {
    if (!editando) return
    enviar({ tipo: 'texto', alvo: editando.getAttribute('data-lp'), valor: editando.innerText })
  }
  function teclaEdicao(e) {
    if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault()
      editando.blur()
    }
  }
  function pararEdicao() {
    if (!editando) return
    var el = editando
    editando = null
    el.contentEditable = 'false'
    el.removeEventListener('input', aoDigitar)
    el.removeEventListener('blur', pararEdicao)
    el.removeEventListener('keydown', teclaEdicao)
    enviar({ tipo: 'texto-fim', alvo: el.getAttribute('data-lp'), valor: el.innerText })
  }

  // ---- barra de acoes da secao ----
  var barra = document.createElement('div')
  barra.className = 'lpe-barra'
  barra.style.display = 'none'
  document.body.appendChild(barra)
  var secaoBarra = null

  function montarBarra(secaoEl) {
    secaoBarra = secaoEl
    var nome = secaoEl.getAttribute('data-lp-nome') || 'Seção'
    barra.innerHTML =
      '<span class="lpe-rotulo">' + nome.replace(/[<>&]/g, '') + '</span>' +
      '<button data-acao="subir" title="Mover para cima">↑</button>' +
      '<button data-acao="descer" title="Mover para baixo">↓</button>' +
      '<button data-acao="duplicar" title="Duplicar">⧉</button>' +
      '<button data-acao="excluir" title="Excluir">✕</button>'
    var r = secaoEl.getBoundingClientRect()
    barra.style.display = 'flex'
    barra.style.top = window.scrollY + r.top + 8 + 'px'
    barra.style.right = '12px'
    barra.style.left = 'auto'
  }
  document.addEventListener('mouseover', function (e) {
    if (editando) return
    if (barra.contains(e.target)) return
    var secaoEl = e.target.closest('section[data-lp]')
    if (!secaoEl) {
      barra.style.display = 'none'
      secaoBarra = null
      return
    }
    // Só remonta ao trocar de seção — senão os botões piscariam a cada mouseover.
    if (secaoEl !== secaoBarra) montarBarra(secaoEl)
    else barra.style.display = 'flex'
  })
  barra.addEventListener('click', function (e) {
    var b = e.target.closest('button')
    if (!b || !secaoBarra) return
    e.stopPropagation()
    enviar({ tipo: 'secao-acao', acao: b.getAttribute('data-acao'), alvo: secaoBarra.getAttribute('data-lp') })
  })

  // ---- atalhos de desfazer/refazer (o foco vive dentro do iframe) ----
  document.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || editando) return
    var k = e.key.toLowerCase()
    if (k === 'z' || k === 'y') {
      e.preventDefault()
      enviar({ tipo: 'atalho', acao: k === 'y' || e.shiftKey ? 'refazer' : 'desfazer' })
    }
  })

  // ---- scroll ----
  var scrollTimer = null
  window.addEventListener('scroll', function () {
    if (scrollTimer) return
    scrollTimer = setTimeout(function () {
      scrollTimer = null
      enviar({ tipo: 'scroll', y: window.scrollY })
    }, 150)
  }, { passive: true })

  // ---- mensagens do parent ----
  window.addEventListener('message', function (e) {
    if (e.source !== pai) return
    var m = e.data
    if (!m || !m.lpEditor) return
    if (m.tipo === 'ir-scroll') window.scrollTo(0, m.y || 0)
    if (m.tipo === 'destacar') {
      var el = m.alvo ? document.querySelector('[data-lp="' + m.alvo + '"]') : null
      selecionar(el)
      if (el && m.rolar) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

  enviar({ tipo: 'pronto' })
})()
`
