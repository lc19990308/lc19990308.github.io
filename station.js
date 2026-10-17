import * as THREE from './vendor/three.module.min.js'

const canvas = document.querySelector('#station-canvas')
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const fallbackTitle = document.querySelector('.fallback-card strong')

const palette = {
  bg: 0x080d16,
  platform: 0x111827,
  platformEdge: 0x263449,
  building: 0x182236,
  roof: 0x263449,
  glass: 0x7dd3fc,
  cyan: 0x7dd3fc,
  amber: 0xf59e0b,
  green: 0x34d399,
  white: 0xf4f7fb,
}

function makeStandard(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.18, ...options })
}

function makeGlow(color, opacity = 0.86) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false })
}

function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function createLabel(text, accent = '#7dd3fc', subtext = '') {
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 640
  labelCanvas.height = 220
  const context = labelCanvas.getContext('2d')
  context.fillStyle = 'rgba(8, 13, 22, 0.82)'
  context.strokeStyle = accent
  context.lineWidth = 5
  roundedRect(context, 18, 24, 604, 158, 34)
  context.fill()
  context.stroke()
  context.textAlign = 'center'
  context.fillStyle = '#f4f7fb'
  context.font = '700 54px "Noto Sans SC", system-ui, sans-serif'
  context.fillText(text, 320, subtext ? 104 : 116)
  if (subtext) {
    context.fillStyle = accent
    context.font = '500 28px "JetBrains Mono", monospace'
    context.fillText(subtext, 320, 150)
  }
  const texture = new THREE.CanvasTexture(labelCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.scale.set(2.5, 0.86, 1)
  return sprite
}

function createStars(scene) {
  const count = 520
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const radius = 18 + Math.random() * 28
    const theta = Math.random() * Math.PI * 2
    positions[index * 3] = Math.cos(theta) * radius
    positions[index * 3 + 1] = -2 + Math.random() * 18
    positions[index * 3 + 2] = Math.sin(theta) * radius
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: palette.cyan,
    size: 0.045,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  }))
  scene.add(points)
  return points
}

function createIsland(world) {
  const island = new THREE.Group()
  world.add(island)
  addMesh(island, new THREE.BoxGeometry(10.4, 0.42, 6.8), makeStandard(palette.platform), [0, -0.22, 0])
  addMesh(island, new THREE.ConeGeometry(4.6, 2.7, 6), makeStandard(0x0b101c, { roughness: 0.8 }), [0, -1.78, 0], [Math.PI, Math.PI / 6, 0])
  const edgeMaterial = makeGlow(palette.cyan, 0.32)
  addMesh(island, new THREE.BoxGeometry(10.7, 0.06, 0.08), edgeMaterial, [0, 0.04, -3.44])
  addMesh(island, new THREE.BoxGeometry(10.7, 0.06, 0.08), edgeMaterial, [0, 0.04, 3.44])
  addMesh(island, new THREE.BoxGeometry(0.08, 0.06, 6.9), edgeMaterial, [-5.24, 0.04, 0])
  addMesh(island, new THREE.BoxGeometry(0.08, 0.06, 6.9), edgeMaterial, [5.24, 0.04, 0])
  addGridLines(island)
  addMesh(island, new THREE.TorusGeometry(2.35, 0.025, 12, 120), makeGlow(palette.amber, 0.34), [-1.15, 0.1, 0.1], [Math.PI / 2, 0, 0])
  return island
}

function addGridLines(island) {
  for (let index = -4; index <= 4; index += 1) {
    addMesh(island, new THREE.BoxGeometry(0.025, 0.025, 6.4), makeGlow(0x334155, 0.55), [index, 0.02, 0])
  }
  for (let index = -2; index <= 2; index += 1) {
    addMesh(island, new THREE.BoxGeometry(9.8, 0.025, 0.025), makeGlow(0x334155, 0.55), [0, 0.025, index])
  }
}

function createStationShell(station) {
  const glassMaterial = makeStandard(palette.glass, {
    transparent: true,
    opacity: 0.28,
    roughness: 0.18,
    metalness: 0.05,
    emissive: palette.cyan,
    emissiveIntensity: 0.12,
  })
  addMesh(station, new THREE.BoxGeometry(4.2, 1.9, 2.5), makeStandard(palette.building), [0, 1.05, 0])
  addMesh(station, new THREE.BoxGeometry(4.55, 0.22, 2.85), makeStandard(palette.roof, { metalness: 0.28 }), [0, 2.12, 0])
  addMesh(station, new THREE.BoxGeometry(4.48, 0.12, 0.14), makeGlow(palette.amber, 0.72), [0, 2.02, 1.47])
  addMesh(station, new THREE.BoxGeometry(1.1, 1.48, 0.08), glassMaterial, [-1.35, 0.88, 1.28])
  addMesh(station, new THREE.BoxGeometry(1.1, 1.48, 0.08), glassMaterial, [0, 0.88, 1.28])
  addMesh(station, new THREE.BoxGeometry(0.82, 1.5, 0.1), makeStandard(0x0d1320), [1.35, 0.86, 1.3])
}

function createStationConsole(station) {
  const consoleGroup = new THREE.Group()
  consoleGroup.position.set(-1.35, 0.08, 2.12)
  station.add(consoleGroup)
  addMesh(consoleGroup, new THREE.BoxGeometry(1.5, 0.16, 0.68), makeStandard(0x111827), [0, 0.36, 0])
  addMesh(consoleGroup, new THREE.BoxGeometry(1.28, 0.72, 0.06), makeGlow(0x0ea5e9, 0.42), [0, 0.88, -0.22], [-0.18, 0, 0])
  const label = createLabel('Vue', '#7dd3fc', 'TYPE-SAFE UI')
  label.position.set(0, 1.55, -0.24)
  label.scale.set(1.25, 0.44, 1)
  consoleGroup.add(label)
}

function createStationPerson(station) {
  const person = new THREE.Group()
  person.position.set(1.6, 0.08, 2.12)
  station.add(person)
  addMesh(person, new THREE.CapsuleGeometry(0.16, 0.48, 6, 12), makeStandard(0x263449), [0, 0.66, 0])
  addMesh(person, new THREE.SphereGeometry(0.18, 18, 14), makeStandard(0xd6a77a), [0, 1.12, 0])
  addMesh(person, new THREE.BoxGeometry(0.52, 0.08, 0.08), makeGlow(palette.cyan, 0.62), [0, 0.96, 0.1])
}

function createStation(world) {
  const station = new THREE.Group()
  station.position.set(-1.15, 0.1, 0.05)
  world.add(station)
  createStationShell(station)
  addMesh(station, new THREE.BoxGeometry(3.6, 0.06, 0.05), makeGlow(palette.cyan, 0.48), [0, 1.74, 1.36])
  addMesh(station, new THREE.BoxGeometry(0.08, 0.74, 0.08), makeGlow(palette.amber, 0.64), [-1.9, 1.16, 1.38])
  addMesh(station, new THREE.BoxGeometry(0.08, 0.74, 0.08), makeGlow(palette.amber, 0.64), [1.9, 1.16, 1.38])
  const roofSign = createLabel('前端驿站', '#f59e0b', 'LC FIELD STATION')
  roofSign.position.set(0, 2.66, 1.1)
  station.add(roofSign)
  createStationConsole(station)
  createStationPerson(station)
  return station
}

function createPortal(group, label, subtitle, color, index) {
  addMesh(group, new THREE.CylinderGeometry(0.42, 0.52, 0.18, 24), makeStandard(0x182236), [0, 0.1, 0])
  addMesh(group, new THREE.CylinderGeometry(0.06, 0.06, 1.38, 12), makeGlow(color, 0.7), [0, 0.82, 0])
  addMesh(group, new THREE.TorusGeometry(0.48, 0.025, 10, 64), makeGlow(color, 0.42), [0, 1.55, 0], [Math.PI / 2, 0, 0])
  const sprite = createLabel(label, `#${color.toString(16).padStart(6, '0')}`, subtitle)
  sprite.position.set(0, 2.08 + index * 0.03, 0)
  sprite.scale.set(1.55, 0.54, 1)
  group.add(sprite)
}

function createPortals(world) {
  const portals = new THREE.Group()
  portals.position.set(3.45, 0.08, 0.05)
  world.add(portals)
  const configs = [
    ['BLOG', '研究记录', palette.amber, 1.8],
    ['PORTFOLIO', '完整简历', palette.cyan, 0],
    ['GITHUB', '开源现场', palette.green, -1.8],
  ]
  configs.forEach(([label, subtitle, color, z], index) => {
    const group = new THREE.Group()
    group.position.set(0, 0, z)
    portals.add(group)
    createPortal(group, label, subtitle, color, index)
  })
  return portals
}

function createAntenna(world) {
  const antenna = new THREE.Group()
  antenna.position.set(-4.05, 0.08, -2.1)
  world.add(antenna)
  addMesh(antenna, new THREE.CylinderGeometry(0.07, 0.11, 2.7, 12), makeStandard(0x334155), [0, 1.35, 0])
  addMesh(antenna, new THREE.BoxGeometry(0.88, 0.08, 0.08), makeStandard(0x64748b), [0, 2.16, 0])
  addMesh(antenna, new THREE.SphereGeometry(0.16, 16, 12), makeGlow(palette.amber, 0.82), [0, 2.82, 0])
  addMesh(antenna, new THREE.SphereGeometry(0.72, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), makeStandard(0x263449, { side: THREE.DoubleSide }), [0.58, 1.72, 0], [0, 0, -0.72])
  const points = [new THREE.Vector3(0, 2.8, 0), new THREE.Vector3(3.4, 4.2, -1.2), new THREE.Vector3(6.5, 2.8, 1.4)]
  const geometry = new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(points).getPoints(64))
  antenna.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: palette.cyan, transparent: true, opacity: 0.42 })))
  return antenna
}

function createDataOrbit(world) {
  const orbit = new THREE.Group()
  world.add(orbit)
  for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
    const radius = 3.5 + ringIndex * 0.52
    addMesh(orbit, new THREE.TorusGeometry(radius, 0.012, 8, 160), makeGlow(palette.cyan, 0.5), [0, 1.2 + ringIndex * 0.2, 0], [Math.PI / 2 + ringIndex * 0.18, 0, ringIndex * 0.32])
  }
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2
    const radius = 3.4 + (index % 3) * 0.52
    addMesh(orbit, new THREE.SphereGeometry(0.055, 12, 8), makeGlow(palette.amber, 0.86), [Math.cos(angle) * radius, 1.18 + Math.sin(index * 1.7) * 0.34, Math.sin(angle) * radius])
  }
  return orbit
}

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !motionQuery.matches,
    alpha: true,
    powerPreference: motionQuery.matches ? 'low-power' : 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  return renderer
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0x93c5fd, 0x111827, 1.5))
  const keyLight = new THREE.DirectionalLight(0xffedd5, 3.2)
  keyLight.position.set(-4, 8, 6)
  keyLight.castShadow = true
  const shadowSize = motionQuery.matches ? 1024 : 2048
  keyLight.shadow.mapSize.set(shadowSize, shadowSize)
  scene.add(keyLight)
  const cyanLight = new THREE.PointLight(palette.cyan, 9, 12)
  cyanLight.position.set(2.8, 3.1, 2.4)
  scene.add(cyanLight)
  const amberLight = new THREE.PointLight(palette.amber, 7, 10)
  amberLight.position.set(-3.8, 2.8, 3.1)
  scene.add(amberLight)
}

function buildWorld(scene) {
  const world = new THREE.Group()
  scene.add(world)
  return {
    world,
    island: createIsland(world),
    station: createStation(world),
    portals: createPortals(world),
    antenna: createAntenna(world),
    orbitGroup: createDataOrbit(world),
    stars: createStars(scene),
  }
}

function createSceneContext() {
  const renderer = createRenderer()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(palette.bg)
  scene.fog = new THREE.FogExp2(palette.bg, 0.035)
  addLights(scene)
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  const rig = { target: new THREE.Vector3(0, 0.82, 0), theta: -0.72, phi: 1.04, radius: 10.8 }
  return { renderer, scene, camera, rig, ...buildWorld(scene) }
}

function updateCamera(context) {
  const { camera, rig } = context
  rig.phi = THREE.MathUtils.clamp(rig.phi, 0.58, 1.36)
  rig.radius = THREE.MathUtils.clamp(rig.radius, 6.4, 15.5)
  const sinPhi = Math.sin(rig.phi)
  camera.position.set(
    rig.target.x + rig.radius * sinPhi * Math.sin(rig.theta),
    rig.target.y + rig.radius * Math.cos(rig.phi),
    rig.target.z + rig.radius * sinPhi * Math.cos(rig.theta),
  )
  camera.lookAt(rig.target)
}

function resizeStation(context) {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  context.renderer.setSize(width, height, false)
  context.camera.aspect = width / height
  context.camera.updateProjectionMatrix()
  updateCamera(context)
  context.renderer.render(context.scene, context.camera)
}

function renderStation(context, time = 0) {
  const seconds = time * 0.001
  context.world.position.y = Math.sin(seconds * 0.72) * 0.08
  context.station.rotation.y = Math.sin(seconds * 0.32) * 0.025
  context.portals.children.forEach((group, index) => {
    group.rotation.y = seconds * (0.18 + index * 0.035)
    group.position.y = Math.sin(seconds * 1.2 + index) * 0.035
  })
  context.orbitGroup.rotation.y = seconds * 0.1
  context.stars.rotation.y = seconds * 0.012
  context.antenna.rotation.y = Math.sin(seconds * 0.42) * 0.08
  context.renderer.render(context.scene, context.camera)
}

function bindPointerControls(context, renderOnce) {
  const { rig } = context
  let dragging = false
  let lastX = 0
  let lastY = 0
  canvas.addEventListener('pointerdown', event => {
    dragging = true
    lastX = event.clientX
    lastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
  })
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return
    rig.theta -= (event.clientX - lastX) * 0.006
    rig.phi -= (event.clientY - lastY) * 0.004
    lastX = event.clientX
    lastY = event.clientY
    updateCamera(context)
    renderOnce()
  })
  canvas.addEventListener('pointerup', event => {
    dragging = false
    canvas.releasePointerCapture(event.pointerId)
  })
}

function bindZoomAndFocus(context, renderOnce) {
  canvas.addEventListener('wheel', event => {
    event.preventDefault()
    context.rig.radius += event.deltaY * 0.01
    updateCamera(context)
    renderOnce()
  }, { passive: false })
  canvas.addEventListener('dblclick', () => {
    context.rig.theta = -0.42
    context.rig.phi = 0.92
    context.rig.radius = context.rig.radius > 8.5 ? 7.2 : 10.8
    updateCamera(context)
    renderOnce()
  })
}

function bindKeyboardControls(context, renderOnce) {
  canvas.addEventListener('keydown', event => {
    const step = 0.08
    if (event.key === 'ArrowLeft') context.rig.theta += step
    else if (event.key === 'ArrowRight') context.rig.theta -= step
    else if (event.key === 'ArrowUp') context.rig.phi -= step
    else if (event.key === 'ArrowDown') context.rig.phi += step
    else if (event.key === 'Home') Object.assign(context.rig, { theta: -0.72, phi: 1.04, radius: 10.8 })
    else return
    event.preventDefault()
    updateCamera(context)
    renderOnce()
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault()
      window.parent.postMessage({ type: 'station:close' }, window.location.origin)
      return
    }
    if (event.key !== 'Tab' || document.activeElement !== canvas) return
    event.preventDefault()
    window.parent.postMessage({ type: 'station:return-focus' }, window.location.origin)
  })
}

function disposeScene(scene, renderer) {
  scene.traverse(object => {
    if (object.geometry) object.geometry.dispose()
    if (!object.material) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach(material => {
      if (material.map) material.map.dispose()
      material.dispose()
    })
  })
  renderer.dispose()
}

function createRuntime(context) {
  let animationFrame = 0
  let destroyed = false
  function destroy() {
    if (destroyed) return
    destroyed = true
    window.cancelAnimationFrame(animationFrame)
    window.removeEventListener('message', onParentMessage)
    disposeScene(context.scene, context.renderer)
  }
  function onParentMessage(event) {
    if (event.origin === window.location.origin && event.data?.type === 'station:destroy') destroy()
  }
  function loop(time) {
    renderStation(context, time)
    animationFrame = window.requestAnimationFrame(loop)
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    window.cancelAnimationFrame(animationFrame)
    document.body.classList.remove('scene-ready')
  })
  canvas.addEventListener('webglcontextrestored', () => window.location.reload())
  window.addEventListener('message', onParentMessage)
  window.addEventListener('pagehide', destroy, { once: true })
  return { destroy, start: () => { animationFrame = window.requestAnimationFrame(loop) } }
}

function createScene() {
  if (!canvas) throw new Error('Station canvas is missing')
  const context = createSceneContext()
  const renderOnce = () => {
    if (motionQuery.matches) renderStation(context, 0)
  }
  bindPointerControls(context, renderOnce)
  bindZoomAndFocus(context, renderOnce)
  bindKeyboardControls(context, renderOnce)
  const runtime = createRuntime(context)
  window.addEventListener('resize', () => resizeStation(context))
  resizeStation(context)
  updateCamera(context)
  if (motionQuery.matches) renderStation(context, 0)
  else runtime.start()
  document.documentElement.dataset.sceneReady = 'true'
  document.body.classList.add('scene-ready')
}

try {
  createScene()
} catch {
  document.documentElement.dataset.sceneReady = 'false'
  if (fallbackTitle) fallbackTitle.textContent = 'Vue · TypeScript · IoT · AI'
}
