import * as THREE from './vendor/three.module.min.js'

// --- Linear / Apple 调色板 ---
const palette = {
  cyan: 0x38bdf8,
  indigo: 0x818cf8,
  emerald: 0x34d399,
  amber: 0xfbbf24,
  silver: 0xe2e8f0,
  darkBase: 0x111420,
}

// 核心节点资产：定义 3 种完全不同维度的空间形态
const NODES_DATA = [
  // 核心中枢
  { id: 'core', label: 'Vue 3 / Core', twinLabel: 'Central Gateway', color: palette.emerald, size: 0.24,
    p: { topology: [0, 0.35, 0], architecture: [0, 1.25, 0], twin: [0, 0.45, 0] } },
  { id: 'three', label: 'Three.js', twinLabel: 'Spatial 3D GIS', color: palette.cyan, size: 0.21,
    p: { topology: [-1.4, 0.85, 0.3], architecture: [-1.2, 1.25, 0.3], twin: [-1.4, 0.05, -1.2] } },
  { id: 'ts', label: 'TypeScript', twinLabel: 'Device Protocol', color: palette.indigo, size: 0.19,
    p: { topology: [1.3, 0.8, -0.2], architecture: [1.2, 1.25, -0.3], twin: [1.4, 0.05, 1.2] } },
  { id: 'ai', label: 'AI Agent', twinLabel: 'Predictive Model', color: palette.indigo, size: 0.21,
    p: { topology: [1.5, -0.5, 0.5], architecture: [1.1, -1.25, 0.2], twin: [1.8, 0.05, -0.8] } },
  { id: 'iot', label: 'IoT Engine', twinLabel: 'Edge Telemetry', color: palette.emerald, size: 0.22,
    p: { topology: [-1.3, -0.6, -0.4], architecture: [-1.1, -0.42, -0.2], twin: [-1.8, 0.05, 0.8] } },
  { id: 'webrtc', label: 'WebRTC', twinLabel: 'Live IPC Camera', color: palette.cyan, size: 0.18,
    p: { topology: [0, -1.1, 0.2], architecture: [0, -0.42, 0.4], twin: [0, 0.05, -1.8] } },

  // 次级外围支持与物理传感器点位
  { id: 'fastapi', label: 'FastAPI', twinLabel: 'Cloud API Sync', color: palette.silver, size: 0.14,
    p: { topology: [0.8, -1.4, -0.6], architecture: [0.9, -1.25, -0.5], twin: [0, 0.05, 1.8] } },
  { id: 'mcp', label: 'MCP / Tools', twinLabel: 'Actuator Control', color: palette.indigo, size: 0.15,
    p: { topology: [2.1, 0.2, -0.3], architecture: [1.5, -1.25, 0.7], twin: [2.1, 0.05, 0.4] } },
  { id: 'canvas', label: 'Canvas 2D', twinLabel: 'HUD Overlay', color: palette.cyan, size: 0.14,
    p: { topology: [-2.0, 0.3, 0.6], architecture: [-1.6, 1.25, -0.3], twin: [-2.1, 0.05, -0.4] } },
  { id: 'echarts', label: 'ECharts', twinLabel: 'Timeseries Telemetry', color: palette.amber, size: 0.14,
    p: { topology: [-0.9, 1.6, -0.5], architecture: [-0.6, 1.25, 0.8], twin: [-1.0, 0.05, 1.6] } },
  { id: 'sse', label: 'SSE / Stream', twinLabel: 'Sensor Telemetry Stream', color: palette.cyan, size: 0.13,
    p: { topology: [0.6, 1.5, 0.6], architecture: [0.6, 0.42, 0.7], twin: [1.0, 0.05, -1.6] } },
  { id: 'state', label: 'Pinia / Store', twinLabel: 'Device State Store', color: palette.amber, size: 0.13,
    p: { topology: [-0.6, -0.2, 1.4], architecture: [-0.7, 0.42, -0.5], twin: [-1.5, 0.05, 0] } },
  { id: 'mqtt', label: 'MQTT / TCP', twinLabel: 'Modbus / RS485 Bus', color: palette.emerald, size: 0.16,
    p: { topology: [-2.1, -1.1, 0.2], architecture: [-1.5, -0.42, 0.4], twin: [1.5, 0.05, 0] } },
]

// 拓扑连接定义
const EDGES_DEFINITION = [
  ['core', 'three'], ['core', 'ts'], ['core', 'ai'], ['core', 'iot'], ['core', 'webrtc'],
  ['core', 'state'], ['core', 'echarts'], ['three', 'canvas'], ['three', 'echarts'],
  ['ts', 'ai'], ['ts', 'sse'], ['ai', 'mcp'], ['ai', 'fastapi'],
  ['iot', 'mqtt'], ['iot', 'webrtc'], ['iot', 'fastapi'], ['webrtc', 'sse'],
  ['state', 'sse'], ['core', 'fastapi'],
]

// 制作 3D 文字标签
function createNodeLabel(text, colorHex) {
  const lCanvas = document.createElement('canvas')
  lCanvas.width = 256
  lCanvas.height = 96
  const ctx = lCanvas.getContext('2d')

  ctx.fillStyle = 'rgba(12, 16, 26, 0.82)'
  ctx.strokeStyle = colorHex
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(8, 8, 240, 80, 18)
  ctx.fill()
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 30px "SF Pro Display", system-ui, sans-serif'
  ctx.fillText(text, 128, 56)

  const texture = new THREE.CanvasTexture(lCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(spriteMat)
  return sprite
}

export function createSignalNetwork(canvas, { motionQuery } = {}) {
  const container = canvas.parentElement
  const isReducedMotion = motionQuery?.matches || false

  // 1. 初始化渲染器
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isReducedMotion,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
  camera.position.set(0, 0.25, 9.2)

  // 柔和环境光
  scene.add(new THREE.AmbientLight(0xffffff, 1.3))
  const dirLight = new THREE.DirectionalLight(0xe2e8f0, 2.5)
  dirLight.position.set(4, 6, 5)
  scene.add(dirLight)
  const rimLight = new THREE.DirectionalLight(palette.cyan, 1.8)
  rimLight.position.set(-5, -3, -4)
  scene.add(rimLight)

  const world = new THREE.Group()
  scene.add(world)

  // 2. 空间背景透视底网格与轨道
  const gridHelper = new THREE.GridHelper(8, 16, 0x38bdf8, 0x1e293b)
  gridHelper.position.y = -1.8
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.15
  gridHelper.material.depthWrite = false
  world.add(gridHelper)

  const orbitMat = new THREE.LineBasicMaterial({ color: palette.cyan, transparent: true, opacity: 0.12 })
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(
    new THREE.Path().absarc(0, 0, 2.6, 0, Math.PI * 2).getPoints(64)
  )
  const orbitRing = new THREE.Line(orbitGeo, orbitMat)
  orbitRing.rotation.x = Math.PI / 2 + 0.15
  world.add(orbitRing)

  // ==========================================
  // 【形态 2：分层架构专用的 4 层毛玻璃载体】
  // ==========================================
  const archGroup = new THREE.Group()
  world.add(archGroup)
  archGroup.visible = false

  const layerGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xebf4ff,
    transmission: 0.9,
    roughness: 0.12,
    thickness: 0.15,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  })
  ;[-1.25, -0.42, 0.42, 1.25].forEach(y => {
    const plane = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.02, 2.5), layerGlassMat)
    plane.position.y = y
    archGroup.add(plane)
  })

  // ==========================================
  // 【形态 3：IoT 数字孪生专用的工业级雷达与传感器中枢】
  // ==========================================
  const twinGroup = new THREE.Group()
  world.add(twinGroup)
  twinGroup.visible = false

  // 1. 中央全息雷达扫描台面 (Radar Telemetry Disk)
  const radarDiskGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.03, 48)
  const radarDiskMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f2a24,
    transmission: 0.7,
    roughness: 0.15,
    thickness: 0.2,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  const radarDisk = new THREE.Mesh(radarDiskGeo, radarDiskMat)
  radarDisk.position.y = 0.02
  twinGroup.add(radarDisk)

  // 雷达同心距离刻度环 (Sonar Concentric Rings)
  ;[0.8, 1.6, 2.4].forEach(r => {
    const rRingGeo = new THREE.RingGeometry(r, r + 0.02, 64)
    const rRingMat = new THREE.MeshBasicMaterial({ color: palette.emerald, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    const rRing = new THREE.Mesh(rRingGeo, rRingMat)
    rRing.rotation.x = -Math.PI / 2
    rRing.position.y = 0.04
    twinGroup.add(rRing)
  })

  // 2. 360 度动态雷达旋转扫描扇面 (Rotary Radar Sweep Beam)
  const sweepGeo = new THREE.CircleGeometry(2.5, 32, 0, Math.PI * 0.32)
  const sweepMat = new THREE.MeshBasicMaterial({
    color: palette.emerald,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const radarSweep = new THREE.Mesh(sweepGeo, sweepMat)
  radarSweep.rotation.x = -Math.PI / 2
  radarSweep.position.y = 0.045
  twinGroup.add(radarSweep)

  // 3. 周期性向外扩散的翠绿声纳脉冲波 (Sonar Ping Waves)
  const sonarWaves = []
  for (let i = 0; i < 2; i++) {
    const sMat = new THREE.MeshBasicMaterial({ color: palette.emerald, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
    const sMesh = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 48), sMat)
    sMesh.rotation.x = -Math.PI / 2
    sMesh.position.y = 0.048
    twinGroup.add(sMesh)
    sonarWaves.push({ mesh: sMesh, mat: sMat, offset: i * 0.5 })
  }

  // 4. 每个传感器节点的垂直激光定位光柱与地面信标圆环 (Vertical Drop Pin Lines)
  const dropLinesGroup = new THREE.Group()
  twinGroup.add(dropLinesGroup)
  const dropLineMat = new THREE.LineBasicMaterial({ color: palette.emerald, transparent: true, opacity: 0.4 })
  const pinRingMat = new THREE.MeshBasicMaterial({ color: palette.emerald, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  const pinRingGeo = new THREE.RingGeometry(0.08, 0.11, 16)

  // 5. 构建 3D 节点对象 (带有双模式标签与引线)
  const sphereGeo = new THREE.SphereGeometry(1, 24, 20)
  const nodes = NODES_DATA.map(data => {
    const colorHex = '#' + data.color.toString(16).padStart(6, '0')
    const mat = new THREE.MeshPhysicalMaterial({
      color: data.color,
      emissive: data.color,
      emissiveIntensity: 0.48,
      roughness: 0.16,
      metalness: 0.32,
      clearcoat: 0.85,
    })
    const mesh = new THREE.Mesh(sphereGeo, mat)
    const scale = data.size
    mesh.scale.set(scale, scale, scale)

    // 文字标签根据父级缩放自适应
    const normalLabel = createNodeLabel(data.label, colorHex)
    normalLabel.scale.set(0.55 / scale, 0.22 / scale, 1)
    normalLabel.position.set(0, 1.4, 0)
    mesh.add(normalLabel)

    const twinLabel = createNodeLabel(data.twinLabel, '#34d399')
    twinLabel.scale.set(0.58 / scale, 0.23 / scale, 1)
    twinLabel.position.set(0, 1.4, 0)
    twinLabel.visible = false
    mesh.add(twinLabel)

    // 传感器垂直投射线
    const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -1.8, 0),
    ])
    const dropLine = new THREE.Line(dropLineGeo, dropLineMat)
    dropLinesGroup.add(dropLine)

    // 地面定位信标环
    const pinRing = new THREE.Mesh(pinRingGeo, pinRingMat)
    pinRing.rotation.x = -Math.PI / 2
    pinRing.position.y = -1.8
    dropLinesGroup.add(pinRing)

    const currentPos = new THREE.Vector3(...data.p.topology)
    const targetPos = new THREE.Vector3(...data.p.topology)
    mesh.position.copy(currentPos)
    world.add(mesh)

    return {
      data,
      mesh,
      normalLabel,
      twinLabel,
      dropLine,
      pinRing,
      currentPos,
      targetPos,
      baseScale: scale,
    }
  })

  // 6. 构建拓扑连线与流光粒子系统
  const nodeMap = new Map(nodes.map(n => [n.data.id, n]))
  const edgePairs = EDGES_DEFINITION
    .map(([fromId, toId]) => [nodeMap.get(fromId), nodeMap.get(toId)])
    .filter(([a, b]) => a && b)

  const lineCount = edgePairs.length
  const linePositions = new Float32Array(lineCount * 6)
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  const lineMat = new THREE.LineBasicMaterial({
    color: palette.cyan,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  })
  const lineSegments = new THREE.LineSegments(lineGeo, lineMat)
  world.add(lineSegments)

  // 穿梭光子脉冲
  const pulseCount = lineCount * 2
  const pulsePositions = new Float32Array(pulseCount * 3)
  const pulseProgress = new Float32Array(pulseCount)
  const pulseSpeeds = new Float32Array(pulseCount)
  const pulseEdges = []

  for (let i = 0; i < pulseCount; i++) {
    pulseProgress[i] = Math.random()
    pulseSpeeds[i] = 0.2 + Math.random() * 0.4
    pulseEdges.push(edgePairs[i % lineCount])
  }

  const pulseGeo = new THREE.BufferGeometry()
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3))
  const pulseMat = new THREE.PointsMaterial({
    color: palette.cyan,
    size: 0.05,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const pulsePoints = new THREE.Points(pulseGeo, pulseMat)
  world.add(pulsePoints)

  // 7. 交互与状态控制
  let currentMode = 'topology'
  let running = false
  let paused = false
  let animId = 0

  const rotation = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  }

  const cameraPositions = {
    topology: new THREE.Vector3(0, 0.25, 9.2),
    architecture: new THREE.Vector3(0, 0.4, 8.8),
    twin: new THREE.Vector3(0, 2.5, 7.8),
  }
  const targetCamPos = cameraPositions.topology.clone()

  function setMode(mode) {
    if (!['topology', 'architecture', 'twin'].includes(mode)) return
    currentMode = mode

    // 联动调整相机的观察高度与俯仰视距
    if (cameraPositions[mode]) {
      targetCamPos.copy(cameraPositions[mode])
    }

    // 切换各专属实体的可见性
    archGroup.visible = mode === 'architecture'
    twinGroup.visible = mode === 'twin'
    orbitRing.visible = mode === 'topology'

    // 更新节点目标坐标与标签
    nodes.forEach(n => {
      const coords = n.data.p[mode] || n.data.p.topology
      n.targetPos.set(...coords)
      // 在 IoT 孪生模式下切换为设备物理遥测标签
      n.normalLabel.visible = mode !== 'twin'
      n.twinLabel.visible = mode === 'twin'
    })

    // 根据模式彻底转换连线与光子脉冲的主题色
    if (mode === 'twin') {
      lineMat.color.setHex(palette.emerald)
      pulseMat.color.setHex(palette.emerald)
      lineMat.opacity = 0.32
    } else if (mode === 'architecture') {
      lineMat.color.setHex(palette.indigo)
      pulseMat.color.setHex(palette.indigo)
      lineMat.opacity = 0.28
    } else {
      lineMat.color.setHex(palette.cyan)
      pulseMat.color.setHex(palette.cyan)
      lineMat.opacity = 0.22
    }
  }

  // 鼠标拖拽交互
  let isDragging = false
  let lastPointerX = 0
  let lastPointerY = 0

  function onPointerDown(e) {
    isDragging = true
    lastPointerX = e.clientX
    lastPointerY = e.clientY
    canvas.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!isDragging) return
    const dx = e.clientX - lastPointerX
    const dy = e.clientY - lastPointerY
    rotation.targetY += dx * 0.006
    rotation.targetX += dy * 0.005
    rotation.targetX = THREE.MathUtils.clamp(rotation.targetX, -0.6, 0.6)
    lastPointerX = e.clientX
    lastPointerY = e.clientY
  }

  function onPointerUp(e) {
    if (!isDragging) return
    isDragging = false
    try { canvas.releasePointerCapture(e.pointerId) } catch {}
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)

  function resize() {
    if (!container) return
    const rect = container.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function render(time = 0) {
    const sec = time * 0.001

    // 相机高度平滑插值跟进
    camera.position.lerp(targetCamPos, 0.06)
    camera.lookAt(0, currentMode === 'twin' ? 0.2 : 0, 0)

    // 旋转阻尼平滑跟进 + 缓速自转
    if (!isDragging) {
      rotation.targetY += 0.002
    }
    rotation.x += (rotation.targetX - rotation.x) * 0.08
    rotation.y += (rotation.targetY - rotation.y) * 0.08
    world.rotation.x = rotation.x
    world.rotation.y = rotation.y

    // 节点位置平滑过渡
    nodes.forEach(n => {
      n.currentPos.lerp(n.targetPos, 0.08)
      const hoverY = currentMode === 'twin' ? 0 : Math.sin(sec * 1.5 + n.currentPos.x * 2) * 0.02
      n.mesh.position.set(n.currentPos.x, n.currentPos.y + hoverY, n.currentPos.z)

      // 更新物联垂直落地点位光线
      if (currentMode === 'twin') {
        const lineAttr = n.dropLine.geometry.attributes.position
        lineAttr.setXYZ(0, n.mesh.position.x, n.mesh.position.y, n.mesh.position.z)
        lineAttr.setXYZ(1, n.mesh.position.x, -1.8, n.mesh.position.z)
        lineAttr.needsUpdate = true
        n.pinRing.position.set(n.mesh.position.x, -1.8, n.mesh.position.z)
      }
    })

    // IoT 孪生模式独有的雷达扫描动效与声纳波
    if (currentMode === 'twin') {
      radarSweep.rotation.z = sec * 1.8
      sonarWaves.forEach(w => {
        const prog = (sec * 0.6 + w.offset) % 1
        const scale = 0.5 + prog * 4.8
        w.mesh.scale.set(scale, scale, 1)
        w.mat.opacity = (1 - prog) * 0.45
      })
    }

    // 更新连线
    const posArr = lineGeo.attributes.position.array
    for (let i = 0; i < lineCount; i++) {
      const [nodeA, nodeB] = edgePairs[i]
      posArr[i * 6] = nodeA.mesh.position.x
      posArr[i * 6 + 1] = nodeA.mesh.position.y
      posArr[i * 6 + 2] = nodeA.mesh.position.z
      posArr[i * 6 + 3] = nodeB.mesh.position.x
      posArr[i * 6 + 4] = nodeB.mesh.position.y
      posArr[i * 6 + 5] = nodeB.mesh.position.z
    }
    lineGeo.attributes.position.needsUpdate = true

    // 更新流光脉冲
    const pulseArr = pulseGeo.attributes.position.array
    for (let i = 0; i < pulseCount; i++) {
      pulseProgress[i] = (pulseProgress[i] + pulseSpeeds[i] * 0.008) % 1
      const [nA, nB] = pulseEdges[i]
      const p = pulseProgress[i]
      pulseArr[i * 3] = nA.mesh.position.x + (nB.mesh.position.x - nA.mesh.position.x) * p
      pulseArr[i * 3 + 1] = nA.mesh.position.y + (nB.mesh.position.y - nA.mesh.position.y) * p
      pulseArr[i * 3 + 2] = nA.mesh.position.z + (nB.mesh.position.z - nA.mesh.position.z) * p
    }
    pulseGeo.attributes.position.needsUpdate = true

    renderer.render(scene, camera)
  }

  function loop(time) {
    if (!running) return
    if (!paused) render(time)
    animId = window.requestAnimationFrame(loop)
  }

  function start() {
    if (running) return
    running = true
    window.addEventListener('resize', resize)
    resize()
    document.body.classList.add('network-ready')
    if (isReducedMotion) {
      render(0)
    } else {
      animId = window.requestAnimationFrame(loop)
    }
  }

  function stop() {
    running = false
    window.cancelAnimationFrame(animId)
    window.removeEventListener('resize', resize)
  }

  function destroy() {
    stop()
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
    renderer.dispose()
  }

  return {
    start,
    destroy,
    select: setMode,
    setPaused(val) { paused = Boolean(val) },
  }
}
