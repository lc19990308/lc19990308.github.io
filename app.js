import { createSignalNetwork } from './network.js'

const STATION_SEEN_KEY = 'lc-signal-station-seen'
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function getGatewayElements() {
  const dialog = document.querySelector('#station-gateway')
  if (!(dialog instanceof HTMLDialogElement)) return null
  return {
    dialog,
    frame: dialog.querySelector('.station-frame'),
    mount: dialog.querySelector('.station-scene'),
    status: dialog.querySelector('.station-status'),
    statusMessage: dialog.querySelector('.station-status-message'),
    controls: dialog.querySelector('.station-controls'),
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
    readyDeadline: 0,
    enterFrame: 0,
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
  window.cancelAnimationFrame(state.enterFrame)
  state.iframe?.contentWindow?.postMessage({ type: 'station:destroy' }, window.location.origin)
  elements.mount?.replaceChildren()
  state.iframe = null
  state.readyDeadline = 0
  state.closing = false
  elements.dialog.classList.remove('station-entering', 'station-leaving')
  elements.frame?.classList.remove('station-loading-active')
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
    motionQuery.matches ? 0 : 240,
  )
}

function updateReadyStatus(state, elements) {
  if (!elements.dialog.open || state.closing) return
  const sceneState = state.iframe?.contentDocument?.documentElement?.dataset.sceneReady
  if (sceneState === undefined && performance.now() < state.readyDeadline) {
    state.readyTimer = window.setTimeout(() => updateReadyStatus(state, elements), 120)
    return
  }

  const sceneReady = sceneState === 'true'
  elements.mount?.setAttribute('aria-busy', 'false')
  elements.frame?.classList.remove('station-loading-active')
  if (!elements.status) return
  if (elements.controls) elements.controls.hidden = !sceneReady
  if (elements.statusMessage) {
    elements.statusMessage.textContent = sceneReady
      ? ''
      : '当前设备使用静态驿站画面，可直接进入主页'
  }
}

function createStationFrame(state, elements) {
  const iframe = document.createElement('iframe')
  iframe.title = 'LewChaw 的前端驿站三维场景，可拖拽旋转、滚轮缩放'
  iframe.src = './station.html'
  iframe.setAttribute('tabindex', '0')
  iframe.addEventListener('load', () => {
    if (state.iframe !== iframe || state.closing) return
    window.clearTimeout(state.readyTimer)
    const sceneReady = iframe.contentDocument?.documentElement?.dataset.sceneReady === 'true'
    if (!sceneReady) {
      elements.frame?.classList.add('station-loading-active')
      elements.mount?.setAttribute('aria-busy', 'true')
      if (elements.statusMessage) elements.statusMessage.textContent = '正在点亮驿站…'
      if (elements.controls) elements.controls.hidden = true
    }
    state.readyDeadline = performance.now() + 8000
    state.readyTimer = window.setTimeout(() => updateReadyStatus(state, elements), 120)
  })
  return iframe
}

function showGateway(state, elements, onChange, event) {
  if (elements.dialog.open || state.closing) return
  state.previousFocus = event?.currentTarget || document.activeElement
  state.closing = false
  state.readyDeadline = 0
  elements.dialog.classList.add('station-entering')
  elements.frame?.classList.add('station-loading-active')
  elements.mount?.setAttribute('aria-busy', 'true')
  if (elements.statusMessage) elements.statusMessage.textContent = '正在点亮驿站…'
  if (elements.controls) elements.controls.hidden = true
  state.iframe = createStationFrame(state, elements)
  state.readyDeadline = performance.now() + 8000
  state.readyTimer = window.setTimeout(() => updateReadyStatus(state, elements), 120)
  document.documentElement.classList.add('gateway-open')
  elements.dialog.showModal()
  elements.mount?.replaceChildren(state.iframe)
  state.enterFrame = window.requestAnimationFrame(() => {
    elements.dialog.classList.remove('station-entering')
  })
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
      const addressLabel = element.querySelector('.contact-address')
      if (addressLabel) addressLabel.textContent = address
      else if (element.firstChild?.nodeType === Node.TEXT_NODE) element.firstChild.nodeValue = `${address} `
    } else {
      element.textContent = address
    }
  })
}

const NETWORK_MODES = {
  topology: {
    badge: '01 / CAPABILITY TOPOLOGY',
    label: 'CORE CAPABILITY',
    title: 'Vue 3 · Three.js · AI · IoT',
    desc: '立体空间中的节点映射真实业务中持续演进的核心技术资产，全向流光连通。',
  },
  architecture: {
    badge: '02 / LAYERED ARCHITECTURE',
    label: 'SYSTEM STACK',
    title: 'Presentation → Bridge → Model',
    desc: '界面渲染层、业务状态流、IoT 硬件通信网关与 AI 智能体分层解耦。',
  },
  twin: {
    badge: '03 / IOT DIGITAL TWIN',
    label: 'TELEMETRY TWIN',
    title: 'Sensor Grid → Edge → Cloud',
    desc: '面向农业物联与设备监控的实时数字孪生中枢，支持高并发空间数据遥测。',
  },
}

function initNetworkControls(networkInstance) {
  const tabs = [...document.querySelectorAll('.network-tab')]
  if (!tabs.length || !networkInstance) return

  const badgeEl = document.querySelector('#network-mode-badge')
  const labelEl = document.querySelector('#readout-label')
  const titleEl = document.querySelector('#readout-title')
  const descEl = document.querySelector('#readout-desc')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.view
      if (!view || !NETWORK_MODES[view]) return

      tabs.forEach(t => {
        const isActive = t === tab
        t.classList.toggle('active', isActive)
        t.setAttribute('aria-pressed', String(isActive))
      })

      const info = NETWORK_MODES[view]
      if (badgeEl) badgeEl.textContent = info.badge
      if (labelEl) labelEl.textContent = info.label
      if (titleEl) titleEl.textContent = info.title
      if (descEl) descEl.textContent = info.desc

      networkInstance.select(view)
    })
  })
}

const canvas = document.querySelector('#signal-network')
const network = canvas ? createSignalNetwork(canvas, { motionQuery }) : null
const gateway = initStationGateway({
  onChange(open) {
    network?.setPaused(open)
  },
})

initNetworkControls(network)
if (!gateway.isOpen()) network?.start()
window.addEventListener('pagehide', event => {
  if (!event.persisted) network?.destroy()
})

initEmailLinks()
initReveal()
document.querySelector('#current-year').textContent = String(new Date().getFullYear())
