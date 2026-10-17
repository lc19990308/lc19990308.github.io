const ANCHORS = [
  { label: 'Vue', x: 0.2, y: 0.34, tone: '#7dd3fc' },
  { label: 'TypeScript', x: 0.42, y: 0.18, tone: '#f59e0b' },
  { label: 'Three.js', x: 0.68, y: 0.3, tone: '#7dd3fc' },
  { label: 'IoT', x: 0.82, y: 0.58, tone: '#34d399' },
  { label: 'AI', x: 0.56, y: 0.76, tone: '#f59e0b' },
  { label: 'WebRTC', x: 0.28, y: 0.72, tone: '#c4b5fd' },
]

const PARTICLE_COUNT = 54
const LINK_DISTANCE = 0.19

function createParticle(index) {
  const seed = index * 9973
  return {
    x: ((seed % 1000) / 1000 + Math.random() * 0.08) % 1,
    y: (((seed * 7) % 1000) / 1000 + Math.random() * 0.08) % 1,
    vx: (Math.random() - 0.5) * 0.0018,
    vy: (Math.random() - 0.5) * 0.0018,
    radius: 1.1 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
  }
}

function createNetworkState() {
  return {
    width: 1,
    height: 1,
    frame: 0,
    running: false,
    paused: false,
    visible: true,
    pointer: null,
    particles: Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(index)),
  }
}

function resizeCanvas(canvas, context, state) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  state.width = Math.max(1, Math.floor(rect.width))
  state.height = Math.max(1, Math.floor(rect.height))
  canvas.width = Math.floor(state.width * dpr)
  canvas.height = Math.floor(state.height * dpr)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  drawNetwork(context, state, 0)
}

function applyPointerForce(pointer, particle) {
  let { vx, vy } = particle
  if (!pointer) return { ...particle, vx, vy }
  const dx = pointer.x - particle.x
  const dy = pointer.y - particle.y
  const distance = Math.hypot(dx, dy)
  if (distance < 0.24 && distance > 0.001) {
    vx += (dx / distance) * 0.00012
    vy += (dy / distance) * 0.00012
  }
  return { ...particle, vx, vy }
}

function moveParticle(particle) {
  let { x, y, vx, vy } = particle
  x += vx
  y += vy
  vx *= 0.996
  vy *= 0.996
  if (x < -0.04) x = 1.04
  if (x > 1.04) x = -0.04
  if (y < -0.04) y = 1.04
  if (y > 1.04) y = -0.04
  if (Math.abs(vx) < 0.00018) vx += (Math.random() - 0.5) * 0.00008
  if (Math.abs(vy) < 0.00018) vy += (Math.random() - 0.5) * 0.00008
  return { ...particle, x, y, vx, vy }
}

function updateParticles(state) {
  state.particles = state.particles
    .map(particle => applyPointerForce(state.pointer, particle))
    .map(moveParticle)
}

function project(state, point) {
  return { x: point.x * state.width, y: point.y * state.height }
}

function drawGrid(context, state) {
  context.save()
  context.strokeStyle = 'rgba(125, 211, 252, 0.055)'
  context.lineWidth = 1
  const step = Math.max(42, Math.floor(state.width / 14))
  for (let x = 0; x <= state.width; x += step) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, state.height)
    context.stroke()
  }
  for (let y = 0; y <= state.height; y += step) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(state.width, y)
    context.stroke()
  }
  context.restore()
}

function drawLink(context, state, a, b, alpha, tone = '125, 211, 252') {
  const start = project(state, a)
  const end = project(state, b)
  context.strokeStyle = `rgba(${tone}, ${alpha})`
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(start.x, start.y)
  context.lineTo(end.x, end.y)
  context.stroke()
}

function drawParticleConnections(context, state) {
  state.particles.forEach((particle, index) => {
    for (let next = index + 1; next < state.particles.length; next += 1) {
      const other = state.particles[next]
      const distance = Math.hypot(particle.x - other.x, particle.y - other.y)
      if (distance < LINK_DISTANCE) drawLink(context, state, particle, other, (1 - distance / LINK_DISTANCE) * 0.2)
    }
    ANCHORS.forEach(anchor => {
      const distance = Math.hypot(particle.x - anchor.x, particle.y - anchor.y)
      if (distance < 0.28) drawLink(context, state, particle, anchor, (1 - distance / 0.28) * 0.28)
    })
  })
}

function drawParticles(context, state, time) {
  state.particles.forEach(particle => {
    const point = project(state, particle)
    const pulse = 0.45 + Math.sin(time * 0.0018 + particle.phase) * 0.22
    context.fillStyle = `rgba(125, 211, 252, ${pulse})`
    context.beginPath()
    context.arc(point.x, point.y, particle.radius, 0, Math.PI * 2)
    context.fill()
  })
}

function drawAnchors(context, state, time) {
  ANCHORS.forEach(anchor => {
    const point = project(state, anchor)
    const pulse = 1 + Math.sin(time * 0.002 + anchor.x * 8) * 0.12
    context.save()
    context.shadowColor = anchor.tone
    context.shadowBlur = 22
    context.fillStyle = anchor.tone
    context.beginPath()
    context.arc(point.x, point.y, 5.2 * pulse, 0, Math.PI * 2)
    context.fill()
    context.restore()
    context.font = '600 12px "JetBrains Mono", monospace'
    context.fillStyle = 'rgba(244, 247, 251, 0.78)'
    context.fillText(anchor.label, point.x + 12, point.y + 4)
  })
}

function drawNetwork(context, state, time) {
  context.clearRect(0, 0, state.width, state.height)
  drawGrid(context, state)
  drawParticleConnections(context, state)
  drawParticles(context, state, time)
  drawAnchors(context, state, time)
}

function updateNetworkLoop(canvas, context, state, motionQuery) {
  window.cancelAnimationFrame(state.frame)
  if (!state.running || state.paused || !state.visible || motionQuery.matches) {
    drawNetwork(context, state, 0)
    return
  }
  state.frame = window.requestAnimationFrame(function tick(time) {
    if (!state.running || state.paused || !state.visible) return
    updateParticles(state)
    drawNetwork(context, state, time)
    state.frame = window.requestAnimationFrame(tick)
  })
}

function attachObservers(canvas, context, state, motionQuery) {
  const resizeObserver = new ResizeObserver(() => resizeCanvas(canvas, context, state))
  resizeObserver.observe(canvas)
  const visibilityObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        state.visible = entries.some(entry => entry.isIntersecting)
        updateNetworkLoop(canvas, context, state, motionQuery)
      }, { threshold: 0.08 })
    : null
  visibilityObserver?.observe(canvas)
  return { resizeObserver, visibilityObserver }
}

function attachPointerEvents(canvas, state) {
  const onPointerMove = event => {
    const rect = canvas.getBoundingClientRect()
    state.pointer = {
      x: (event.clientX - rect.left) / Math.max(rect.width, 1),
      y: (event.clientY - rect.top) / Math.max(rect.height, 1),
    }
  }
  const onPointerLeave = () => {
    state.pointer = null
  }
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  return { onPointerMove, onPointerLeave }
}

export function createSignalNetwork(canvas, { motionQuery }) {
  const context = canvas.getContext('2d')
  if (!context) return { start() {}, setPaused() {}, destroy() {} }
  canvas.closest('.signal-panel')?.classList.add('network-ready')

  const state = createNetworkState()
  const observers = attachObservers(canvas, context, state, motionQuery)
  const pointerEvents = attachPointerEvents(canvas, state)
  resizeCanvas(canvas, context, state)

  return {
    start() {
      state.running = true
      updateNetworkLoop(canvas, context, state, motionQuery)
    },
    setPaused(value) {
      state.paused = value
      updateNetworkLoop(canvas, context, state, motionQuery)
    },
    destroy() {
      state.running = false
      window.cancelAnimationFrame(state.frame)
      observers.resizeObserver.disconnect()
      observers.visibilityObserver?.disconnect()
      canvas.removeEventListener('pointermove', pointerEvents.onPointerMove)
      canvas.removeEventListener('pointerleave', pointerEvents.onPointerLeave)
    },
  }
}
