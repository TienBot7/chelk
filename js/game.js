const TARGET_SCORE = 7
const bubblesContainer = document.querySelector('.bubbles-container2')
const grayColor = '#9E9E9E'
const MAIN_OBJECT_COLORS = {
  Хорека: '#C4142D',
  Одежда: '#1D737B',
  Косметика: '#7B1D7B',
}

function getSelectedColorVariant() {
  const mainText = document.getElementById('mainObject')?.textContent?.trim() || window.mainObject || ''
  return MAIN_OBJECT_COLORS[mainText] || '#1D737B'
}

let selectedColorVariant = getSelectedColorVariant()
const lottiePatternElement = document.querySelector('.lottie-pattern')
const popSoundPaths = ['./audio/pop1.mp3', './audio/pop2.mp3']
const preloadedAudio = {
  chelk: new Audio('audio/chelk.mp3'),
  pop1: new Audio('audio/pop1.mp3'),
  pop2: new Audio('audio/pop2.mp3'),
}
Object.values(preloadedAudio).forEach((audio) => {
  audio.preload = 'auto'
  audio.load()
})

function getPreloadedAudio(url) {
  const cached = Object.values(preloadedAudio).find((audio) => audio.src.endsWith(url))
  if (cached) {
    try {
      const clone = cached.cloneNode(true)
      clone.preload = 'auto'
      return clone
    } catch (e) {
      return new Audio(url)
    }
  }
  return new Audio(url)
}

function playPopSound() {
  try {
    if (window.audioManager && typeof window.audioManager.play === 'function') {
      const pick = Math.random() < 0.5 ? 'pop1' : 'pop2'
      window.audioManager.play(pick, { volume: 0.6 })
      return
    }
  } catch (e) {}
  const sound = getPreloadedAudio(popSoundPaths[Math.floor(Math.random() * popSoundPaths.length)])
  sound.volume = 0.6
  sound.play().catch(() => {})
}

function loadPatternSvg(color) {
  if (!lottiePatternElement) return
  fetch('./other/pattern.svg')
    .then((response) => {
      if (!response.ok) throw new Error('Pattern SVG not found')
      return response.text()
    })
    .then((svgText) => {
      const coloredSvg = svgText
        .replace(/<path([^>]*\bid=['"]patternTail['"][^>]*)>/gi, (match, attrs) => {
          let updated = match.replace(/stroke="[^"]*"/gi, '')
          if (/fill="[^"]*"/i.test(updated)) {
            updated = updated.replace(/fill="[^"]*"/gi, `fill="${color}"`)
          } else {
            updated = updated.replace(/(\s*\/?>)$/, ` fill="${color}"$1`)
          }
          return updated
        })
        .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
      lottiePatternElement.innerHTML = coloredSvg
    })
    .catch(() => {
      lottiePatternElement.innerHTML = '<img src="./other/pattern.svg" alt="pattern">'
    })
}

const gameColors = [grayColor, selectedColorVariant]

function syncSelectedColorVariant() {
  selectedColorVariant = getSelectedColorVariant()
  loadPatternSvg(selectedColorVariant)
  gameColors[1] = selectedColorVariant
  const platformElement = document.querySelector('.platform')
  if (platformElement) applyPlatformColor(platformElement, selectedColorVariant)
  if (typeof window !== 'undefined') {
    void preloadSingleLottieResource(window.mainObject || selectedColorVariant)
  }
}

window.addEventListener('mainObjectChange', syncSelectedColorVariant)

loadPatternSvg(selectedColorVariant)
let initialColoredSpawned = false
let isMerging = false
let mixedDone = false
const MAX_LIQUID_LEVEL = 7
const FILL_MAX_PERCENT = 94
const FILL_HALF_PERCENT = Math.round(FILL_MAX_PERCENT * 0.66)

const platformDevice = document.querySelector('.platform .device')
const points = Array.from(document.querySelectorAll('.points-wrapper .game-point'))
const pointsWrapper = document.querySelector('.points-wrapper')
const pointsCounter = document.getElementById('pointsCounter')
const controlsPanel = document.getElementById('controlsPanel')
const messagePanel = document.getElementById('messagePanel')
const mixWrapper = document.getElementById('mixWrapper')
const mixBtn = document.getElementById('mixBtn')
const btnPlayAgain = document.getElementById('btnPlayAgain')
const btnRequest = document.getElementById('btnRequest')
const rangeInputs = Array.from(document.querySelectorAll('.range-input'))
const platform = document.querySelector('.platform')

if (btnPlayAgain) {
  btnPlayAgain.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    window.location.reload()
  })
}
if (btnRequest) {
  btnRequest.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    playCheklSound()
    const formSection = document.querySelector('.form')
    const header = document.getElementById('header')
    if (formSection) {
      formSection.classList.add('visible')
    }
    if (header) {
      header.classList.add('is-dark')
    }
  })
}

function playCheklSound() {
  try {
    if (window.audioManager && typeof window.audioManager.play === 'function') {
      window.audioManager.play('chelk', { volume: 0.54 })
      return
    }
    const audio = getPreloadedAudio('audio/chelk.mp3')
    audio.volume = 0.54
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch (e) {}
}

function updatePlatformLiquid(scoreValue) {
  const PARTS = 7
  const maxIndex = PARTS - 1
  const level = Math.max(0, Math.min(maxIndex, Math.round(scoreValue)))
  const percent = Math.round((level / maxIndex) * 94)
  if (platformDevice) platformDevice.style.setProperty('--progress', percent + '%')
  updatePointsDisplay(scoreValue)
}

function clearBubblePointerCursor() {
  const bubbles = Array.from(bubblesContainer.querySelectorAll('.bubble, .bubble2'))
  for (const bubble of bubbles) {
    bubble.style.cursor = 'default'
    bubble.style.setProperty('cursor', 'default', 'important')
  }
}

function updatePointsDisplay(scoreValue) {
  const defaultOpacities = [0.3, 0.42, 0.53, 0.65, 0.77, 0.88, 1]
  const activeCount = Math.max(0, Math.min(points.length, scoreValue))
  points.forEach((point, index) => {
    if (index < activeCount) {
      point.style.backgroundColor = selectedColorVariant
      point.style.opacity = defaultOpacities[index]
    } else {
      point.style.backgroundColor = '#303132'
      point.style.opacity = defaultOpacities[index]
    }
  })
}

function applyPlatformColor(platformElement, color) {
  if (!platformElement) return
  const device = platformElement.classList.contains('device') ? platformElement : platformElement.querySelector('.device')
  if (!device) return
  for (let i = 1; i <= 5; i++) {
    device.style.setProperty(`--c${i}`, color)
  }
}

function applyPlatformProgress(platformElement, percent) {
  const device = platformElement.querySelector('.device')
  if (!device) return
  device.style.setProperty('--progress', `${percent}%`)
}

function animateDeviceProgress(deviceElement, targetPercent, duration = 1200, onComplete) {
  if (!deviceElement) return
  const startValue = Number((getComputedStyle(deviceElement).getPropertyValue('--progress') || '0').trim().replace('%', ''))
  const endValue = Number(targetPercent)
  const delta = endValue - startValue
  if (delta === 0) {
    if (typeof onComplete === 'function') onComplete()
    return
  }
  const startTime = performance.now()

  const step = (time) => {
    const elapsed = Math.min(duration, time - startTime)
    const progress = elapsed / duration
    const current = startValue + delta * progress
    deviceElement.style.setProperty('--progress', `${current}%`)
    if (elapsed < duration) {
      requestAnimationFrame(step)
    } else {
      deviceElement.style.setProperty('--progress', `${endValue}%`)
      if (typeof onComplete === 'function') onComplete()
    }
  }

  requestAnimationFrame(step)
}

const liquidEffectState = {
  canvas: null,
  ctx: null,
  particles: [],
  rafId: null,
  intervalId: null,
  color: selectedColorVariant,
}

function getLiquidGooeySettings() {
  const width = window.innerWidth || document.documentElement.clientWidth
  const isSmall = width < 600
  return {
    stdDeviation: isSmall ? '6' : '8', //склеивание жидкости
    matrixValues: isSmall ? '7 -3' : '14 -5', //плотность жидкости
  }
}

function ensureLiquidGooeyFilter() {
  if (document.getElementById('chelkLiquidGooeyFilter')) return
  const svgNs = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNs, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  svg.style.width = '0'
  svg.style.height = '0'
  svg.style.overflow = 'hidden'

  const defs = document.createElementNS(svgNs, 'defs')
  const filter = document.createElementNS(svgNs, 'filter')
  filter.id = 'chelkLiquidGooeyFilter'
  filter.setAttribute('height', '130%')
  filter.setAttribute('filterUnits', 'userSpaceOnUse')

  const settings = getLiquidGooeySettings()
  const blur = document.createElementNS(svgNs, 'feGaussianBlur')
  blur.setAttribute('in', 'SourceGraphic')
  blur.setAttribute('stdDeviation', settings.stdDeviation)
  blur.setAttribute('result', 'blur')

  const matrix = document.createElementNS(svgNs, 'feColorMatrix')
  matrix.setAttribute('in', 'blur')
  matrix.setAttribute('mode', 'matrix')
  matrix.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${settings.matrixValues}`)

  filter.appendChild(blur)
  filter.appendChild(matrix)
  defs.appendChild(filter)
  svg.appendChild(defs)
  document.body.appendChild(svg)
}

function getLiquidEffectColor() {
  const mainText = document.getElementById('mainObject')?.textContent?.trim() || window.mainObject || ''
  if (mainText === 'Хорека') return '#E43B51'
  if (mainText === 'Косметика') return '#7D267D'
  if (mainText === 'Одежда') return '#317D84'
  return selectedColorVariant
}

function hexToRgba(hex, alpha) {
  const cleanHex = (hex || '#1D737B').replace('#', '')
  const normalized =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : cleanHex
  const intValue = Number.parseInt(normalized, 16)
  const r = (intValue >> 16) & 255
  const g = (intValue >> 8) & 255
  const b = intValue & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function randomNumBetween(min, max) {
  return Math.random() * (max - min) + min
}

function resetLiquidCanvasSize() {
  if (!liquidEffectState.canvas || !liquidEffectState.ctx) return
  const width = window.innerWidth || document.documentElement.clientWidth
  const height = window.innerHeight || document.documentElement.clientHeight
  const ratio = window.devicePixelRatio || 1
  const canvas = liquidEffectState.canvas
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  liquidEffectState.ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  updateLiquidGooeyFilter()
}

function updateLiquidGooeyFilter() {
  const filter = document.getElementById('chelkLiquidGooeyFilter')
  if (!filter) return
  const blur = filter.querySelector('feGaussianBlur')
  const matrix = filter.querySelector('feColorMatrix')
  if (!blur || !matrix) return
  const settings = getLiquidGooeySettings()
  blur.setAttribute('stdDeviation', settings.stdDeviation)
  matrix.setAttribute('values', `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${settings.matrixValues}`)
}

function repositionLiquidParticles(prevWidth, prevHeight) {
  if (!liquidEffectState.canvas || liquidEffectState.particles.length === 0) return
  const ratio = window.devicePixelRatio || 1
  const oldWidth = prevWidth / ratio
  const oldHeight = prevHeight / ratio
  const rect = liquidEffectState.canvas.getBoundingClientRect()
  const deltaX = rect.width / 2 - oldWidth / 2
  const deltaY = rect.height / 2 - oldHeight / 2
  if (deltaX === 0 && deltaY === 0) return
  liquidEffectState.particles.forEach((particle) => {
    particle.x += deltaX
    particle.y += deltaY
  })
}

function createLiquidCanvas(color) {
  const liquidWrapper = document.body
  if (!liquidWrapper) return null
  if (liquidEffectState.canvas) return liquidEffectState.canvas
  ensureLiquidGooeyFilter()

  const canvas = document.createElement('canvas')
  canvas.className = 'chelk-liquid-canvas'
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100dvh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '10'
  canvas.style.background = 'transparent'
  canvas.style.opacity = '0'
  canvas.style.transition = 'opacity 0.35s ease'

  try {
    const ua = (navigator && navigator.userAgent) || ''
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua) && !/Android/.test(ua)
    const isAndroid = /Android/.test(ua)
    if (!isSafari && !isAndroid) {
      canvas.style.filter = 'url(#chelkLiquidGooeyFilter)'
      canvas.style.webkitFilter = 'url(#chelkLiquidGooeyFilter)'
    } else {
      canvas.style.filter = 'none'
      canvas.style.webkitFilter = 'none'
    }
  } catch (e) {
    canvas.style.filter = 'none'
  }

  liquidWrapper.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    return null
  }

  liquidEffectState.canvas = canvas
  liquidEffectState.ctx = ctx
  liquidEffectState.color = color
  liquidEffectState.particles = []
  resetLiquidCanvasSize()
  return canvas
}

function addLiquidParticle() {
  const canvas = liquidEffectState.canvas
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const glassContainer = platform?.querySelector('.device .glass-container')
  const glassRect = glassContainer ? glassContainer.getBoundingClientRect() : null
  const pourPoint = platform?.querySelector('.device-rotator .test2')
  const pourRect = pourPoint ? pourPoint.getBoundingClientRect() : null

  let originX = rect.width / 2
  let originY = rect.height / 2

  if (pourRect) {
    originX = pourRect.left + pourRect.width / 2 - rect.left
    originY = pourRect.top + pourRect.height / 2 - rect.top - 6
  } else if (glassRect) {
    originX = glassRect.left + glassRect.width / 2 - rect.left
    originY = glassRect.top + glassRect.height / 2 - rect.top - 6
  }

  const count = Math.round(randomNumBetween(5, 8)) //число новых частиц за вызов
  for (let i = 0; i < count; i++) {
    const radius = randomNumBetween(8, 9) //размер частиц
    liquidEffectState.particles.push({
      x: originX + randomNumBetween(-20, 20),
      y: originY + randomNumBetween(-15, 15),
      r: radius,
      vx: randomNumBetween(1.0, 2.0),
      vy: randomNumBetween(-1.0, 0.4),
      alpha: randomNumBetween(0.88, 1), //непрозрачность
    })
  }
}

function updateLiquidParticles() {
  const canvas = liquidEffectState.canvas
  const ctx = liquidEffectState.ctx
  if (!canvas || !ctx) return
  const rect = canvas.getBoundingClientRect()
  ctx.clearRect(0, 0, rect.width, rect.height)
  const fillColor = hexToRgba(liquidEffectState.color || selectedColorVariant || '#1D737B', 0.92) //непрозрачность

  for (let i = liquidEffectState.particles.length - 1; i >= 0; i--) {
    const particle = liquidEffectState.particles[i]
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vy += 0.18

    if (particle.y - particle.r > rect.height || particle.x - particle.r > rect.width + 60) {
      liquidEffectState.particles.splice(i, 1)
      continue
    }

    ctx.beginPath()
    ctx.fillStyle = fillColor
    ctx.globalAlpha = particle.alpha
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
  liquidEffectState.rafId = requestAnimationFrame(updateLiquidParticles)
}

function showLiquidEffectOverBottle(showImmediately = true) {
  stopLiquidEffect()
  const effectColor = getLiquidEffectColor()
  liquidEffectState.color = effectColor
  const canvas = createLiquidCanvas(effectColor)
  if (!canvas) return null
  resetLiquidCanvasSize()
  liquidEffectState.intervalId = setInterval(addLiquidParticle, 50)
  updateLiquidParticles()
  if (showImmediately) {
    requestAnimationFrame(() => {
      if (liquidEffectState.canvas) {
        liquidEffectState.canvas.style.opacity = '1'
      }
    })
  }
  return canvas
}

function stopLiquidEffect() {
  if (liquidEffectState.intervalId) {
    clearInterval(liquidEffectState.intervalId)
    liquidEffectState.intervalId = null
  }
  if (liquidEffectState.rafId) {
    cancelAnimationFrame(liquidEffectState.rafId)
    liquidEffectState.rafId = null
  }
  if (liquidEffectState.canvas && liquidEffectState.canvas.parentNode) {
    liquidEffectState.canvas.parentNode.removeChild(liquidEffectState.canvas)
  }
  liquidEffectState.canvas = null
  liquidEffectState.ctx = null
  liquidEffectState.particles = []
}

const bottleStates = ['empty', 'half', 'full']
const bottleStateValue = { empty: 0, half: 1, full: 2 }
const messageMap = {
  0: {
    empty: 'Визуал не спорит с текстом, потому что его считай нет. Добавь Креатива!',
    full: 'Идея в порядке. Реальность попросила пощады.',
  },
  1: {
    empty: 'Целевая аудитория — все. От восьми до восьмидесяти. Необходима Стратегия!',
    full: 'Архитектура бренда настолько безупречна, что её жалко портить реальными продажами. ',
  },
  2: {
    empty: 'Эстетика абсолютной стабильности: эпохи меняются, а этот шрифт остаётся. Отслеживай Тренды!',
    full: 'Пока концепт шёл по цепочке согласований, он успел стать кринжем, пост-иронией и в итоге абсолютной базой.',
  },
  3: {
    empty: 'Бренд, с которым всем комфортно. Включая конкурентов. Нужна Провокация!',
    full: 'Половина команды в восторге. Вторая — просит убрать фамилии.',
  },
  4: {
    empty: 'Удача — это проклятие дилетантов. Используй Х-фактор!',
    full: 'Кармический джекпот. Сошлись правильный день недели, фаза Луны и идеальное похмелье арт-директора.',
  },
}
const messageLabels = {
  0: 'Креатив',
  1: 'Стратегия',
  2: 'Тренды',
  3: 'Провокация',
  4: 'X-фактор',
}

function getTotalBottleUnits() {
  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  return bottles.reduce((sum, bottle) => {
    const state = bottle.dataset.state || 'empty'
    return sum + (bottleStateValue[state] || 0)
  }, 0)
}

function updateBottleUnitsDisplay() {
  const used = getTotalBottleUnits()
  updatePointsDisplay(used)
  if (pointsCounter) {
    const percent = Math.round((used / TARGET_SCORE) * 100)
    pointsCounter.textContent = `${used} / ${TARGET_SCORE} частей (${percent}% жидкости)`
  }

  if (used >= 5 && typeof window !== 'undefined' && typeof window.forceShowHelpPrompt === 'function' && !window.__firstBottleHelpShown) {
    window.__firstBottleHelpShown = true
    window.forceShowHelpPrompt()
  }

  updateRangeLinePositions()
  updateMessagePanel()
  updateMixButtonVisibility()
}

function getMessageLines() {
  const used = getTotalBottleUnits()
  if (used !== TARGET_SCORE) return []

  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  const states = bottles.map((bottle) => ({
    index: Number(bottle.dataset.index),
    state: bottle.dataset.state || 'empty',
  }))
  const emptyBottle = states.find((item) => item.state === 'empty')
  if (emptyBottle) {
    return [
      {
        state: 'empty',
        label: messageLabels[emptyBottle.index],
        text: messageMap[emptyBottle.index].empty,
      },
    ]
  }
  return states
    .filter((item) => item.state === 'full')
    .map((item) => ({
      state: 'full',
      label: messageLabels[item.index],
      text: messageMap[item.index].full,
    }))
}

function updateMessagePanel() {
  if (!messagePanel) return
  const messages = getMessageLines()
  if (!messages.length) {
    messagePanel.innerHTML = ''
    messagePanel.classList.remove('show')
    return
  }
  messagePanel.innerHTML = messages
    .map((message) => {
      const icon =
        message.state === 'full'
          ? '<img src="./other/white-icon.svg" alt="full message icon" />'
          : '<img src="./other/red-icon.svg" alt="empty message icon" />'
      const nullStateClass = message.state === 'empty' ? ' message-item-null' : ''
      return `
          <div class="message-item ${nullStateClass}">
            <div class='message-icon'>${icon}</div>
            <div class='message-content'>
              <p class="message-label">✦ ${message.label} ✦</p>
              <p>${message.text}</p>
            </div>
          </div>
        `
    })
    .join('')
  messagePanel.classList.add('show')
}

function updateRangeLineForIndex(index, state) {
  const input = rangeInputs.find((input) => Number(input.dataset.index) === index)
  if (!input) return
  const line = input.closest('.glass-range')?.querySelector('.range-line')
  if (!line) return
  const position = state === 'empty' ? '0%' : state === 'half' ? '50%' : '100%'
  line.style.left = position
}

function updateRangeLinePositions() {
  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  bottles.forEach((bottle) => {
    const index = Number(bottle.dataset.index)
    const state = bottle.dataset.state || 'empty'
    updateRangeLineForIndex(index, state)
  })
}

function hasEmptyBottle() {
  return Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy')).some((bottle) => (bottle.dataset.state || 'empty') === 'empty')
}

function updateMixButtonVisibility() {
  const used = getTotalBottleUnits()
  const empty = hasEmptyBottle()
  if (mixWrapper) {
    if (!mixedDone && used === TARGET_SCORE && platformRowShown && !empty) {
      mixWrapper.classList.add('show')
    } else {
      mixWrapper.classList.remove('show')
    }
  }
  if (mixBtn) {
    const disabled = used !== TARGET_SCORE || empty || isMerging || mixedDone
    mixBtn.disabled = disabled
    mixBtn.classList.toggle('disabled-mix', disabled)
  }
}

let lottieScriptLoading = null
let lottieAnimation = null
let lottieScrollHandler = null
const isSafariLottie = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

function loadLottieLib() {
  if (window.lottie) return Promise.resolve(window.lottie)
  if (lottieScriptLoading) return lottieScriptLoading
  lottieScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js'
    script.onload = () => resolve(window.lottie)
    script.onerror = () => reject(new Error('Lottie failed to load'))
    document.body.appendChild(script)
  })
  return lottieScriptLoading
}

function getMergedBottleColor(color) {
  if (color === '#1D737B') return '#1D737B'
  if (color === '#7B1D7B') return '#7B1D7B'
  if (color === '#C4142D') return '#C4142D'
  return color
}

function getLottiePathForColor(color) {
  if (color === '#C4142D') return './other/red.json'
  if (color === '#7B1D7B') return './other/purple.json'
  if (color === '#1D737B') return './other/green.json'
  return './other/green.json'
}

function preloadAudioFiles() {
  const audioUrls = ['audio/chelk.mp3', 'audio/music.mp3']
  return Promise.all(
    audioUrls.map((url) =>
      fetch(url, { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`Failed to preload audio: ${url}`)
          return response.arrayBuffer()
        })
        .catch((error) => {
          console.warn('Audio preload failed:', url, error)
        }),
    ),
  )
}

const cachedLottieJson = {}

function preloadSingleLottieResource(selectionValue = '') {
  const color =
    selectionValue && typeof selectionValue === 'string' && MAIN_OBJECT_COLORS[selectionValue]
      ? MAIN_OBJECT_COLORS[selectionValue]
      : selectedColorVariant
  const path = getLottiePathForColor(color)
  if (cachedLottieJson[path]) {
    return Promise.resolve(cachedLottieJson[path])
  }

  return fetch(path, { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to preload Lottie JSON: ${path}`)
      return response.json()
    })
    .then((json) => {
      if (json) cachedLottieJson[path] = json
      return json
    })
    .catch((error) => {
      console.warn('Lottie JSON preload failed:', path, error)
      return null
    })
}

function preloadStartupResources() {
  const tasks = [preloadAudioFiles(), preloadSingleLottieResource(window.mainObject || '')]
  if (typeof window !== 'undefined' && window.preloader && typeof window.preloader.addWaitTask === 'function') {
    tasks.forEach((task) => window.preloader.addWaitTask(task))
  }
}

if (typeof window !== 'undefined') {
  preloadStartupResources()
}

function clearLottieScrollListener() {
  const scrollArea = document.getElementById('lottieScrollArea')
  const lottieContainerEl = document.getElementById('lottieContainer')
  if (scrollArea && lottieScrollHandler) {
    try {
      scrollArea.removeEventListener('scroll', lottieScrollHandler)
    } catch (e) {}
  }
  if (lottieAnimation && lottieScrollHandler) {
    try {
      lottieAnimation.removeEventListener('enterFrame', lottieScrollHandler)
    } catch (e) {}
  }
  if (lottieContainerEl && lottieAnimation && lottieAnimation._clickHandler) {
    try {
      lottieContainerEl.removeEventListener('click', lottieAnimation._clickHandler)
    } catch (e) {}
  }
  if (scrollArea && lottieAnimation && lottieAnimation._scrollHandler) {
    try {
      scrollArea.removeEventListener('scroll', lottieAnimation._scrollHandler)
    } catch (e) {}
  }
  lottieScrollHandler = null
}

function playLottieAnimation(path) {
  const overlay = document.getElementById('lottieOverlay')
  const lottieContainerEl = document.getElementById('lottieContainer')
  const scrollArea = document.getElementById('lottieScrollArea')

  console.log('🎬 playLottieAnimation called:', {
    overlayExists: !!overlay,
    containerExists: !!lottieContainerEl,
    scrollAreaExists: !!scrollArea,
    path,
  })

  if (!overlay || !lottieContainerEl || !scrollArea) {
    console.error('❌ Lottie elements not found!', { overlay, lottieContainerEl, scrollArea })
    return
  }

  overlay.classList.remove('show')
  overlay.style.removeProperty('display')
  overlay.style.visibility = 'hidden'
  overlay.style.opacity = '0'
  overlay.style.pointerEvents = 'none'

  scrollArea.style.overflowY = 'auto'
  scrollArea.scrollTop = 0
  lottieContainerEl.innerHTML = ''
  clearLottieScrollListener()
  if (lottieAnimation) {
    lottieAnimation.destroy()
    lottieAnimation = null
  }
  loadLottieLib()
    .then((lottie) => {
      const animationOptions = {
        container: lottieContainerEl,
        renderer: isSafariLottie ? 'canvas' : 'svg',
        loop: false,
        autoplay: false,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
          clearCanvas: true,
          progressiveLoad: false,
        },
      }
      if (cachedLottieJson[path]) {
        animationOptions.animationData = cachedLottieJson[path]
      } else {
        animationOptions.path = path
      }
      lottieAnimation = lottie.loadAnimation(animationOptions)
      let displayedFrame = 0
      let isScrubbing = false
      const baseAutoplaySpeed = 0.5

      const getRenderedLottieElement = () => lottieContainerEl.querySelector('svg') || lottieContainerEl.querySelector('canvas')
      const updateFrame = () => {
        if (!lottieAnimation) return
        const totalFrames = lottieAnimation.totalFrames || 1
        const frame = Math.max(0, Math.min(totalFrames - 1, Math.floor(lottieAnimation.currentFrame || 0)))
        displayedFrame = frame
        if (!isScrubbing) {
          try {
            const lastNormalFrameStart = Math.max(0, totalFrames - 8)
            const isSlowSection = frame >= 43 && frame < lastNormalFrameStart
            const effectiveSpeed = isSlowSection ? baseAutoplaySpeed * 0.5 : baseAutoplaySpeed
            lottieAnimation.setSpeed(effectiveSpeed)
          } catch (e) {}
        }

        if (window.innerWidth <= 500) {
          if (frame === 39) {
            if (selectedColorVariant === '#C4142D') {
              overlay.style.left = '-230%'
              overlay.style.right = ''
            } else if (selectedColorVariant === '#1D737B') {
              overlay.style.right = '-230%'
              overlay.style.left = ''
            }
          } else if (frame < 39) {
            overlay.style.left = ''
            overlay.style.right = ''
          }
        } else if (window.innerWidth <= 1024) {
          if (frame === 39) {
            if (selectedColorVariant === '#C4142D') {
              overlay.style.left = '-140%'
              overlay.style.right = ''
            } else if (selectedColorVariant === '#1D737B') {
              overlay.style.right = '-140%'
              overlay.style.left = ''
            }
          } else if (frame < 39) {
            overlay.style.left = ''
            overlay.style.right = ''
          }
        }

        const scaleFrame = Math.min(frame, 15)
        const scale = 0.6 + 0.4 * Math.min(1, scaleFrame / 15)
        lottieContainerEl.style.transform = `scale(${scale})`

        const renderedElement = getRenderedLottieElement()
        if (renderedElement) {
          const marginBottom = 80 * (1 - Math.min(1, scaleFrame / 15))
          renderedElement.style.marginBottom = `${marginBottom}px`
        }

        const section = document.getElementById('lottieSection')
        if (section) {
          const startThreshold = 0.92
          const progress = totalFrames > 1 ? frame / (totalFrames - 1) : 0
          let sectionProgress = 0
          if (progress > startThreshold) {
            sectionProgress = (progress - startThreshold) / (1 - startThreshold)
          }
          sectionProgress = Math.max(0, Math.min(sectionProgress, 1))
          section.style.transform = `translateX(${100 - sectionProgress * 100}%)`
        }

        const overlayIndicator = overlay.querySelector('.scroll-down')
        if (overlayIndicator) {
          const indicatorOpacity = Math.max(0, Math.min(1, 1 - frame / Math.max(1, totalFrames * 0.12)))
          overlayIndicator.style.opacity = String(indicatorOpacity)
        }
      }

      lottieScrollHandler = updateFrame
      lottieAnimation.addEventListener('enterFrame', lottieScrollHandler)

      const showLottieOverlay = () => {
        if (overlay.classList.contains('show')) return
        overlay.classList.add('show')
        overlay.style.visibility = 'visible'
        overlay.style.opacity = '1'
        overlay.style.pointerEvents = 'auto'

        requestAnimationFrame(() => {
          if (!lottieAnimation) return
          displayedFrame = 0
          lottieAnimation.goToAndStop(displayedFrame, true)
          lottieAnimation.setSpeed(0.5)
          try {
            lottieAnimation.setSpeed(baseAutoplaySpeed)
          } catch (e) {}
          displayedFrame = 0
          try {
            lottieAnimation.setSpeed(baseAutoplaySpeed)
          } catch (e) {}
          lottieAnimation.play()
          updateFrame()
        })
      }

      const revealLottieOverlay = () => {
        requestAnimationFrame(() => {
          if (!lottieAnimation) return
          displayedFrame = 0
          lottieAnimation.goToAndStop(displayedFrame, true)
          showLottieOverlay()
        })
      }

      lottieAnimation.addEventListener('DOMLoaded', revealLottieOverlay)
      lottieAnimation.addEventListener('loaded_images', revealLottieOverlay)

      let isAutoPlaying = false

      const handleLottieClick = (e) => {
        if (!lottieAnimation) return
        e.preventDefault()
        e.stopPropagation()
        if (isAutoPlaying) {
          isAutoPlaying = false
          lottieAnimation.pause()
          return
        }

        try {
          if (lottieScrubRafId !== null) {
            cancelAnimationFrame(lottieScrubRafId)
            lottieScrubRafId = null
          }
        } catch (e) {}
        isScrubbing = false

        try {
          if (lottieAnimation && lottieScrollHandler) lottieAnimation.addEventListener('enterFrame', lottieScrollHandler)
        } catch (e) {}

        isAutoPlaying = true
        try {
          if (typeof lottieAnimation.goToAndPlay === 'function') {
            lottieAnimation.goToAndPlay(displayedFrame, true)
          } else {
            lottieAnimation.goToAndStop(displayedFrame, true)
            lottieAnimation.play()
          }
        } catch (e) {
          try {
            lottieAnimation.play()
          } catch (err) {}
        }
        try {
          updateFrame()
        } catch (e) {}
      }

      let lastScrollTop = 0
      let lottieScrubTargetFrame = 0
      let lottieScrubRafId = null

      const animateLottieToTargetFrame = () => {
        if (!lottieAnimation) return

        const currentFrame = lottieAnimation.currentFrame || 0
        const targetFrame = Math.round(lottieScrubTargetFrame)
        const diff = targetFrame - currentFrame
        if (Math.abs(diff) < 0.5) {
          displayedFrame = targetFrame
          lottieAnimation.goToAndStop(displayedFrame, true)
          try {
            updateFrame()
          } catch (e) {}
          lottieScrubRafId = null
          isScrubbing = false
          try {
            if (lottieAnimation && lottieScrollHandler) lottieAnimation.addEventListener('enterFrame', lottieScrollHandler)
          } catch (e) {}
          return
        }

        const easingFactor = 0.16
        const minStep = 0.35
        const maxStep = 1.2
        const step = Math.sign(diff) * Math.min(maxStep, Math.max(minStep, Math.abs(diff) * easingFactor))
        const nextFrame = currentFrame + step
        displayedFrame = Math.max(0, Math.min(lottieAnimation.totalFrames - 1, Math.round(nextFrame)))
        lottieAnimation.goToAndStop(displayedFrame, true)
        updateFrame()
        lottieScrubRafId = requestAnimationFrame(animateLottieToTargetFrame)
      }

      const handleLottieScroll = (e) => {
        if (!lottieAnimation) return

        if (isAutoPlaying) {
          isAutoPlaying = false
          lottieAnimation.pause()
        }

        isScrubbing = true
        try {
          if (lottieAnimation && lottieScrollHandler) lottieAnimation.removeEventListener('enterFrame', lottieScrollHandler)
        } catch (e) {}

        const currentScrollTop = scrollArea.scrollTop
        const maxScrollTop = Math.max(1, scrollArea.scrollHeight - scrollArea.clientHeight)
        const progress = Math.max(0, Math.min(1, currentScrollTop / maxScrollTop))
        const totalFrames = lottieAnimation.totalFrames || 1
        const maxFrame = Math.max(0, totalFrames - 1)
        lottieScrubTargetFrame = progress * maxFrame

        if (lottieScrubRafId !== null) {
          cancelAnimationFrame(lottieScrubRafId)
        }
        lottieScrubRafId = requestAnimationFrame(animateLottieToTargetFrame)
      }

      lottieContainerEl.addEventListener('click', handleLottieClick)
      scrollArea.addEventListener('scroll', handleLottieScroll)

      lottieAnimation._clickHandler = handleLottieClick
      lottieAnimation._scrollHandler = handleLottieScroll

      setTimeout(() => {
        if (lottieAnimation && !overlay.classList.contains('show')) {
          revealLottieOverlay()
        }
      }, 2600)

      const autoplayWatcher = setInterval(() => {
        if (overlay.classList.contains('show') && lottieAnimation && !isAutoPlaying) {
          isAutoPlaying = true
          try {
            lottieAnimation.setSpeed(baseAutoplaySpeed)
          } catch (e) {}
          lottieAnimation.play()
          clearInterval(autoplayWatcher)
        }
      }, 50)
    })
    .catch((err) => {
      console.error('❌ Failed to load lottie:', err)
      overlay.classList.remove('show')
      overlay.style.display = 'none'
    })
}

function createFlashEffect(colorHex) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.backgroundColor = colorHex || 'rgba(196, 20, 45, 0.4)'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '200'
    overlay.style.opacity = '0'
    overlay.style.transition = 'opacity 0.25s ease-out'
    document.body.appendChild(overlay)
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      requestAnimationFrame(() => resolve())
      setTimeout(() => {
        overlay.style.opacity = '0'
        setTimeout(() => {
          if (overlay.parentNode) overlay.remove()
        }, 300)
      }, 150)
    })
  })
}

function startMixAnimation() {
  if (mixedDone || isMerging) return
  const used = getTotalBottleUnits()
  if (used !== TARGET_SCORE) return
  if (hasEmptyBottle()) return

  isMerging = true
  mixedDone = true
  if (platform) {
    platform.style.cursor = 'default'
    const rotator = platform.querySelector('.device-rotator')
    if (rotator) rotator.style.cursor = 'default'
  }
  updateMixButtonVisibility()

  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  const positions = bottles.map((bottle) => bottle.getBoundingClientRect())
  const centerBottle = bottles.find((bottle) => Number(bottle.dataset.index) === 2) || bottles[0]
  const centerPos = centerBottle.getBoundingClientRect()
  if (controlsPanel) controlsPanel.classList.add('fade-out-ui')
  if (messagePanel) messagePanel.classList.add('fade-out-ui')
  if (pointsWrapper) pointsWrapper.classList.add('fade-out-ui')
  if (pointsCounter) pointsCounter.classList.add('fade-out-ui')
  if (mixWrapper) mixWrapper.classList.add('fade-out-ui')

  try {
    const cards = Array.from(document.querySelectorAll('.colb-card'))
    cards.forEach((c) => c.classList.add('fade-out-ui'))
  } catch (e) {}

  bottles.forEach((bottle, i) => {
    bottle.style.position = 'fixed'
    bottle.style.left = `${positions[i].left}px`
    bottle.style.top = `${positions[i].top}px`
    bottle.style.margin = '0'
    bottle.style.zIndex = '12'
    bottle.style.width = 'max-content'
  })

  requestAnimationFrame(() => {
    bottles.forEach((bottle) => {
      bottle.style.left = `${centerPos.left}px`
      bottle.style.top = `${centerPos.top}px`
      if (Number(bottle.dataset.index) !== 2) {
        bottle.style.opacity = '0'
      }
    })
  })

  setTimeout(() => {
    bottles.forEach((bottle) => {
      if (Number(bottle.dataset.index) !== 2 && bottle.parentNode) bottle.parentNode.removeChild(bottle)
    })
    const centralBottle = getBottleByIndex(2)
    if (centralBottle) {
      centralBottle.style.left = 'auto'
      centralBottle.style.top = 'auto'
      centralBottle.style.opacity = '1'
      centralBottle.style.zIndex = 'auto'
      setBottleState(centralBottle, 'full')
      applyPlatformColor(centralBottle, getMergedBottleColor(selectedColorVariant))
      updateBottleUnitsDisplay()
      const thermostat = centralBottle.querySelector('.thermostat')

      centralBottle.classList.add('merged-central')
      createFlashEffect(selectedColorVariant).then(() => {
      })
      const sparkContainer = document.createElement('div')
      sparkContainer.style.position = 'fixed'
      sparkContainer.style.inset = '0'
      sparkContainer.style.pointerEvents = 'none'
      sparkContainer.style.zIndex = '150'
      document.body.appendChild(sparkContainer)
      const rect = centralBottle.getBoundingClientRect()
      for (let i = 0; i < 40; i++) {
        const spark = document.createElement('div')
        spark.style.position = 'absolute'
        const size = 2 + Math.random() * 6
        spark.style.width = `${size}px`
        spark.style.height = `${size}px`
        spark.style.borderRadius = '50%'
        spark.style.backgroundColor = selectedColorVariant
        spark.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 70}px`
        spark.style.top = `${rect.top + rect.height / 2 + (Math.random() - 0.5) * 60}px`
        spark.style.opacity = '0.9'
        spark.style.transition = 'all 0.8s ease-out'
        sparkContainer.appendChild(spark)
        const dx = (Math.random() - 0.5) * 140
        const dy = -60 - Math.random() * 100
        requestAnimationFrame(() => {
          spark.style.transform = `translate(${dx}px, ${dy}px)`
          spark.style.opacity = '0'
        })
      }
      setTimeout(() => {
        if (sparkContainer.parentNode) sparkContainer.parentNode.removeChild(sparkContainer)
      }, 1000)
    }
    isMerging = false
    updateMixButtonVisibility()
  }, 650)
}

function setBottleState(platformElement, state) {
  if (!platformElement) return
  platformElement.dataset.state = state
  const percent = state === 'empty' ? 0 : state === 'half' ? FILL_HALF_PERCENT : FILL_MAX_PERCENT
  applyPlatformProgress(platformElement, percent)
  const index = Number(platformElement.dataset.index)
  if (!Number.isNaN(index)) updateRangeLineForIndex(index, state)
}

function cycleBottleState(platformElement) {
  if (!platformElement || !platformRowShown || mixedDone) return false
  const current = platformElement.dataset.state || 'half'
  let next = current === 'empty' ? 'half' : current === 'half' ? 'full' : 'empty'
  const used = getTotalBottleUnits()
  if (current === 'half' && used + 1 > TARGET_SCORE) {
    next = 'empty'
  }
  const delta = bottleStateValue[next] - bottleStateValue[current]
  if (delta > 0 && used + delta > TARGET_SCORE) return false
  setBottleState(platformElement, next)

  if (typeof window !== 'undefined' && !window.__firstBottleHelpShown) {
    window.__firstBottleHelpShown = true
    if (typeof window.forceShowHelpPrompt === 'function') {
      window.forceShowHelpPrompt()
    }
  }

  updateBottleUnitsDisplay()
  return true
}

function getBottleByIndex(index) {
  return bubblesContainer.querySelector(`.platform[data-index="${index}"]`) || bubblesContainer.querySelector(`.platform-copy[data-index="${index}"]`)
}

const winColorPalettes = {
  '#1D737B': ['#608A8F', '#00D0E0', '#0F4254', '#1A917A', '#2BA0AD'],
  '#C4142D': ['#E32A3E', '#D43B1A', '#B0133B', '#5C1033', '#FF3B6A'],
  '#7B1D7B': ['#622D47', '#FF2AFF', '#3D0B4D', '#8E47AB', '#C43BC4'],
}

function getWinColors() {
  return (
    winColorPalettes[selectedColorVariant] || [
      selectedColorVariant,
      selectedColorVariant,
      selectedColorVariant,
      selectedColorVariant,
      selectedColorVariant,
    ]
  )
}

if (platformDevice) {
  platformDevice.style.setProperty('--c1', selectedColorVariant)
  platformDevice.style.setProperty('--c2', selectedColorVariant)
  platformDevice.style.setProperty('--c3', selectedColorVariant)
  platformDevice.style.setProperty('--c4', selectedColorVariant)
  platformDevice.style.setProperty('--c5', selectedColorVariant)
}
updatePlatformLiquid(0)

const GAP = 16
let bubbleSize = getBubbleSize()
let columnsCount = 1
let columnsOccupied = []

function getBubbleSize() {
  return Math.round((6.67 * window.innerWidth + 6.67 * window.innerHeight) / 100)
}

function updateColumns() {
  bubbleSize = getBubbleSize()
  const width = Math.max(320, bubblesContainer.clientWidth)
  columnsCount = Math.max(1, Math.floor(width / (bubbleSize + GAP)))
  columnsOccupied = new Array(columnsCount).fill(false)
}

function centerPlatform() {
  if (!platform) return
  const initialPlatformX = bubblesContainer.getBoundingClientRect().left + bubblesContainer.clientWidth / 2
  const initialPlatformWidth = platform.offsetWidth || 220
  const rect = bubblesContainer.getBoundingClientRect()
  const edgeMargin = window.innerWidth <= 768 ? 0 : 150
  const minX = edgeMargin
  const maxX = Math.max(minX, rect.width - edgeMargin - initialPlatformWidth)
  let initialX = initialPlatformX - rect.left - initialPlatformWidth / 2
  initialX = Math.max(minX, Math.min(maxX, initialX))
  if (!gameActive && !platformRowShown) {
    platform.style.left = initialX + 'px'
  }
}

window.addEventListener('resize', () => {
  updateColumns()
  centerPlatform()
  if (liquidEffectState.canvas && liquidEffectState.ctx) {
    const prevWidth = liquidEffectState.canvas.width
    const prevHeight = liquidEffectState.canvas.height
    resetLiquidCanvasSize()
    repositionLiquidParticles(prevWidth, prevHeight)
  }
})
updateColumns()

function spawnDrop(forceColor = false) {
  if (!gameActive) return
  const sessionId = gameSessionId
  const available = []
  for (let i = 0; i < columnsCount; i++) if (!columnsOccupied[i]) available.push(i)
  if (available.length === 0) return

  const col = available[Math.floor(Math.random() * available.length)]
  columnsOccupied[col] = true

  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.style.width = bubbleSize + 'px'
  bubble.style.left = computeLeftForColumn(col) + 'px'
  bubble.dataset.col = String(col)
  bubble.style.top = `-${bubbleSize}px`
  bubble.style.cursor = 'default'

  const colorOptions = forceColor || !initialColoredSpawned
    ? [selectedColorVariant]
    : window.innerWidth <= 768
      ? [selectedColorVariant, selectedColorVariant, selectedColorVariant, selectedColorVariant, grayColor]
      : gameColors
  const color = colorOptions[Math.floor(Math.random() * colorOptions.length)]
  if (color !== grayColor) initialColoredSpawned = true
  bubble.style.setProperty('--bubble-color', color)
  bubble.dataset.color = color
  bubble.innerHTML = '<span class="bubble-inner"><span></span></span>'
  bubblesContainer.appendChild(bubble)

  const duration = 3000 + Math.random() * 2500

  const anim = bubble.animate(
    [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: `translateY(${bubblesContainer.clientHeight + bubbleSize}px)`, opacity: 0.95 },
    ],
    {
      duration: duration,
      easing: 'linear',
      fill: 'forwards',
    },
  )

  anim.onfinish = () => {
    if (sessionId !== gameSessionId) {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
      columnsOccupied[col] = false
      return
    }

    if (!gameActive) {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
      columnsOccupied[col] = false
      return
    }

    const wasCaught = bubble.dataset.caught === '1'
    if (!wasCaught) {
      if (bubble.dataset.color === selectedColorVariant) {
        setScoreValue(score - 1)
      }
    }
    if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
    columnsOccupied[col] = false
  }
}

function computeLeftForColumn(colIndex) {
  const totalWidth = columnsCount * bubbleSize + (columnsCount - 1) * GAP
  const offset = Math.max(0, (bubblesContainer.clientWidth - totalWidth) / 2)
  return Math.round(offset + colIndex * (bubbleSize + GAP))
}

let gameActive = false
let gameSessionId = 0
let allowStart = true
let platformRowShown = false
const SPAWN_INTERVAL = 1500
let spawnIntervalId = null
let spawnTimeoutIds = []

const glassText = document.querySelector('.glass-text')
const gameText = document.querySelector('.game-text')

function startGame() {
  if (gameActive || !allowStart) return
  clearBubblePointerCursor()
  score = 0
  if (scoreEl) scoreEl.textContent = score
  updatePlatformLiquid(score)
  gameSessionId += 1
  gameActive = true
  if (glassText) glassText.classList.add('fade-out')
  if (gameText) gameText.classList.add('fade-out')
  hideThermostatIntroUI()
  startSpawning()
}

function startSpawning() {
  if (spawnIntervalId !== null) clearInterval(spawnIntervalId)
  spawnTimeoutIds.forEach(clearTimeout)
  spawnTimeoutIds = []
  const sessionId = gameSessionId
  spawnIntervalId = setInterval(() => {
    if (gameActive && sessionId === gameSessionId) spawnDrop()
  }, SPAWN_INTERVAL)
  for (let i = 0; i < Math.min(columnsCount, 3); i++) {
    const timeoutId = setTimeout(() => {
      if (gameActive && sessionId === gameSessionId) spawnDrop(i === 0)
    }, i * 250)
    spawnTimeoutIds.push(timeoutId)
  }
}

function showPlatformRow() {
  if (platformRowShown) return
  clearBubblePointerCursor()
  platformRowShown = true

  const baseLeft = platform.offsetLeft
  const baseTop = platform.offsetTop
  const width = platform.offsetWidth
  const containerWidth = bubblesContainer.clientWidth
  let maxBottleSpread = 890

  if (window.innerWidth <= 768) {
    maxBottleSpread = 620
  } else if (window.innerWidth <= 1024) {
    maxBottleSpread = 730
  }

  const maxStep = Math.min(maxBottleSpread / 4, (containerWidth - width) / 4)
  const availableLeft = baseLeft
  const availableRight = containerWidth - width - baseLeft
  const step = Math.max(0, Math.min(maxStep, availableLeft / 2, availableRight / 2))
  const positions = [baseLeft - 2 * step, baseLeft - step, baseLeft, baseLeft + step, baseLeft + 2 * step]
  const winColors = getWinColors()
  const targetIndices = [0, 1, 3, 4]

  const clones = []
  for (let i = 0; i < 4; i++) {
    const clone = platform.cloneNode(true)
    clone.classList.add('platform-copy')
    clone.dataset.index = String(targetIndices[i])
    clone.dataset.state = 'half'
    clone.style.left = `${baseLeft}px`
    clone.style.top = `${baseTop}px`
    clone.style.opacity = '0'
    clone.style.pointerEvents = 'auto'
    applyPlatformColor(clone, winColors[targetIndices[i]])
    applyPlatformProgress(clone, 0)
    bubblesContainer.appendChild(clone)
    clones.push(clone)
  }

  platform.dataset.index = '2'
  platform.dataset.state = 'half'

  const isVerticalLayout = window.innerWidth <= 500
  let positionsLeft = []
  let positionsTop = []
  if (isVerticalLayout) {
    const stepY = 50
    positionsLeft = [baseLeft, baseLeft, baseLeft, baseLeft, baseLeft]
    positionsTop = [baseTop - 2 * stepY, baseTop - stepY, baseTop, baseTop + stepY, baseTop + 2 * stepY]
  } else {
    positionsLeft = [baseLeft - 2 * step, baseLeft - step, baseLeft, baseLeft + step, baseLeft + 2 * step]
    positionsTop = [baseTop, baseTop, baseTop, baseTop, baseTop]
  }

  requestAnimationFrame(() => {
    clones.forEach((clone, index) => {
      const targetIndex = index < 2 ? index : index + 1
      clone.style.setProperty('left', `${positionsLeft[targetIndex]}px`, 'important')
      clone.style.setProperty('top', `${positionsTop[targetIndex]}px`, 'important')
      clone.style.opacity = '1'
      applyPlatformProgress(clone, FILL_HALF_PERCENT)
    })
    platform.style.setProperty('left', `${baseLeft}px`, 'important')
    platform.style.setProperty('top', `${baseTop}px`, 'important')
    applyPlatformColor(platform, winColors[2])
    setBottleState(platform, 'half')
    updateBottleUnitsDisplay()
    
    if (window.innerWidth <= 500) {
      const tryPositionCards = (attemptsLeft = 4) => {
        try {
          const colbsContainer = document.getElementById('colbsContainer')
          if (!colbsContainer) return
          const cards = Array.from(colbsContainer.querySelectorAll('.colb-card'))
          if (!cards.length) return

          let needRetry = false
          cards.forEach((card, i) => {
            try {
              const index = Number(card.querySelector('input.range-input')?.dataset.index ?? i)
              const bottle = getBottleByIndex(index)
              if (!bottle) return

              const device = bottle.querySelector('.device')
              if (!device) return
              if (card.parentNode !== device) {
                card.dataset._moved = '1'
                try {
                  if (!device.dataset._posSet) {
                    device.dataset._posSet = '1'
                    device.style.position = device.style.position || 'relative'
                  }
                } catch (e) {}
                device.appendChild(card)
              }

              card.style.display = ''
              card.style.opacity = card.style.opacity || '0'
              const rect = device.getBoundingClientRect()
              const cardWidth = card.offsetWidth || 160
              if (cardWidth === 0) {
                needRetry = true
                return
              }

              card.style.opacity = '1'
            } catch (e) {
              needRetry = true
            }
          })

          if (needRetry && attemptsLeft > 0) {
            setTimeout(() => tryPositionCards(attemptsLeft - 1), 60)
          }
        } catch (e) {
          if (attemptsLeft > 0) setTimeout(() => tryPositionCards(attemptsLeft - 1), 60)
        }
      }
      requestAnimationFrame(() => tryPositionCards())
    }
  })
  if (pointsWrapper) {
    pointsWrapper.classList.add('expanded')
  }
  if (pointsCounter) {
    pointsCounter.classList.add('show')
  }
  if (controlsPanel) controlsPanel.classList.add('show')

  if (typeof window !== 'undefined' && typeof window.updateHelpText === 'function') {
    try {
      const helpEl = document.querySelector('.help')
      if (helpEl) {
        helpEl.classList.remove('open', 'visible')
        helpEl.style.opacity = '0'
        helpEl.style.visibility = 'hidden'
      }
    } catch (e) {}
    window.updateHelpText('Меняйте уровень жидкости в колбах — так вы распределяете усилия своей стратегии продвижения.')
  }
}

bubblesContainer.addEventListener('click', (event) => {
  if (!platformRowShown) return
  const clickedPlatform = event.target.closest('.platform, .platform-copy')
  if (!clickedPlatform) return
  playCheklSound()
  cycleBottleState(clickedPlatform)
})

rangeInputs.forEach((input) => {
  const index = Number(input.dataset.index)
  input.addEventListener('click', () => {
    if (!platformRowShown) return
    const bottle = getBottleByIndex(index)
    if (bottle) {
      playCheklSound()
      cycleBottleState(bottle)
    }
  })
})

if (mixBtn) {
  mixBtn.addEventListener('click', () => {
    if (!mixBtn.disabled) {
      playCheklSound()

      if (
        typeof window !== 'undefined' &&
        typeof window.hideHelpPrompt === 'function'
      ) {
        window.hideHelpPrompt()
      }

      const rotator = platform?.querySelector('.device-rotator')

      if (rotator) {
        setTimeout(() => {
          const device = platform?.querySelector('.device')
          let canvas = null
          let pouringStarted = false

          const startProgressAfterRotation = () => {
            if (!device || pouringStarted) return

            pouringStarted = true

            if (
              typeof window !== 'undefined' &&
              window.innerWidth <= 500
            ) {
              const t2 = platform.querySelector(
                '.device-rotator .test2',
              )
              const t3 = platform.querySelector(
                '.device-rotator .test3',
              )

              ;[t2, t3].forEach((el) => {
                if (!el) return

                el.style.display = ''
                el.style.opacity = '1'
                el.style.pointerEvents = 'auto'
              })
            }

            canvas = showLiquidEffectOverBottle(true)
            animateDeviceProgress(device, 200, 4200)
          }

          if (
            typeof window !== 'undefined' &&
            window.innerWidth <= 500
          ) {
            const t2 = platform.querySelector(
              '.device-rotator .test2',
            )
            const t3 = platform.querySelector(
              '.device-rotator .test3',
            )

            ;[t2, t3].forEach((el, index) => {
              if (!el) return

              el.style.display = ''
              el.style.opacity = '0'
              el.style.pointerEvents = 'none'
              el.style.transition = 'opacity 400ms ease'

              setTimeout(
                () => {
                  el.style.opacity = '1'
                  el.style.pointerEvents = 'auto'
                },
                900 + index * 100,
              )
            })
          }

          const transitionEndHandler = (event) => {
            if (event.propertyName !== 'transform') return

            rotator.removeEventListener(
              'transitionend',
              transitionEndHandler,
            )

            startProgressAfterRotation()
          }

          rotator.addEventListener(
            'transitionend',
            transitionEndHandler,
          )

          rotator.style.willChange = 'transform'
          rotator.style.transformOrigin = 'center center'
          rotator.style.transform = 'rotate(135deg)'
        }, 1000) // поворот колбы
      }

      startMixAnimation()
    }
  })
}

if (platform) {
  platform.addEventListener('click', (event) => {
    if (event.target && event.target.closest && event.target.closest('.platform, .platform-copy')) {
      return
    }
  })
}

function resetGame(preservePosition = false) {
  if (typeof window !== 'undefined') {
    window.__firstBottleHelpShown = false
  }
  gameActive = false
  allowStart = true
  showThermostatIntroUI()
  platformRowShown = false
  gameSessionId += 1
  if (spawnIntervalId !== null) {
    clearInterval(spawnIntervalId)
    spawnIntervalId = null
  }
  spawnTimeoutIds.forEach(clearTimeout)
  spawnTimeoutIds = []
  stopLiquidEffect()

  score = 0
  if (scoreEl) scoreEl.textContent = score
  updatePlatformLiquid(score)
  if (glassText) glassText.classList.remove('fade-out')
  if (gameText) gameText.classList.remove('fade-out')
  platform.classList.remove('end-vertical', 'merged-central')
  platform.style.transform = ''
  platform.style.position = ''
  platform.style.left = preservePosition ? platform.style.left : initialX + 'px'
  platform.style.bottom = preservePosition ? platform.style.bottom : '-50px'
  platform.style.top = preservePosition ? platform.style.top : ''
  platform.style.margin = ''
  platform.style.zIndex = ''
  platform.style.width = ''
  platform.style.opacity = ''
  platform.style.transition = ''
  platform.style.cursor = ''
  const rotator = platform.querySelector('.device-rotator')
  if (rotator) {
    rotator.style.cursor = ''
    rotator.style.transform = ''
    rotator.style.transition = ''
    rotator.style.willChange = ''
    rotator.style.transformOrigin = ''
  }
  const testDivs = platform.querySelectorAll('div.test, div.test2, div.test3')
  testDivs.forEach((d) => {
    d.style.display = ''
    d.style.opacity = ''
    d.style.pointerEvents = ''
  })
  const thermostat = platform.querySelector('.thermostat')
  if (thermostat) {
    thermostat.style.transition = ''
    thermostat.style.transform = ''
  }
  platform.removeAttribute('data-index')
  platform.removeAttribute('data-state')

  const clones = Array.from(bubblesContainer.querySelectorAll('.platform-copy'))
  for (const clone of clones) if (clone.parentNode) clone.parentNode.removeChild(clone)

  const all = Array.from(bubblesContainer.querySelectorAll('.bubble, .bubble2'))
  for (const b of all) if (b.parentNode) b.parentNode.removeChild(b)
  columnsOccupied = new Array(columnsCount).fill(false)
  initialColoredSpawned = false
  if (pointsWrapper) pointsWrapper.classList.remove('expanded', 'fade-out-ui')
  if (pointsCounter) pointsCounter.classList.remove('show', 'fade-out-ui')
  if (controlsPanel) controlsPanel.classList.remove('show', 'fade-out-ui')
  if (mixWrapper) mixWrapper.classList.remove('show', 'fade-out-ui')
  if (messagePanel) messagePanel.classList.remove('show', 'fade-out-ui')
  
  try {
    const cards = Array.from(document.querySelectorAll('.colb-card'))
    const colbsContainer = document.getElementById('colbsContainer')
    cards.forEach((card) => {
      try {
        if (card.dataset && card.dataset._moved && colbsContainer) {
          colbsContainer.appendChild(card)
          delete card.dataset._moved
        }
      } catch (e) {}
      try {
        card.classList.remove('fade-out-ui')
      } catch (e) {}
      card.style.position = ''
      card.style.left = ''
      card.style.top = ''
      card.style.transform = ''
      card.style.zIndex = ''
      card.style.pointerEvents = ''
      card.style.transition = ''
      card.style.opacity = ''
    })
    
    try {
      const devices = Array.from(document.querySelectorAll('.platform .device, .platform-copy .device'))
      devices.forEach((d) => {
        try {
          if (d.dataset && d.dataset._posSet) {
            d.style.position = ''
            delete d.dataset._posSet
          }
        } catch (e) {}
      })
    } catch (e) {}
  } catch (e) {}
}

function hideThermostatIntroUI() {
  document.querySelector('.game-text')?.classList.add('fade-out')
  document.querySelectorAll('.thermostat .arrow').forEach((arrow) => {
    arrow.classList.add('fade-out')
  })
}

function showThermostatIntroUI() {
  document.querySelector('.game-text')?.classList.remove('fade-out')
  document.querySelectorAll('.thermostat .arrow').forEach((arrow) => {
    arrow.classList.remove('fade-out')
  })
}

function resetAppState() {
  playCheklSound()
  resetGame(false)
  mixedDone = false
  isMerging = false
  selectedColorVariant = getSelectedColorVariant()
  gameColors[1] = selectedColorVariant
  loadPatternSvg(selectedColorVariant)
  applyPlatformColor(platform, selectedColorVariant)
  updatePlatformLiquid(0)
  updateRangeLinePositions()
  updateMixButtonVisibility()
  updatePointsDisplay(0)

  const overlay = document.getElementById('lottieOverlay')
  const scrollArea = document.getElementById('lottieScrollArea')
  const lottieContainerEl = document.getElementById('lottieContainer')
  const lottieSectionEl = document.getElementById('lottieSection')
  const formSection = document.querySelector('.form')
  const header = document.getElementById('header')

  if (overlay) overlay.classList.remove('show')
  if (scrollArea) {
    scrollArea.scrollTop = 0
    scrollArea.style.overflowY = 'auto'
  }
  if (lottieContainerEl) lottieContainerEl.innerHTML = ''
  if (lottieSectionEl) lottieSectionEl.style.transform = 'translateX(100%)'
  if (formSection) formSection.classList.remove('visible')
  if (header) header.classList.remove('is-dark')
  clearLottieScrollListener()
  if (lottieAnimation) {
    lottieAnimation.destroy()
    lottieAnimation = null
  }

  if (typeof window !== 'undefined') {
    window.bubbleClick = false
    window.bubblesActive = false
    if (window.bgAudio) {
      try {
        window.bgAudio.pause()
        window.bgAudio.currentTime = 0
      } catch (e) {}
    }
  }
  stopLiquidEffect()
}

centerPlatform()

platform.addEventListener('click', (event) => {
  if (platformRowShown) {
    return
  }

  if (!allowStart) {
    event.stopPropagation()
    playCheklSound()
    if (window.innerWidth <= 500) {
      const rotatorEl = platform.querySelector('.device-rotator') || platform
      const transitionEndHandler = () => {
        try {
          rotatorEl.removeEventListener('transitionend', transitionEndHandler)
        } catch (e) {}
        showPlatformRow()
      }
      rotatorEl.addEventListener('transitionend', transitionEndHandler)
      rotatorEl.style.willChange = 'transform'
      rotatorEl.style.transformOrigin = 'center center'
      rotatorEl.style.transition = 'transform 1200ms cubic-bezier(0.22, 0.61, 0.36, 1)'
      rotatorEl.style.transform = 'rotate(90deg)'
    } else {
      showPlatformRow()
    }
    return
  }
  try {
    const helpEl = document.querySelector('.help')
    if (helpEl) {
      helpEl.classList.remove('open', 'visible')
      helpEl.style.opacity = '0'
      helpEl.style.visibility = 'hidden'
    }
  } catch (e) {}

  playCheklSound()
  startGame()
})

const deviceRotator = platform.querySelector('.device-rotator')
if (deviceRotator) {
  deviceRotator.addEventListener('click', (event) => {
    if (!platformRowShown) return
  })
}

let score = 0
const scoreEl = document.getElementById('score')
function setScoreValue(newScore) {
  score = Math.max(0, newScore)
  if (scoreEl) scoreEl.textContent = score
  updatePlatformLiquid(score)
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function updatePlatformPosition(clientX) {
  if (!gameActive) return
  const rect = bubblesContainer.getBoundingClientRect()
  const pEl = platform.querySelector('.device-rotator') || platform
  const pW = pEl.offsetWidth || 220
  const edgeMargin = window.innerWidth <= 768 ? 0 : 150
  const minX = Math.max(edgeMargin, -rect.left)
  const maxX = Math.min(window.innerWidth - pW - edgeMargin - rect.left, rect.width - edgeMargin - pW)
  const boundedMaxX = Math.max(minX, maxX)
  let x = clientX - rect.left - pW / 2
  x = clamp(x, minX, boundedMaxX)
  platform.style.left = x + 'px'
}

bubblesContainer.addEventListener('mousemove', (e) => {
  updatePlatformPosition(e.clientX)
})

bubblesContainer.addEventListener(
  'touchmove',
  (e) => {
    e.preventDefault()
    if (e.touches && e.touches[0]) updatePlatformPosition(e.touches[0].clientX)
  },
  { passive: false }
)

function checkCollisions() {
  if (!gameActive) {
    requestAnimationFrame(checkCollisions)
    return
  }

  const rotator = document.querySelector('.device-rotator')
  const glass = rotator ? rotator.querySelector('.glass-container') : platform.querySelector('.glass-container')
  if (!glass) {
    requestAnimationFrame(checkCollisions)
    return
  }

  const rotStyle = rotator ? getComputedStyle(rotator).transform : 'none'
  const angle = (() => {
    if (!rotStyle || rotStyle === 'none') return 0
    const m = rotStyle.match(/matrix\(([^)]+)\)/)
    if (!m) return 0
    const parts = m[1].split(',').map(Number)
    const a = parts[0],
      b = parts[1]
    return Math.atan2(b, a)
  })()

  const gRect = glass.getBoundingClientRect()
  const gW = glass.offsetWidth
  const gH = glass.offsetHeight
  const gCenterX = gRect.left + gRect.width / 2
  const gCenterY = gRect.top + gRect.height / 2

  const bubbles = Array.from(bubblesContainer.querySelectorAll('.bubble, .bubble2'))
  for (const b of bubbles) {
    if (b.dataset.caught === '1') continue
    const br = b.getBoundingClientRect()
    const bx = br.left + br.width / 2
    const by = br.top + br.height / 2
    const radius = Math.max(br.width, br.height) / 2

    const samples = 8
    let hit = false
    const cos = Math.cos(-angle)
    const sin = Math.sin(-angle)
    const gLeft = gCenterX - gW / 2
    const gTop = gCenterY - gH / 2

    for (let i = 0; i < samples; i++) {
      const theta = (i / samples) * Math.PI * 2
      const sx = bx + Math.cos(theta) * radius
      const sy = by + Math.sin(theta) * radius

      const rx = cos * (sx - gCenterX) - sin * (sy - gCenterY) + gCenterX
      const ry = sin * (sx - gCenterX) + cos * (sy - gCenterY) + gCenterY

      if (rx >= gLeft && rx <= gLeft + gW && ry >= gTop && ry <= gTop + gH) {
        hit = true
        break
      }
    }

    if (hit) {
      const col = b.dataset.col
      const bcolor = b.dataset.color
      if (bcolor === grayColor) setScoreValue(score - 1)
      else if (bcolor === selectedColorVariant) setScoreValue(score + 1)

      if (col && columnsOccupied[Number(col)]) columnsOccupied[Number(col)] = false
      if (b.dataset.caught === '1') continue
      b.dataset.caught = '1'
      playPopSound()
      b.style.pointerEvents = 'none'
      const bubbleHitDuration = 100
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }], {
        duration: bubbleHitDuration,
        easing: 'ease-out',
        fill: 'forwards',
        composite: 'add',
      })
      const fadeAnim = b.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: bubbleHitDuration,
        easing: 'ease-out',
        fill: 'forwards',
      })
      fadeAnim.onfinish = () => {
        if (b.parentNode) b.parentNode.removeChild(b)
      }

      if (score >= TARGET_SCORE) {
      // if (score >= 1) {
        endGame()
        break
      }
    }
  }

  requestAnimationFrame(checkCollisions)
}

requestAnimationFrame(checkCollisions)

function endGame(preservePosition = false) {
  if (!gameActive) return
  gameActive = false
  allowStart = false
  platformRowShown = false
  gameSessionId += 1
  if (spawnIntervalId !== null) {
    clearInterval(spawnIntervalId)
    spawnIntervalId = null
  }
  spawnTimeoutIds.forEach(clearTimeout)
  spawnTimeoutIds = []

  let platformClickedEarly = false
  const earlyClickHandler = () => {
    platformClickedEarly = true
  }
  if (platform && platform.addEventListener) {
    platform.addEventListener('click', earlyClickHandler, { once: true })
  }

  if (!preservePosition) {
    const rect = platform.getBoundingClientRect()
    platform.style.left = rect.left + 'px'
    platform.style.top = rect.top + 'px'
    const testDivs = platform.querySelectorAll('div.test2, div.test3')
    if (window && window.innerWidth <= 500) {
      testDivs.forEach((testDiv) => {
        testDiv.style.display = 'none'
        testDiv.style.opacity = '0'
        testDiv.style.pointerEvents = 'none'
      })
    } else {
      testDivs.forEach((testDiv) => {
        testDiv.style.display = ''
        testDiv.style.opacity = '1'
        testDiv.style.pointerEvents = ''
      })
    }
    platform.offsetHeight
    platform.classList.add('end-vertical')
  }

  const all = Array.from(bubblesContainer.querySelectorAll('.bubble, .bubble2'))
  for (const b of all) if (b.parentNode) b.parentNode.removeChild(b)

  try {
    setTimeout(() => {
      try {
        if (!platform) return
        if (platformClickedEarly) return
        if (platform && platform.removeEventListener) {
          try {
            platform.removeEventListener('click', earlyClickHandler)
          } catch (e) {}
        }
        const rect = platform.getBoundingClientRect()
        const wrapper = document.createElement('div')
        wrapper.className = 'click-svg-wrapper'

        wrapper.innerHTML = `
          <svg width="73" height="73" viewBox="0 0 73 73" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Pulsating dashed outline -->
            <circle class="pulse" cx="36.5" cy="36.5" r="36.5" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4 6" stroke-opacity="0.9" />
            <!-- Solid center circle -->
            <circle cx="36.5" cy="36.5" r="35" fill="#121315" stroke="white" stroke-width="3"/>
            <rect width="24" height="24" transform="translate(26 24)" fill="#121315"/>
            <path d="M33 37V28.5C33 28.1022 33.158 27.7206 33.4393 27.4393C33.7206 27.158 34.1022 27 34.5 27C34.8978 27 35.2794 27.158 35.5607 27.4393C35.842 27.7206 36 28.1022 36 28.5V36M36 35.5V33.5C36 33.1022 36.158 32.7206 36.4393 32.4393C36.7206 32.158 37.1022 32 37.5 32C37.8978 32 38.2794 32.158 38.5607 32.4393C38.842 32.7206 39 33.1022 39 33.5V36M39 34.5C39 34.1022 39.158 33.7206 39.4393 33.4393C39.7206 33.158 40.1022 33 40.5 33C40.8978 33 41.2794 33.158 41.5607 33.4393C41.842 33.7206 42 34.1022 42 34.5V36" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M42 35.5C42 35.1022 42.158 34.7206 42.4393 34.4393C42.7206 34.158 43.1022 34 43.5 34C43.8978 34 44.2794 34.158 44.5607 34.4393C44.842 34.7206 45 35.1022 45 35.5V40C45 41.5913 44.3679 43.1174 43.2426 44.2426C42.1174 45.3679 40.5913 46 39 46H37H37.208C36.2143 46.0002 35.2362 45.7535 34.3614 45.2823C33.4866 44.811 32.7425 44.1299 32.196 43.3L32 43C31.688 42.5213 30.5927 40.612 28.714 37.272C28.5224 36.9315 28.4713 36.5298 28.5714 36.1522C28.6715 35.7745 28.9149 35.4509 29.25 35.25C29.607 35.0364 30.0251 34.9479 30.4381 34.9986C30.851 35.0494 31.2353 35.2363 31.53 35.53L33 37M30 27L29 26M29 31H28M39 27L40 26M40 30H41" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `

        document.body.appendChild(wrapper)

        requestAnimationFrame(() => wrapper.classList.add('visible'))

        try {
          if (window.audioManager && typeof window.audioManager.play === 'function') {
            window.audioManager.play('chelk', { loop: false, volume: 0.54, forceImmediate: true })
          } else if (typeof preloadedAudio !== 'undefined' && preloadedAudio.chelk) {
            try {
              preloadedAudio.chelk.volume = 0.54
              preloadedAudio.chelk.currentTime = 0
              preloadedAudio.chelk.play().catch(() => {})
            } catch (e) {}
          }
        } catch (e) {}

        try {
          if (platform && platform.addEventListener) {
            const removeOverlay = () => {
              try {
                wrapper.classList.remove('visible')
              } catch (e) {}
              setTimeout(() => {
                try {
                  if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper)
                } catch (e) {}
              }, 400)
            }
            try {
              platform.removeEventListener('click', earlyClickHandler)
            } catch (e) {}
            platform.addEventListener('click', removeOverlay, { once: true })
          }
        } catch (e) {}
      } catch (e) {}
    }, 3000)
  } catch (e) {}
}
