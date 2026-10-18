import * as THREE from './vendor/three.module.min.js'

const canvas = document.querySelector('#station-canvas')
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
const fallbackTitle = document.querySelector('.fallback-card strong')

// --- Linear / Apple 顶级质感色板 ---
const theme = {
  bg: 0x090a0f,
  bgDeep: 0x050608,
  titaniumDark: 0x11131a,
  titaniumMid: 0x1c202c,
  titaniumEdge: 0x3b4254,
  titaniumSilver: 0x818cf8,
  metalHighlight: 0xcfd8dc,
  glassFrost: 0xe2e8f0,
  accentCyan: 0x38bdf8,
  accentIndigo: 0x818cf8,
  accentEmerald: 0x34d399,
  accentAmber: 0xfbbf24,
  pureWhite: 0xffffff,
}

// 统一物理材质工厂
function createMetalMaterial(color, roughness = 0.28, metalness = 0.88) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  })
}

// 苹果级物理毛玻璃材质
function createFrostedGlassMaterial({
  color = theme.glassFrost,
  roughness = 0.14,
  transmission = 0.88,
  thickness = 0.45,
  ior = 1.52,
  clearcoat = 1.0,
  clearcoatRoughness = 0.08,
  opacity = 0.85,
} = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    transmission,
    thickness,
    ior,
    clearcoat,
    clearcoatRoughness,
    transparent: true,
    opacity,
    specularIntensity: 1.0,
    depthWrite: false,
  })
}

function createGlowMaterial(color, opacity = 0.85) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    toneMapped: false,
  })
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

// 高保真毛玻璃 HUD 铭牌生成器
function createGlassBadge(title, subtext = '', accentHex = '#38bdf8') {
  const bCanvas = document.createElement('canvas')
  bCanvas.width = 512
  bCanvas.height = 192
  const ctx = bCanvas.getContext('2d')

  // 背景半透明暗夜毛玻璃渐变
  const grad = ctx.createLinearGradient(0, 0, 0, 192)
  grad.addColorStop(0, 'rgba(24, 28, 40, 0.72)')
  grad.addColorStop(1, 'rgba(10, 12, 18, 0.86)')
  ctx.fillStyle = grad
  roundedRect(ctx, 8, 8, 496, 176, 26)
  ctx.fill()

  // 极细外发光钛金线框
  ctx.strokeStyle = accentHex
  ctx.lineWidth = 2.2
  ctx.shadowColor = accentHex
  ctx.shadowBlur = 8
  ctx.stroke()
  ctx.shadowBlur = 0

  // 状态小圆点
  ctx.fillStyle = accentHex
  ctx.beginPath()
  ctx.arc(44, 52, 4.5, 0, Math.PI * 2)
  ctx.fill()

  // 标题文字
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
  ctx.fillText(title, 64, 64)

  // 副标题
  if (subtext) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 20px "SF Mono", "JetBrains Mono", Consolas, monospace'
    ctx.fillText(subtext, 44, 124)
  }

  const texture = new THREE.CanvasTexture(bCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.92,
  })
  const sprite = new THREE.Sprite(spriteMat)
  sprite.scale.set(1.7, 0.64, 1)
  return sprite
}

// 全息操作台曲面屏幕纹理
function createHoloScreenTexture() {
  const sCanvas = document.createElement('canvas')
  sCanvas.width = 1024
  sCanvas.height = 512
  const ctx = sCanvas.getContext('2d')

  ctx.fillStyle = 'rgba(6, 10, 18, 0.7)'
  ctx.fillRect(0, 0, 1024, 512)

  // 顶部极客工具栏
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(32, 54)
  ctx.lineTo(992, 54)
  ctx.stroke()

  ctx.fillStyle = '#38bdf8'
  ctx.font = '600 22px "SF Mono", "JetBrains Mono", monospace'
  ctx.fillText('LEWCHAW // SIGNAL TERMINAL v3.0', 36, 40)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#34d399'
  ctx.fillText('● SYSTEM ONLINE', 988, 40)

  // 动态数据波形
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (let x = 36; x < 580; x += 4) {
    const y = 200 + Math.sin(x * 0.045) * 42 + Math.cos(x * 0.1) * 20
    if (x === 36) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // 遥测性能指标
  ctx.textAlign = 'left'
  ctx.font = '500 18px "SF Mono", monospace'
  const metrics = [
    'FPS: 60.0 [PBR PIPELINE]',
    'LATENCY: 12ms STABLE',
    'GRAPH: AST_CONNECTED',
    'SHADERS: COMPILED_OK',
    'AI CORES: 4 NODES SYNC',
  ]
  metrics.forEach((txt, idx) => {
    ctx.fillStyle = idx === 0 ? '#38bdf8' : 'rgba(255, 255, 255, 0.75)'
    ctx.fillText(`> ${txt}`, 620, 120 + idx * 36)
  })

  // 底部代码流
  ctx.fillStyle = '#64748b'
  ctx.font = '400 16px "SF Mono", monospace'
  ctx.fillText('const signal = new SignalTerminal({ studio: "Zhengzhou", aesthetic: "Linear/Apple" });', 36, 430)
  ctx.fillText('await signal.mount(); // Rendering real-time physical diorama', 36, 464)

  const texture = new THREE.CanvasTexture(sCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 柔和接触阴影底盘 (Contact Shadow Platter)
function createContactShadow() {
  const sCanvas = document.createElement('canvas')
  sCanvas.width = 256
  sCanvas.height = 256
  const ctx = sCanvas.getContext('2d')
  const grad = ctx.createRadialGradient(128, 128, 24, 128, 128, 122)
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)')
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.38)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(sCanvas)
  const geo = new THREE.PlaneGeometry(16, 16)
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = -2.18
  return mesh
}

// 1. 悬浮精密数控钛合金多面体基座与毛玻璃光盘台面
function createSuspendedChassis(world) {
  const group = new THREE.Group()
  world.add(group)

  const darkTitanium = createMetalMaterial(theme.titaniumDark, 0.35, 0.85)
  const midTitanium = createMetalMaterial(theme.titaniumMid, 0.25, 0.9)
  const edgeMetal = createMetalMaterial(theme.titaniumEdge, 0.18, 0.92)
  const silverBezel = createMetalMaterial(theme.metalHighlight, 0.12, 0.95)

  // 下层 CNC 切角金属底座 (八边形厚基台)
  const baseGeo = new THREE.CylinderGeometry(5.4, 4.6, 0.72, 8)
  addMesh(group, baseGeo, darkTitanium, [0, -0.38, 0], [0, Math.PI / 8, 0])

  // 中层数控倒角金属环
  const collarGeo = new THREE.CylinderGeometry(5.62, 5.42, 0.18, 8)
  addMesh(group, collarGeo, edgeMetal, [0, 0.04, 0], [0, Math.PI / 8, 0])

  // 内部光纤凹槽与微型电路走线
  const circuitGroup = new THREE.Group()
  circuitGroup.position.set(0, 0.14, 0)
  group.add(circuitGroup)

  const cyanMat = createGlowMaterial(theme.accentCyan, 0.55)
  const indigoMat = createGlowMaterial(theme.accentIndigo, 0.5)

  // 环形同心能量导轨
  ;[1.6, 2.8, 4.2].forEach((radius, idx) => {
    const ringGeo = new THREE.RingGeometry(radius, radius + 0.024, 64)
    const ringMesh = new THREE.Mesh(ringGeo, idx % 2 === 0 ? cyanMat : indigoMat)
    ringMesh.rotation.x = -Math.PI / 2
    circuitGroup.add(ringMesh)
  })

  // 密集精密刻度线 (Apple Watch 风格激光蚀刻)
  for (let i = 0; i < 48; i++) {
    const angle = (i * Math.PI * 2) / 48
    const isMajor = i % 6 === 0
    const len = isMajor ? 0.35 : 0.16
    const tickGeo = new THREE.BoxGeometry(0.018, 0.005, len)
    const tick = new THREE.Mesh(tickGeo, isMajor ? cyanMat : indigoMat)
    const r = 4.2
    tick.position.set(Math.cos(angle) * r, 0.002, Math.sin(angle) * r)
    tick.rotation.y = -angle
    circuitGroup.add(tick)
  }

  // 8条主干放射状电路
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8
    const rGeo = new THREE.BoxGeometry(2.3, 0.005, 0.03)
    const line = new THREE.Mesh(rGeo, cyanMat)
    line.position.set(Math.cos(angle) * 2.9, 0.002, Math.sin(angle) * 2.9)
    line.rotation.y = -angle
    circuitGroup.add(line)
  }

  // 表面：整块大尺寸 Apple 物理毛玻璃操作台面 (Physical Frosted Glass Platter)
  const glassPlatterMat = createFrostedGlassMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    transmission: 0.88,
    thickness: 0.75,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  })
  const glassTopGeo = new THREE.CylinderGeometry(5.5, 5.5, 0.14, 8)
  const glassTop = addMesh(group, glassTopGeo, glassPlatterMat, [0, 0.22, 0], [0, Math.PI / 8, 0])
  glassTop.castShadow = false

  // 台面边缘细致金属保护圈 (Beveled Outer Bezel)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8
    const len = 4.28
    const edge = addMesh(group, new THREE.BoxGeometry(len, 0.045, 0.045), silverBezel, [
      Math.cos(angle) * 5.12,
      0.28,
      Math.sin(angle) * 5.12,
    ])
    edge.rotation.y = -angle + Math.PI / 2
  }

  return group
}

// 2. 极客数字温室与全息工作台 (包含人体工学椅与桌面微物件)
function createTerminalStudio(world) {
  const studio = new THREE.Group()
  studio.position.set(-0.85, 0.28, -0.25)
  world.add(studio)

  const silver = createMetalMaterial(theme.metalHighlight, 0.14, 0.94)
  const darkMetal = createMetalMaterial(theme.titaniumDark, 0.28, 0.86)
  const midMetal = createMetalMaterial(theme.titaniumMid, 0.22, 0.9)
  const frostedGlass = createFrostedGlassMaterial({
    color: 0xebf4ff,
    transmission: 0.88,
    roughness: 0.1,
    thickness: 0.38,
    clearcoat: 0.98,
  })

  // 四根极简钛金主立柱
  const postGeo = new THREE.CylinderGeometry(0.038, 0.038, 2.2, 16)
  const posts = [
    [-2.2, 1.1, -1.2],
    [1.8, 1.1, -1.2],
    [-2.2, 1.1, 1.4],
    [1.8, 1.1, 1.4],
  ]
  posts.forEach(pos => addMesh(studio, postGeo, silver, pos))

  // 横梁骨架
  addMesh(studio, new THREE.BoxGeometry(4.08, 0.045, 0.05), midMetal, [-0.2, 2.2, -1.2])
  addMesh(studio, new THREE.BoxGeometry(4.08, 0.045, 0.05), midMetal, [-0.2, 2.2, 1.4])
  addMesh(studio, new THREE.BoxGeometry(0.05, 0.045, 2.66), midMetal, [-2.2, 2.2, 0.1])
  addMesh(studio, new THREE.BoxGeometry(0.05, 0.045, 2.66), midMetal, [1.8, 2.2, 0.1])

  // 后方与左侧悬浮毛玻璃立面幕墙
  addMesh(studio, new THREE.BoxGeometry(3.96, 2.05, 0.035), frostedGlass, [-0.2, 1.12, -1.18])
  addMesh(studio, new THREE.BoxGeometry(0.035, 2.05, 2.54), frostedGlass, [-2.18, 1.12, 0.1])

  // 顶部悬挑天幕：采用 Apple Park 级通透毛玻璃天窗 (Ultra-clear Glass Skylight Canopy)
  const roofGlass = createFrostedGlassMaterial({
    color: 0xf1f5f9,
    transmission: 0.92,
    roughness: 0.08,
    thickness: 0.25,
    clearcoat: 1.0,
  })
  addMesh(studio, new THREE.BoxGeometry(4.35, 0.04, 2.95), roofGlass, [-0.2, 2.26, 0.1])
  // 极细天窗钛金边框与支撑肋条
  addMesh(studio, new THREE.BoxGeometry(4.38, 0.05, 0.05), silver, [-0.2, 2.26, -1.37])
  addMesh(studio, new THREE.BoxGeometry(4.38, 0.05, 0.05), silver, [-0.2, 2.26, 1.57])
  addMesh(studio, new THREE.BoxGeometry(0.05, 0.05, 2.95), silver, [-2.37, 2.26, 0.1])
  addMesh(studio, new THREE.BoxGeometry(0.05, 0.05, 2.95), silver, [1.97, 2.26, 0.1])
  for (let i = -1.5; i <= 1.2; i += 0.9) {
    addMesh(studio, new THREE.BoxGeometry(0.025, 0.03, 2.9), silver, [i, 2.26, 0.1])
  }
  const roofLipMat = createGlowMaterial(theme.accentCyan, 0.65)
  addMesh(studio, new THREE.BoxGeometry(4.38, 0.015, 0.02), roofLipMat, [-0.2, 2.24, 1.58])

  // 悬浮全息曲面 HUD 屏幕
  const holoTexture = createHoloScreenTexture()
  const holoMat = new THREE.MeshBasicMaterial({
    map: holoTexture,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const holoGeo = new THREE.CylinderGeometry(2.1, 2.1, 1.15, 32, 1, true, -Math.PI * 0.24, Math.PI * 0.48)
  const holoScreen = new THREE.Mesh(holoGeo, holoMat)
  holoScreen.position.set(-0.25, 1.2, 0.35)
  holoScreen.rotation.y = Math.PI
  studio.add(holoScreen)

  // 极简毛玻璃悬浮桌台
  const deskGlass = createFrostedGlassMaterial({ thickness: 0.28, roughness: 0.08, transmission: 0.92 })
  addMesh(studio, new THREE.BoxGeometry(2.6, 0.055, 0.85), deskGlass, [-0.25, 0.72, 0.2])
  // 金属支脚
  addMesh(studio, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 12), silver, [-1.45, 0.35, 0.2])
  addMesh(studio, new THREE.CylinderGeometry(0.03, 0.03, 0.7, 12), silver, [0.95, 0.35, 0.2])

  // --- 桌面高阶微缩道具 (MacBook, Coffee Mug, Touchpad) ---
  const deskItems = new THREE.Group()
  deskItems.position.set(-0.25, 0.75, 0.2)
  studio.add(deskItems)

  // 1. 深空灰 MacBook 电脑 (带微发光屏幕)
  const mbBase = addMesh(deskItems, new THREE.BoxGeometry(0.42, 0.015, 0.28), midMetal, [-0.45, 0.01, 0])
  const mbScreen = addMesh(deskItems, new THREE.BoxGeometry(0.42, 0.28, 0.012), midMetal, [-0.45, 0.14, -0.14], [-0.24, 0, 0])
  addMesh(mbScreen, new THREE.BoxGeometry(0.39, 0.25, 0.002), createGlowMaterial(theme.accentCyan, 0.8), [0, 0, 0.008])

  // 2. 极简白陶瓷马克咖啡杯 (带杯把)
  const ceramicMat = createMetalMaterial(0xf8fafc, 0.15, 0.05)
  const mug = addMesh(deskItems, new THREE.CylinderGeometry(0.045, 0.04, 0.09, 16), ceramicMat, [0.42, 0.045, 0.08])
  // 咖啡把手
  const handleGeo = new THREE.TorusGeometry(0.024, 0.007, 6, 12, Math.PI)
  const mugHandle = new THREE.Mesh(handleGeo, ceramicMat)
  mugHandle.position.set(0.42, 0.045, 0.125)
  mugHandle.rotation.y = Math.PI / 2
  deskItems.add(mugHandle)
  // 咖啡表面深色液体
  addMesh(deskItems, new THREE.CylinderGeometry(0.038, 0.038, 0.005, 12), createMetalMaterial(0x3e2723, 0.2, 0.1), [0.42, 0.082, 0.08])

  // 3. 悬浮触控板与手写笔
  addMesh(deskItems, new THREE.BoxGeometry(0.24, 0.008, 0.18), darkMetal, [0.05, 0.006, 0.05])
  addMesh(deskItems, new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8), silver, [0.22, 0.008, 0.06], [0, 0, Math.PI / 2])

  // --- 人体工学转椅 (Herman Miller Aeron 风格) ---
  const chair = new THREE.Group()
  chair.position.set(-0.25, 0, 1.05)
  studio.add(chair)
  // 五星轮爪
  for (let i = 0; i < 5; i++) {
    const ang = (i * Math.PI * 2) / 5
    const arm = addMesh(chair, new THREE.BoxGeometry(0.32, 0.02, 0.025), silver, [Math.cos(ang) * 0.16, 0.06, Math.sin(ang) * 0.16])
    arm.rotation.y = -ang
  }
  // 气压支撑中轴
  addMesh(chair, new THREE.CylinderGeometry(0.025, 0.03, 0.38, 12), silver, [0, 0.24, 0])
  // 坐垫
  addMesh(chair, new THREE.BoxGeometry(0.46, 0.05, 0.44), darkMetal, [0, 0.44, 0])
  // 镂空透气网背
  const backMat = createFrostedGlassMaterial({ color: 0x334155, roughness: 0.3, transmission: 0.6 })
  addMesh(chair, new THREE.BoxGeometry(0.44, 0.52, 0.04), backMat, [0, 0.72, 0.2], [-0.12, 0, 0])
  // 左右扶手
  ;[-0.24, 0.24].forEach(x => {
    addMesh(chair, new THREE.CylinderGeometry(0.015, 0.015, 0.24, 8), silver, [x, 0.56, 0.05])
    addMesh(chair, new THREE.BoxGeometry(0.045, 0.02, 0.28), darkMetal, [x, 0.68, 0.05])
  })

  // 服务器机柜微模块
  const serverMat = createMetalMaterial(0x10131c, 0.3, 0.85)
  addMesh(studio, new THREE.BoxGeometry(0.68, 1.4, 0.52), serverMat, [1.32, 0.7, -0.65])
  // 服务器呼吸指示灯条
  const blinkLeds = []
  for (let i = 0; i < 7; i++) {
    const ledColor = i % 3 === 0 ? theme.accentEmerald : (i % 2 === 0 ? theme.accentCyan : theme.accentIndigo)
    const ledMat = createGlowMaterial(ledColor, 0.8)
    const led = addMesh(studio, new THREE.BoxGeometry(0.48, 0.025, 0.02), ledMat, [1.32, 0.28 + i * 0.16, -0.38])
    blinkLeds.push({ mesh: led, mat: ledMat, speed: 2.2 + i * 1.1, phase: i * 0.8 })
  }

  // 顶部天顶柔和线形光槽
  const lightStripMat = createGlowMaterial(0xffffff, 0.85)
  addMesh(studio, new THREE.BoxGeometry(2.8, 0.02, 0.04), lightStripMat, [-0.25, 2.22, 0.2])

  return { studio, blinkLeds }
}

// 3. 量子相控阵信号塔
function createSignalTower(world) {
  const tower = new THREE.Group()
  tower.position.set(3.4, 0.24, -1.8)
  world.add(tower)

  const titanium = createMetalMaterial(theme.titaniumDark, 0.25, 0.88)
  const silver = createMetalMaterial(theme.metalHighlight, 0.15, 0.94)

  // 三棱锥镂空主框架
  const strutGeo = new THREE.CylinderGeometry(0.032, 0.048, 3.5, 12)
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3
    const radius = 0.56
    const strut = addMesh(tower, strutGeo, silver, [
      Math.cos(angle) * (radius * 0.5),
      1.75,
      Math.sin(angle) * (radius * 0.5),
    ])
    strut.rotation.x = Math.sin(angle) * 0.055
    strut.rotation.z = -Math.cos(angle) * 0.055
  }

  // 水平加固环
  ;[0.85, 1.85, 2.85].forEach(y => {
    addMesh(tower, new THREE.TorusGeometry(0.36 - y * 0.05, 0.02, 8, 32), titanium, [0, y, 0], [Math.PI / 2, 0, 0])
  })

  // 塔顶悬浮量子正八面体晶体核心
  const coreGroup = new THREE.Group()
  coreGroup.position.set(0, 3.65, 0)
  tower.add(coreGroup)

  const octaGeo = new THREE.OctahedronGeometry(0.25, 0)
  const octaMat = new THREE.MeshPhysicalMaterial({
    color: theme.accentCyan,
    emissive: theme.accentCyan,
    emissiveIntensity: 0.75,
    roughness: 0.08,
    transmission: 0.65,
    thickness: 0.5,
    clearcoat: 1.0,
  })
  const crystal = new THREE.Mesh(octaGeo, octaMat)
  coreGroup.add(crystal)

  // 双陀螺光环
  const ring1 = addMesh(coreGroup, new THREE.TorusGeometry(0.44, 0.012, 8, 64), createGlowMaterial(theme.accentCyan, 0.75))
  const ring2 = addMesh(coreGroup, new THREE.TorusGeometry(0.54, 0.012, 8, 64), createGlowMaterial(theme.accentIndigo, 0.65))

  // 塔尖发射针与微型脉冲光球
  addMesh(tower, new THREE.CylinderGeometry(0.012, 0.028, 1.25, 8), silver, [0, 4.4, 0])
  addMesh(tower, new THREE.SphereGeometry(0.045, 16, 12), createGlowMaterial(theme.accentCyan, 0.95), [0, 5.02, 0])

  // 向上周期性膨胀扩散的脉冲波纹
  const waveRings = []
  for (let i = 0; i < 3; i++) {
    const waveMat = createGlowMaterial(theme.accentCyan, 0.4)
    const waveMesh = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 48), waveMat)
    waveMesh.rotation.x = -Math.PI / 2
    waveMesh.position.y = 5.02
    tower.add(waveMesh)
    waveRings.push({ mesh: waveMesh, mat: waveMat, offset: i * 0.33 })
  }

  return { tower, coreGroup, ring1, ring2, crystal, waveRings }
}

// 4. 自主巡检微型无人机
function createInspectorDrone(world) {
  const drone = new THREE.Group()
  drone.position.set(-1.8, 2.6, 2.2)
  world.add(drone)

  const carbon = createMetalMaterial(0x161822, 0.22, 0.8)
  const titanium = createMetalMaterial(theme.metalHighlight, 0.15, 0.95)

  // 流线型机身
  addMesh(drone, new THREE.CylinderGeometry(0.18, 0.22, 0.12, 16), carbon, [0, 0, 0])

  // 顶部球形全向传感器
  const domeMat = createFrostedGlassMaterial({ color: 0x38bdf8, roughness: 0.1, transmission: 0.75 })
  addMesh(drone, new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat, [0, 0.06, 0])

  // 底部扫描头与光眼
  addMesh(drone, new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12), titanium, [0, -0.08, 0])
  addMesh(drone, new THREE.SphereGeometry(0.045, 12, 12), createGlowMaterial(theme.accentCyan, 0.9), [0, -0.1, 0])

  // 四轴旋翼
  const rotors = []
  const armLen = 0.38
  const angles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]
  angles.forEach(ang => {
    const arm = addMesh(drone, new THREE.CylinderGeometry(0.015, 0.015, armLen, 8), titanium, [
      Math.cos(ang) * (armLen * 0.5),
      0,
      Math.sin(ang) * (armLen * 0.5),
    ])
    arm.rotation.y = -ang + Math.PI / 2
    arm.rotation.z = Math.PI / 2

    addMesh(drone, new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), carbon, [
      Math.cos(ang) * armLen,
      0.02,
      Math.sin(ang) * armLen,
    ])

    const bladeGeo = new THREE.BoxGeometry(0.24, 0.005, 0.025)
    const bladeMat = createGlowMaterial(theme.accentCyan, 0.4)
    const blade = addMesh(drone, bladeGeo, bladeMat, [
      Math.cos(ang) * armLen,
      0.05,
      Math.sin(ang) * armLen,
    ])
    rotors.push(blade)
  })

  // 底部下视扫描光锥
  const coneGeo = new THREE.ConeGeometry(0.75, 2.0, 24, 1, true)
  const coneMat = new THREE.MeshBasicMaterial({
    color: theme.accentCyan,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const scanCone = new THREE.Mesh(coneGeo, coneMat)
  scanCone.position.set(0, -1.05, 0)
  drone.add(scanCone)

  return { drone, rotors }
}

// 5. 极客数字工程师剪影 (带有微侧姿态与操作光感)
function createArchitectFigure(world) {
  const person = new THREE.Group()
  person.position.set(-0.8, 0.28, 0.75)
  // 微侧站姿面向全息曲面屏
  person.rotation.y = Math.PI * 0.92
  person.scale.set(0.95, 0.95, 0.95)
  world.add(person)

  const coatMat = createMetalMaterial(0x181b24, 0.65, 0.18)
  const pantMat = createMetalMaterial(0x11131a, 0.75, 0.12)
  const shoeMat = createMetalMaterial(0x0a0c10, 0.5, 0.2)
  const skinMat = createMetalMaterial(0xd8b49a, 0.45, 0.1)
  const headphoneMat = createMetalMaterial(theme.metalHighlight, 0.18, 0.95)
  const glowBand = createGlowMaterial(theme.accentCyan, 0.85)

  // 身体与立领风衣
  addMesh(person, new THREE.CapsuleGeometry(0.19, 0.52, 8, 16), coatMat, [0, 0.76, 0])
  addMesh(person, new THREE.CylinderGeometry(0.09, 0.11, 0.09, 14), coatMat, [0, 1.05, 0])
  addMesh(person, new THREE.SphereGeometry(0.18, 20, 16), skinMat, [0, 1.22, 0])

  // 发型
  const hair = addMesh(person, new THREE.SphereGeometry(0.185, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), coatMat, [0, 1.25, 0], [0.1, 0, 0])
  hair.scale.set(1.02, 0.8, 1.02)

  // 钛金轻量头戴耳机
  const band = addMesh(person, new THREE.TorusGeometry(0.195, 0.015, 8, 24, Math.PI), headphoneMat, [0, 1.25, 0])
  band.rotation.z = Math.PI / 2
  addMesh(person, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), headphoneMat, [-0.19, 1.22, 0], [0, 0, Math.PI / 2])
  addMesh(person, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), headphoneMat, [0.19, 1.22, 0], [0, 0, Math.PI / 2])

  // 双臂：右手前伸做浮空全息交互，左手自然下垂
  addMesh(person, new THREE.CapsuleGeometry(0.05, 0.36, 6, 10), coatMat, [-0.22, 0.72, 0.06], [0.2, 0, 0.15])
  addMesh(person, new THREE.CapsuleGeometry(0.05, 0.36, 6, 10), coatMat, [0.22, 0.8, 0.18], [0.75, 0, -0.22])

  // 右手指尖微型全息触控光晕
  addMesh(person, new THREE.SphereGeometry(0.024, 8, 8), glowBand, [0.28, 0.65, 0.34])
  addMesh(person, new THREE.TorusGeometry(0.052, 0.008, 6, 16), glowBand, [0.28, 0.62, 0.28], [Math.PI / 4, 0, 0])

  // 双腿与鞋
  addMesh(person, new THREE.CapsuleGeometry(0.065, 0.44, 6, 10), pantMat, [-0.1, 0.28, 0])
  addMesh(person, new THREE.CapsuleGeometry(0.065, 0.44, 6, 10), pantMat, [0.1, 0.28, 0])
  addMesh(person, new THREE.BoxGeometry(0.15, 0.08, 0.24), shoeMat, [-0.1, 0.04, 0.04])
  addMesh(person, new THREE.BoxGeometry(0.15, 0.08, 0.24), shoeMat, [0.1, 0.04, 0.04])

  return person
}

// 6. 悬浮数据传送铭牌 (放置在左侧翼，高低错落，极具空间层次)
function createFloatingPortals(world) {
  const group = new THREE.Group()
  group.position.set(-4.6, 1.3, 0.4)
  world.add(group)

  const badges = [
    { title: 'PORTFOLIO', desc: 'SYSTEM & 3D WORK', accent: '#38bdf8', y: 0.85, z: -0.8 },
    { title: 'RESEARCH', desc: 'AI & GRAPH LAB', accent: '#818cf8', y: 0.05, z: 0.2 },
    { title: 'GITHUB', desc: 'OPEN SOURCE / CORE', accent: '#34d399', y: -0.75, z: -0.5 },
  ]

  const badgeMeshes = []
  badges.forEach((item, index) => {
    const badge = createGlassBadge(item.title, item.desc, item.accent)
    badge.scale.set(1.3, 0.48, 1)
    badge.position.set(0, item.y, item.z)
    group.add(badge)
    badgeMeshes.push({ sprite: badge, baseY: item.y, speed: 1.2 + index * 0.25, offset: index * 1.5 })
  })

  // 站标主铭牌：悬浮在基座前方左上侧，优雅不挡视线
  const mainStationSign = createGlassBadge('LEWCHAW', 'SIGNAL FIELD TERMINAL // 001', '#38bdf8')
  mainStationSign.position.set(-1.8, 3.6, 1.2)
  mainStationSign.scale.set(1.4, 0.52, 1)
  world.add(mainStationSign)

  return { portalGroup: group, badgeMeshes, mainSign: mainStationSign }
}

// 7. 空间流光与悬浮数据微光子
function createDataPhotons(scene) {
  const count = 380
  const positions = new Float32Array(count * 3)
  const initialY = new Float32Array(count)
  const speeds = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const radius = 2.0 + Math.random() * 8.5
    const theta = Math.random() * Math.PI * 2
    positions[i * 3] = Math.cos(theta) * radius
    initialY[i] = -0.5 + Math.random() * 6.5
    positions[i * 3 + 1] = initialY[i]
    positions[i * 3 + 2] = Math.sin(theta) * radius
    speeds[i] = 0.25 + Math.random() * 0.65
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color: theme.accentCyan,
    size: 0.04,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geometry, material)
  scene.add(points)
  return { points, positions, initialY, speeds, count }
}

// 渲染器创建
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
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  return renderer
}

// 电影级 Apple / Linear 灯光系统
function setupLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xe2e8f0, 0x090a0f, 1.4)
  scene.add(hemi)

  const keyLight = new THREE.DirectionalLight(0xf8fafc, 2.8)
  keyLight.position.set(-5, 9, 7)
  keyLight.castShadow = true
  const shadowResolution = motionQuery.matches ? 1024 : 2048
  keyLight.shadow.mapSize.set(shadowResolution, shadowResolution)
  keyLight.shadow.bias = -0.00015
  keyLight.shadow.camera.near = 1
  keyLight.shadow.camera.far = 30
  keyLight.shadow.camera.left = -8
  keyLight.shadow.camera.right = 8
  keyLight.shadow.camera.top = 8
  keyLight.shadow.camera.bottom = -8
  scene.add(keyLight)

  const rimLight = new THREE.DirectionalLight(theme.accentCyan, 1.9)
  rimLight.position.set(6, 4, -6)
  scene.add(rimLight)

  const fillLight = new THREE.PointLight(theme.accentIndigo, 3.2, 12, 1.6)
  fillLight.position.set(2.4, 2.8, 3.2)
  scene.add(fillLight)

  const deskLight = new THREE.PointLight(theme.accentCyan, 2.8, 6, 2.0)
  deskLight.position.set(-1.0, 1.5, 0.4)
  scene.add(deskLight)
}

function buildStationWorld(scene) {
  const world = new THREE.Group()
  scene.add(world)

  world.add(createContactShadow())

  const chassis = createSuspendedChassis(world)
  const studioData = createTerminalStudio(world)
  const towerData = createSignalTower(world)
  const droneData = createInspectorDrone(world)
  const person = createArchitectFigure(world)
  const portalData = createFloatingPortals(world)
  const photonData = createDataPhotons(scene)

  return {
    world,
    chassis,
    studioData,
    towerData,
    droneData,
    person,
    portalData,
    photonData,
  }
}

function createSceneContext() {
  const renderer = createRenderer()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(theme.bg)
  scene.fog = new THREE.FogExp2(theme.bg, 0.024)

  setupLighting(scene)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
  const rig = {
    target: new THREE.Vector3(-0.2, 1.15, 0),
    theta: 0.55,
    phi: 1.25,
    radius: 15.0,
    targetTheta: 0.55,
    targetPhi: 1.25,
    targetRadius: 15.0,
  }

  const worldComponents = buildStationWorld(scene)

  return {
    renderer,
    scene,
    camera,
    rig,
    ...worldComponents,
  }
}

function updateCamera(context, lerp = false) {
  const { camera, rig } = context

  if (lerp) {
    rig.theta += (rig.targetTheta - rig.theta) * 0.12
    rig.phi += (rig.targetPhi - rig.phi) * 0.12
    rig.radius += (rig.targetRadius - rig.radius) * 0.12
  } else {
    rig.theta = rig.targetTheta
    rig.phi = rig.targetPhi
    rig.radius = rig.targetRadius
  }

  rig.phi = THREE.MathUtils.clamp(rig.phi, 0.35, 1.42)
  rig.radius = THREE.MathUtils.clamp(rig.radius, 6.5, 24.0)

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
  const aspect = width / height
  context.camera.aspect = aspect
  context.camera.updateProjectionMatrix()

  // 宽屏/桌面端自动向右偏移，为左侧文字预留充足呼吸留白
  const offsetX = aspect > 1.25 ? Math.min(2.1, (aspect - 1.1) * 1.5) : 0
  context.world.position.x = offsetX
  context.rig.target.x = offsetX - 0.2

  updateCamera(context, false)
  context.renderer.render(context.scene, context.camera)
}

function renderStation(context, time = 0) {
  const sec = time * 0.001

  // 1. 基座空间呼吸
  context.world.position.y = Math.sin(sec * 0.8) * 0.05

  // 2. 塔身与核心量子晶体旋转
  const { towerData } = context
  if (towerData) {
    towerData.coreGroup.rotation.y = sec * 0.45
    towerData.crystal.rotation.x = sec * 0.8
    towerData.crystal.rotation.z = sec * 0.6
    towerData.ring1.rotation.x = sec * 1.2
    towerData.ring1.rotation.y = sec * 0.8
    towerData.ring2.rotation.y = -sec * 1.0
    towerData.ring2.rotation.z = sec * 0.7

    towerData.waveRings.forEach(w => {
      const progress = (sec * 0.5 + w.offset) % 1
      const scale = 1 + progress * 5.5
      w.mesh.scale.set(scale, scale, 1)
      w.mesh.position.y = 5.02 + progress * 0.8
      w.mat.opacity = (1 - progress) * 0.5
    })
  }

  // 3. 巡检无人机三维闭合航线巡航
  const { droneData } = context
  if (droneData) {
    droneData.rotors.forEach((r, idx) => {
      r.rotation.y = sec * (idx % 2 === 0 ? 32 : -32)
    })
    const droneAngle = sec * 0.38
    const targetX = Math.cos(droneAngle) * 3.8 - 0.4
    const targetZ = Math.sin(droneAngle * 2) * 1.9 + 0.3
    const targetY = 2.45 + Math.sin(sec * 1.5) * 0.15
    droneData.drone.position.set(targetX, targetY, targetZ)
    droneData.drone.rotation.y = -droneAngle + Math.PI / 2
    droneData.drone.rotation.z = Math.sin(droneAngle) * 0.12
  }

  // 4. 服务器指示灯呼吸
  const { studioData } = context
  if (studioData && studioData.blinkLeds) {
    studioData.blinkLeds.forEach(led => {
      led.mat.opacity = 0.35 + Math.sin(sec * led.speed + led.phase) * 0.45
    })
  }

  // 5. 悬浮数据铭牌微晃
  const { portalData } = context
  if (portalData && portalData.badgeMeshes) {
    portalData.badgeMeshes.forEach(b => {
      b.sprite.position.y = b.baseY + Math.sin(sec * b.speed + b.offset) * 0.05
    })
    portalData.mainSign.position.y = 3.8 + Math.sin(sec * 0.9) * 0.04
  }

  // 6. 微光子升华
  const { photonData } = context
  if (photonData) {
    const posAttr = photonData.points.geometry.attributes.position
    const arr = posAttr.array
    for (let i = 0; i < photonData.count; i++) {
      let y = arr[i * 3 + 1] + photonData.speeds[i] * 0.012
      if (y > 7.0) y = -0.5
      arr[i * 3 + 1] = y
    }
    posAttr.needsUpdate = true
    photonData.points.rotation.y = sec * 0.018
  }

  // 7. 相机阻尼跟进
  updateCamera(context, true)

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
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    rig.targetTheta -= dx * 0.0055
    rig.targetPhi -= dy * 0.004
    rig.targetPhi = THREE.MathUtils.clamp(rig.targetPhi, 0.35, 1.42)
    lastX = event.clientX
    lastY = event.clientY
    renderOnce()
  })

  const onPointerUp = event => {
    if (!dragging) return
    dragging = false
    try {
      canvas.releasePointerCapture(event.pointerId)
    } catch {}
  }
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
}

function bindZoomAndFocus(context, renderOnce) {
  const { rig } = context

  canvas.addEventListener(
    'wheel',
    event => {
      event.preventDefault()
      rig.targetRadius += event.deltaY * 0.009
      rig.targetRadius = THREE.MathUtils.clamp(rig.targetRadius, 6.5, 24.0)
      renderOnce()
    },
    { passive: false },
  )

  canvas.addEventListener('dblclick', () => {
    rig.targetTheta = 0.55
    rig.targetPhi = 1.25
    rig.targetRadius = rig.targetRadius > 11.0 ? 8.8 : 15.0
    renderOnce()
  })
}

function bindKeyboardControls(context, renderOnce) {
  canvas.addEventListener('keydown', event => {
    const step = 0.08
    const { rig } = context
    if (event.key === 'ArrowLeft') rig.targetTheta += step
    else if (event.key === 'ArrowRight') rig.targetTheta -= step
    else if (event.key === 'ArrowUp') rig.targetPhi -= step
    else if (event.key === 'ArrowDown') rig.targetPhi += step
    else if (event.key === 'Home') {
      rig.targetTheta = 0.55
      rig.targetPhi = 1.25
      rig.targetRadius = 15.0
    } else return

    rig.targetPhi = THREE.MathUtils.clamp(rig.targetPhi, 0.35, 1.42)
    event.preventDefault()
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
    materials.forEach(mat => {
      if (mat.map) mat.map.dispose()
      mat.dispose()
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
    if (event.origin === window.location.origin && event.data?.type === 'station:destroy') {
      destroy()
    }
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

  return {
    destroy,
    start: () => {
      animationFrame = window.requestAnimationFrame(loop)
    },
  }
}

function initScene() {
  if (!canvas) throw new Error('Station canvas element is missing')
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

  if (motionQuery.matches) {
    renderStation(context, 0)
  } else {
    runtime.start()
  }

  document.documentElement.dataset.sceneReady = 'true'
  document.body.classList.add('scene-ready')
}

try {
  initScene()
} catch (error) {
  console.error('Failed to init 3D station scene:', error)
  document.documentElement.dataset.sceneReady = 'false'
  if (fallbackTitle) fallbackTitle.textContent = 'Vue · Three.js · IoT · AI'
}
