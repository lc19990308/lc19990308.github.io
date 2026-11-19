const viewer = document.querySelector('.station-viewer')
const frame = document.querySelector('#station-frame')
const poster = viewer.querySelector('.scene-poster')
const status = document.querySelector('#scene-status')
const detail = document.querySelector('#scene-loading-detail')
const controls = viewer.querySelector('.viewer-controls')
const motion = document.querySelector('#scene-motion')
const reset = document.querySelector('#scene-reset')
const retry = document.querySelector('#scene-retry')
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const loadTimeout = 20000
let state = 'poster'
let paused = motionPreference.matches
let inView = false
let timeoutId

function send(type, values = {}) {
  if (window.location.origin === 'null') return
  frame.contentWindow?.postMessage({ type, ...values }, window.location.origin)
}

function setState(nextState, label) {
  const interactive = nextState === 'ready' || nextState === 'static'
  const hadViewerFocus = controls.contains(document.activeElement) || document.activeElement === frame
  const retrying = nextState === 'loading' && state === 'error'
  state = nextState
  viewer.dataset.state = nextState
  status.textContent = label
  frame.tabIndex = interactive ? 0 : -1
  frame.setAttribute('aria-hidden', String(!interactive))
  poster.setAttribute('aria-hidden', String(interactive))
  controls.hidden = !interactive
  motion.setAttribute('aria-pressed', String(paused))
  motion.textContent = paused ? '继续动效' : '暂停动效'
  if (interactive && document.activeElement === retry) motion.focus()
  retry.hidden = nextState !== 'error' && !retrying
  retry.setAttribute('aria-disabled', String(retrying))
  if (nextState === 'error' && hadViewerFocus) retry.focus()
}

function showScene() {
  setState(paused ? 'static' : 'ready', paused ? '动效已暂停' : '三维已连接')
}

function showFallback() {
  window.clearTimeout(timeoutId)
  detail.textContent = '三维场景暂未连接，当前显示静态图。'
  setState('error', '静态预览')
}

function syncVisibility() {
  if (state === 'ready' || state === 'static') {
    send('station:visibility', { visible: inView && !document.hidden })
  }
}

function loadScene() {
  if (window.location.protocol === 'file:') {
    status.textContent = '静态预览'
    detail.textContent = '通过站点预览或本地 HTTP 服务可打开三维场景。'
    return
  }

  if (state !== 'poster' && state !== 'error') return

  detail.textContent = '正在加载三维场景…'
  setState('loading', '正在连接')
  frame.src = frame.dataset.src
  timeoutId = window.setTimeout(showFallback, loadTimeout)
}

window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.origin !== window.location.origin) return
  const { type, text, paused: scenePaused } = event.data ?? {}

  if (type === 'station:progress' && state === 'loading' && typeof text === 'string') {
    detail.textContent = text.slice(0, 120)
  } else if (type === 'station:ready' && (state === 'loading' || state === 'error')) {
    window.clearTimeout(timeoutId)
    showScene()
    syncVisibility()
    send('station:motion', { paused })
  } else if (type === 'station:error' && state !== 'poster') {
    showFallback()
  } else if (type === 'station:motion-state' && (state === 'ready' || state === 'static')) {
    if (typeof scenePaused !== 'boolean' || scenePaused === paused) return
    paused = scenePaused
    showScene()
  }
})

frame.addEventListener('error', showFallback)
retry.addEventListener('click', loadScene)
reset.addEventListener('click', () => send('station:reset'))
motion.addEventListener('click', () => {
  paused = !paused
  send('station:motion', { paused })
  showScene()
})
motionPreference.addEventListener('change', event => {
  paused = event.matches
  if (state === 'ready' || state === 'static') {
    send('station:motion', { paused })
    showScene()
  }
})
document.addEventListener('visibilitychange', syncVisibility)

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    if (inView && state === 'poster') loadScene()
    syncVisibility()
  }, { threshold: 0.02 })
  observer.observe(viewer)
} else {
  inView = true
  loadScene()
}

// Contact information remains available when scripts or WebGL are unavailable.
document.querySelectorAll('[data-email-user][data-email-domain]').forEach(element => {
  const address = `${element.dataset.emailUser}@${element.dataset.emailDomain}`
  if (element.hasAttribute('data-email-link')) element.setAttribute('href', `mailto:${address}`)
  else element.textContent = address
})

const year = document.querySelector('#current-year')
if (year) year.textContent = String(new Date().getFullYear())
