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

// 左侧悬浮信息展示栏纹理（分区块：OPERATOR / STACK / FOCUS / METRICS，底部实时行）
function createInfoPanelTexture() {
  const pCanvas = document.createElement('canvas')
  pCanvas.width = 512
  pCanvas.height = 800
  const ctx = pCanvas.getContext('2d')
  const texture = new THREE.CanvasTexture(pCanvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const chips = ['Vue 3', 'TypeScript', 'Three.js', 'WebGL', 'FastAPI', 'MQTT / TCP', 'AI Agent', 'ECharts']
  const focus = [
    ['#38bdf8', 'IoT 协议栈与设备接入'],
    ['#818cf8', '3D 可视化 / 数字孪生'],
    ['#34d399', 'AI Agent 应用落地'],
  ]
  const metrics = [
    ['15+', 'PROJECTS'],
    ['48', 'SKILLS'],
    ['146D', 'UPTIME'],
  ]

  // 节流刷新（~2.5fps 足够，控制重绘开销）
  let lastDraw = -1
  function update(sec) {
    if (sec - lastDraw < 0.4) return
    lastDraw = sec

    // 毛玻璃底板 + 青色描边
    ctx.clearRect(0, 0, 512, 800)
    const grad = ctx.createLinearGradient(0, 0, 0, 800)
    grad.addColorStop(0, 'rgba(24, 28, 40, 0.8)')
    grad.addColorStop(1, 'rgba(10, 12, 18, 0.92)')
    ctx.fillStyle = grad
    roundedRect(ctx, 8, 8, 496, 784, 28)
    ctx.fill()
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 2.5
    ctx.shadowColor = '#38bdf8'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    // 头部：站名 + 在线状态
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 44px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif'
    ctx.fillText('LEWCHAW', 36, 66)
    ctx.fillStyle = '#7d8590'
    ctx.font = '500 15px "SF Mono", monospace'
    ctx.fillText('SIGNAL FIELD TERMINAL // 001', 36, 98)
    ctx.fillStyle = '#34d399'
    ctx.shadowColor = '#34d399'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(432, 60, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.textAlign = 'right'
    ctx.fillText('ONLINE', 476, 66)

    const divider = y => {
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.28)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(36, y)
      ctx.lineTo(476, y)
      ctx.stroke()
    }
    const section = (y, label) => {
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(56, 189, 248, 0.85)'
      ctx.font = '600 15px "SF Mono", monospace'
      ctx.fillText(`■ ${label}`, 36, y)
    }
    divider(122)

    // OPERATOR：身份信息
    section(154, 'OPERATOR')
    const rows = [
      ['ROLE', 'FRONTEND ENGINEER', '#e2e8f0'],
      ['BASE', 'ZHENGZHOU · UTC+08', '#e2e8f0'],
      ['EXP', '6+ YEARS', '#e2e8f0'],
      ['MODE', 'OPEN TO WORK', '#34d399'],
    ]
    rows.forEach(([label, value, color], i) => {
      const y = 186 + i * 30
      ctx.font = '500 14px "SF Mono", monospace'
      ctx.fillStyle = '#64748b'
      ctx.textAlign = 'left'
      ctx.fillText(label, 44, y)
      ctx.font = '500 16px "SF Mono", monospace'
      ctx.fillStyle = color
      ctx.textAlign = 'right'
      ctx.fillText(value, 468, y)
    })
    divider(296)

    // TECH STACK：芯片矩阵 2×4
    section(324, 'TECH STACK')
    chips.forEach((name, i) => {
      const cx = 36 + (i % 2) * 232
      const cy = 342 + Math.floor(i / 2) * 40
      ctx.fillStyle = 'rgba(56, 189, 248, 0.07)'
      roundedRect(ctx, cx, cy, 216, 30, 8)
      ctx.fill()
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '500 14px "SF Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(name, cx + 108, cy + 20)
    })
    divider(506)

    // CURRENT FOCUS：三个方向
    section(534, 'CURRENT FOCUS')
    focus.forEach(([color, text], i) => {
      const y = 566 + i * 30
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(50, y - 5, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '500 15px "SF Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(text, 66, y)
    })
    divider(656)

    // LIVE METRICS：三项关键数字
    section(684, 'LIVE METRICS')
    metrics.forEach(([value, label], i) => {
      const cx = 108 + i * 148
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '600 26px "SF Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(value, cx, 722)
      ctx.fillStyle = '#64748b'
      ctx.font = '500 12px "SF Mono", monospace'
      ctx.fillText(label, cx, 742)
    })

    // 底部实时行：动态信号强度 + 吞吐读数 + 闪烁光标
    for (let i = 0; i < 5; i++) {
      const h = 6 + (i + 1) * 4.5 * (0.55 + 0.45 * Math.sin(sec * 2.2 - i * 0.7))
      ctx.fillStyle = `rgba(52, 211, 153, ${0.35 + 0.13 * i})`
      ctx.fillRect(38 + i * 11, 778 - h, 7, h)
    }
    ctx.fillStyle = '#34d399'
    ctx.font = '500 13px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText('LINK STABLE', 102, 776)
    const pkts = (1.2 + Math.sin(sec * 0.6) * 0.35).toFixed(2)
    ctx.fillStyle = '#94a3b8'
    ctx.textAlign = 'right'
    ctx.fillText(`PKTS ${pkts}k/s`, 460, 776)
    if (sec % 1 < 0.55) {
      ctx.fillStyle = '#38bdf8'
      ctx.fillRect(466, 764, 8, 14)
    }

    texture.needsUpdate = true
  }
  update(0)
  return { texture, update }
}

// 服务器机柜监控屏纹理（动态 RACK 状态）
function createServerScreenTexture() {
  const sCanvas = document.createElement('canvas')
  sCanvas.width = 256
  sCanvas.height = 128
  const ctx = sCanvas.getContext('2d')
  const texture = new THREE.CanvasTexture(sCanvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const rows = [
    ['CPU', '#38bdf8', 0.62, 0.14, 0.9],
    ['MEM', '#34d399', 0.48, 0.11, 0.7],
    ['DISK', '#fbbf24', 0.35, 0.18, 1.3],
    ['NET', '#818cf8', 0.57, 0.16, 1.7],
  ]
  const miniLogs = [
    'rsync delta-sync done',
    'smartctl: all disks OK',
    'docker: 12 containers up',
    'uptime 146 days',
    'temp 42C normal',
  ]

  let lastDraw = -1
  function update(sec) {
    if (sec - lastDraw < 0.16) return
    lastDraw = sec
    ctx.fillStyle = '#05070c'
    ctx.fillRect(0, 0, 256, 128)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#38bdf8'
    ctx.font = '600 12px "SF Mono", monospace'
    ctx.fillText('RACK-01 // MONITOR', 10, 17)
    ctx.fillStyle = (sec % 1.2) < 0.7 ? '#34d399' : '#14532d'
    ctx.fillText('●', 238, 17)

    rows.forEach(([label, color, base, amp, speed], i) => {
      const y = 40 + i * 21
      const ratio = Math.min(0.96, Math.max(0.12, base + Math.sin(sec * speed + i * 1.7) * amp))
      ctx.fillStyle = '#8b949e'
      ctx.font = '500 10px "SF Mono", monospace'
      ctx.fillText(label, 10, y)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.fillRect(48, y - 8, 158, 6)
      ctx.fillStyle = color
      ctx.fillRect(48, y - 8, 158 * ratio, 6)
      ctx.fillStyle = '#e6edf3'
      ctx.textAlign = 'right'
      ctx.fillText(`${Math.round(ratio * 100)}%`, 246, y)
      ctx.textAlign = 'left'
    })

    // 迷你日志（每 3s 轮换）
    ctx.fillStyle = '#010409'
    ctx.fillRect(0, 108, 256, 20)
    ctx.font = '400 10px "SF Mono", monospace'
    const idx = Math.floor(sec / 3) % miniLogs.length
    ctx.fillStyle = '#34d399'
    ctx.fillText('»', 10, 122)
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(miniLogs[idx], 24, 122)

    texture.needsUpdate = true
  }
  update(0)
  return { texture, update }
}

// 全息操作台曲面屏幕纹理
function createHoloScreenTexture() {
  const sCanvas = document.createElement('canvas')
  sCanvas.width = 1024
  sCanvas.height = 512
  const ctx = sCanvas.getContext('2d')
  const texture = new THREE.CanvasTexture(sCanvas)
  texture.colorSpace = THREE.SRGBColorSpace

  // 日志池（事件流按时间轮换）
  const logPool = [
    ['[ OK ]', '#34d399', 'edge telemetry stream attached'],
    ['[INFO]', '#38bdf8', 'device protocol handshake → RS485 bus'],
    ['[ OK ]', '#34d399', 'ai inference warm-up complete (4 nodes)'],
    ['[WARN]', '#fbbf24', 'packet jitter spike 42ms → auto re-route'],
    ['[INFO]', '#38bdf8', 'device twin sync · 13 nodes verified'],
    ['[ OK ]', '#34d399', 'shader cache rebuilt in 218 ms'],
    ['[INFO]', '#38bdf8', 'mqtt bridge qos=1 heartbeat 30s'],
    ['[ OK ]', '#34d399', 'webrtc camera pipeline stable 60fps'],
  ]
  const clockBase = 14 * 3600 + 32 * 60 + 7
  const clockText = offsetSec => {
    const t = clockBase + Math.floor(offsetSec)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`
  }

  // 动态刷新（内部节流 ~8fps，控制 canvas 重绘开销）
  let lastDraw = -1
  function update(sec) {
    if (sec - lastDraw < 0.12) return
    lastDraw = sec

    // 底色 + 微网格
  ctx.fillStyle = 'rgba(6, 10, 18, 0.72)'
  ctx.fillRect(0, 0, 1024, 512)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x <= 1024; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke()
  }
  for (let y = 0; y <= 512; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke()
  }

  // 顶部极客工具栏
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(32, 54)
  ctx.lineTo(992, 54)
  ctx.stroke()

  ctx.fillStyle = '#38bdf8'
  ctx.font = '600 22px "SF Mono", "JetBrains Mono", monospace'
  ctx.textAlign = 'left'
  ctx.fillText('LEWCHAW // SIGNAL TERMINAL v3.0', 36, 40)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#34d399'
  ctx.fillText('● SYSTEM ONLINE', 860, 40)
  ctx.fillStyle = '#64748b'
  ctx.font = '500 18px "SF Mono", monospace'
  ctx.fillText(`UTC+08 ${clockText(sec)}`, 988, 40)

  // --- 面板通用边框 ---
  function panel(x, y, w, h, title) {
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.28)'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)'
    ctx.font = '600 13px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(title, x + 12, y + 20)
  }

  // --- 左上：能力节点拓扑图 ---
  panel(32, 70, 300, 200, 'NODE TOPOLOGY')
  const topoNodes = [
    [90, 150, '#34d399'], [180, 110, '#38bdf8'], [270, 140, '#818cf8'],
    [130, 220, '#38bdf8'], [230, 235, '#fbbf24'],
  ]
  const topoEdges = [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [2, 4]]
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'
  ctx.lineWidth = 1.2
  topoEdges.forEach(([a, b]) => {
    ctx.beginPath()
    ctx.moveTo(topoNodes[a][0], topoNodes[a][1])
    ctx.lineTo(topoNodes[b][0], topoNodes[b][1])
    ctx.stroke()
  })
  topoNodes.forEach(([nx, ny, c], i) => {
    ctx.fillStyle = c
    ctx.shadowColor = c
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(nx, ny, (i === 0 ? 7 : 5) + Math.sin(sec * 2 + i * 1.4) * 0.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  })
  // 数据包沿链路流动
  ;[[0, 1, sec * 0.45], [3, 4, sec * 0.3 + 0.5]].forEach(([a, b, t]) => {
    const p = t % 1
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.arc(topoNodes[a][0] + (topoNodes[b][0] - topoNodes[a][0]) * p, topoNodes[a][1] + (topoNodes[b][1] - topoNodes[a][1]) * p, 2.5, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = '#64748b'
  ctx.font = '400 11px "SF Mono", monospace'
  ctx.fillText('13 NODES · 19 EDGES · MESH OK', 44, 256)

  // --- 左下：双环形仪表 ---
  panel(32, 284, 300, 198, 'CORE LOAD')
  function gauge(cx, cy, r, ratio, color, label) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * ratio))
    ctx.stroke()
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '600 17px "SF Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(ratio * 100)}%`, cx, cy + 6)
    ctx.fillStyle = '#64748b'
    ctx.font = '400 11px "SF Mono", monospace'
    ctx.fillText(label, cx, cy + 26)
  }
  gauge(110, 390, 34, 0.66 + Math.sin(sec * 0.6) * 0.1, '#38bdf8', 'GPU')
  gauge(230, 390, 34, 0.44 + Math.sin(sec * 0.43 + 2) * 0.07, '#34d399', 'MEM')

  // --- 中上：双序列实时波形 ---
  panel(352, 70, 420, 260, 'SIGNAL WAVEFORM / LIVE')
  // 序列1：实线 + 渐变面积
  const areaGrad = ctx.createLinearGradient(0, 130, 0, 300)
  areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)')
  areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')
  ctx.beginPath()
  for (let x = 366; x < 758; x += 3) {
    const y = 200 + Math.sin(x * 0.042 - sec * 1.8) * 44 + Math.cos(x * 0.09 - sec * 1.1) * 18
    if (x === 366) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.lineTo(758, 300)
  ctx.lineTo(366, 300)
  ctx.closePath()
  ctx.fillStyle = areaGrad
  ctx.fill()
  // 序列2：琥珀虚线
  ctx.setLineDash([6, 5])
  ctx.strokeStyle = '#fbbf24'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (let x = 366; x < 758; x += 3) {
    const y = 240 + Math.sin(x * 0.03 + 1.6 - sec * 1.4) * 30 + Math.sin(x * 0.11 - sec * 2.2) * 10
    if (x === 366) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  // 图例 + 实时数值
  ctx.font = '500 12px "SF Mono", monospace'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#38bdf8'
  ctx.fillText('— telemetry', 380, 306)
  ctx.fillStyle = '#fbbf24'
  ctx.fillText('--- predict', 480, 306)
  ctx.fillStyle = '#34d399'
  ctx.fillText('Δ 12ms', 580, 306)

  // --- 右侧：遥测指标 + 进度条 ---
  panel(792, 70, 200, 260, 'TELEMETRY')
  const fps = 58 + Math.round(Math.sin(sec * 1.1) * 2 + Math.sin(sec * 2.7))
  const lat = Math.max(7, Math.round(12 + Math.sin(sec * 0.8) * 3.4))
  const pkts = (1.2 + Math.sin(sec * 0.6) * 0.35).toFixed(1)
  const metrics = [
    ['FPS', fps / 62, '#38bdf8', String(fps)],
    ['LAT/ms', lat / 24, '#34d399', String(lat)],
    ['PKTS/s', Number(pkts) / 2.2, '#818cf8', `${pkts}k`],
    ['SHADERS', 1, '#fbbf24', '48'],
  ]
  metrics.forEach(([label, ratio, color, txt], i) => {
    const y = 122 + i * 48
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 12px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(label, 804, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = color
    ctx.fillText(txt, 980, y)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
    ctx.fillRect(804, y + 8, 176, 5)
    ctx.fillStyle = color
    ctx.fillRect(804, y + 8, 176 * Math.min(1, Math.max(0.06, ratio)), 5)
  })

  // --- 中下：事件日志流 ---
  panel(352, 344, 640, 138, 'EVENT STREAM')
  // 事件日志：时间驱动滚动 + 时间戳推进
  const logStart = Math.floor(sec / 2.6)
  for (let i = 0; i < 4; i++) {
    const [level, color, msg] = logPool[(logStart + i) % logPool.length]
    const y = 378 + i * 24
    ctx.font = '500 13px "SF Mono", monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#475569'
    ctx.fillText(clockText(sec - (3 - i) * 2.6), 366, y)
    ctx.fillStyle = color
    ctx.fillText(level, 438, y)
    ctx.fillStyle = 'rgba(226, 232, 240, 0.82)'
    ctx.fillText(msg, 502, y)
  }
  // 光标闪烁块
  if (sec % 1.1 < 0.6) {
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(366, 470, 8, 4)
  }

    texture.needsUpdate = true
  }
  update(0)
  return { texture, update }
}

// MacBook 代码编辑器屏幕纹理（仿真实 IDE：窗口栏 / 文件树 / 语法高亮 / 调试终端）
function createCodeScreenTexture() {
  const cCanvas = document.createElement('canvas')
  cCanvas.width = 640
  cCanvas.height = 416
  const ctx = cCanvas.getContext('2d')

  // 编辑器底色
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, 640, 416)

  // macOS 窗口栏 + 红绿灯
  ctx.fillStyle = '#161b22'
  ctx.fillRect(0, 0, 640, 30)
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((color, i) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(18 + i * 18, 15, 5, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = '#8b949e'
  ctx.font = '500 13px "SF Mono", monospace'
  ctx.textAlign = 'center'
  ctx.fillText('signal-station.ts — station', 360, 19)

  // 左侧文件树
  ctx.fillStyle = '#010409'
  ctx.fillRect(0, 30, 130, 386)
  ctx.textAlign = 'left'
  ctx.font = '500 12px "SF Mono", monospace'
  const files = [
    ['▾ src', '#e6edf3'],
    ['  network.ts', '#7d8590'],
    ['  station.ts', '#58a6ff'],
    ['  holo.tsx', '#7d8590'],
    ['▸ types', '#e6edf3'],
    ['  theme.css', '#7d8590'],
    ['▸ tests', '#7d8590'],
  ]
  files.forEach(([name, color], i) => {
    if (name === '  station.ts') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)'
      ctx.fillRect(0, 40 + i * 22, 130, 20)
    }
    ctx.fillStyle = color
    ctx.fillText(name, 12, 54 + i * 22)
  })

  // 代码区：行号 + 语法高亮色块行
  const codeLines = [
    [['import', '#ff7b72'], [' { createSignalNetwork } ', '#e6edf3'], ['from', '#ff7b72'], [" './network'", '#a5d6ff']],
    [['', '']],
    [['const', '#ff7b72'], [' station ', '#e6edf3'], ['=', '#ff7b72'], [' createStation', '#d2a8ff'], ['({', '#e6edf3']],
    [['  theme: ', '#e6edf3'], ["'linear-dark'", '#a5d6ff'], [',', '#e6edf3']],
    [['  nodes: ', '#e6edf3'], ['NODES_DATA', '#79c0ff'], [',', '#e6edf3']],
    [['  motion: ', '#e6edf3'], ['reduced', '#79c0ff'], [' ? ', '#ff7b72'], ["'static'", '#a5d6ff'], [' : ', '#ff7b72'], ["'orbit'", '#a5d6ff'], [',', '#e6edf3']],
    [['})', '#e6edf3']],
    [['', '']],
    [['// TODO: 接入边缘遥测流', '#6e7681']],
    [['await', '#ff7b72'], [' station', '#e6edf3'], ['.', '#ff7b72'], ['mount', '#d2a8ff'], ['(', '#e6edf3'], ["'#holo'", '#a5d6ff'], [')', '#e6edf3']],
  ]
  codeLines.forEach((tokens, i) => {
    const y = 52 + i * 22
    ctx.fillStyle = '#3d444d'
    ctx.textAlign = 'right'
    ctx.fillText(String(i + 1), 156, y)
    let x = 172
    ctx.textAlign = 'left'
    tokens.forEach(([text, color]) => {
      if (!text) return
      ctx.fillStyle = color
      ctx.fillText(text, x, y)
      x += ctx.measureText(text).width
    })
  })
  // 当前行高亮 + 光标
  ctx.fillStyle = 'rgba(56, 189, 248, 0.07)'
  ctx.fillRect(134, 52 + 2 * 22 - 16, 506, 20)
  ctx.fillStyle = '#58a6ff'
  ctx.fillRect(300, 52 + 2 * 22 - 15, 1.6, 15)

  // 底部调试终端面板
  ctx.fillStyle = '#010409'
  ctx.fillRect(134, 288, 506, 128)
  ctx.strokeStyle = '#21262d'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(134, 288.5)
  ctx.lineTo(640, 288.5)
  ctx.stroke()
  ctx.font = '500 12px "SF Mono", monospace'
  const termLines = [
    [['➜ ', '#28c840'], ['vite dev ', '#e6edf3'], ['server ready in 218 ms', '#7d8590']],
    [['➜ ', '#28c840'], ['Local:   ', '#e6edf3'], ['http://localhost:5173/', '#58a6ff']],
    [['✓ ', '#28c840'], ['hmr update /station.ts ', '#7d8590'], ['(34 ms)', '#6e7681']],
    [['● ', '#fbbf24'], ['watching for file changes...', '#7d8590']],
  ]
  termLines.forEach((tokens, i) => {
    let x = 148
    tokens.forEach(([text, color]) => {
      ctx.fillStyle = color
      ctx.fillText(text, x, 312 + i * 24)
      x += ctx.measureText(text).width
    })
  })

  const texture = new THREE.CanvasTexture(cCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
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
    color: 0xdff4ff,
    transmission: 0.96,
    roughness: 0.045,
    thickness: 0.16,
    opacity: 0.56,
    clearcoat: 1.0,
    clearcoatRoughness: 0.035,
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

  const glassFrame = createMetalMaterial(0x657487, 0.28, 0.78)
  const glassEdgeGlow = createGlowMaterial(theme.accentCyan, 0.22)

  // 后方与左侧透明玻璃幕墙
  addMesh(studio, new THREE.BoxGeometry(3.96, 2.05, 0.035), frostedGlass, [-0.2, 1.12, -1.18])
  addMesh(studio, new THREE.BoxGeometry(0.035, 2.05, 2.54), frostedGlass, [-2.18, 1.12, 0.1])
  // 右侧低反射透明玻璃补全温室轮廓，前方保留通透入口
  const sideGlass = createFrostedGlassMaterial({
    color: 0xe2f4ff,
    transmission: 0.99,
    roughness: 0.025,
    thickness: 0.08,
    opacity: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  })
  addMesh(studio, new THREE.BoxGeometry(0.014, 1.98, 2.5), sideGlass, [1.78, 1.12, 0.1])
  const glassClamp = createMetalMaterial(0x91a3b2, 0.24, 0.82)
  ;[0.22, 2.02].forEach(y => {
    ;[-1.02, 1.22].forEach(z => {
      addMesh(studio, new THREE.BoxGeometry(0.045, 0.035, 0.07), glassClamp, [1.79, y, z])
    })
  })
  ;[-0.68, 0.1, 0.82].forEach(z => {
    addMesh(studio, new THREE.BoxGeometry(0.012, 1.84, 0.014), glassFrame, [1.768, 1.12, z])
  })
  addMesh(studio, new THREE.BoxGeometry(0.008, 1.76, 0.01), glassEdgeGlow, [1.768, 1.12, -1.14])

  // 细窄内侧压条分隔玻璃，不遮挡室内视线
  ;[-1.2, -0.2, 0.8].forEach(x => {
    addMesh(studio, new THREE.BoxGeometry(0.016, 1.96, 0.018), glassFrame, [x, 1.12, -1.145])
  })
  ;[0.42, 1.82].forEach(y => {
    addMesh(studio, new THREE.BoxGeometry(3.88, 0.014, 0.018), glassFrame, [-0.2, y, -1.145])
  })
  ;[0.5, 1.35].forEach(z => {
    addMesh(studio, new THREE.BoxGeometry(0.018, 1.96, 0.018), glassFrame, [-2.145, 1.12, z])
  })
  // 玻璃内侧的窄反光边，轻微勾勒空间轮廓
  addMesh(studio, new THREE.BoxGeometry(3.82, 0.008, 0.006), glassEdgeGlow, [-0.2, 2.12, -1.137])
  addMesh(studio, new THREE.BoxGeometry(0.006, 1.82, 0.008), glassEdgeGlow, [-2.137, 1.12, 1.32])

  // 前侧透明滑门与窄型门框，保持开放式入口的通透感
  const entryGlass = createFrostedGlassMaterial({
    color: 0xe8f7ff,
    transmission: 0.98,
    roughness: 0.025,
    thickness: 0.08,
    opacity: 0.28,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
  })
  addMesh(studio, new THREE.BoxGeometry(0.82, 1.88, 0.014), entryGlass, [0.35, 1.14, 1.365])
  const doorFrame = createMetalMaterial(0x93a4b2, 0.2, 0.86)
  ;[-0.06, 0.76].forEach(x => {
    addMesh(studio, new THREE.BoxGeometry(0.018, 1.92, 0.022), doorFrame, [x, 1.14, 1.38])
  })
  ;[0.2, 2.08].forEach(y => {
    addMesh(studio, new THREE.BoxGeometry(0.84, 0.018, 0.022), doorFrame, [0.35, y, 1.38])
  })
  addMesh(studio, new THREE.BoxGeometry(0.018, 0.28, 0.026), glassEdgeGlow, [0.65, 1.12, 1.395])
  addMesh(studio, new THREE.BoxGeometry(0.12, 0.018, 0.026), silver, [0.57, 1.25, 1.395])

  // 顶部悬挑透明天幕
  const roofGlass = createFrostedGlassMaterial({
    color: 0xe6f5ff,
    transmission: 0.98,
    roughness: 0.035,
    thickness: 0.12,
    opacity: 0.42,
    clearcoat: 1.0,
    clearcoatRoughness: 0.025,
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
  // 天窗细分线与内侧漫反射光带，强调玻璃层次而不加厚边框
  const roofDivider = createMetalMaterial(0x74899a, 0.3, 0.72)
  ;[-0.85, 0.1, 1.02].forEach(z => {
    addMesh(studio, new THREE.BoxGeometry(4.16, 0.008, 0.012), roofDivider, [-0.2, 2.284, z])
  })
  const roofGlowMat = createGlowMaterial(theme.accentCyan, 0.18)
  addMesh(studio, new THREE.BoxGeometry(3.72, 0.008, 0.014), roofGlowMat, [-0.2, 2.205, -1.08])
  addMesh(studio, new THREE.BoxGeometry(0.014, 0.008, 2.32), roofGlowMat, [-2.08, 2.205, 0.1])
  const interiorLight = new THREE.PointLight(theme.accentCyan, 0.48, 3.8, 1.8)
  interiorLight.position.set(-0.1, 1.92, 0.15)
  studio.add(interiorLight)
  const roofLipMat = createGlowMaterial(theme.accentCyan, 0.42)
  addMesh(studio, new THREE.BoxGeometry(4.38, 0.012, 0.018), roofLipMat, [-0.2, 2.24, 1.58])

  // 悬浮全息曲面 HUD 屏幕（内容动态刷新）
  const holoScreenData = createHoloScreenTexture()
  const holoMat = new THREE.MeshBasicMaterial({
    map: holoScreenData.texture,
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

  // 1. 深空灰 MacBook 电脑（屏幕显示真实 IDE 开发调试画面）
  const mbBase = addMesh(deskItems, new THREE.BoxGeometry(0.42, 0.015, 0.28), midMetal, [-0.45, 0.01, 0])
  // 键盘凹陷面板 + 触控条
  addMesh(mbBase, new THREE.BoxGeometry(0.36, 0.002, 0.2), createMetalMaterial(0x0c0e14, 0.55, 0.4), [0, 0.001, 0.02])
  addMesh(mbBase, new THREE.BoxGeometry(0.1, 0.002, 0.012), createGlowMaterial(theme.accentCyan, 0.35), [0, 0.002, 0.11])
  const mbScreen = addMesh(deskItems, new THREE.BoxGeometry(0.42, 0.28, 0.012), midMetal, [-0.45, 0.14, -0.14], [-0.24, 0, 0])
  addMesh(mbScreen, new THREE.BoxGeometry(0.39, 0.25, 0.002), new THREE.MeshBasicMaterial({
    map: createCodeScreenTexture(),
    toneMapped: false,
  }), [0, 0, 0.008])

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

  // 4. 工作笔记本与钢笔（桌面左侧，随手摊开的记录本）
  const paperMat = createMetalMaterial(0xe8e4d8, 0.75, 0.02)
  addMesh(deskItems, new THREE.BoxGeometry(0.26, 0.006, 0.2), paperMat, [-0.98, 0.004, 0.04], [0, 0.16, 0])
  addMesh(deskItems, new THREE.BoxGeometry(0.26, 0.002, 0.03), createMetalMaterial(0x2d3648, 0.5, 0.3), [-0.98, 0.008, -0.06], [0, 0.16, 0])
  // 摊开的两页折痕
  addMesh(deskItems, new THREE.BoxGeometry(0.002, 0.001, 0.19), createMetalMaterial(0xc9c3b2, 0.8, 0.02), [-0.98, 0.0075, 0.04], [0, 0.16, 0])
  // 斜放的钢笔
  addMesh(deskItems, new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8), createMetalMaterial(0x1f2937, 0.3, 0.85), [-0.92, 0.012, 0.11], [0, 0.5, Math.PI / 2])

  // 5. 手机平放（马克杯右侧，微转更显随意）
  const phoneBody = addMesh(deskItems, new THREE.BoxGeometry(0.09, 0.008, 0.18), createMetalMaterial(0x1a1f2b, 0.25, 0.9), [0.68, 0.005, 0.02], [0, -0.28, 0])
  addMesh(phoneBody, new THREE.BoxGeometry(0.082, 0.002, 0.17), createGlowMaterial(0x1e293b, 0.9), [0, 0.005, 0])

  // 6. 后角小型绿植（填补左后视觉空档，玻璃盆栽）
  const plantX = -1.18
  const plantZ = -0.26
  addMesh(deskItems, new THREE.CylinderGeometry(0.05, 0.038, 0.07, 12), createFrostedGlassMaterial({ color: 0x9fb8c8, roughness: 0.25, transmission: 0.7, thickness: 0.1, opacity: 0.9 }), [plantX, 0.035, plantZ])
  addMesh(deskItems, new THREE.CylinderGeometry(0.046, 0.046, 0.01, 12), createMetalMaterial(0x2a2018, 0.9, 0.05), [plantX, 0.066, plantZ])
  // 三簇高低错落的叶片
  const leafMat = createMetalMaterial(0x2f9e6e, 0.4, 0.1)
  ;[[0, 0.16, 0, 0.05], [0.035, 0.12, 0.02, 0.035], [-0.03, 0.13, -0.02, 0.04]].forEach(([ox, oy, oz, r]) => {
    const leaf = addMesh(deskItems, new THREE.SphereGeometry(r, 8, 6), leafMat, [plantX + ox, oy, plantZ + oz])
    leaf.scale.y = 1.5
  })

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

  // 服务器机柜微模块（标准 19 寸机架结构：框架立柱 + 分层单元 + 散热格栅 + 走线）
  const serverX = 1.32
  const serverZ = -0.65
  const rackW = 0.68
  const rackH = 1.4
  const rackD = 0.52
  const serverMat = createMetalMaterial(0x10131c, 0.3, 0.85)
  const rackPanelMat = createMetalMaterial(0x171b26, 0.4, 0.8)
  const rackDarkMat = createMetalMaterial(0x0a0d13, 0.55, 0.6)

  // 机柜主体（内腔）
  addMesh(studio, new THREE.BoxGeometry(rackW, rackH, rackD), serverMat, [serverX, rackH / 2, serverZ])

  // 四根钛银立柱（前面两根亮面，侧面透视感）
  const postMat = createMetalMaterial(0x2a3040, 0.3, 0.9)
  const postH = rackH + 0.03
  ;[[serverX - rackW / 2 + 0.025, serverZ + rackD / 2 - 0.01], [serverX + rackW / 2 - 0.025, serverZ + rackD / 2 - 0.01],
    [serverX - rackW / 2 + 0.025, serverZ - rackD / 2 + 0.01], [serverX + rackW / 2 - 0.025, serverZ - rackD / 2 + 0.01]].forEach(([px, pz]) => {
    addMesh(studio, new THREE.BoxGeometry(0.05, postH, 0.05), postMat, [px, rackH / 2, pz])
  })

  // 分层服务器单元：每层 = 前面板 + 散热格栅 + 把手 + 单元指示灯
  const blinkLeds = []
  const unitH = 0.16
  const unitCount = 7
  for (let i = 0; i < unitCount; i++) {
    const unitY = 0.2 + i * unitH
    // 1U 前面板
    addMesh(studio, new THREE.BoxGeometry(rackW - 0.12, unitH - 0.03, 0.02), rackPanelMat, [serverX, unitY, serverZ + rackD / 2 + 0.005])
    // 散热格栅：一排细缝
    for (let v = 0; v < 6; v++) {
      addMesh(studio, new THREE.BoxGeometry(0.3, 0.006, 0.004), rackDarkMat,
        [serverX - 0.06, unitY - 0.035 + v * 0.014, serverZ + rackD / 2 + 0.017])
    }
    // 单元左侧小型拉手
    addMesh(studio, new THREE.BoxGeometry(0.02, 0.05, 0.02), postMat, [serverX - rackW / 2 + 0.09, unitY, serverZ + rackD / 2 + 0.02])
    // 呼吸指示灯条（保留原动画机制）
    const ledColor = i % 3 === 0 ? theme.accentEmerald : (i % 2 === 0 ? theme.accentCyan : theme.accentIndigo)
    const ledMat = createGlowMaterial(ledColor, 0.8)
    const led = addMesh(studio, new THREE.BoxGeometry(0.16, 0.02, 0.02), ledMat, [serverX + 0.16, unitY, serverZ + rackD / 2 + 0.018])
    blinkLeds.push({ mesh: led, mat: ledMat, speed: 2.2 + i * 1.1, phase: i * 0.8 })
    // 每单元两颗状态小灯
    addMesh(studio, new THREE.SphereGeometry(0.008, 6, 6), createGlowMaterial(ledColor, 0.55), [serverX + 0.26, unitY + 0.03, serverZ + rackD / 2 + 0.018])
  }

  // 顶部核心单元：微型服务器监控屏（动态刷新）
  const serverScreenData = createServerScreenTexture()
  addMesh(studio, new THREE.BoxGeometry(rackW - 0.12, 0.18, 0.02), rackPanelMat, [serverX, 1.44, serverZ + rackD / 2 + 0.005])
  addMesh(studio, new THREE.BoxGeometry(0.26, 0.13, 0.006), new THREE.MeshBasicMaterial({
    map: serverScreenData.texture,
    toneMapped: false,
  }), [serverX - 0.06, 1.44, serverZ + rackD / 2 + 0.017])

  // 侧面走线（两根弯曲理线）
  const cableMat = createMetalMaterial(0x0c0e14, 0.7, 0.2)
  const rackCable1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(serverX - rackW / 2 - 0.01, 1.3, serverZ + 0.1),
    new THREE.Vector3(serverX - rackW / 2 - 0.04, 0.9, serverZ + 0.14),
    new THREE.Vector3(serverX - rackW / 2 - 0.02, 0.45, serverZ + 0.12),
    new THREE.Vector3(serverX - rackW / 2 - 0.01, 0.12, serverZ + 0.06),
  ])
  addMesh(studio, new THREE.TubeGeometry(rackCable1, 20, 0.012, 6), cableMat, [0, 0, 0])
  const rackCable2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(serverX + rackW / 2 + 0.01, 1.2, serverZ + 0.12),
    new THREE.Vector3(serverX + rackW / 2 + 0.035, 0.75, serverZ + 0.15),
    new THREE.Vector3(serverX + rackW / 2 + 0.015, 0.3, serverZ + 0.1),
  ])
  addMesh(studio, new THREE.TubeGeometry(rackCable2, 16, 0.01, 6), cableMat, [0, 0, 0])

  // 底部支脚 + 顶部理线架
  ;[[-0.24, 0.18], [0.24, 0.18], [-0.24, -0.18], [0.24, -0.18]].forEach(([ox, oz]) => {
    addMesh(studio, new THREE.CylinderGeometry(0.025, 0.03, 0.06, 8), rackDarkMat, [serverX + ox, 0.03, serverZ + oz])
  })

  // 顶部天顶柔和线形光槽
  const lightStripMat = createGlowMaterial(0xffffff, 0.85)
  addMesh(studio, new THREE.BoxGeometry(2.8, 0.02, 0.04), lightStripMat, [-0.25, 2.22, 0.2])

  return { studio, blinkLeds, holoUpdate: holoScreenData.update, serverScreenUpdate: serverScreenData.update }
}

// 3. 量子相控阵信号塔
function createSignalTower(world) {
  const tower = new THREE.Group()
  tower.position.set(3.4, 0.258, -1.8)
  world.add(tower)

  const titanium = createMetalMaterial(theme.titaniumDark, 0.25, 0.88)
  const silver = createMetalMaterial(theme.metalHighlight, 0.15, 0.94)

  // 三点式地板锚固：塔脚直接落在主台面，不另设突兀圆盘
  const footMat = createMetalMaterial(theme.titaniumMid, 0.22, 0.92)
  const footGlow = createGlowMaterial(theme.accentCyan, 0.55)
  const phase = Math.PI / 6
  const footPoints = Array.from({ length: 3 }, (_, k) => {
    const angle = phase + (k * Math.PI * 2) / 3
    return [Math.cos(angle) * 0.62, 0.055, Math.sin(angle) * 0.62]
  })
  footPoints.forEach(([x, y, z]) => {
    addMesh(tower, new THREE.BoxGeometry(0.2, 0.045, 0.2), footMat, [x, y, z], [0, phase, 0])
    addMesh(tower, new THREE.BoxGeometry(0.09, 0.008, 0.09), footGlow, [x, y + 0.027, z], [0, phase, 0])
  })
  // 三角形薄型连接框，把三只塔脚锁成一体
  for (let k = 0; k < 3; k++) {
    beam(footPoints[k], footPoints[(k + 1) % 3], 0.012, 0.012, footMat)
  }

  // 直杆连接工具：在两点之间生成圆管梁
  function beam(p1, p2, r1, r2, mat) {
    const start = new THREE.Vector3(...p1)
    const end = new THREE.Vector3(...p2)
    const dir = end.clone().sub(start)
    const len = dir.length()
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 10), mat)
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh.castShadow = true
    mesh.receiveShadow = true
    tower.add(mesh)
    return mesh
  }

  // 三角形格构塔身：主柱收窄 + 层间横撑 + 之字斜撑（真实桁架结构，替代原 3 根直棍）
  const levels = [
    { y: 0.16, r: 0.56 },
    { y: 0.95, r: 0.42 },
    { y: 1.7, r: 0.3 },
    { y: 2.42, r: 0.2 },
    { y: 3.12, r: 0.115 },
  ]
  const joint = (k, lv) => {
    const angle = phase + (k * Math.PI * 2) / 3
    return [Math.cos(angle) * lv.r, lv.y, Math.sin(angle) * lv.r]
  }
  const legR = i => 0.036 - (i / (levels.length - 1)) * 0.02
  for (let k = 0; k < 3; k++) {
    beam(footPoints[k], joint(k, levels[0]), 0.025, 0.025, silver)
  }

  // 主柱分段（向上收窄）+ 柱脚锚固块
  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < levels.length - 1; i++) {
      beam(joint(k, levels[i]), joint(k, levels[i + 1]), legR(i), legR(i + 1), silver)
    }
    const [ax, , az] = joint(k, levels[0])
    addMesh(tower, new THREE.BoxGeometry(0.16, 0.1, 0.16), silver, [ax, 0.12, az])
    addMesh(tower, new THREE.SphereGeometry(0.014, 8, 8), createGlowMaterial(theme.accentCyan, 0.8), [ax * 1.16, 0.12, az * 1.16])
  }

  // 层间水平横撑（三角形箍）
  for (let i = 1; i < levels.length; i++) {
    for (let k = 0; k < 3; k++) {
      beam(joint(k, levels[i]), joint((k + 1) % 3, levels[i]), 0.013, 0.013, titanium)
    }
  }

  // 之字斜撑（正反交替，构成桁架交叉纹）
  for (let i = 0; i < levels.length - 1; i++) {
    for (let k = 0; k < 3; k++) {
      const target = (k + (i % 2 === 0 ? 1 : 2)) % 3
      beam(joint(k, levels[i]), joint(target, levels[i + 1]), 0.009, 0.009, titanium)
    }
  }

  // 中层检修平台 + 护栏
  const platformY = levels[3].y
  addMesh(tower, new THREE.CylinderGeometry(0.3, 0.3, 0.025, 24), titanium, [0, platformY, 0])
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8
    addMesh(tower, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6), silver, [Math.cos(angle) * 0.27, platformY + 0.06, Math.sin(angle) * 0.27])
  }
  addMesh(tower, new THREE.TorusGeometry(0.27, 0.005, 6, 32), silver, [0, platformY + 0.11, 0], [Math.PI / 2, 0, 0])

  // 天线板 ×3（顶层朝外）+ 微波碟与支架
  for (let k = 0; k < 3; k++) {
    const angle = phase + (k * Math.PI * 2) / 3
    addMesh(tower, new THREE.BoxGeometry(0.02, 0.4, 0.11), titanium, [Math.cos(angle) * 0.22, 2.85, Math.sin(angle) * 0.22], [0, -angle, 0.04])
  }
  const dishAngle = phase
  const dishGroup = new THREE.Group()
  dishGroup.position.set(Math.cos(dishAngle) * 0.32, 1.95, Math.sin(dishAngle) * 0.32)
  dishGroup.rotation.y = Math.PI / 2 - dishAngle
  tower.add(dishGroup)
  addMesh(dishGroup, new THREE.CylinderGeometry(0.11, 0.11, 0.018, 20), silver, [0, 0, 0], [1.2, 0, 0])
  addMesh(tower, new THREE.BoxGeometry(0.14, 0.02, 0.02), silver, [Math.cos(dishAngle) * 0.22, 1.95, Math.sin(dishAngle) * 0.22], [0, -dishAngle, 0])

  // 馈线：沿 0 号主柱从塔脚到塔顶
  const feederPoints = levels.map(lv => {
    const [fx, fy, fz] = joint(0, lv)
    return new THREE.Vector3(fx * 1.06, fy, fz * 1.06)
  })
  addMesh(tower, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(feederPoints), 24, 0.008, 6), titanium, [0, 0, 0])

  // 顶部设备舱 + 航空警示灯
  addMesh(tower, new THREE.CylinderGeometry(0.1, 0.15, 0.16, 10), titanium, [0, 3.2, 0])
  addMesh(tower, new THREE.SphereGeometry(0.028, 8, 8), createGlowMaterial(theme.accentAmber, 0.9), [0, 3.32, 0])

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

// 3.5 WALL·E 风格地面勤务机器人（履带底盘 / 伸缩脖颈 / 望远镜头部 / 双机械臂 / 扫描光锥）
function createGroundBot(world) {
  const bot = new THREE.Group()
  bot.position.set(3.0, 0.24, 1.6)
  world.add(bot)

  const bodyMat = createMetalMaterial(0xb0862f, 0.52, 0.55)
  const bodyDark = createMetalMaterial(0x3a2f14, 0.6, 0.4)
  const trackMat = createMetalMaterial(0x14161c, 0.75, 0.3)
  const trackHub = createMetalMaterial(0x2a2d36, 0.5, 0.7)
  const lensMat = createGlowMaterial(theme.accentCyan, 0.95)

  // 履带底盘：两侧履带 + 轮毂组 + 连接横梁
  const trackGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.2, 18)
  const tracks = []
  ;[-0.21, 0.21].forEach(x => {
    const track = addMesh(bot, trackGeo, trackMat, [x, 0.16, 0], [0, 0, Math.PI / 2])
    track.scale.z = 0.62
    tracks.push(track)
    // 履带板纹理（环形细棱）
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8
      addMesh(bot, new THREE.BoxGeometry(0.04, 0.03, 0.1), bodyDark, [x, 0.16 + Math.sin(a) * 0.1, Math.cos(a) * 0.1], [-a, 0, 0])
    }
    // 轮毂
    ;[-0.07, 0.07].forEach(oz => {
      addMesh(bot, new THREE.CylinderGeometry(0.07, 0.07, 0.22, 12), trackHub, [x, 0.16, oz], [0, 0, Math.PI / 2])
    })
  })
  addMesh(bot, new THREE.BoxGeometry(0.34, 0.14, 0.3), bodyDark, [0, 0.16, 0])

  // 主体躯干：主舱 + 侧挂压缩货箱 + 胸口状态灯
  const torso = addMesh(bot, new THREE.BoxGeometry(0.5, 0.42, 0.36), bodyMat, [0, 0.45, 0])
  addMesh(torso, new THREE.BoxGeometry(0.16, 0.12, 0.02), bodyDark, [0.19, 0.02, 0.185])
  addMesh(torso, new THREE.BoxGeometry(0.13, 0.2, 0.04), bodyDark, [-0.2, -0.02, 0.17])
  addMesh(torso, new THREE.BoxGeometry(0.06, 0.05, 0.012), createGlowMaterial(theme.accentEmerald, 0.85), [-0.14, 0.1, 0.19])
  // 背部太阳能板
  addMesh(bot, new THREE.BoxGeometry(0.34, 0.015, 0.24), createMetalMaterial(0x14203a, 0.3, 0.7), [0, 0.68, -0.04], [0.16, 0, 0])

  // 伸缩脖颈 + 望远镜头部（双筒镜筒 + 独立取景窗 + 天线）
  const neck = new THREE.Group()
  neck.position.set(0, 0.66, 0.02)
  bot.add(neck)
  addMesh(neck, new THREE.CylinderGeometry(0.05, 0.065, 0.16, 10), bodyDark, [0, 0.06, 0])
  const head = new THREE.Group()
  head.position.set(0, 0.2, 0)
  neck.add(head)
  ;[-0.075, 0.075].forEach(x => {
    addMesh(head, new THREE.CylinderGeometry(0.07, 0.075, 0.2, 14), bodyMat, [x, 0, 0], [Math.PI / 2, 0, 0])
    addMesh(head, new THREE.CylinderGeometry(0.052, 0.052, 0.012, 14), lensMat, [x, 0, 0.1], [Math.PI / 2, 0, 0])
  })
  addMesh(head, new THREE.BoxGeometry(0.05, 0.05, 0.06), bodyDark, [0, 0.07, -0.06])
  addMesh(head, new THREE.CylinderGeometry(0.005, 0.005, 0.14, 6), trackHub, [0.13, 0.1, -0.04], [0, 0, 0.28])
  addMesh(head, new THREE.SphereGeometry(0.011, 6, 6), createGlowMaterial(theme.accentAmber, 0.9), [0.145, 0.17, -0.04])

  // 双机械臂：肩关节 + 上臂 + 前臂 + 双指机械爪
  const makeArm = side => {
    const shoulder = new THREE.Group()
    shoulder.position.set(side * 0.28, 0.56, 0.05)
    bot.add(shoulder)
    addMesh(shoulder, new THREE.SphereGeometry(0.045, 10, 8), bodyDark, [0, 0, 0])
    addMesh(shoulder, new THREE.BoxGeometry(0.045, 0.2, 0.05), bodyMat, [side * 0.02, -0.1, 0.02], [side * 0.35, 0, side * 0.12])
    addMesh(shoulder, new THREE.BoxGeometry(0.038, 0.14, 0.045), bodyMat, [side * 0.09, -0.22, 0.09], [side * 0.6, 0, side * 0.2])
    // 双指爪
    ;[-0.02, 0.02].forEach(fx => {
      addMesh(shoulder, new THREE.BoxGeometry(0.012, 0.07, 0.02), trackHub, [side * 0.14 + fx * 0.4, -0.3, 0.12 + fx], [side * 0.6, 0, side * 0.2])
    })
    return shoulder
  }
  const lArm = makeArm(-1)
  const rArm = makeArm(1)

  // 前视扫描光锥（呼吸开关）
  const scanConeMat = new THREE.MeshBasicMaterial({
    color: theme.accentCyan,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const scanCone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 20, 1, true), scanConeMat)
  scanCone.rotation.x = Math.PI / 2
  scanCone.position.set(0, 0.2, 0.85)
  neck.add(scanCone)

  // 巡逻路径（桌前 → 停机坪方向往返）与头部追踪状态
  const path = { x: 3.0, zFrom: 0.9, zTo: 2.5 }
  const ease = t => t * t * (3 - 2 * t)
  bot.userData.update = (sec, inspectionTarget = '') => {
    const inspecting = inspectionTarget === 'robot'
    const leg = 6
    const ph = (sec % (leg * 2)) / leg
    const k = ease(ph > 1 ? 2 - ph : ph)
    const patrolZ = path.zFrom + (path.zTo - path.zFrom) * k
    const targetZ = inspecting ? 1.36 : patrolZ
    bot.position.z += (targetZ - bot.position.z) * (inspecting ? 0.08 : 0.18)
    bot.position.y = 0.24 + Math.abs(Math.sin(sec * 6.5)) * 0.008
    bot.rotation.y = inspecting ? -Math.PI / 2 : (ph > 1 ? Math.PI : 0)

    tracks.forEach(track => {
      track.rotation.x = sec * (inspecting ? 0 : (ph > 1 ? -1 : 1) * 1.8)
      track.rotation.z = Math.PI / 2
    })

    neck.position.y = 0.66 + Math.sin(sec * 1.4) * 0.02 + (inspecting ? 0.045 : 0)
    head.rotation.y = inspecting ? Math.sin(sec * 1.3) * 0.24 : Math.sin(sec * 0.9) * 0.5
    head.rotation.x = inspecting ? -0.12 : Math.sin(sec * 0.6) * 0.06
    lArm.rotation.z = Math.sin(sec * 1.1) * 0.08 + (inspecting ? -0.16 : 0)
    rArm.rotation.z = -Math.sin(sec * 1.1) * 0.08 + (inspecting ? 0.16 : 0)
    scanConeMat.opacity = inspecting
      ? 0.18 + Math.max(0, Math.sin(sec * 2.6)) * 0.16
      : 0.06 + Math.max(0, Math.sin(sec * 1.8)) * 0.09
    lensMat.opacity = inspecting ? 0.55 + Math.sin(sec * 5) * 0.35 : 0.95
  }
  return bot
}

// 3.6 科幻侦察飞翼 + 切角矩形停机甲板（导引光轨 / 系泊锁 / 引擎辉光）
function createLandingPad(world) {
  const pad = new THREE.Group()
  pad.position.set(0.95, 0.29, 2.2)
  pad.scale.setScalar(0.58)
  world.add(pad)

  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xb8d7e5,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    toneMapped: false,
  })
  const hullMat = createMetalMaterial(0x202a38, 0.26, 0.9)
  const hullSilver = createMetalMaterial(theme.metalHighlight, 0.15, 0.94)
  const cyanGlow = createGlowMaterial(theme.accentCyan, 0.3)
  // 停机位只保留贴地轮廓线，主地板保持连续
  const deckRim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-2.01, 0.006, -1.55), new THREE.Vector3(2.01, 0.006, -1.55),
    new THREE.Vector3(2.35, 0.006, -1.21), new THREE.Vector3(2.35, 0.006, 1.21),
    new THREE.Vector3(2.01, 0.006, 1.55), new THREE.Vector3(-2.01, 0.006, 1.55),
    new THREE.Vector3(-2.35, 0.006, 1.21), new THREE.Vector3(-2.35, 0.006, -1.21),
  ]), edgeMat)
  pad.add(deckRim)
  // 低亮度导引光轨与定位刻度直接落在主台面上
  ;[-0.72, 0.72].forEach(x => {
    addMesh(pad, new THREE.BoxGeometry(0.012, 0.003, 2.2), cyanGlow, [x, 0.008, 0])
  })
  ;[-1, -0.5, 0, 0.5, 1].forEach(z => {
    addMesh(pad, new THREE.BoxGeometry(1.5, 0.002, 0.01), createGlowMaterial(theme.accentIndigo, 0.18), [0, 0.009, z])
  })
  // 入口方向用双线箭头标识，直接贴在主台面
  ;[-1, 1].forEach(s => {
    addMesh(pad, new THREE.BoxGeometry(0.34, 0.003, 0.025), cyanGlow, [s * 0.1, 0.008, 1.18], [0, s * 0.68, 0])
  })
  // 泊位编号位置以细边框标记，不做凸起牌匾
  ;[-1, 1].forEach(s => {
    addMesh(pad, new THREE.BoxGeometry(0.28, 0.003, 0.012), edgeMat, [1.62, 0.008, -1.02 + s * 0.12])
  })
  // 四个齐平系泊锁扣与状态灯
  ;[[-1.72, -1.02], [1.72, -1.02], [-1.72, 1.02], [1.72, 1.02]].forEach(([x, z]) => {
    addMesh(pad, new THREE.BoxGeometry(0.24, 0.018, 0.15), edgeMat, [x, 0.012, z])
    addMesh(pad, new THREE.BoxGeometry(0.13, 0.003, 0.018), cyanGlow, [x, 0.023, z])
  })

  // 侦察飞翼：宽展掠翼、分层装甲、抬高座舱与双尾翼
  const ship = new THREE.Group()
  ship.position.set(0, 0.005, -0.02)
  pad.add(ship)
  const wingShape = new THREE.Shape()
  wingShape.moveTo(0, -1.18)
  wingShape.lineTo(0.34, -0.68)
  wingShape.lineTo(1.52, 0.12)
  wingShape.lineTo(1.62, 0.36)
  wingShape.lineTo(0.62, 0.18)
  wingShape.lineTo(0.42, 0.78)
  wingShape.lineTo(0, 0.98)
  wingShape.lineTo(-0.42, 0.78)
  wingShape.lineTo(-0.62, 0.18)
  wingShape.lineTo(-1.62, 0.36)
  wingShape.lineTo(-1.52, 0.12)
  wingShape.lineTo(-0.34, -0.68)
  wingShape.closePath()
  const wingGeo = new THREE.ShapeGeometry(wingShape)
  const wing = new THREE.Mesh(wingGeo, hullMat)
  wing.rotation.x = -Math.PI / 2
  wing.position.y = 0.04
  wing.castShadow = true
  ship.add(wing)
  // 三点式短起落支脚，让机翼落在贴地泊位上
  const gearMat = createMetalMaterial(theme.titaniumMid, 0.22, 0.9)
  ;[[-0.46, 0.28], [0.46, 0.28], [0, 0.68]].forEach(([x, z]) => {
    addMesh(ship, new THREE.CylinderGeometry(0.018, 0.022, 0.042, 8), gearMat, [x, 0.019, z])
    addMesh(ship, new THREE.BoxGeometry(0.085, 0.012, 0.065), hullSilver, [x, 0.004, z])
  })
  // 中央装甲脊与前端尖锥
  addMesh(ship, new THREE.BoxGeometry(0.48, 0.2, 1.42), hullSilver, [0, 0.12, -0.05], [0.08, 0, 0])
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.78, 5), hullMat)
  nose.rotation.x = -Math.PI / 2
  nose.position.set(0, 0.14, -0.93)
  nose.scale.set(1, 0.7, 0.72)
  nose.castShadow = true
  ship.add(nose)
  // 抬高蓝色座舱罩 + 环绕装甲框
  addMesh(ship, new THREE.SphereGeometry(0.24, 18, 12), createFrostedGlassMaterial({ color: 0x79d8ff, roughness: 0.08, transmission: 0.72, opacity: 0.92 }), [0, 0.29, -0.18], [0.18, 0, 0])
  addMesh(ship, new THREE.TorusGeometry(0.235, 0.018, 8, 28), hullSilver, [0, 0.29, -0.18], [Math.PI / 2, 0, 0])
  // 两片后掠尾翼和翼面装甲条
  ;[-1, 1].forEach(s => {
    addMesh(ship, new THREE.BoxGeometry(0.07, 0.13, 0.48), hullSilver, [s * 0.52, 0.12, 0.48], [0, 0, -s * 0.36])
    addMesh(ship, new THREE.BoxGeometry(0.72, 0.018, 0.035), hullSilver, [s * 0.82, 0.075, 0.18], [0, 0, -s * 0.15])
    addMesh(ship, new THREE.SphereGeometry(0.035, 8, 8), createGlowMaterial(s < 0 ? 0xff647c : 0x62ffd0, 0.95), [s * 1.48, 0.09, 0.28])
  })
  // 背部传感器阵列
  ;[-0.12, 0, 0.12].forEach(x => {
    addMesh(ship, new THREE.BoxGeometry(0.055, 0.025, 0.24), hullSilver, [x, 0.235, 0.48])
  })

  // 双后置离子引擎与喷口辉光
  const engineMats = []
  ;[-1, 1].forEach(s => {
    addMesh(ship, new THREE.CylinderGeometry(0.13, 0.16, 0.44, 12), hullSilver, [s * 0.34, 0.14, 0.68], [Math.PI / 2, 0, 0])
    const glowMat = createGlowMaterial(theme.accentCyan, 0.8)
    addMesh(ship, new THREE.CylinderGeometry(0.105, 0.105, 0.035, 14), glowMat, [s * 0.34, 0.14, 0.92], [Math.PI / 2, 0, 0])
    engineMats.push(glowMat)
  })
  const mainGlowMat = createGlowMaterial(theme.accentIndigo, 0.78)
  addMesh(ship, new THREE.CylinderGeometry(0.13, 0.11, 0.04, 14), mainGlowMat, [0, 0.14, 0.83], [Math.PI / 2, 0, 0])

  pad.userData.update = (sec, inspectionTarget = '') => {
    const inspecting = inspectionTarget === 'aircraft'
    engineMats.forEach((mat, i) => {
      const idleOpacity = 0.5 + Math.sin(sec * 2.4 + i * 1.8) * 0.32
      const inspectionPulse = 0.5 + Math.sin(sec * 5 + i * 0.8) * 0.5
      mat.opacity = inspecting ? 0.55 + inspectionPulse * 0.4 : idleOpacity
    })
    mainGlowMat.opacity = inspecting
      ? 0.65 + Math.sin(sec * 4) * 0.28
      : 0.55 + Math.sin(sec * 1.7) * 0.28
  }
  return { pad, ship, update: pad.userData.update }
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
  const coatDarkMat = createMetalMaterial(0x14171f, 0.7, 0.15)
  const pantMat = createMetalMaterial(0x11131a, 0.75, 0.12)
  const shoeMat = createMetalMaterial(0x0a0c10, 0.5, 0.2)
  const soleMat = createMetalMaterial(0x1e222e, 0.6, 0.15)
  const skinMat = createMetalMaterial(0xd8b49a, 0.45, 0.1)
  const headphoneMat = createMetalMaterial(theme.metalHighlight, 0.18, 0.95)
  const glassMat = createMetalMaterial(0x3b4254, 0.25, 0.9)
  const glowDotMat = createGlowMaterial(theme.accentCyan, 0.85)
  const glowRingMat = createGlowMaterial(theme.accentCyan, 0.85)
  const badgeGlow = createGlowMaterial(theme.accentEmerald, 0.5)

  // 头部枢轴（挂在颈部高度，用于环视 / 低头动画）
  const head = new THREE.Group()
  head.position.set(0, 1.06, 0)
  person.add(head)
  const headInner = new THREE.Group()
  headInner.position.set(0, -1.06, 0)
  head.add(headInner)

  // 身体与立领风衣
  addMesh(person, new THREE.CapsuleGeometry(0.15, 0.52, 8, 16), coatMat, [0, 0.76, 0])
  // 大衣下摆（微外扩，盖住胯部）
  addMesh(person, new THREE.CylinderGeometry(0.16, 0.19, 0.2, 16), coatDarkMat, [0, 0.42, 0])
  // 腰带
  addMesh(person, new THREE.CylinderGeometry(0.155, 0.155, 0.035, 16), createMetalMaterial(0x0c0e14, 0.5, 0.3), [0, 0.56, 0])
  // 立领
  const collar = addMesh(person, new THREE.TorusGeometry(0.085, 0.022, 8, 18), coatDarkMat, [0, 1.09, 0], [Math.PI / 2.4, 0, 0])
  collar.scale.set(1.15, 1, 1)
  // 前襟拉链线 + 胸前工牌
  addMesh(person, new THREE.BoxGeometry(0.012, 0.52, 0.008), createMetalMaterial(0x3b4254, 0.3, 0.85), [0, 0.82, 0.152])
  addMesh(person, new THREE.BoxGeometry(0.07, 0.09, 0.006), badgeGlow, [-0.07, 0.95, 0.152])
  addMesh(person, new THREE.CylinderGeometry(0.075, 0.09, 0.09, 14), coatMat, [0, 1.05, 0])
  addMesh(headInner, new THREE.SphereGeometry(0.18, 20, 16), skinMat, [0, 1.22, 0])

  // 发型：主体 + 前额刘海
  const hair = addMesh(headInner, new THREE.SphereGeometry(0.185, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), coatMat, [0, 1.25, 0], [0.1, 0, 0])
  hair.scale.set(1.02, 0.8, 1.02)
  addMesh(headInner, new THREE.BoxGeometry(0.24, 0.07, 0.1), coatMat, [0, 1.31, 0.1], [0.22, 0, 0])
  // 双耳
  addMesh(headInner, new THREE.SphereGeometry(0.032, 8, 8), skinMat, [-0.175, 1.21, 0])
  addMesh(headInner, new THREE.SphereGeometry(0.032, 8, 8), skinMat, [0.175, 1.21, 0])

  // 细框眼镜（极客气质关键细节）
  ;[-0.075, 0.075].forEach(x => {
    addMesh(headInner, new THREE.TorusGeometry(0.042, 0.006, 6, 16), glassMat, [x, 1.235, 0.162])
  })
  addMesh(headInner, new THREE.BoxGeometry(0.055, 0.007, 0.007), glassMat, [0, 1.24, 0.165])
  // 鼻梁
  addMesh(headInner, new THREE.ConeGeometry(0.022, 0.06, 8), skinMat, [0, 1.2, 0.175], [Math.PI / 2, 0, 0])

  // 钛金轻量头戴耳机（耳罩 + 头梁 + 垂落线材）
  const band = addMesh(headInner, new THREE.TorusGeometry(0.195, 0.015, 8, 24, Math.PI), headphoneMat, [0, 1.25, 0])
  band.rotation.z = Math.PI / 2
  addMesh(headInner, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), headphoneMat, [-0.19, 1.22, 0], [0, 0, Math.PI / 2])
  addMesh(headInner, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), headphoneMat, [0.19, 1.22, 0], [0, 0, Math.PI / 2])
  const cablePoints = [
    new THREE.Vector3(-0.19, 1.2, -0.01),
    new THREE.Vector3(-0.23, 1.02, -0.09),
    new THREE.Vector3(-0.16, 0.84, -0.13),
    new THREE.Vector3(-0.05, 0.7, -0.1),
  ]
  addMesh(headInner, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints), 16, 0.006, 6), headphoneMat, [0, 0, 0])

  // 双臂按肩、肘、腕定位，走动时手掌仍连接在前臂末端
  const lUpper = addMesh(person, new THREE.CapsuleGeometry(0.045, 0.18, 6, 10), coatMat, [-0.2, 0.75, 0.02])
  const lFore = addMesh(person, new THREE.CapsuleGeometry(0.04, 0.16, 6, 10), coatMat, [-0.21, 0.56, 0.09])
  const lCuff = addMesh(person, new THREE.CylinderGeometry(0.045, 0.042, 0.03, 10), coatDarkMat, [-0.21, 0.51, 0.11])
  const lHand = addMesh(person, new THREE.SphereGeometry(0.036, 10, 8), skinMat, [-0.21, 0.46, 0.13])
  // 右臂：肩→肘→腕两段前伸（姿态可在全息交互与落手之间切换）
  const rUpper = addMesh(person, new THREE.CapsuleGeometry(0.045, 0.16, 6, 10), coatMat, [0.21, 0.94, 0.12], [0.85, 0, -0.3])
  const rFore = addMesh(person, new THREE.CapsuleGeometry(0.04, 0.16, 6, 10), coatMat, [0.25, 0.74, 0.26], [0.5, 0, -0.15])
  const rCuff = addMesh(person, new THREE.CylinderGeometry(0.04, 0.036, 0.03, 10), coatDarkMat, [0.26, 0.66, 0.3], [0.5, 0, -0.15])
  const rHand = addMesh(person, new THREE.SphereGeometry(0.037, 12, 10), skinMat, [0.27, 0.62, 0.33])
  rHand.scale.set(0.92, 0.9, 1.22)
  const rFinger = addMesh(person, new THREE.CapsuleGeometry(0.011, 0.025, 4, 6), skinMat, [0.28, 0.58, 0.37])

  // 右手指尖微型全息触控光晕
  const glowDot = addMesh(person, new THREE.SphereGeometry(0.024, 8, 8), glowDotMat, [0.28, 0.58, 0.37])
  const glowRing = addMesh(person, new THREE.TorusGeometry(0.052, 0.008, 6, 16), glowRingMat, [0.28, 0.55, 0.31], [Math.PI / 4, 0, 0])

  // 双腿：髋部枢轴（踱步时前后摆腿）
  const makeLeg = x => {
    const hip = new THREE.Group()
    hip.position.set(x, 0.52, 0)
    person.add(hip)
    addMesh(hip, new THREE.CapsuleGeometry(0.055, 0.44, 6, 10), pantMat, [0, -0.24, 0])
    addMesh(hip, new THREE.CylinderGeometry(0.058, 0.05, 0.04, 10), pantMat, [0, -0.43, 0])
    const shoe = addMesh(hip, new THREE.CapsuleGeometry(0.048, 0.12, 6, 10), shoeMat, [0, -0.465, 0.05], [Math.PI / 2, 0, 0])
    shoe.scale.set(1.15, 1, 1)
    addMesh(hip, new THREE.BoxGeometry(0.115, 0.018, 0.22), soleMat, [0, -0.508, 0.04])
    return hip
  }
  const lLeg = makeLeg(-0.085)
  const rLeg = makeLeg(0.085)

  // --- 待机行为：呼吸起伏 / 重心微移 / 环视低头 / 全息交互与落手切换 ---
  const smooth = x => x * x * (3 - 2 * x)
  const mix = (a, b, t) => a + (b - a) * t
  // 姿态以肩、肘、腕关节为基准，手掌和袖口始终跟随腕部
  const poseA = {
    shoulder: [0.21, 0.94, 0.12],
    elbow: [0.28, 0.82, 0.24],
    wrist: [0.32, 0.7, 0.38],
  }
  const poseB = {
    shoulder: [0.21, 0.92, 0.05],
    elbow: [0.27, 0.74, 0.09],
    wrist: [0.24, 0.58, 0.17],
  }
  const shoulder = new THREE.Vector3()
  const elbow = new THREE.Vector3()
  const wrist = new THREE.Vector3()
  const armDirection = new THREE.Vector3()
  const leftShoulder = new THREE.Vector3(-0.2, 0.94, 0.02)
  const leftElbow = new THREE.Vector3()
  const leftWrist = new THREE.Vector3()
  const leftDirection = new THREE.Vector3()
  const fingerTip = new THREE.Vector3()
  const yAxis = new THREE.Vector3(0, 1, 0)
  const zAxis = new THREE.Vector3(0, 0, 1)
  const setPoint = (target, from, to, amount) => target.set(
    mix(from[0], to[0], amount),
    mix(from[1], to[1], amount),
    mix(from[2], to[2], amount),
  )
  const setArmSegment = (mesh, start, end, direction) => {
    direction.subVectors(end, start).normalize()
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(yAxis, direction)
  }
  const setCuffAndHand = (cuff, hand, handDirection, handWrist) => {
    cuff.position.copy(handWrist).addScaledVector(handDirection, -0.012)
    cuff.quaternion.setFromUnitVectors(yAxis, handDirection)
    hand.position.copy(handWrist).addScaledVector(handDirection, 0.03)
    hand.quaternion.setFromUnitVectors(zAxis, handDirection)
  }

  // 行为路线：驻足交互 ↔ 短途踱步（沿桌子左前方小范围往返）
  const route = [
    { to: [-0.8, 0.75], ry: Math.PI * 0.92, dur: 7, mode: 'interact' },
    { to: [-1.42, 0.92], dur: 1.7, mode: 'move' },
    { to: [-1.42, 0.92], ry: 2.0, dur: 2.6, mode: 'idle' },
    { to: [-0.88, 0.95], dur: 1.6, mode: 'move' },
    { to: [-0.8, 0.75], dur: 0.9, mode: 'move' },
  ]
  const st = { idx: 0, t: 0, from: [...route[0].to], ryFrom: route[0].ry, ry: route[0].ry, phase: 0, legAmp: 0, lastSec: -1 }
  const normAngle = a => Math.atan2(Math.sin(a), Math.cos(a))
  const lerpAngle = (a, b, k) => a + normAngle(b - a) * k

  person.userData.update = sec => {
    // 帧间隔（标签页切回时防跳变）
    const dt = st.lastSec < 0 ? 0.016 : Math.min(0.05, Math.max(0, sec - st.lastSec))
    st.lastSec = sec
    st.t += dt

    // 段推进
    let seg = route[st.idx]
    if (st.t >= seg.dur) {
      st.ryFrom = st.ry
      st.from = [...seg.to]
      st.idx = (st.idx + 1) % route.length
      st.t = 0
      seg = route[st.idx]
    }

    // 位置与朝向
    const moveK = seg.mode === 'move' ? smooth(Math.min(1, st.t / seg.dur)) : 1
    person.position.x = seg.mode === 'move' ? mix(st.from[0], seg.to[0], moveK) : seg.to[0]
    person.position.z = seg.mode === 'move' ? mix(st.from[1], seg.to[1], moveK) : seg.to[1]
    if (seg.mode === 'move') {
      const dirRy = Math.atan2(seg.to[0] - st.from[0], seg.to[1] - st.from[1])
      st.ry = lerpAngle(st.ryFrom, dirRy, smooth(Math.min(1, st.t / (seg.dur * 0.4))))
    } else {
      st.ry = lerpAngle(st.ryFrom, seg.ry, smooth(Math.min(1, st.t / 0.9)))
    }
    person.rotation.y = st.ry

    // 走路相位与摆腿幅度
    st.legAmp += ((seg.mode === 'move' ? 1 : 0) - st.legAmp) * Math.min(1, dt * 6)
    st.phase += dt * 7.2 * st.legAmp
    lLeg.rotation.x = Math.sin(st.phase) * 0.42 * st.legAmp
    rLeg.rotation.x = -Math.sin(st.phase) * 0.42 * st.legAmp

    // 呼吸 + 走路重心起伏 + 迈步微侧倾
    person.position.y = 0.28 + Math.sin(sec * 1.7) * 0.012 + Math.abs(Math.cos(st.phase)) * 0.02 * st.legAmp
    person.rotation.z = Math.sin(sec * 0.33) * 0.018 + Math.sin(st.phase) * 0.02 * st.legAmp

    // 手臂姿态：交互抬起 / 驻足与行走自然下垂 + 行走摆臂
    let t
    if (seg.mode === 'interact') t = 1 - smooth(Math.min(1, st.t / 1.2))
    else if (seg.mode === 'move') t = 1 - smooth(Math.max(0, Math.min(1, 1 - st.t / 0.6)))
    else t = 1
    const swing = Math.sin(st.phase) * 0.045 * st.legAmp
    setPoint(shoulder, poseA.shoulder, poseB.shoulder, t)
    setPoint(elbow, poseA.elbow, poseB.elbow, t)
    setPoint(wrist, poseA.wrist, poseB.wrist, t)
    shoulder.z += swing * 0.35
    elbow.z += swing
    wrist.z += swing * 1.4
    setArmSegment(rUpper, shoulder, elbow, armDirection)
    setArmSegment(rFore, elbow, wrist, armDirection)
    setCuffAndHand(rCuff, rHand, armDirection, wrist)

    leftElbow.set(-0.21, 0.68, 0.035 - swing)
    leftWrist.set(-0.21, 0.49, 0.075 - swing * 1.35)
    setArmSegment(lUpper, leftShoulder, leftElbow, leftDirection)
    setArmSegment(lFore, leftElbow, leftWrist, leftDirection)
    setCuffAndHand(lCuff, lHand, leftDirection, leftWrist)

    fingerTip.copy(wrist).addScaledVector(armDirection, 0.105)
    rFinger.position.copy(fingerTip).addScaledVector(armDirection, -0.018)
    rFinger.quaternion.setFromUnitVectors(yAxis, armDirection)
    glowDot.position.copy(fingerTip).addScaledVector(armDirection, 0.018)
    glowRing.position.copy(fingerTip).addScaledVector(armDirection, -0.012)
    glowRing.quaternion.setFromUnitVectors(zAxis, armDirection)

    // 指尖光晕只在全息交互姿态出现，并轻微脉动
    glowDotMat.opacity = 0.85 * (1 - t)
    glowRingMat.opacity = 0.75 * (1 - t)
    glowRing.scale.setScalar(0.9 + Math.sin(sec * 3.2) * 0.12 * (1 - t) + t * 0.2)
    glowDot.scale.setScalar(1 + Math.sin(sec * 4.1) * 0.18 * (1 - t))

    // 头部：交互环视屏幕 / 驻足远眺左右扫视 / 行走目视前方
    let headY = 0
    let headX = 0.04
    if (seg.mode === 'interact') {
      headY = Math.sin(sec * 0.45) * 0.16 * (1 - t)
      headX = 0.16 * t + Math.sin(sec * 0.8) * 0.035
    } else if (seg.mode === 'idle') {
      headY = Math.sin(sec * 0.55) * 0.28
      headX = 0.05 + Math.sin(sec * 0.4) * 0.03
    }
    const hk = Math.min(1, dt * 5)
    head.rotation.y += (headY - head.rotation.y) * hk
    head.rotation.x += (headX - head.rotation.x) * hk
  }

  return person
}

function createStationTechnician(world) {
  const person = new THREE.Group()
  person.position.set(0.25, 0.28, 0.92)
  person.scale.setScalar(0.82)
  world.add(person)

  const suitMat = createMetalMaterial(0x344456, 0.48, 0.42)
  const vestMat = createMetalMaterial(0x86b8a8, 0.42, 0.24)
  const darkMat = createMetalMaterial(0x161c27, 0.62, 0.3)
  const bootMat = createMetalMaterial(0x0b1018, 0.48, 0.36)
  const skinMat = createMetalMaterial(0xd8b49a, 0.48, 0.08)
  const metalMat = createMetalMaterial(0x9babb7, 0.24, 0.86)
  const scannerMat = createMetalMaterial(0x101a27, 0.26, 0.72)
  const scannerGlow = createGlowMaterial(theme.accentCyan, 0.2)

  addMesh(person, new THREE.CapsuleGeometry(0.145, 0.43, 8, 12), suitMat, [0, 0.78, 0])
  addMesh(person, new THREE.BoxGeometry(0.23, 0.37, 0.018), vestMat, [0, 0.79, 0.133])
  ;[-1, 1].forEach(side => {
    addMesh(person, new THREE.BoxGeometry(0.025, 0.4, 0.02), createMetalMaterial(0xe2c17b, 0.34, 0.4), [side * 0.073, 0.79, 0.148])
  })
  addMesh(person, new THREE.BoxGeometry(0.08, 0.09, 0.022), metalMat, [-0.065, 0.93, 0.15])
  addMesh(person, new THREE.BoxGeometry(0.19, 0.24, 0.12), darkMat, [0, 0.77, -0.17])
  addMesh(person, new THREE.CylinderGeometry(0.064, 0.075, 0.1, 12), suitMat, [0, 1.08, 0])

  const head = new THREE.Group()
  head.position.set(0, 1.2, 0)
  person.add(head)
  addMesh(head, new THREE.SphereGeometry(0.14, 16, 12), skinMat, [0, 0, 0.015])
  addMesh(head, new THREE.SphereGeometry(0.158, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), vestMat, [0, 0.045, 0])
  addMesh(head, new THREE.CylinderGeometry(0.16, 0.16, 0.025, 16), metalMat, [0, 0.025, 0])
  addMesh(head, new THREE.BoxGeometry(0.2, 0.042, 0.12), darkMat, [0, -0.035, 0.118])
  addMesh(head, new THREE.BoxGeometry(0.16, 0.018, 0.012), createGlowMaterial(theme.accentCyan, 0.42), [0, -0.042, 0.126])

  const makeLeg = x => {
    const leg = new THREE.Group()
    leg.position.set(x, 0.51, 0)
    person.add(leg)
    addMesh(leg, new THREE.CapsuleGeometry(0.057, 0.37, 6, 10), darkMat, [0, -0.22, 0])
    addMesh(leg, new THREE.BoxGeometry(0.115, 0.09, 0.2), bootMat, [0, -0.45, 0.045])
    addMesh(leg, new THREE.BoxGeometry(0.12, 0.018, 0.2), metalMat, [0, -0.497, 0.045])
    return leg
  }
  const leftLeg = makeLeg(-0.078)
  const rightLeg = makeLeg(0.078)

  const makeArm = side => {
    const arm = new THREE.Group()
    arm.position.set(side * 0.18, 0.96, 0.015)
    person.add(arm)
    addMesh(arm, new THREE.CapsuleGeometry(0.045, 0.17, 6, 10), suitMat, [0, -0.12, 0], [0.12, 0, side * 0.12])
    addMesh(arm, new THREE.CapsuleGeometry(0.037, 0.16, 6, 10), suitMat, [0, -0.32, 0.055])
    addMesh(arm, new THREE.CylinderGeometry(0.04, 0.04, 0.035, 10), metalMat, [0, -0.42, 0.075])
    addMesh(arm, new THREE.SphereGeometry(0.033, 8, 8), skinMat, [0, -0.46, 0.08])
    return arm
  }
  const leftArm = makeArm(-1)
  const rightArm = makeArm(1)
  addMesh(rightArm, new THREE.BoxGeometry(0.13, 0.09, 0.035), scannerMat, [0, -0.405, 0.115])
  addMesh(rightArm, new THREE.BoxGeometry(0.09, 0.055, 0.006), scannerGlow, [0, -0.405, 0.136])
  const scanRing = addMesh(rightArm, new THREE.TorusGeometry(0.07, 0.006, 6, 20), scannerGlow, [0, -0.47, 0.2], [Math.PI / 2, 0, 0])

  const route = [
    { to: [0.25, 0.92], dur: 1.5, mode: 'idle', yaw: 0 },
    { to: [0.65, -0.42], dur: 3, mode: 'walk' },
    { to: [0.65, -0.42], dur: 3.8, mode: 'server', target: 'server', yaw: Math.PI },
    { to: [0.25, -0.42], dur: 1.8, mode: 'walk' },
    { to: [0.25, 1.52], dur: 2.8, mode: 'walk' },
    { to: [1.15, 1.72], dur: 1.8, mode: 'walk' },
    { to: [2.35, 1.36], dur: 2.1, mode: 'walk' },
    { to: [2.38, 1.36], dur: 3.4, mode: 'robot', target: 'robot', yaw: Math.PI / 2 },
    { to: [2.4, 1.82], dur: 1.3, mode: 'walk' },
    { to: [1.55, 2.85], dur: 2.2, mode: 'walk' },
    { to: [1.55, 2.85], dur: 4, mode: 'aircraft', target: 'aircraft', yaw: -Math.PI / 2 },
    { to: [2.4, 1.82], dur: 2.2, mode: 'walk' },
    { to: [0.65, 1.52], dur: 1.4, mode: 'walk' },
    { to: [0.25, 0.92], dur: 1.2, mode: 'walk' },
  ]
  const state = { index: 0, elapsed: 0, from: [...route[0].to], yaw: 0, yawFrom: 0, phase: 0, stride: 0, lastSec: -1 }
  const smooth = value => value * value * (3 - 2 * value)
  const mix = (from, to, amount) => from + (to - from) * amount
  const lerpAngle = (from, to, amount) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount

  person.userData.update = sec => {
    const dt = state.lastSec < 0 ? 0.016 : Math.min(0.05, Math.max(0, sec - state.lastSec))
    state.lastSec = sec
    state.elapsed += dt
    let segment = route[state.index]
    if (state.elapsed >= segment.dur) {
      state.from = [...segment.to]
      state.yawFrom = state.yaw
      state.index = (state.index + 1) % route.length
      state.elapsed = 0
      segment = route[state.index]
    }

    const moving = segment.mode === 'walk'
    const progress = smooth(Math.min(1, state.elapsed / segment.dur))
    person.position.x = moving ? mix(state.from[0], segment.to[0], progress) : segment.to[0]
    person.position.z = moving ? mix(state.from[1], segment.to[1], progress) : segment.to[1]
    const targetYaw = moving
      ? Math.atan2(segment.to[0] - state.from[0], segment.to[1] - state.from[1])
      : segment.yaw ?? state.yaw
    state.yaw = lerpAngle(state.yawFrom, targetYaw, smooth(Math.min(1, state.elapsed / (moving ? 1.1 : 0.8))))
    person.rotation.y = state.yaw

    state.stride += dt * 8 * (moving ? 1 : 0)
    const strideAmount = Math.min(1, dt * 7)
    const stride = moving ? 0.42 : 0
    leftLeg.rotation.x += (Math.sin(state.stride) * stride - leftLeg.rotation.x) * strideAmount
    rightLeg.rotation.x += (-Math.sin(state.stride) * stride - rightLeg.rotation.x) * strideAmount
    const inspect = segment.target ? smooth(Math.max(0, Math.min(1, state.elapsed / 0.7, (segment.dur - state.elapsed) / 0.7))) : 0
    person.position.y = 0.28 + Math.sin(sec * 1.8) * 0.008 + Math.abs(Math.cos(state.stride)) * 0.018 * (moving ? 1 : 0)
    person.rotation.x = mix(0, 0.06, inspect)
    person.rotation.z = Math.sin(state.stride) * 0.018 * (moving ? 1 : 0)
    const reach = segment.target === 'robot' ? 0.42 : 0.9
    rightArm.rotation.x += (-0.08 - inspect * reach + Math.sin(state.stride) * 0.12 * (moving ? 1 : 0) - rightArm.rotation.x) * strideAmount
    leftArm.rotation.x += (-0.06 - inspect * (segment.target === 'robot' ? 0.28 : 0.16) - leftArm.rotation.x) * strideAmount
    rightArm.rotation.z += (-0.08 - inspect * 0.16 - rightArm.rotation.z) * strideAmount
    head.rotation.x += (0.06 + inspect * 0.2 + Math.sin(sec * 0.8) * 0.025 - head.rotation.x) * Math.min(1, dt * 4)
    head.rotation.y += (Math.sin(sec * 0.55) * 0.16 * (moving ? 0.3 : 1) - head.rotation.y) * Math.min(1, dt * 3)
    scannerGlow.opacity = segment.target ? 0.35 + (0.5 + Math.sin(sec * 6) * 0.5) * 0.55 * inspect : 0.2
    scanRing.scale.setScalar(0.85 + inspect * (0.18 + Math.sin(sec * 4) * 0.08))
    person.userData.inspectionTarget = segment.target || ''
    return person.userData.inspectionTarget
  }
  return person
}

// 6. 左侧信息展示栏（实体立柱支架：落地底座 + 立杆 + 托架）
function createFloatingPortals(world) {
  const group = new THREE.Group()
  // 房子左侧，落地放置
  group.position.set(-2.6, 0.24, 0.75)
  // 微朝向场景中心，便于环绕视角阅读
  group.rotation.y = Math.PI * 0.18
  world.add(group)

  const standMat = createMetalMaterial(0x1c202c, 0.3, 0.85)
  const standSilver = createMetalMaterial(theme.metalHighlight, 0.15, 0.94)

  // 落地底座 + 能量环
  addMesh(group, new THREE.CylinderGeometry(0.2, 0.27, 0.05, 8), standMat, [0, 0.025, 0], [0, Math.PI / 8, 0])
  addMesh(group, new THREE.CylinderGeometry(0.21, 0.21, 0.008, 8), createGlowMaterial(theme.accentCyan, 0.5), [0, 0.052, 0], [0, Math.PI / 8, 0])
  // 立杆 + 杆顶发射环
  addMesh(group, new THREE.CylinderGeometry(0.018, 0.026, 0.62, 10), standSilver, [0, 0.36, -0.02])
  addMesh(group, new THREE.TorusGeometry(0.032, 0.007, 6, 18), createGlowMaterial(theme.accentCyan, 0.75), [0, 0.67, -0.02], [Math.PI / 2, 0, 0])
  // 背部托架（连接立杆与面板）
  addMesh(group, new THREE.BoxGeometry(0.05, 0.02, 0.06), standSilver, [0, 0.5, -0.005])
  addMesh(group, new THREE.BoxGeometry(0.05, 0.02, 0.06), standSilver, [0, 0.74, -0.005])

  const panelData = createInfoPanelTexture()
  const panelMat = new THREE.MeshBasicMaterial({
    map: panelData.texture,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  })
  // 512×800 纹理对应 0.64 单位宽 → 高 1.0
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.0), panelMat)
  panel.position.set(0, 0.81, 0.012)
  group.add(panel)

  return { portalGroup: group, panel, panelUpdate: panelData.update }
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
  const groundBot = createGroundBot(world)
  const landingPadData = createLandingPad(world)
  const droneData = createInspectorDrone(world)
  const person = createArchitectFigure(world)
  const technician = createStationTechnician(world)
  const portalData = createFloatingPortals(world)
  const photonData = createDataPhotons(scene)

  return {
    world,
    chassis,
    studioData,
    towerData,
    groundBot,
    landingPadData,
    droneData,
    person,
    technician,
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

  // 4. 巡检技师、服务器与机器人互动
  const { studioData, person, technician } = context
  const inspectionTarget = technician?.userData?.update?.(sec) || ''
  if (studioData && studioData.blinkLeds) {
    studioData.blinkLeds.forEach((led, index) => {
      const idleOpacity = 0.35 + Math.sin(sec * led.speed + led.phase) * 0.45
      const inspectionPulse = 0.35 + (0.5 + Math.sin(sec * 6 + index * 0.65) * 0.5) * 0.65
      led.mat.opacity = inspectionTarget === 'server' ? inspectionPulse : idleOpacity
    })
    studioData.holoUpdate?.(sec)
    studioData.serverScreenUpdate?.(sec)
  }
  person?.userData?.update?.(sec)
  context.groundBot?.userData?.update?.(sec, inspectionTarget)
  context.landingPadData?.update?.(sec, inspectionTarget)

  // 5. 左侧信息展示栏：内容刷新
  const { portalData } = context
  if (portalData?.panelUpdate) {
    portalData.panelUpdate(sec)
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
