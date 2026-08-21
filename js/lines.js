;(function () {
  let svgTemplate = ''
  let currentColor = '#C4142D'
  let animationFrame = null
  let initialTimeout1 = null
  let initialTimeout2 = null
  let lastTime = 0
  let accumulatedTime = 0
  let isRunning = true

  const NAME_COLOR_MAP = {
    'хорека': '#C4142D',
    'косметика': '#7B1D7B',
    'одежда': '#1D737B'
  }

  const stage = document.getElementById('animationStage')
  let linesElement = null

  const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const ANIMATION_DURATION = isMobileDevice ? 2200 : 3000
  const NEW_LAYER_DELAY = isMobileDevice ? 700 : 500

  function isLinesVisible() {
    return !!(linesElement && linesElement.classList.contains('visible'))
  }

  function handleLinesVisibility(isVisible) {
    if (isVisible) {
      if (svgTemplate) startInfiniteAnimation()
    } else {
      cleanup()
    }
  }

  function observeLinesVisibility() {
    linesElement = document.querySelector('.lines')
    if (!linesElement) return

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'class') continue
        handleLinesVisibility(linesElement.classList.contains('visible'))
        break
      }
    })
    observer.observe(linesElement, { attributes: true, attributeFilter: ['class'] })
    handleLinesVisibility(linesElement.classList.contains('visible'))
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${r}, ${g}, ${b})`
  }

  function getSvgString(colorHex) {
    return svgTemplate.replace(/COLOR_PLACEHOLDER/g, hexToRgb(colorHex))
  }

  function createSvgElement(svgMarkup) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml')
    const svg = doc.documentElement
    svg.classList.add('animated-svg')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', 'auto')
    return svg
  }

  function createAndAnimateLayer() {
    if (!isRunning || !isLinesVisible()) return

    const svgString = getSvgString(currentColor)
    let svgElement = createSvgElement(svgString)

    svgElement.style.animation = `diveOpacity ${ANIMATION_DURATION}ms linear forwards`
    
    stage.appendChild(svgElement)

    setTimeout(() => {
      if (svgElement && svgElement.parentNode) svgElement.remove()
    }, ANIMATION_DURATION)
  }

  function animationLoop(timestamp) {
    if (!isRunning) return
    if (!isLinesVisible()) {
      cleanup()
      return
    }

    if (!lastTime) lastTime = timestamp
    const delta = timestamp - lastTime
    lastTime = timestamp

    accumulatedTime += delta

    while (accumulatedTime >= NEW_LAYER_DELAY) {
      createAndAnimateLayer()
      accumulatedTime -= NEW_LAYER_DELAY
    }

    animationFrame = requestAnimationFrame(animationLoop)
  }

  function clearInitialTimeouts() {
    if (initialTimeout1) {
      clearTimeout(initialTimeout1)
      initialTimeout1 = null
    }
    if (initialTimeout2) {
      clearTimeout(initialTimeout2)
      initialTimeout2 = null
    }
  }

  function startInfiniteAnimation() {
    cleanup()
    clearInitialTimeouts()

    createAndAnimateLayer()
    initialTimeout1 = setTimeout(() => createAndAnimateLayer(), 180)
    initialTimeout2 = setTimeout(() => createAndAnimateLayer(), 380)

    lastTime = 0
    accumulatedTime = 0
    isRunning = true

    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = requestAnimationFrame(animationLoop)
  }

  function pauseAnimation() {
    isRunning = false
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  function resumeAnimation() {
    if (isRunning) return
    isRunning = true
    lastTime = 0
    accumulatedTime = 0
    animationFrame = requestAnimationFrame(animationLoop)
  }

  function changeColor(newColor) {
    currentColor = newColor
    startInfiniteAnimation()
  }

  function cleanup() {
    isRunning = false
    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = null
    clearInitialTimeouts()
    accumulatedTime = 0
    lastTime = 0
    document.querySelectorAll('.animated-svg').forEach(el => el.remove())
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseAnimation()
    } else {
      resumeAnimation()
    }
  })

  window.addEventListener('load', () => {
    fetch('other/lines.svg')
      .then(res => res.text())
      .then(text => {
        svgTemplate = text
        if (linesElement && linesElement.classList.contains('visible')) {
          startInfiniteAnimation()
        }
      })
      .catch(err => console.error('SVG load error:', err))

    observeLinesVisibility()

    const choiceBtn = document.getElementById('choiseBtn')
    
    if (choiceBtn) {
      choiceBtn.addEventListener('click', () => {
        try { window._linesEnabled = true } catch (e) {}
        document.querySelector('.lines')?.classList.add('visible')
      })
    }
  })

  window.changeColor = changeColor

  window.addEventListener('mainObjectChange', (ev) => {
    try {
      const payload = ev && ev.detail ? ev.detail : ev
      const name = String(payload || '').toLowerCase()
      const newColor = NAME_COLOR_MAP[name]
      if (newColor) changeColor(newColor)
    } catch (e) {
    }
  })
})()