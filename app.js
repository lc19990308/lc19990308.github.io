// The document works independently of WebGL. Only the first-screen viewer loads Three.js.
const frame = document.querySelector('#station-frame')
const viewer = document.querySelector('.station-viewer')
const status = document.querySelector('#scene-status')
const motionButton = document.querySelector('#scene-motion')
const resetButton = document.querySelector('#scene-reset')
const controls = document.querySelector('.viewer-controls')
const retryButton = document.querySelector('#scene-retry')
const sceneDetail = document.querySelector('#scene-loading-detail')
const loader = document.querySelector('#site-loader')
const loaderDetail = document.querySelector('#loader-detail')
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
let inView = false
let started = false
// Initial anchor scrolling can briefly expose the hero before reaching the target.
let awaitingInitialAnchor = ['#projects', '#writing', '#stack', '#contact'].includes(window.location.hash)
let ready = false
let failed = false
let paused = motionQuery.matches
let manuallyChangedMotion = false
let readyTimer = 0
let loadStartedAt = 0
const loadingStages = ['engine', 'structure', 'render', 'ready']

function finishLoading() {
  window.dispatchEvent(new Event('station:loading-finished'))
}

function updateProgress(stage, text) {
  const step = ['details', 'batching'].includes(stage) ? 'structure' : stage
  if (!loadingStages.includes(step)) return
  if (loader) {
    loader.dataset.stage = step
    loader.querySelectorAll('[data-step]').forEach(item => {
      if (item.dataset.step === step) item.setAttribute('aria-current', 'step')
      else item.removeAttribute('aria-current')
      item.toggleAttribute('data-complete', loadingStages.indexOf(item.dataset.step) < loadingStages.indexOf(step))
    })
  }
  if (loaderDetail) loaderDetail.textContent = text
  if (sceneDetail) sceneDetail.textContent = text
  if (viewer) viewer.dataset.loadingStage = stage
}

function send(type, values = {}) {
  frame?.contentWindow?.postMessage({ type, ...values }, window.location.origin)
}

function updateMotion() {
  if (!motionButton) return
  motionButton.setAttribute('aria-pressed', String(paused))
  motionButton.textContent = paused ? '播放动效' : '暂停动效'
  motionButton.setAttribute('aria-label', paused ? '播放驿站动效' : '暂停驿站动效')
}

function updateStatus() {
  if (!viewer || !status) return
  viewer.dataset.state = failed ? 'error' : ready ? (paused ? 'static' : 'ready') : 'loading'
  status.textContent = failed ? '静态驿站' : !ready ? '正在连接驿站' : paused ? '静态漫游' : '实时驿站'
  if (controls) controls.hidden = !ready || failed
  if (retryButton) retryButton.hidden = !failed
  if (failed && sceneDetail) sceneDetail.textContent = '驿站暂未连接，可重新尝试或继续浏览主页'
  viewer.querySelector('.scene-poster')?.setAttribute('aria-hidden', String(ready && !failed))
  updateMotion()
}

function syncState() {
  send('station:visibility', { visible: inView && !document.hidden })
  send('station:motion', { paused })
  updateStatus()
}

function loadScene(retry = false) {
  if ((started && !retry) || !frame) return
  window.clearTimeout(readyTimer)
  started = true
  ready = false
  failed = false
  loadStartedAt = performance.now()
  updateProgress('engine', '正在加载三维引擎与本地资源')
  updateStatus()
  frame.src = frame.dataset.src
  readyTimer = window.setTimeout(() => {
    if (!ready) {
      failed = true
      updateStatus()
      finishLoading()
    }
  }, 20000)
}

if (frame && viewer) {
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return
    if (event.data?.type === 'station:progress' && !ready) {
      if (typeof event.data.text === 'string') updateProgress(event.data.stage, event.data.text.slice(0, 120))
    } else if (event.data?.type === 'station:ready') {
      window.clearTimeout(readyTimer)
      ready = true
      failed = false
      viewer.dataset.pixelRatio = String(event.data.pixelRatio)
      viewer.dataset.drawCalls = String(event.data.drawCalls)
      viewer.dataset.loadMs = String(Math.round(performance.now() - loadStartedAt))
      if (event.data.timings) viewer.dataset.timings = JSON.stringify(event.data.timings)
      if (event.data.shaderPrograms !== undefined) viewer.dataset.shaderPrograms = String(event.data.shaderPrograms)
      updateProgress('ready', '驿站已就绪')
      syncState()
      finishLoading()
    } else if (event.data?.type === 'station:error') {
      window.clearTimeout(readyTimer)
      failed = true
      ready = false
      updateStatus()
      finishLoading()
    } else if (event.data?.type === 'station:motion-state') {
      paused = Boolean(event.data.paused)
      if (event.data.runtimeState) viewer.dataset.runtimeState = event.data.runtimeState
      if (event.data.renderedFrames !== undefined) viewer.dataset.renderedFrames = String(event.data.renderedFrames)
      updateStatus()
    }
  })

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting
      if (!inView) awaitingInitialAnchor = false
      if (inView && !awaitingInitialAnchor) loadScene()
      send('station:visibility', { visible: inView && !document.hidden })
    }, { threshold: 0.02 })
    observer.observe(viewer)
  } else {
    inView = true
    loadScene()
  }

  document.addEventListener('visibilitychange', syncState)
  window.addEventListener('pageshow', syncState)
  frame.addEventListener('error', () => {
    window.clearTimeout(readyTimer)
    failed = true
    ready = false
    updateStatus()
    finishLoading()
  })
  retryButton?.addEventListener('click', () => loadScene(true))

  motionButton?.addEventListener('click', () => {
    manuallyChangedMotion = true
    paused = !paused
    syncState()
  })
  resetButton?.addEventListener('click', () => send('station:reset'))
  motionQuery.addEventListener('change', event => {
    // Turning reduced motion on always takes effect, even after a manual choice.
    if (event.matches || !manuallyChangedMotion) {
      paused = event.matches
      syncState()
    }
  })

  updateStatus()
}

// Contact information remains available when scripts or WebGL are unavailable.
document.querySelectorAll('[data-email-user][data-email-domain]').forEach(element => {
  const address = `${element.dataset.emailUser}@${element.dataset.emailDomain}`
  if (element.hasAttribute('data-email-link')) element.setAttribute('href', `mailto:${address}`)
  else element.textContent = address
})

const year = document.querySelector('#current-year')
if (year) year.textContent = String(new Date().getFullYear())
