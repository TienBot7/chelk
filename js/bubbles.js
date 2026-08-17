const container = document.querySelector('.bubbles-container')
// global flag: becomes true on the first bubble click
if (typeof window !== 'undefined') {
  if (typeof window.bubbleClick === 'undefined') window.bubbleClick = false
  if (typeof window.headBubbleClicks === 'undefined') window.headBubbleClicks = 0
}
// store placed rectangles to avoid overlaps
const placedRects = []

const itemsGreen = [
  {
    color: '#9E9E9E',
    text1: '<p>Хочу что-то уникальное… как у всех</p>',
    text2: '<p>Уникально повторим</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Мне пока все нравится, но что-то не то</p>',
    text2: '<p>✨Ему все нравится✨</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Нам важно, чтобы это работало</p>',
    text2: '<p>На всё воля божья</p>',
  },
  {
    color: '#1D737B',
    text1: '<p>Давайте сначала разберемся, что мы делаем</p>',
    text2: '<p>А какую цель вы хотите достичь?</p>',
  },
  {
    color: '#1D737B',
    text1: '<p>Хочу в Forbes</p>',
    text2: '<p>Хочу выиграть Design Lion в Каннах</p>',
  },
  {
    color: '#1D737B',
    text1: '<p>Конкуренты громче. Мы — лучше</p>',
    text2: '<p>Позвольте это исправить</p>',
  },
]

const itemsRed = [
  {
    color: '#9E9E9E',
    text1: '<p>Хочется сделать и не переделывать никогда</p>',
    text2: '<p>Ахахахахвхаххазахв</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Давайте без брифа, там всё понятно</p>',
    text2: '<p>6 years later…</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Переделайте, как сейчас в тренде</p>',
    text2: '<p>Составим новый договор или оформим годовую подписку?</p>',
  },
  {
    color: '#C4142D',
    text1: '<p>Устал извиняться за сайт на переговорах</p>',
    text2: '<p>Больше не придётся</p>',
  },
  {
    color: '#C4142D',
    text1: '<p>Главное — чтобы это решало задачи бизнеса, а не просто мне нравилось</p>',
    text2: '<p>Мы нашли друг друга)</p>',
  },
  {
    color: '#C4142D',
    text1: '<p>Мы понимаем, что сильный продукт не делается за три дня, поэтому готовы заложить адекватные сроки</p>',
    text2: '<p>Вы только что увеличили мою мотивацию в три раза</p>',
  },
]

const itemsPurple = [
  {
    color: '#9E9E9E',
    text1: '<p>Начали за здравие, ушли в редизайн</p>',
    text2: '<p>Маршрут перестроен</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Это сработает?</p>',
    text2: '<p>Бюджет заложен на «да»</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Почти зафиналили, но давайте сначала</p>',
    text2: '<p>Сто шагов назад…</p>',
  },
  {
    color: '#7B1D7B',
    text1: '<p>Давайте не будем копировать лидеров рынка, у нас свой путь</p>',
    text2: '<p>Похоже у ребят большое будущее</p>',
  },
  {
    color: '#7B1D7B',
    text1: '<p>Наш продукт сложный, помогите упаковать его так, чтобы понял даже ребенок</p>',
    text2: '<p>Я проведу кастдевы с вашими клиентами и сотрудниками</p>',
  },
  {
    color: '#7B1D7B',
    text1: '<p>Мы наняли вас ради вашей экспертизы, так что финальное визуальное решение за вами</p>',
    text2: '<p>Улыбка в ответ</p>',
  },
]

// NOTE: initial bubbles removed — page starts empty.
// Helper: find non-overlapping random position for a bubble and register its rect
function buildBubbleTextHtml(mainHtml, label) {
  return `<p class="bubble-label">${label}</p>${mainHtml}`
}

function placeNonOverlapping(bubble) {
  const cRect = container.getBoundingClientRect()
  const bRect = bubble.getBoundingClientRect()
  const maxLeft = Math.max(0, cRect.width - bRect.width)
  const maxTop = Math.max(0, cRect.height - bRect.height)
  const padding = Math.max(8, Math.round(bRect.width * 0.06))

  let placed = false
  let left = 0,
    top = 0
  const tries = 200

  for (let i = 0; i < tries; i++) {
    left = Math.round(Math.random() * maxLeft)
    top = Math.round(Math.random() * maxTop)
    const rect = { left, top, right: left + bRect.width, bottom: top + bRect.height }

    let overlap = false
    for (const pr of placedRects) {
      if (!(rect.right + padding < pr.left || rect.left - padding > pr.right || rect.bottom + padding < pr.top || rect.top - padding > pr.bottom)) {
        overlap = true
        break
      }
    }

    if (!overlap) {
      bubble.style.left = left + 'px'
      bubble.style.top = top + 'px'
      placedRects.push(rect)
      placed = true
      break
    }
  }

  if (!placed) {
    left = Math.round(Math.random() * maxLeft)
    top = Math.round(Math.random() * maxTop)
    bubble.style.left = left + 'px'
    bubble.style.top = top + 'px'
    placedRects.push({ left, top, right: left + bRect.width, bottom: top + bRect.height })
  }

  return { left: parseInt(bubble.style.left, 10), top: parseInt(bubble.style.top, 10) }
}

function applyBubbleRelativePosition(bubble, relX, relY) {
  if (!container) return
  const cRect = container.getBoundingClientRect()
  const bRect = bubble.getBoundingClientRect()
  const maxLeft = Math.max(0, cRect.width - bRect.width)
  const maxTop = Math.max(0, cRect.height - bRect.height)
  const left = Math.round(Math.max(0, Math.min(1, relX)) * maxLeft)
  const top = Math.round(Math.max(0, Math.min(1, relY)) * maxTop)
  bubble.style.left = left + 'px'
  bubble.style.top = top + 'px'
}

function syncBubblePositionsOnResize() {
  if (!container) return
  const bubbles = Array.from(container.querySelectorAll('.bubble'))
  if (bubbles.length === 0) return

  const nextPlacedRects = []
  bubbles.forEach((bubble) => {
    const relX = Number.parseFloat(bubble.dataset.bubbleRelX ?? '0')
    const relY = Number.parseFloat(bubble.dataset.bubbleRelY ?? '0')
    applyBubbleRelativePosition(bubble, relX, relY)

    const rect = bubble.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const left = parseInt(bubble.style.left, 10)
    const top = parseInt(bubble.style.top, 10)
    nextPlacedRects.push({
      left,
      top,
      right: left + rect.width,
      bottom: top + rect.height,
    })
  })

  while (placedRects.length > 0) placedRects.pop()
  nextPlacedRects.forEach((rect) => placedRects.push(rect))
}

function playBubblePopSound() {
  try {
    if (window.audioManager && typeof window.audioManager.play === 'function') {
      const pick = Math.random() < 0.5 ? 'pop1' : 'pop2'
      window.audioManager.play(pick, { volume: 0.6 })
      return
    }
    const audio = new Audio('audio/chelk.mp3')
    audio.loop = false
    audio.play().catch((err) => console.warn('Bubble pop playback failed:', err))
  } catch (err) {
    console.warn('Failed to play bubble pop sound:', err)
  }
}

function attachBehavior(bubble, item) {
  const inner = bubble.querySelector('.bubble-inner')
  const textElement = bubble.querySelector('.bubble-text')
  const gameSection = document.querySelector('.game')
  let timeoutId = null
  let swapTimeout = null
  bubble.dataset.bubbleTextState = bubble.dataset.bubbleTextState || '1'

  function isGameActive() {
    if (!gameSection) return false
    const style = window.getComputedStyle(gameSection)
    return style.visibility !== 'hidden' && style.opacity !== '0'
  }

  function updateCursor() {
    bubble.style.cursor = isGameActive() ? 'default' : 'pointer'
  }

  function hideBubbleText() {
    textElement.style.transition = 'opacity 0.18s ease'
    textElement.style.opacity = '0'
  }

  function startRandomShake() {
    const delay = 2000 + Math.random() * 5000
    timeoutId = setTimeout(() => {
      if (!inner.matches(':hover')) {
        inner.classList.add('shake')
        setTimeout(() => inner.classList.remove('shake'), 420)
      }
      startRandomShake()
    }, delay)
  }

  startRandomShake()
  updateCursor()

  inner.addEventListener('mouseenter', () => {
    updateCursor()
    if (isGameActive()) {
      hideBubbleText()
      return
    }
    if (timeoutId) clearTimeout(timeoutId)
    inner.classList.remove('shake')

    bubble.style.animation = 'none'
    bubble.style.webkitAnimation = 'none'
    bubble.style.animationPlayState = 'paused'
    bubble.style.webkitAnimationPlayState = 'paused'
    bubble.style.transform = 'translate3d(0, 0, 0)'
    bubble.style.webkitTransform = 'translate3d(0, 0, 0)'
    // allow CSS :hover to control opacity (show text)
    textElement.style.opacity = ''
  })

  inner.addEventListener('mouseleave', () => {
    if (isGameActive()) {
      updateCursor()
      hideBubbleText()
      return
    }
    bubble.style.animation = 'none'
    bubble.style.webkitAnimation = 'none'
    bubble.style.animationPlayState = 'paused'
    bubble.style.webkitAnimationPlayState = 'paused'
    bubble.style.transform = 'translate3d(0, 0, 0)'
    bubble.style.webkitTransform = 'translate3d(0, 0, 0)'
    startRandomShake()

    // hide text on mouseleave immediately and cancel pending swaps
    if (swapTimeout) {
      clearTimeout(swapTimeout)
      swapTimeout = null
    }
    textElement.style.transition = 'opacity 0.18s ease'
    textElement.style.opacity = '0'
  })

  function swapText(newHtml, label, forceVisible = false) {
    if (isGameActive()) {
      hideBubbleText()
      return
    }
    clearTimeout(swapTimeout)
    textElement.style.transition = 'opacity 0.18s ease'
    // fade out first
    textElement.style.opacity = '0'
    swapTimeout = setTimeout(() => {
      if (isGameActive()) {
        hideBubbleText()
        return
      }
      textElement.innerHTML = buildBubbleTextHtml(newHtml, label)
      void textElement.offsetWidth
      if (forceVisible || inner.matches(':hover')) {
        textElement.style.opacity = '1'
      } else {
        textElement.style.opacity = '0'
      }
    }, 200)
  }

  inner.addEventListener('click', (event) => {
    event.stopPropagation()
    event.preventDefault()
    playBubblePopSound()
    if (isGameActive()) {
      updateCursor()
      hideBubbleText()
      return
    }
    // On click set the global flags, enable page scrolling, and allow head fade on scroll.
    try {
      if (typeof window !== 'undefined') {
        window.bubbleClick = true
        window.bubblesActive = true
        console.log('bubbleClick:', true, '(bubble click)')
      }
      const scrollSection = document.querySelector('.scroll-section')
      if (scrollSection) {
        scrollSection.classList.remove('visible')
      }
      const carousel = document.querySelector('.carousel')
      if (carousel) {
        carousel.style.setProperty('display', 'none', 'important')
      }
      const headSection = bubble.closest('section.head') || bubble.closest('.head')
      if (headSection && typeof window !== 'undefined') {
        window.headBubbleClicks = (window.headBubbleClicks || 0) + 1
        if (window.headBubbleClicks === 3) {
          headSection.classList.add('scroll-hint-visible')
        }
      }
    } catch (e) {}

    const cycleState = Number(bubble.dataset.bubbleTextState || '1')

    if (cycleState === 0) {
      swapText(item.text1, '✦ клиент ✦', true)
      bubble.dataset.bubbleTextState = '1'
    } else if (cycleState === 1) {
      swapText(item.text2, '✦ агентство ✦', true)
      bubble.dataset.bubbleTextState = '2'
    } else {
      hideBubbleText()
      bubble.dataset.bubbleTextState = '0'
    }
  })
}

// Вынесенная функция: спавнит один пузырь по дуге из кнопки
function spawnBubble(item, fixedTarget, sourcePoint) {
  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.style.setProperty('--bubble-color', item.color)
  const dur = (4 + Math.random() * 6).toFixed(2) + 's'
  const x = (Math.random() * 12 - 6).toFixed(3) + 'vw'
  bubble.style.setProperty('--float-duration', dur)
  bubble.style.setProperty('--float-x', x)
  bubble.style.animation = 'none'

  bubble.innerHTML = `
        <span class="bubble-inner">
          <span></span>
          <div class="bubble-text"></div>
        </span>
      `

  container.appendChild(bubble)
  bubble.classList.add('spawning')

  requestAnimationFrame(() => {
    const cRect = container.getBoundingClientRect()
    const bRect = bubble.getBoundingClientRect()
    const btn = document.querySelector('.bubbles-btn')

    let buttonCenterX = btn
      ? Math.round(btn.getBoundingClientRect().left - cRect.left + btn.getBoundingClientRect().width / 2)
      : Math.round(cRect.width * 0.5)
    let buttonCenterY = btn
      ? Math.round(btn.getBoundingClientRect().top - cRect.top + btn.getBoundingClientRect().height / 2)
      : Math.round(cRect.height * 0.37)

    if (sourcePoint && typeof sourcePoint.sx === 'number' && typeof sourcePoint.sy === 'number') {
      buttonCenterX = Math.round(Math.max(0, Math.min(1, sourcePoint.sx)) * cRect.width)
      buttonCenterY = Math.round(Math.max(0, Math.min(1, sourcePoint.sy)) * cRect.height)
    }

    const startLeft = Math.round(buttonCenterX - bRect.width / 2)
    const startTop = Math.round(buttonCenterY - bRect.height / 2)

    const maxLeft = Math.max(0, cRect.width - bRect.width)
    const maxTop = Math.max(0, cRect.height - bRect.height)
    const padding = Math.max(8, Math.round(bRect.width * 0.06))

    let targetLeft = startLeft,
      targetTop = startTop
    if (fixedTarget && (typeof fixedTarget.fx === 'number' || fixedTarget.edge)) {
      const hasFy = typeof fixedTarget.fy === 'number'
      const hasFx = typeof fixedTarget.fx === 'number'

      if (fixedTarget.edge === 'left') {
        targetLeft = 0
      } else if (fixedTarget.edge === 'right') {
        targetLeft = maxLeft
      } else if (hasFx) {
        targetLeft = Math.round(fixedTarget.fx * maxLeft)
      }

      targetTop = hasFy ? Math.round(fixedTarget.fy * maxTop) : startTop
      placedRects.push({ left: targetLeft, top: targetTop, right: targetLeft + bRect.width, bottom: targetTop + bRect.height })
    } else {
      let placed = false
      const tries = 200
      for (let i = 0; i < tries; i++) {
        const l = Math.round(Math.random() * maxLeft)
        const t = Math.round(Math.random() * maxTop)
        const rect = { left: l, top: t, right: l + bRect.width, bottom: t + bRect.height }

        let overlap = false
        for (const pr of placedRects) {
          if (
            !(rect.right + padding < pr.left || rect.left - padding > pr.right || rect.bottom + padding < pr.top || rect.top - padding > pr.bottom)
          ) {
            overlap = true
            break
          }
        }

        if (!overlap) {
          targetLeft = l
          targetTop = t
          placedRects.push(rect)
          placed = true
          break
        }
      }

      if (!placed) {
        targetLeft = Math.round(Math.random() * maxLeft)
        targetTop = Math.round(Math.random() * maxTop)
        placedRects.push({ left: targetLeft, top: targetTop, right: targetLeft + bRect.width, bottom: targetTop + bRect.height })
      }
    }

    bubble.style.left = startLeft + 'px'
    bubble.style.top = startTop + 'px'
    bubble.dataset.bubbleRelX = String(cRect.width ? startLeft / Math.max(1, cRect.width) : 0)
    bubble.dataset.bubbleRelY = String(cRect.height ? startTop / Math.max(1, cRect.height) : 0)
    bubble.style.opacity = '0'
    bubble.style.transition = 'none'
    bubble.style.transform = 'translate3d(0px, 0px, 0px)'
    bubble.style.webkitTransform = 'translate3d(0px, 0px, 0px)'
    bubble.style.animation = 'none'
    bubble.style.webkitAnimation = 'none'
    bubble.style.animationPlayState = 'paused'
    bubble.style.webkitAnimationPlayState = 'paused'

    const dx = targetLeft - startLeft
    const dy = targetTop - startTop
    const arcHeight = Math.max(60, Math.round(bRect.height * 0.6))

    const anim = bubble.animate(
      [
        { transform: 'translate(0px, 0px)', opacity: 0 },
        { transform: `translate(${Math.round(dx / 2)}px, ${Math.round(dy / 2 - arcHeight)}px)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 },
      ],
      {
        duration: 700,
        easing: 'cubic-bezier(.22,.9,.31,1)',
      },
    )

    anim.onfinish = () => {
      bubble.style.left = targetLeft + 'px'
      bubble.style.top = targetTop + 'px'
      const maxLeft = Math.max(0, cRect.width - bRect.width)
      const maxTop = Math.max(0, cRect.height - bRect.height)
      bubble.dataset.bubbleRelX = String(maxLeft > 0 ? targetLeft / maxLeft : 0)
      bubble.dataset.bubbleRelY = String(maxTop > 0 ? targetTop / maxTop : 0)
      bubble.style.transform = 'translate3d(0px, 0px, 0px)'
      bubble.style.webkitTransform = 'translate3d(0px, 0px, 0px)'
      bubble.style.transition = 'none'
      bubble.style.opacity = '1'

      bubble.style.animation = 'none'
      bubble.style.webkitAnimation = 'none'
      bubble.style.animationPlayState = 'paused'
      bubble.style.webkitAnimationPlayState = 'paused'
      bubble.classList.remove('spawning')

      const textElement = bubble.querySelector('.bubble-text')
      textElement.innerHTML = buildBubbleTextHtml(item.text1, '✦ клиент ✦')
      bubble.dataset.bubbleTextState = '1'

      attachBehavior(bubble, item)
    }
  })
}

const spawnBtn = document.querySelector('.bubbles-btn')
let spawnLocked = false // prevent multiple rapid clicks

function triggerBubbleSpawn({ triggeredBy, sourcePoint } = {}) {
  if (triggeredBy !== 'head' && triggeredBy !== 'button') return
  if (spawnLocked) return
  spawnLocked = true
  if (spawnBtn) spawnBtn.disabled = true

  const headMobileMode = triggeredBy === 'head' && window.innerWidth > 390 && window.innerWidth <= 500
  if (triggeredBy === 'head' && !sourcePoint) {
    sourcePoint = {
      sx: 0.5,
      sy: window.innerWidth <= 1024 ? 0.52 : 0.28,
    }
  }

  const existing = Array.from(container.querySelectorAll('.bubble'))
  const mobileSpawnOptions = headMobileMode
    ? { count: 2, fixedTargets: headMobileFixedTargets, pickMode: 'headMobile' }
    : undefined

  if (existing.length === 0) {
    let activeMain = null
    try {
      const el = document.getElementById('mainObject')
      if (el && el.textContent) activeMain = String(el.textContent).trim()
    } catch (e) {}
    try { if (!activeMain && typeof window !== 'undefined' && window.mainObject) activeMain = String(window.mainObject); } catch (e) {}

    let forcedGroup = null
    const nm = (activeMain || '').toLowerCase()
    if (nm === 'хорека') forcedGroup = itemsRed
    else if (nm === 'одежда') forcedGroup = itemsGreen
    else if (nm === 'косметика') forcedGroup = itemsPurple

    if (forcedGroup) console.log('[bubbles] forced group by mainObject:', activeMain)
    spawnThreeWithStagger(
      () => {
        spawnLocked = false
        if (spawnBtn) spawnBtn.disabled = false
      },
      forcedGroup,
      sourcePoint,
      mobileSpawnOptions,
    )
    return
  }

  const fallDuration = 1500 // ms for translate (shorter, smoother)
  const fadeBefore = 0 // ms before end to start fade
  existing.forEach((b) => {
    b.style.animation = 'none'
    b.style.animationPlayState = 'paused'

    const cs = getComputedStyle(b)
    const startTransform = cs.transform && cs.transform !== 'none' ? cs.transform : 'translate3d(0px,0px,0px)'
    const fallPx = Math.round(window.innerHeight * 1.2)
    const endTransform = startTransform + ` translate3d(0px, ${fallPx}px, 0)`

    try {
      const anim = b.animate([{ transform: startTransform }, { transform: endTransform }], {
        duration: fallDuration,
        easing: 'ease-in-out',
        fill: 'forwards',
      })
      
      anim.onfinish = () => {
        b.style.transform = endTransform
      }
    } catch (e) {
      let tx = 0,
        ty = 0
      try {
        const m = new DOMMatrixReadOnly(startTransform)
        tx = m.m41 || 0
        ty = m.m42 || 0
      } catch (er) {}
      b.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
      b.style.transition = `transform ${fallDuration}ms ease-in, opacity 600ms linear`
      void b.offsetWidth
      b.style.transform = `translate3d(${tx}px, ${ty + fallPx}px, 0)`
      
    }
  })

  const fallWait = fallDuration - 500 // spawn new bubbles immediately after the fall ends
  setTimeout(() => {
    existing.forEach(removeBubbleImmediate)
    let activeMain2 = null
    try {
      const el2 = document.getElementById('mainObject')
      if (el2 && el2.textContent) activeMain2 = String(el2.textContent).trim()
    } catch (e) {}
    try { if (!activeMain2 && typeof window !== 'undefined' && window.mainObject) activeMain2 = String(window.mainObject); } catch (e) {}
    let forcedGroup2 = null
    const nm2 = (activeMain2 || '').toLowerCase()
    if (nm2 === 'хорека') forcedGroup2 = itemsRed
    else if (nm2 === 'одежда') forcedGroup2 = itemsGreen
    else if (nm2 === 'косметика') forcedGroup2 = itemsPurple
    if (forcedGroup2) console.log('[bubbles] forced group by mainObject (after fall):', activeMain2)

    spawnThreeWithStagger(
      () => {
        spawnLocked = false
        if (spawnBtn) spawnBtn.disabled = false
      },
      forcedGroup2,
      sourcePoint,
      mobileSpawnOptions,
    )
  }, fallWait)
}

window.triggerBubbleSpawn = triggerBubbleSpawn

window.addEventListener('resize', () => {
  requestAnimationFrame(syncBubblePositionsOnResize)
})

// helper: try to remove the placedRects entry for a bubble
function removePlacedRectForBubble(bubble) {
  const left = parseInt(bubble.style.left || 0, 10)
  const top = parseInt(bubble.style.top || 0, 10)
  for (let i = 0; i < placedRects.length; i++) {
    const pr = placedRects[i]
    if (Math.abs(pr.left - left) < 8 && Math.abs(pr.top - top) < 8) {
      placedRects.splice(i, 1)
      return
    }
  }
}

function removeBubbleImmediate(bubble) {
  removePlacedRectForBubble(bubble)
  if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function pickTwoMobileHeadItems(chosenGroup) {
  if (!Array.isArray(chosenGroup) || chosenGroup.length === 0) return []
  const copy = chosenGroup.slice()
  shuffleArray(copy)

  const grayItems = copy.filter((item) => item && item.color === '#9E9E9E')
  const coloredItems = copy.filter((item) => item && item.color !== '#9E9E9E')

  if (grayItems.length > 0 && coloredItems.length > 0) {
    return [grayItems[0], coloredItems[0]]
  }

  const picks = []
  const colorCounts = {}
  for (let i = 0; i < copy.length && picks.length < 2; i++) {
    const it = copy[i]
    const c = it && it.color ? it.color : ''
    const cnt = colorCounts[c] || 0
    if (cnt < 2) {
      picks.push(it)
      colorCounts[c] = cnt + 1
    }
  }

  if (picks.length < 2) {
    for (let i = 0; i < copy.length && picks.length < 2; i++) {
      const it = copy[i]
      if (!picks.includes(it)) picks.push(it)
    }
  }
}

const headMobileFixedTargets = [
  { edge: 'left', fy: 0.35 },
  { edge: 'right', fy: 0.27 },
]

function spawnThreeWithStagger(done, forcedGroup, sourcePoint, options = {}) {
  const maxBubbles = window.innerWidth <= 1024 ? 2 : 3
  const count = Number.isFinite(options.count) ? Math.max(1, Math.min(maxBubbles, options.count)) : maxBubbles
  const stagger = 220 // ms between spawns
  // fixed relative target positions for the three bubbles (fractions of available area)
  const defaultFixedTargets = [
    { fx: 0.954, fy: 0.41 },
    { fx: 0.13, fy: 0.68 },
    { fx: 0.76, fy: 0.14 },
  ]
  const fixedTargets1440 = [
    { fx: 0.985, fy: 0.44 },
    { fx: 0.09, fy: 0.70 },
    { fx: 0.79, fy: 0.15 },
  ]
  const fixedTargets1024 = [
    { fx: 0.93, fy: 0.338 },
    { fx: 0.032, fy: 0.455 },
  ]
  const fixedTargets768 = [
    { fx: 0.955, fy: 0.325 },
    { fx: 0.04, fy: 0.47 },
  ]
  const fixedTargets500 = [
    { edge: 'left', fy: 0.29 },
    { edge: 'right', fy: 0.48 },
  ]
  const fixedTargets = options.fixedTargets || (() => {
    const width = window.innerWidth
    if (width <= 500) return fixedTargets500
    if (width <= 768) return fixedTargets768
    if (width <= 1024) return fixedTargets1024
    if (width <= 1440) return fixedTargets1440
    return defaultFixedTargets
  })()

  const groups = [itemsGreen, itemsRed, itemsPurple]

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  // Choose group strictly based on forcedGroup or current mainObject value (no random group selection)
  let picks = null
  let chosenGroup = null
  const pickMode = options.pickMode || 'default'
  if (Array.isArray(forcedGroup) && forcedGroup.length > 0) {
    chosenGroup = forcedGroup
  } else {
    // determine active mainObject (normalized)
    let activeMain = null
    try {
      const el = document.getElementById('mainObject')
      if (el && el.textContent) activeMain = String(el.textContent).trim()
    } catch (e) {}
    try { if (!activeMain && typeof window !== 'undefined' && window.mainObject) activeMain = String(window.mainObject); } catch (e) {}
    const nm = (activeMain || '').toLowerCase()
    if (nm === 'хорека') chosenGroup = itemsRed
    else if (nm === 'одежда') chosenGroup = itemsGreen
    else if (nm === 'косметика') chosenGroup = itemsPurple
    else chosenGroup = itemsGreen // default group when mainObject not set
    if (chosenGroup) console.log('[bubbles] chosen group by mainObject (spawn):', activeMain || '<none>')
  }

  // pick items based on the requested mode
  if (chosenGroup) {
    if (pickMode === 'headMobile') {
      picks = pickTwoMobileHeadItems(chosenGroup)
    } else {
      const copy = chosenGroup.slice()
      shuffleArray(copy)

      // pick up to 3 items but allow at most 2 items of the same color
      picks = []
      const colorCounts = {}
      for (let i = 0; i < copy.length && picks.length < 3; i++) {
        const it = copy[i]
        const c = it && it.color ? it.color : ''
        const cnt = colorCounts[c] || 0
        if (cnt < 2) {
          picks.push(it)
          colorCounts[c] = cnt + 1
        }
      }

      // if we couldn't gather 3 items under the constraint, fill remaining slots ignoring color
      if (picks.length < 3) {
        for (let i = 0; i < copy.length && picks.length < 3; i++) {
          const it = copy[i]
          if (!picks.includes(it)) picks.push(it)
        }
      }
    }
  }

  const finalCount = Math.min(count, picks.length)
  // finally spawn the picked items in order with stagger
  for (let i = 0; i < finalCount; i++) {
    setTimeout(() => {
      spawnBubble(picks[i], fixedTargets[i], sourcePoint)
    }, i * stagger)
  }

  if (typeof done === 'function') {
    const totalSpawnTime = (finalCount - 1) * stagger + 700 + 80 // last spawn start + anim duration + buffer
    setTimeout(() => done(), totalSpawnTime)
  }
}

