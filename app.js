import { createSignalNetwork } from './network.js'

const STATION_SEEN_KEY = 'lc-signal-station-seen'
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function getGatewayElements() {
  const dialog = document.querySelector('#station-gateway')
  if (!(dialog instanceof HTMLDialogElement)) return null
  return {
    dialog,
    mount: dialog.querySelector('.station-scene'),
    status: dialog.querySelector('.station-status'),
    launchers: [...document.querySelectorAll('[data-open-station]')],
    closers: [...dialog.querySelectorAll('[data-close-station]')],
  }
}

function createGatewayState() {
  return {
    iframe: null,
    previousFocus: null,
    closeTimer: 0,
    readyTimer: 0,
    closing: false,
  }
}

function setExpanded(elements, value) {
  elements.launchers.forEach(button => button.setAttribute('aria-expanded', String(value)))
}

function restoreFocus(state, elements) {
  const target = state.previousFocus?.isConnected && state.previousFocus !== document.body
    ? state.previousFocus
    : elements.launchers[0]
  target?.focus({ preventScroll: true })
}

function cleanupGateway(state, elements, onChange) {
  window.clearTimeout(state.closeTimer)
  window.clearTimeout(state.readyTimer)
  state.iframe?.contentWindow?.postMessage({ type: 'station:destroy' }, window.location.origin)
  elements.mount?.replaceChildren()
  state.iframe = null
  state.closing = false
  elements.dialog.classList.remove('station-leaving')
  document.documentElement.classList.remove('gateway-open')
  setExpanded(elements, false)
  onChange(false)
  restoreFocus(state, elements)
}

function markStationSeen() {
  try {
    sessionStorage.setItem(STATION_SEEN_KEY, '1')
  } catch {
    // sessionStorage 在隐私模式下可能不可用，不影响关闭。
  }
}

function dismissGateway(state, elements) {
  if (!elements.dialog.open || state.closing) return
  state.closing = true
  markStationSeen()
  window.clearTimeout(state.readyTimer)
  elements.dialog.classList.add('station-leaving')
  state.closeTimer = window.setTimeout(
    () => elements.dialog.close(),
    motionQuery.matches ? 0 : 160,
  )
}

function updateReadyStatus(state, elements) {
  if (!elements.dialog.open || state.closing) return
  elements.mount?.setAttribute('aria-busy', 'false')
  const sceneReady = state.iframe?.contentDocument?.documentElement.dataset.sceneReady === 'true'
  if (!elements.status) return
  elements.status.textContent = sceneReady
    ? '拖动旋转 · 滚轮缩放 · 双击聚焦'
    : '当前设备使用静态驿站画面，可直接进入主页'
}

function createStationFrame(state, elements) {
  const iframe = document.createElement('iframe')
  iframe.title = 'LewChaw 的前端驿站三维场景，可拖拽旋转、滚轮缩放'
  iframe.src = './station.html'
  iframe.setAttribute('tabindex', '0')
  iframe.addEventListener('load', () => {
    state.readyTimer = window.setTimeout(() => updateReadyStatus(state, elements), 360)
  })
  return iframe
}

function showGateway(state, elements, onChange, event) {
  if (elements.dialog.open || state.closing) return
  state.previousFocus = event?.currentTarget || document.activeElement
  state.closing = false
  elements.mount?.setAttribute('aria-busy', 'true')
  if (elements.status) elements.status.textContent = '正在点亮驿站…'
  state.iframe = createStationFrame(state, elements)
  document.documentElement.classList.add('gateway-open')
  elements.dialog.showModal()
  elements.mount?.replaceChildren(state.iframe)
  setExpanded(elements, true)
  onChange(true)
  elements.dialog.querySelector('[data-close-station]')?.focus({ preventScroll: true })
}

function shouldAutoOpen() {
  let seen = false
  try {
    seen = sessionStorage.getItem(STATION_SEEN_KEY) === '1'
  } catch {
    seen = false
  }
  const forced = new URLSearchParams(window.location.search).get('station') === '1'
  return forced || (!seen && !window.location.hash)
}

function bindGatewayEvents(state, elements, onChange) {
  const dismiss = () => dismissGateway(state, elements)
  elements.dialog.addEventListener('cancel', event => {
    event.preventDefault()
    dismiss()
  })
  elements.dialog.addEventListener('close', () => cleanupGateway(state, elements, onChange))
  elements.closers.forEach(button => button.addEventListener('click', dismiss))
  elements.launchers.forEach(button => {
    button.addEventListener('click', event => showGateway(state, elements, onChange, event))
  })
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin) return
    if (event.data?.type === 'station:return-focus') {
      elements.dialog.querySelector('[data-close-station]')?.focus({ preventScroll: true })
    }
    if (event.data?.type === 'station:close') dismiss()
  })
}

function initStationGateway({ onChange }) {
  const elements = getGatewayElements()
  if (!elements) return { isOpen: () => false }
  const state = createGatewayState()
  bindGatewayEvents(state, elements, onChange)
  if (shouldAutoOpen()) showGateway(state, elements, onChange)
  return { isOpen: () => elements.dialog.open }
}

function initReveal() {
  const items = [...document.querySelectorAll('[data-reveal]')]
  if (!items.length) return
  if (motionQuery.matches || !('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('is-visible'))
    return
  }
  document.documentElement.classList.add('reveal-enabled')
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    })
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
  items.forEach(item => observer.observe(item))
}

function initEmailLinks() {
  document.querySelectorAll('[data-email-user][data-email-domain]').forEach(element => {
    const address = `${element.dataset.emailUser}@${element.dataset.emailDomain}`
    if (element.hasAttribute('data-email-link')) {
      element.setAttribute('href', `mailto:${address}`)
      if (element.firstChild?.nodeType === Node.TEXT_NODE) element.firstChild.nodeValue = `${address} `
    } else {
      element.textContent = address
    }
  })
}

const canvas = document.querySelector('#signal-network')
const network = canvas ? createSignalNetwork(canvas, { motionQuery }) : null
const gateway = initStationGateway({
  onChange(open) {
    network?.setPaused(open)
  },
})

if (!gateway.isOpen()) network?.start()
window.addEventListener('pagehide', event => {
  if (!event.persisted) network?.destroy()
})

initEmailLinks()
initReveal()
document.querySelector('#current-year').textContent = String(new Date().getFullYear())
