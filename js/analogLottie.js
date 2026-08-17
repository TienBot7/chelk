const wavesCanvas = document.getElementById('wavesCanvas')
const ctx = wavesCanvas.getContext('2d')
const analogSection = document.getElementById('analogSection')
const content = document.getElementById('content')
const shopImage = document.getElementById('shopImage')

const person1 = document.getElementById('person1')
const person2 = document.getElementById('person2')
const person3 = document.getElementById('person3')
const person4 = document.getElementById('person4')
const formScreen = document.getElementById('formScreen')

let choice = null
let start = 'purple'

function resolveStartFromSelection(value = '') {
  const rawValue = String(value || document.getElementById('mainObject')?.textContent || window.mainObject || '').trim().toLowerCase()

  if (rawValue.includes('хор') || rawValue.includes('soda') || rawValue.includes('red')) {
    return 'red'
  }

  if (rawValue.includes('одеж') || rawValue.includes('cloth') || rawValue.includes('t-shirt') || rawValue.includes('green')) {
    return 'green'
  }

  if (rawValue.includes('косм') || rawValue.includes('cos') || rawValue.includes('purple')) {
    return 'purple'
  }

  return start || 'purple'
}

function syncStartFromSelection() {
  start = resolveStartFromSelection(document.getElementById('mainObject')?.textContent || window.mainObject || '')
  return start
}

let width, height
let fillLevel = 0
let targetFill = 0
let isFilling = false
let liquidOpacity = 1
let isFading = false
let verticalLines = []

let waves = []
let bubbles = []
let cansImages = []
let tShirtsImages = []
let tubesImages = []
let cloudsImages = []
let cansCreated = false
let tShirtsCreated = false
let tubesCreated = false
let cloudsCreated = false
let allowBubbles = true
const personAnimationState = {
  person1: { key: 'initial', x: 0, y: 0 },
  person2: { key: 'initial', x: 0, y: 0 },
  person3: { key: 'initial', x: 0, y: 0 },
  person4: { key: 'initial', x: 0, y: 0 },
}

let anim1 = { frame: 1, total: 3, interval: null }
let anim2 = { frame: 1, total: 3, interval: null }
let anim3 = { frame: 1, total: 3, interval: null }
let anim4 = { frame: 1, total: 3, interval: null }
let formScreenFollowFrame = null
let formScreenFollowActive = false
let isPaused = false
let animationFrameId = null
let timerCounter = 0
const activeTimeouts = new Map()
const activeIntervals = new Map()

const person4SettingsByChoice = {
  red: { enterDelay: 7000, enterDuration: 1800, pause: 3000, exitDuration: 1800 },
  green: { enterDelay: 4600, enterDuration: 1800, pause: 3000, exitDuration: 1800 },
  purple: { enterDelay: 6600, enterDuration: 1800, pause: 3000, exitDuration: 1800 },
}

const cansPositions = [
  { x: 0.71, y: 0.372 },
  { x: 0.735, y: 0.372 },
  { x: 0.76, y: 0.372 },
  { x: 0.785, y: 0.372 },
  { x: 0.81, y: 0.372 },
  { x: 0.835, y: 0.372 },
  { x: 0.86, y: 0.372 },
  { x: 0.885, y: 0.372 },
  { x: 0.89, y: 0.372 },
  { x: 0.935, y: 0.372 },
]
const tubesPositions = [
  { x: 0.47, y: 0.39 },
  { x: 0.485, y: 0.39 },
  { x: 0.5, y: 0.39 },
  { x: 0.515, y: 0.39 },
  { x: 0.53, y: 0.39 },
  { x: 0.545, y: 0.39 },
  { x: 0.56, y: 0.39 },
  { x: 0.575, y: 0.39 },
  { x: 0.59, y: 0.39 },
  { x: 0.605, y: 0.39 },
  { x: 0.62, y: 0.39 },
  { x: 0.635, y: 0.39 },
]
const tShirtsPositions = [
  { x: 0.06, y: 0.38 },
  { x: 0.012, y: 0.373 },
]
const personCoordinateSettings = {
  person1: {
    initial: { x: -1.35, y: 0.1 },
    red: { x: 0.52, y: 0.1 },
    purple: { x: 0.3, y: 0.1 },
    exit: { x: 1.2, y: 0.1 },
  },
  person2: {
    initial: { x: 1.2, y: 0.17 },
    red: { x: 0.76, y: 0.17 },
    purple: { x: 0.6, y: 0.17 },
    exit: { x: 2, y: 0.17 },
  },
  person3: {
    initial: { x: 1.15, y: 0.1 },
    red: { x: 0.82, y: 0.1 },
    purple: { x: 0.64, y: 0.1 },
    green: { x: 0.26, y: 0.1 },
    exit: { x: 1.2, y: 0.1 },
  },
  person4: {
    initial: { x: 1.6, y: 0 },
    red: { x: 0.8, y: 0 },
    purple: { x: 0.6, y: 0 },
    green: { x: 0.3, y: 0 },
    exit: { x: -2, y: 0 },
  },
}
const cloudSettingsByChoice = {
  red: [
    { className: 'red-cloud1', x: 0.9, y: 0.32, appearDelay: 4300, appearDuration: 400, fadeDuration: 400 },
    { className: 'red-cloud2', x: 0.8, y: 0.31, appearDelay: 4500, appearDuration: 400, fadeDuration: 400 },
    { className: 'red-cloud3', x: 0.7, y: 0.31, appearDelay: 4800, appearDuration: 600, fadeDuration: 700 },
    { className: 'red-cloud4', x: 0.65, y: 0.29, appearDelay: 8100, appearDuration: 1100, fadeDuration: 700 },
  ],
  green: [
    { className: 'green-cloud1', x: 0.03, y: 0.3, appearDelay: 2100, appearDuration: 800, fadeDuration: 400 },
    { className: 'green-cloud2', x: -0.1, y: 0.2, appearDelay: 6300, appearDuration: 1100, fadeDuration: 400 },
  ],
  purple: [
    { className: 'purple-cloud1', x: 0.47, y: 0.35, appearDelay: 3260, appearDuration: 1050, fadeDuration: 680 },
    { className: 'purple-cloud2', x: 0.5, y: 0.34, appearDelay: 3360, appearDuration: 1050, fadeDuration: 680 },
    { className: 'purple-cloud3', x: 0.55, y: 0.33, appearDelay: 3660, appearDuration: 1050, fadeDuration: 680 },
    { className: 'purple-cloud4', x: 0.53, y: 0.35, appearDelay: 4660, appearDuration: 1050, fadeDuration: 680 },
    { className: 'purple-cloud5', x: 0.48, y: 0.33, appearDelay: 4860, appearDuration: 1050, fadeDuration: 680 },
    { className: 'purple-cloud6', x: 0.42, y: 0.32, appearDelay: 8100, appearDuration: 1050, fadeDuration: 680 },
  ],
}

class Wave {
  constructor() {
    this.amplitude = 20 + Math.random() * 8
    this.frequency = 0.0055 + Math.random() * 0.007
    this.speed = 0.005 + Math.random() * 0.0007; //скорость волны
    this.offset = Math.random() * Math.PI * 2
  }
}

class Bubble {
  constructor() {
    this.reset()
  }
  reset() {
    this.x = Math.random() * width
    this.y = height + 50
    this.radius = 3 + Math.random() * 7
    this.speed = 1.8 + Math.random() * 2.8
    this.opacity = 0.6 + Math.random() * 0.4
    this.wobble = Math.random() * Math.PI * 2
    this.life = 1.0
  }
  update() {
    this.y -= this.speed
    this.wobble += 0.07
    this.x += Math.sin(this.wobble) * 1.2
    this.life -= 0.055
  }
  draw() {
    if (this.life <= 0) return
    ctx.save()
    ctx.globalAlpha = this.opacity * Math.max(this.life, 0) * liquidOpacity
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(this.x - this.radius * 0.32, this.y - this.radius * 0.32, this.radius * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.fill()
    ctx.restore()
  }
}

class VerticalLine {
  constructor() {
    this.x = Math.random() * width
    this.opacity = 0.75 + Math.random() * 0.25
    this.life = 0.8 + Math.random() * 0.7
    this.thickness = 1.2 + Math.random() * 2.8
    const surfaceY = height - fillLevel
    if (Math.random() > 0.45) {
      this.startY = surfaceY - 30
      this.length = fillLevel + 60 + Math.random() * 160
    } else {
      if (Math.random() > 0.5) {
        this.startY = surfaceY - 20
        this.length = 80 + Math.random() * 160
      } else {
        this.startY = height - 180 - Math.random() * 120
        this.length = 100 + Math.random() * 140
      }
    }
  }
  update() {
    this.life -= 0.085
  }
  draw() {
    ctx.save()
    ctx.globalAlpha = this.opacity * this.life * liquidOpacity
    ctx.strokeStyle = '#525457'
    ctx.lineWidth = this.thickness
    ctx.beginPath()
    ctx.moveTo(this.x, this.startY)
    ctx.lineTo(this.x, this.startY + this.length)
    ctx.stroke()
    ctx.restore()
  }
}

function getLiquidColors() {
  if (choice === 'green') {
    return { top: '#4ECDC4', main: '#1D737B', bottom: '#0F4A4F' }
  } else if (choice === 'purple') {
    return { top: '#C45EFF', main: '#7B1D7B', bottom: '#4A0F4A' }
  } else {
    return { top: '#ff5e5e', main: '#C4142D', bottom: '#8a0f1f' }
  }
}

function resize() {
  width = analogSection.clientWidth
  height = analogSection.clientHeight
  wavesCanvas.width = width
  wavesCanvas.height = height
  if (choice) {
    updatePersonLayout()
  }
}

function createWaves() {
  waves = []
  for (let i = 0; i < 4; i++) waves.push(new Wave())
}

function spawnBubble() {
  if (!isFilling || bubbles.length > 38 || !allowBubbles) return
  const bubble = new Bubble()
  bubble.y = height - fillLevel * (0.25 + Math.random() * 0.75)
  bubbles.push(bubble)
}

function spawnVerticalLine() {
  if (fillLevel < height * 0.95 || isFading) return
  verticalLines.push(new VerticalLine())
}

function clearScheduledTimer(timerId) {
  if (!timerId) return

  const timeoutInfo = activeTimeouts.get(timerId)
  if (timeoutInfo) {
    if (timeoutInfo.handle) clearTimeout(timeoutInfo.handle)
    activeTimeouts.delete(timerId)
  }

  const intervalInfo = activeIntervals.get(timerId)
  if (intervalInfo) {
    if (intervalInfo.handle) clearInterval(intervalInfo.handle)
    activeIntervals.delete(timerId)
  }
}

function scheduleTimeout(fn, delay) {
  const id = ++timerCounter
  const start = performance.now()
  const handle = window.setTimeout(() => {
    activeTimeouts.delete(id)
    fn()
  }, delay)
  activeTimeouts.set(id, { handle, delay, start, fn })
  return id
}

function scheduleInterval(fn, delay) {
  const id = ++timerCounter
  const handle = window.setInterval(() => {
    if (isPaused) return
    fn()
  }, delay)
  activeIntervals.set(id, { handle, delay, fn })
  return id
}

function pauseTimers() {
  for (const [id, timer] of activeTimeouts) {
    if (timer.handle) {
      clearTimeout(timer.handle)
      timer.remaining = Math.max(0, timer.delay - (performance.now() - timer.start))
      timer.handle = null
    }
  }

  for (const [id, timer] of activeIntervals) {
    if (timer.handle) {
      clearInterval(timer.handle)
      timer.handle = null
    }
  }
}

function resumeTimers() {
  for (const [id, timer] of activeTimeouts) {
    if (!timer.handle && timer.remaining !== null) {
      timer.start = performance.now()
      timer.handle = window.setTimeout(() => {
        activeTimeouts.delete(id)
        timer.fn()
      }, timer.remaining)
      timer.remaining = null
    }
  }

  for (const [id, timer] of activeIntervals) {
    if (!timer.handle) {
      timer.handle = window.setInterval(() => {
        if (isPaused) return
        timer.fn()
      }, timer.delay)
    }
  }
}

function togglePauseAnimation() {
  if (!choice) return
  if (isPaused) {
    isPaused = false
    resumeTimers()
  } else {
    isPaused = true
    pauseTimers()
  }
}

function startPersonAnimation(person, anim) {
  person.style.opacity = '1'
  anim.frame = 1
  if (anim.interval) clearScheduledTimer(anim.interval)

  anim.interval = scheduleInterval(() => {
    anim.frame = (anim.frame % anim.total) + 1
    const folder = person.id === 'person4' ? 'person4' : `person${person.id.slice(-1)}`
    person.src = `./img/${folder}/frame${anim.frame}.webp`
  }, 180)
}

function removePersonAfterAnimation(person, delay = 0) {
  scheduleTimeout(() => {
    if (person && person.parentNode) {
      clearScheduledTimer(person.__animInterval || null)
      person.parentNode.removeChild(person)
    }
  }, delay)
}

function createCans() {
  if (cansCreated) return
  cansCreated = true
  cansPositions.forEach((pos) => {
    const img = document.createElement('img')
    img.src = './img/cans.webp'
    img.alt = 'Cans'
    img.className = 'cans-image'
    analogSection.appendChild(img)
    cansImages.push(img)
  })
}

function createTShirts() {
  if (tShirtsCreated) return
  tShirtsCreated = true
  tShirtsPositions.forEach((pos, index) => {
    const img = document.createElement('img')
    img.src = './img/t-shirt.webp'
    img.alt = 'T-Shirt'
    img.className = 't-shirts-image'
    img.classList.add(index === 0 ? 'tshirt-0' : 'tshirt-1')
    analogSection.appendChild(img)
    tShirtsImages.push(img)
  })
}

function createTubes() {
  if (tubesCreated) return
  tubesCreated = true
  tubesPositions.forEach((pos) => {
    const img = document.createElement('img')
    img.src = './img/tube.webp'
    img.alt = 'Tube'
    img.className = 'tubes-image'
    analogSection.appendChild(img)
    tubesImages.push(img)
  })
}

function createClouds() {
  if (cloudsCreated) return
  cloudsCreated = true
  const settings = cloudSettingsByChoice[choice] || cloudSettingsByChoice.red
  settings.forEach((cfg) => {
    const img = document.createElement('img')
    img.src = './img/cloud.svg'
    img.alt = 'Cloud'
    img.className = 'cloud-image'
    if (cfg.className) {
      img.classList.add(cfg.className)
    } else if (cfg.maxWidth) {
      img.style.width = `${cfg.maxWidth}px`
    }
    img.style.left = '0px'
    img.style.top = '0px'
    img.style.transform = 'scale(0.2)'
    analogSection.appendChild(img)
    cloudsImages.push(img)
  })
}

function getImageContentRect() {
  const rect = shopImage.getBoundingClientRect()
  const sectionRect = analogSection.getBoundingClientRect()
  const naturalWidth = shopImage.naturalWidth || rect.width
  const naturalHeight = shopImage.naturalHeight || rect.height
  const containerWidth = rect.width
  const containerHeight = rect.height
  const scale = Math.max(containerWidth / naturalWidth, containerHeight / naturalHeight)
  const renderedWidth = naturalWidth * scale
  const renderedHeight = naturalHeight * scale
  // Respect CSS `object-position` so elements positioned relative to the
  // visible image area follow the same shift when shopImage is aligned
  // left/center/right or using percentage offsets.
  let objectPosition = '50% 50%'
  try {
    objectPosition = getComputedStyle(shopImage).objectPosition || shopImage.style.objectPosition || objectPosition
  } catch (e) {}

  const parts = String(objectPosition).trim().split(/\s+/)
  const posX = parts[0] || '50%'
  const posY = parts[1] || '50%'

  const parsePos = (p, axisSize, renderedSize) => {
    if (typeof p === 'string' && p.endsWith('%')) {
      return (parseFloat(p) / 100) * (axisSize - renderedSize)
    }
    if (p === 'left' || p === 'top') return 0
    if (p === 'center') return (axisSize - renderedSize) / 2
    if (p === 'right' || p === 'bottom') return axisSize - renderedSize
    if (typeof p === 'string' && p.endsWith('px')) return parseFloat(p)
    return (axisSize - renderedSize) / 2
  }

  const offsetX = parsePos(posX, containerWidth, renderedWidth)
  const offsetY = parsePos(posY, containerHeight, renderedHeight)

  return {
    left: rect.left - sectionRect.left + offsetX,
    top: rect.top - sectionRect.top + offsetY,
    width: renderedWidth,
    height: renderedHeight,
  }
}

function positionCans() {
  const imageRect = getImageContentRect()

  cansImages.forEach((img, index) => {
    const pos = cansPositions[index]
    if (!pos) return

    const x = imageRect.left + imageRect.width * pos.x
    const y = imageRect.top + imageRect.height * pos.y

    img.style.left = `${x}px`
    img.style.top = `${y}px`
  })
}

function positionTShirts() {
  const imageRect = getImageContentRect()

  tShirtsImages.forEach((img, index) => {
    const pos = tShirtsPositions[index]
    if (!pos) return

    const x = imageRect.left + imageRect.width * pos.x
    const y = imageRect.top + imageRect.height * pos.y

    img.style.left = `${x}px`
    img.style.top = `${y}px`
  })
}

function positionTubes() {
  const imageRect = getImageContentRect()

  tubesImages.forEach((img, index) => {
    const pos = tubesPositions[index]
    if (!pos) return

    const x = imageRect.left + imageRect.width * pos.x
    const y = imageRect.top + imageRect.height * pos.y

    img.style.left = `${x}px`
    img.style.top = `${y}px`
  })
}

function positionClouds() {
  const imageRect = getImageContentRect()

  cloudsImages.forEach((img, index) => {
    const settings = cloudSettingsByChoice[choice] || cloudSettingsByChoice.red
    const cfg = settings[index]
    if (!cfg) return

    const x = imageRect.left + imageRect.width * cfg.x
    const y = imageRect.top + imageRect.height * cfg.y

    img.style.left = `${x}px`
    img.style.top = `${y}px`
  })
}

function positionPerson(person, positionKey, options = {}) {
  const imageRect = getImageContentRect()
  const settings = personCoordinateSettings[person.id]
  const pos = settings?.[positionKey] || settings?.initial || { x: 0, y: 0 }
  const targetX = imageRect.left + imageRect.width * pos.x
  const targetY = imageRect.top + imageRect.height * pos.y
  const state = personAnimationState[person.id]
  const duration = options.duration ?? 0
  const easing = options.easing ?? 'cubic-bezier(0.25, 0.1, 0.25, 1)'
  const isBottomAnchored = person.id === 'person4'

  person.style.opacity = '1'

  if (isBottomAnchored) {
    if (duration > 0) {
      const sectionRect = analogSection.getBoundingClientRect()
      const currentRect = person.getBoundingClientRect()
      const startX = currentRect.left - sectionRect.left

      person.style.transition = 'none'
      person.style.top = 'auto'
      person.style.bottom = '0px'
      person.style.left = `${startX}px`

      requestAnimationFrame(() => {
        person.style.transition = `left ${duration}ms ${easing}, bottom ${duration}ms ${easing}`
        person.style.left = `${targetX}px`
        person.style.bottom = '0px'
      })
    } else {
      person.style.transition = 'none'
      person.style.top = 'auto'
      person.style.bottom = '0px'
      person.style.left = `${targetX}px`
    }

    if (state) {
      state.key = positionKey
      state.x = targetX
      state.y = targetY
    }
    return
  }

  if (duration > 0) {
    const sectionRect = analogSection.getBoundingClientRect()
    const currentRect = person.getBoundingClientRect()
    const startX = currentRect.left - sectionRect.left
    const startY = currentRect.top - sectionRect.top

    // When the element is hidden or not yet painted, don't animate from a stale
    // measurement; jump directly to the target coordinate to avoid it floating in space.
    if (!currentRect.width && !currentRect.height) {
      person.style.transition = 'none'
      person.style.left = `${targetX}px`
      person.style.top = `${targetY}px`
    } else {
      person.style.transition = 'none'
      person.style.left = `${startX}px`
      person.style.top = `${startY}px`

      requestAnimationFrame(() => {
        person.style.transition = `left ${duration}ms ${easing}, top ${duration}ms ${easing}`
        person.style.left = `${targetX}px`
        person.style.top = `${targetY}px`
      })
    }
  } else {
    person.style.transition = 'none'
    person.style.left = `${targetX}px`
    person.style.top = `${targetY}px`
  }

  if (state) {
    state.key = positionKey
    state.x = targetX
    state.y = targetY
  }
}

function updatePersonLayout() {
  if (!choice) return
  positionPerson(person1, personAnimationState.person1.key, { duration: 650, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  positionPerson(person2, personAnimationState.person2.key, { duration: 650, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  positionPerson(person3, personAnimationState.person3.key, { duration: 650, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  if (person4 && person4.isConnected) {
    positionPerson(person4, personAnimationState.person4.key, { duration: 650, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  }
}

function hideCans() {
  const hideDelays = [9000, 5300, 5700, 5600, 5500, 5400, 5800, 5200, 5100, 5000]
  cansImages.forEach((img, index) => {
    const delay = hideDelays[index] ?? 1200 + index * 120
    scheduleTimeout(() => {
      img.style.transition = 'none'
      img.style.opacity = '0'
    }, delay)
  })
}

function hideTShirts() {
  const hideDelays = [3200, 7500]
  tShirtsImages.forEach((img, index) => {
    const delay = hideDelays[index] ?? 1200 + index * 120
    scheduleTimeout(() => {
      img.style.transition = 'none'
      img.style.opacity = '0'
    }, delay)
  })
}

function hideTubes() {
  const hideDelays = [9000, 4800, 4000, 6000, 4500, 4000, 6000, 5800, 5200, 5000, 4800, 4600]
  tubesImages.forEach((img, index) => {
    const delay = hideDelays[index] ?? 1200 + index * 120
    scheduleTimeout(() => {
      img.style.transition = 'none'
      img.style.opacity = '0'
    }, delay)
  })
}

function showCans() {
  if (!cansCreated) createCans()
  positionCans()
  cansImages.forEach((img) => {
    img.style.transition = 'opacity 0.5s'
    img.style.opacity = '1'
  })
  hideCans()
}

function showTShirts() {
  if (!tShirtsCreated) createTShirts()
  positionTShirts()
  tShirtsImages.forEach((img) => {
    img.style.opacity = '1'
  })
  hideTShirts()
}

function showTubes() {
  if (!tubesCreated) createTubes()
  positionTubes()
  tubesImages.forEach((img) => {
    img.style.opacity = '1'
  })
  hideTubes()
}

function playCloudAppearSound() {
  try {
    if (window.audioManager && typeof window.audioManager.play === 'function') {
      window.audioManager.play('chelk', { loop: false, volume: 0.9, forceImmediate: true })
      return
    }
  } catch (e) {}

  try {
    const audio = new Audio('audio/chelk.mp3')
    audio.volume = 0.9
    audio.currentTime = 0
    audio.play().catch(() => {})
  } catch (e) {}
}

function showClouds() {
  if (!cloudsCreated) createClouds()
  positionClouds()

  const settings = cloudSettingsByChoice[choice] || cloudSettingsByChoice.red
  cloudsImages.forEach((img, index) => {
    const cfg = settings[index]
    if (!cfg) return

    img.style.opacity = '0'
    img.style.transform = 'scale(0.2)'
    img.style.transition = 'none'

    scheduleTimeout(() => {
      playCloudAppearSound()
      img.style.transition = `opacity ${cfg.appearDuration}ms ease-out, transform ${cfg.appearDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`
      img.style.opacity = '1'
      img.style.transform = 'scale(1)'

      scheduleTimeout(() => {
        img.style.transition = `opacity ${cfg.fadeDuration}ms ease-in`
        img.style.opacity = '0'

        scheduleTimeout(() => {
          if (img.parentNode) {
            img.parentNode.removeChild(img)
          }
        }, cfg.fadeDuration + 50)
      }, cfg.appearDuration + 150)
    }, cfg.appearDelay)
  })
}

function startFormScreenFollow() {
  formScreenFollowActive = true
  if (formScreenFollowFrame) cancelAnimationFrame(formScreenFollowFrame)

  const update = () => {
    if (!formScreenFollowActive) return

    const sectionRect = analogSection.getBoundingClientRect()
    const personRect = person4.getBoundingClientRect()
    const gap = -10
    const left = Math.max(0, personRect.right - sectionRect.left + gap)

    formScreen.style.left = `${left}px`
    formScreen.style.right = '0px'
    formScreenFollowFrame = requestAnimationFrame(update)
  }

  formScreenFollowFrame = requestAnimationFrame(update)
}

function stopFormScreenFollow() {
  formScreenFollowActive = false
  if (formScreenFollowFrame) {
    cancelAnimationFrame(formScreenFollowFrame)
    formScreenFollowFrame = null
  }
  formScreen.style.left = '0px'
  formScreen.style.right = '0px'
}

function animatePerson4() {
  const settings = person4SettingsByChoice[choice] || person4SettingsByChoice.red
  person4.style.opacity = '1'
  person4.style.transition = 'none'
  personAnimationState.person4.key = 'initial'
  person4.style.top = 'auto'
  person4.style.bottom = '0px'
  // place initial (offscreen) position using the shared coordinate system
  positionPerson(person4, 'initial', { duration: 0 })
  formScreen.style.left = '100%'
  formScreen.style.right = '0px'
  startPersonAnimation(person4, anim4)
  startFormScreenFollow()

  scheduleTimeout(() => {
    const targetKey = choice === 'green' ? 'green' : choice === 'purple' ? 'purple' : 'red'
    positionPerson(person4, targetKey, { duration: settings.enterDuration, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })

    scheduleTimeout(() => {
      positionPerson(person4, 'exit', { duration: settings.exitDuration, easing: 'cubic-bezier(0.4, 0.0, 1, 1)' })

      scheduleTimeout(() => {
        stopFormScreenFollow()
        if (person4.parentNode) {
          person4.parentNode.removeChild(person4)
        }
      }, settings.exitDuration + 100)
    }, settings.pause)
  }, settings.enterDelay)
}

function animatePersons() {
  animatePerson4()
  positionPerson(person1, 'initial', { duration: 0 })
  positionPerson(person2, 'initial', { duration: 0 })
  positionPerson(person3, 'initial', { duration: 0 })

  const targetKey = choice === 'purple' ? 'purple' : 'red'

  if (choice === 'green') {
    startPersonAnimation(person3, anim3)
    positionPerson(person3, 'green', { duration: 2800, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })

    scheduleTimeout(() => {
      scheduleTimeout(() => {
        positionPerson(person3, 'exit', { duration: 3500, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
      }, 1500)
    }, 2800)
    removePersonAfterAnimation(person3, 10000)
    return
  }

  // red и purple
  const delay1 = choice === 'purple' ? 200 : 300
  const delay2 = choice === 'purple' ? 900 : 1100
  const delay3 = choice === 'purple' ? 1600 : 1900

  scheduleTimeout(() => {
    startPersonAnimation(person1, anim1)
    positionPerson(person1, targetKey, { duration: 2400, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  }, delay1)

  scheduleTimeout(() => {
    startPersonAnimation(person2, anim2)
    positionPerson(person2, targetKey, { duration: 2100, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  }, delay2)

  scheduleTimeout(() => {
    startPersonAnimation(person3, anim3)
    positionPerson(person3, targetKey, { duration: 2000, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })
  }, delay3)

  scheduleTimeout(() => {
    positionPerson(person3, 'exit', { duration: 3500, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' })

    scheduleTimeout(() => {
      positionPerson(person1, 'exit', { duration: 1500, easing: 'cubic-bezier(0.4, 0.0, 1, 1)' })
      positionPerson(person2, 'exit', { duration: 2600, easing: 'cubic-bezier(0.4, 0.0, 1, 1)' })
    }, 700)
  }, 6200)

  removePersonAfterAnimation(person1, 10000)
  removePersonAfterAnimation(person2, 10000)
  removePersonAfterAnimation(person3, 10000)
}

function drawLiquid() {
  ctx.clearRect(0, 0, width, height)
  if (!isFilling && fillLevel === 0) return

  const surfaceY = height - fillLevel
  const colors = getLiquidColors()

  const gradient = ctx.createLinearGradient(0, surfaceY, 0, height)
  gradient.addColorStop(0, colors.top)
  gradient.addColorStop(0.45, colors.main)
  gradient.addColorStop(1, colors.bottom)

  ctx.fillStyle = gradient
  ctx.globalAlpha = liquidOpacity
  ctx.beginPath()
  ctx.moveTo(0, surfaceY)

  for (let x = 0; x <= width; x += 4) {
    let y = surfaceY
    waves.forEach((wave, i) => {
      const phase = Date.now() * wave.speed * (i % 2 === 0 ? 1 : -1)
      y += Math.sin(x * wave.frequency + phase + wave.offset) * wave.amplitude
    })
    ctx.lineTo(x, y)
  }

  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i]
    b.update()
    if (b.life > 0 && b.y + b.radius > surfaceY - 30) b.draw()
    else bubbles.splice(i, 1)
  }

  for (let i = verticalLines.length - 1; i >= 0; i--) {
    const line = verticalLines[i]
    line.update()
    if (line.life > 0) line.draw()
    else verticalLines.splice(i, 1)
  }
}

function animate() {
  if (!isPaused) {
    if (isFilling && fillLevel < targetFill) {
      fillLevel += (targetFill - fillLevel) * 0.01 //скорость поднятия экрана с жидкостью
    }

    if (isFilling && bubbles.length === 0 && fillLevel > height * 0.7 && !isFading) {
      isFading = true
      shopImage.style.opacity = '1'

      if (choice === 'red') {
        showCans()
        showClouds()
      } else if (choice === 'green') {
        showTShirts()
        showClouds()
      } else if (choice === 'purple') {
        showTubes()
        showClouds()
      }

      animatePersons()
      fadeOutLiquid()
    }
  }

  drawLiquid()
  animationFrameId = requestAnimationFrame(animate)
}

function fadeOutLiquid() {
  let opacity = 1
  const fadeInterval = scheduleInterval(() => {
    opacity -= 0.022
    liquidOpacity = Math.max(0, opacity)
    if (opacity < 0.7) verticalLines = []
    if (liquidOpacity <= 0) {
      clearScheduledTimer(fadeInterval)
      content.style.display = 'none'
    }
  }, 25)
}

function setShopImageByChoice(selectedChoice) {
  if (selectedChoice === 'green') {
    shopImage.src = './img/shop/green.webp'
  } else if (selectedChoice === 'purple') {
    shopImage.src = './img/shop/purple.webp'
  } else {
    shopImage.src = './img/shop/red.webp'
  }
  try { positionShopImageByChoice(selectedChoice) } catch (e) {}
}

function positionShopImageByChoice(selectedChoice) {
  // Apply alignment only for narrow viewports
  if (window.innerWidth > 1024) {
    // reset to default for large viewports
    shopImage.style.objectPosition = 'center center'
    shopImage.style.width = ''
    shopImage.style.left = ''
    return
  }

  if (window.innerWidth <= 500) {
    // For very small screens, widen the image and shift it so it
    // protrudes beyond the viewport edge by the requested amount.
    if (selectedChoice === 'red') {
      // Хорека -> выступить на 40px за правый край
      shopImage.style.width = 'calc(100% + 40px)'
      shopImage.style.objectPosition = 'right top'
      shopImage.style.left = '0'
    } else if (selectedChoice === 'green') {
      // Одежда -> выступить на 40px за левый край
      shopImage.style.width = 'calc(100% + 40px)'
      shopImage.style.objectPosition = 'left top'
      shopImage.style.left = '-40px'
    } else if (selectedChoice === 'purple') {
      // Косметика -> сдвинуть на 110px влево
      shopImage.style.width = 'calc(100% + 110px)'
      shopImage.style.objectPosition = 'center top'
      shopImage.style.left = '-110px'
    } else {
      shopImage.style.width = 'calc(100% + 40px)'
      shopImage.style.objectPosition = 'center top'
      shopImage.style.left = '0'
    }
    return
  }

  // Default narrow viewport behaviour (<=1024 && >500)
  shopImage.style.width = ''
  shopImage.style.left = ''
  if (selectedChoice === 'red') {
    shopImage.style.objectPosition = 'right top'
  } else if (selectedChoice === 'green') {
    shopImage.style.objectPosition = 'left top'
  } else {
    shopImage.style.objectPosition = 'center center'
  }
}

function startFilling(selectedChoice) {
  if (isFilling) return
  choice = selectedChoice
  setShopImageByChoice(selectedChoice)
  positionPerson(person1, 'initial', { duration: 0 })
  positionPerson(person2, 'initial', { duration: 0 })
  positionPerson(person3, 'initial', { duration: 0 })
  isFilling = true
  if (!animationFrameId) animate()
  content.style.opacity = '0'
  targetFill = height * 1.4

  scheduleInterval(() => {
    if (isFilling && fillLevel < targetFill * 0.95) {
      spawnBubble()
      if (Math.random() > 0.6) spawnBubble()
    }
  }, 75)

  scheduleInterval(() => spawnVerticalLine(), 85)
}

analogSection.addEventListener('click', () => {
  if (!choice) return
  togglePauseAnimation()
})

shopImage.addEventListener('load', () => {
  positionCans()
  positionTShirts()
  positionTubes()
  positionClouds()
})

window.addEventListener('resize', () => {
  resize()
  if (cansCreated) positionCans()
  if (tShirtsCreated) positionTShirts()
  if (tubesCreated) positionTubes()
  if (cloudsCreated) positionClouds()
  try { if (choice) positionShopImageByChoice(choice) } catch (e) {}
})

resize()
createWaves()
fillLevel = 0

const mixBtn = document.getElementById('mixBtn')
if (mixBtn) {
  mixBtn.addEventListener('click', () => {
    if (!isFilling) {
      start = syncStartFromSelection()

      try {
        if (analogSection) {
          analogSection.style.right = '0%'
          analogSection.style.display = 'block'
          analogSection.style.visibility = 'visible'
          analogSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          const comp = getComputedStyle(analogSection)
          if (comp.position === 'static') analogSection.style.position = 'relative'
          analogSection.style.setProperty('z-index', '20')
          if (content) {
            content.style.display = ''
            content.style.opacity = '1'
          }
        }
      } catch (e) {
        console.warn('Could not bring analogSection to top:', e)
      }

      allowBubbles = true

      window.setTimeout(() => {
        startFilling(start)
      }, 3550) //поднятие волн и запуск css-анимации (аналог лотти)
    }
  })
}

window.addEventListener('mainObjectChange', () => {
  syncStartFromSelection()
})

const headCanvas = document.getElementById('canvas')
if (headCanvas) {
  headCanvas.addEventListener('click', () => {
    allowBubbles = false
  })
}
