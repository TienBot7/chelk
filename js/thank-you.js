let VFX = null

// Параметры эффекта
const PARAMS = {
  sphereR: 0.12,
  bubbleCount: 8,
  bubbleRadiusMin: 0.03,
  bubbleRadiusMax: 0.07,
  bubbleSpeed: 0.32,
  mouseSmoothing: 0.05,
}

// Шейдер эффекта (без изменений)
const postEffectShader = `
        precision highp float;
        uniform sampler2D src;
        uniform vec2 resolution;
        uniform vec2 offset;
        uniform vec2 mouse;
        uniform vec2 lag;
        uniform float time;
        uniform float effectScale;
        out vec4 outColor;

        const float SPHERE_R = ${PARAMS.sphereR.toFixed(4)};

        const float DISP = 0.025;
        const int   DISP_STEPS = 12;
        const float DISP_LO = 0.0;
        const float DISP_HI = 1.0;

        const float SCATTER = 0.03;

        const int N_BUBBLES = ${PARAMS.bubbleCount};
        const float BUBBLE_SMOOTH = 0.025;
        uniform float bubbleData[${PARAMS.bubbleCount * 4}];

        const vec3 ABSORB = vec3(2.0, 1.2, 1.0) * 3.;

        float smin(float a, float b, float k) {
          float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
          return mix(b, a, h) - k * h * (1.0 - h);
        }

        vec2 hash22(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
        }

        mat2 rot(float t) {
          float c = cos(t), s = sin(t);
          return mat2(c, -s, s, c);
        }

        float sdSphere(vec3 p, float r) {
          return length(p) - r;
        }

        float map(vec3 p, vec3 c) {
          vec3 q = p - c;
          vec3 sp = q;
          sp.y += sin(sp.z * 29. + time * 3.2) * 0.008;
          sp.z += sin(sp.x * 23. + sp.y * 11. + time * 3.5) * 0.008;
          sp.xy *= rot(time * 0.55);
          sp.xz *= rot(time * 0.45);

          float d = sdSphere(sp, SPHERE_R * effectScale);

          for (int i = 0; i < N_BUBBLES; i++) {
            int b = i * 4;
            vec3 bPos = vec3(bubbleData[b], bubbleData[b+1], bubbleData[b+2]);
            float r = bubbleData[b+3];
            d = smin(d, sdSphere(q - bPos, max(r, 0.001) * effectScale), BUBBLE_SMOOTH);
          }

          return d;
        }

        vec3 calcNormal(vec3 p, vec3 c) {
          vec2 e = vec2(0.001, 0.0);
          return normalize(vec3(
            map(p + e.xyy, c) - map(p - e.xyy, c),
            map(p + e.yxy, c) - map(p - e.yxy, c),
            map(p + e.yyx, c) - map(p - e.yyx, c)
          ));
        }

        vec3 spectrum(float x) {
          return clamp(vec3(
            1.5 - abs(4.0 * x - 1.0),
            1.5 - abs(4.0 * x - 2.0),
            1.5 - abs(4.0 * x - 3.0)
          ), 0.0, 1.0);
        }

        vec4 getSrc(vec2 uv) {
          vec4 c = texture(src, uv);
          return c;
        }

        void main() {
          vec2 uv = (gl_FragCoord.xy - offset) / resolution;
          float aspect = resolution.y / resolution.x;

          vec2 p = (uv - 0.5) * vec2(1.0, aspect);
          vec2 mp = ((mouse + lag) / resolution - 0.5) * vec2(1.0, aspect);

          vec3 ro = vec3(0.0, 0.0, -2.0);
          float focal = 2.0;
          vec3 rd = normalize(vec3(p, focal));

          vec3 c = vec3(mp, 0.0);

          vec3 firstN = vec3(0.0);
          vec3 lastN = vec3(0.0);
          int hitCount = 0;

          float thickness = 0.0;
          float tEntry = 0.0;
          float t = 0.0;
          bool inside = false;
          for (int i = 0; i < 50; i++) {
            if (t > 10.0) break;

            vec3 pos = ro + rd * t;
            float d = map(pos, c);

            float step = inside ? -d : d;
            if (step < 3e-4) {
              vec3 n = calcNormal(pos, c);
              if (hitCount == 0) firstN = n;
              lastN = n;
              if (!inside) {
                tEntry = t;
              } else {
                thickness += t - tEntry;
              }

              hitCount++;
              if (hitCount >= 4) { break; }

              inside = !inside;
              t += 0.01;
            } else {
              t += step;
            }
          }

          if (hitCount > 0) {
            vec2 baseDisp = -(firstN.xy + lastN.xy) * 0.5 * DISP;

            float NdotR = max(dot(firstN, -rd), 0.0);
            float scatter = pow((1.0 - NdotR), 2.0) * SCATTER;

            vec3 acc = vec3(0.0);
            vec3 wsum = vec3(0.0);
            for (int i = 0; i < DISP_STEPS; i++) {
              float wl = float(i) / float(DISP_STEPS - 1);
              float k = mix(DISP_LO, DISP_HI, wl) * (1.3 + float(hitCount) * 0.2);
              vec2 h = hash22(uv * 1000.0 + float(i) * 7.13 + time) * scatter;
              vec3 w = spectrum(wl);
              acc += getSrc(uv + baseDisp * k + h).rgb * w;
              wsum += w;
            }
            vec3 col = acc / wsum * 0.99;
            col -= float(hitCount) * 0.05;

            col += 0.1;

            float fres = pow(1.0 - NdotR, 5.0);
            col *= 1. + fres;

            float f2 = 1. - pow(NdotR, 3.0);
            col *= mix(vec3(1), exp(-ABSORB * thickness), f2);
            col *= 1. + f2;

            vec3 ld = normalize(vec3(0.5, 0.9, -0.3));
            float spec = pow(max(dot(reflect(-ld, firstN), -rd), 0.0), 200.0);
            col += spec * 30.;

            ld = normalize(vec3(-0.9, 0.4, -0.3));
            spec = pow(max(dot(reflect(-ld, firstN), -rd), 0.0), 300.0);
            col += spec * 3.;

            ld = normalize(vec3(-0.1, -0.9, -0.1));
            spec = pow(max(dot(reflect(-ld, firstN), -rd), 0.0), 30.0);
            col += spec * 0.5;

            col = min(col, 1.);
            
            float alpha = 0.7 + fres * 0.3;
            col = 1. - abs(col + fres * .5 - 1.);
            col = col * 1.2;
            
            outColor = vec4(col, alpha);
          } else {
            outColor = vec4(0.0, 0.0, 0.0, 0.0);
          }
        }
      `

// Клонируем элемент для VFX
const originalCircles = document.querySelector('.thank-you__circles')
let app
if (originalCircles) {
  const clone = originalCircles.cloneNode(true)
  clone.style.position = 'absolute'
  clone.style.left = '-9999px'
  clone.style.top = '-9999px'
  clone.style.opacity = '0'
  clone.style.pointerEvents = 'none'
  document.body.appendChild(clone)
  app = clone
} else {
  app = document.querySelector('.thank-you__wrapper') || document.body
}

const N = PARAMS.bubbleCount
const fract = (x) => x - Math.floor(x)
const rot2d = (x, y, t) => {
  const c = Math.cos(t), s = Math.sin(t)
  return [x * c - y * s, x * s + y * c]
}

let p0 = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
let p1 = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
let p2 = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

let isPressed = false
let lastWidth = window.innerWidth
let lastHeight = window.innerHeight

const circlesElement = document.querySelector('.thank-you__circles')
const buttonElement = document.querySelector('.thank-you__button')

const setCenterTarget = () => {
  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  p0.x = centerX
  p0.y = centerY

  // Сильное изменение размера — жёстко сбрасываем всё
  if (Math.abs(window.innerWidth - lastWidth) > 20 || 
      Math.abs(window.innerHeight - lastHeight) > 20) {
    p1.x = p0.x; p1.y = p0.y
    p2.x = p0.x; p2.y = p0.y
    lastWidth = window.innerWidth
    lastHeight = window.innerHeight
  }
}

const updatePointerPosition = (clientX, clientY) => {
  p0.x = clientX
  p0.y = window.innerHeight - clientY
}

const pressStart = (clientX, clientY) => {
  isPressed = true
  circlesElement?.classList.add('pressed')
  updatePointerPosition(clientX, clientY)
  p1.x = p0.x; p1.y = p0.y
  p2.x = p0.x; p2.y = p0.y
}

const pressEnd = () => {
  isPressed = false
  circlesElement?.classList.remove('pressed')
  setCenterTarget()
}

const addCaptureListener = (target, type, handler) => {
  target.addEventListener(type, handler, { passive: false, capture: true })
}

if (buttonElement) {
  buttonElement.addEventListener('pointerdown', () => circlesElement?.classList.add('pressed'))
  buttonElement.addEventListener('pointerup', () => circlesElement?.classList.remove('pressed'))
  buttonElement.addEventListener('pointercancel', () => circlesElement?.classList.remove('pressed'))
}

addCaptureListener(window, 'pointerdown', (e) => {
  pressStart(e.clientX, e.clientY)
  if (e.pointerType === 'touch' && e.cancelable) e.preventDefault()
})

addCaptureListener(window, 'pointerup', () => {
  pressEnd()
})

addCaptureListener(window, 'pointercancel', () => {
  pressEnd()
})

addCaptureListener(window, 'pointermove', (e) => {
  if (!isPressed) return
  updatePointerPosition(e.clientX, e.clientY)
})

const touchStartHandler = (e) => {
  const touch = e.changedTouches[0]
  if (!touch) return
  pressStart(touch.clientX, touch.clientY)
  if (e.cancelable) e.preventDefault()
}

const touchMoveHandler = (e) => {
  if (!isPressed) return
  const touch = e.changedTouches[0]
  if (!touch) return
  updatePointerPosition(touch.clientX, touch.clientY)
  if (e.cancelable) e.preventDefault()
}

const touchEndHandler = () => {
  pressEnd()
}

addCaptureListener(window, 'touchstart', touchStartHandler)
addCaptureListener(document, 'touchstart', touchStartHandler)
addCaptureListener(window, 'touchmove', touchMoveHandler)
addCaptureListener(document, 'touchmove', touchMoveHandler)
addCaptureListener(window, 'touchend', touchEndHandler)
addCaptureListener(document, 'touchend', touchEndHandler)
addCaptureListener(window, 'touchcancel', touchEndHandler)
addCaptureListener(document, 'touchcancel', touchEndHandler)

window.addEventListener('resize', () => {
  setCenterTarget()
  if (vfx) {
    vfx.update(app)
  }
  applyThankYouVfxScale()
})

const bubbles = new Float32Array(N * 4)
const t0 = performance.now() / 1000

let vfx // объявляем заранее

function tick() {
  const time = performance.now() / 1000 - t0
  const sm = isPressed ? 0.09 : 0.28

  if (!isPressed) {
    setCenterTarget()
    // Если отпустили, возвращаемся в центр плавно
    p1.x += (p0.x - p1.x) * sm
    p1.y += (p0.y - p1.y) * sm
    p2.x += (p1.x - p2.x) * sm
    p2.y += (p1.y - p2.y) * sm
  } else {
    p1.x += (p0.x - p1.x) * sm
    p1.y += (p0.y - p1.y) * sm
    p2.x += (p1.x - p2.x) * sm
    p2.y += (p1.y - p2.y) * sm
  }

  for (let i = 0; i < N; i++) {
    const life = fract(time * PARAMS.bubbleSpeed + i / N)

    const orbitR = PARAMS.sphereR * (0.3 + life * 0.8)
    const orbitAngle = time * (0.8 + fract(i * 0.618) * 0.7) + i * 1.256

    let bx = Math.cos(orbitAngle) * orbitR
    let by = 0
    let bz = Math.sin(orbitAngle) * orbitR

    ;[bx, by] = rot2d(bx, by, i * 2.3)
    ;[by, bz] = rot2d(by, bz, i * 1.8)

    by += life * 0.1
    bx += Math.sin(time * 2.7 + i * 4.1) * 0.008 * life
    bz += Math.cos(time * 3.1 + i * 3.7) * 0.008 * life

    const w = window.innerWidth
    const h = window.innerHeight
    bx += ((p2.x - p1.x) / w) * (h / w)
    by += (p2.y - p1.y) / h

    const range = PARAMS.bubbleRadiusMax - PARAMS.bubbleRadiusMin
    const maxR = PARAMS.bubbleRadiusMin + range * fract(i * 0.618)

    const j = i * 4
    bubbles[j]     = bx
    bubbles[j + 1] = by
    bubbles[j + 2] = bz
    bubbles[j + 3] = maxR * Math.sin(life * Math.PI)
  }

  requestAnimationFrame(tick)
}
tick()

// Создаём VFX
function getThankYouEffectScale() {
  return window.innerWidth <= 1024 ? 1.58 : 1
}

// Прозрачный фон
const style = document.createElement('style')
style.textContent = `
  vfx-js-canvas, canvas {
    background: transparent !important;
  }
`
document.head.appendChild(style)

async function initializeVfx() {
  if (!VFX) {
    const LoadedVFX = await loadVfxModule()
    if (!LoadedVFX) return
    VFX = LoadedVFX
  }

  try {
    vfx = new VFX({
      postEffect: {
        shader: postEffectShader,
        uniforms: {
          lag: () => [p2.x * devicePixelRatio, p2.y * devicePixelRatio],
          mouse: () => [0, 0],
          bubbleData: () => bubbles,
          effectScale: () => getThankYouEffectScale(),
        },
      },
    })

    await vfx.addHTML(app, { shader: 'none' })
    vfx.play()
  } catch (e) {
    console.warn('[thank-you] VFX initialization failed:', e)
    vfx = null
  }
}

initializeVfx().catch((err) => {
  console.warn('[thank-you] initializeVfx failed:', err)
})

const tensElement = document.getElementById('tens')
const unitsElement = document.getElementById('units')
let counterPercent = 0
let counterFrame = null
const titleElement = document.querySelector('.thank-you__title')

const updateDigits = (percent) => {
  const tens = Math.floor(percent / 10)
  const units = percent % 10
  if (tensElement) tensElement.textContent = String(tens)
  if (unitsElement) unitsElement.textContent = String(units)
}

const getThankYouVfxScale = () => {
  return window.innerWidth <= 1024 ? 1.18 : 1
}

const applyThankYouVfxScale = () => {
  const canvasRoot = document.querySelector('vfx-js-canvas') || document.querySelector('canvas')
  if (!canvasRoot) return
  const scale = getThankYouVfxScale()
  canvasRoot.style.transformOrigin = 'center center'
  canvasRoot.style.transform = scale === 1 ? '' : `scale(${scale})`
}

const revealVfxCanvas = () => {
  const canvasRoot = document.querySelector('vfx-js-canvas') || document.querySelector('canvas')
  if (!canvasRoot) {
    if (!vfx) return
    setTimeout(revealVfxCanvas, 50)
    return
  }
  canvasRoot.classList.add('visible-vfx')
  applyThankYouVfxScale()
}

async function loadVfxModule(timeoutMs = 3000) {
  try {
    const importPromise = import('@vfx-js/core')
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('VFX import timeout')), timeoutMs))
    const mod = await Promise.race([importPromise, timeoutPromise])
    if (!mod || !mod.VFX) throw new Error('VFX module missing')
    VFX = mod.VFX
    return VFX
  } catch (err) {
    console.warn('[thank-you] VFX module failed to load:', err)
    return null
  }
}

const animateCounter = () => {
  if (counterPercent < 99) {
    counterPercent += 1
    updateDigits(counterPercent)
    if (counterPercent === 99) {
      const inner = document.querySelector('.thank-you__circles__inner')
      const counter = document.querySelector('.loading__counter')
      if (inner) {
        inner.style.transform = 'translate(-50%, -50%) rotate(0deg)'
      }
      if (counter) {
        counter.style.transition = 'opacity 0.35s ease'
        counter.style.opacity = '0'
        setTimeout(() => {
          counter.style.display = 'none'
          titleElement?.classList.add('visible-title')
          revealVfxCanvas()
        }, 360)
      } else {
        titleElement?.classList.add('visible-title')
        revealVfxCanvas()
      }
    }
    counterFrame = requestAnimationFrame(() => {
      setTimeout(animateCounter, 12)
    })
  }
}

const initThankYouPage = () => {
  const loader = document.querySelector('.loading')
  const header = document.querySelector('header')
  const main = document.querySelector('main')

  if (header) header.style.display = ''
  if (main) main.style.display = ''

  if (!loader) return

  const onTransitionEnd = (event) => {
    if (event.propertyName !== 'opacity') return
    loader.removeEventListener('transitionend', onTransitionEnd)
    clearTimeout(fallback)
    loader.remove()
  }

  const fallback = setTimeout(() => {
    loader.removeEventListener('transitionend', onTransitionEnd)
    loader.remove()
  }, 1200)

  if (counterFrame) cancelAnimationFrame(counterFrame)
  updateDigits(99)

  loader.addEventListener('transitionend', onTransitionEnd)
  requestAnimationFrame(() => {
    loader.classList.add('hide')
  })
}

updateDigits(0)
animateCounter()

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initThankYouPage()
} else {
  window.addEventListener('DOMContentLoaded', initThankYouPage)
}

// === Аудио и анимация (без изменений) ===
const thankYouLink = document.querySelector('.thank-you__bottom a.mix-btn')
const thankYouScreen = document.querySelector('.thank-you')
let buttonAudio = null

const getButtonAudio = (resetCurrentTime = true) => {
  if (!buttonAudio) {
    buttonAudio = new Audio('./audio/chelk.mp3')
    buttonAudio.volume = 0.9
    buttonAudio.preload = 'auto'
  }
  if (resetCurrentTime) buttonAudio.currentTime = 0
  return buttonAudio
}

const playCheklSound = () => {
  const audio = getButtonAudio()
  audio.play().catch(() => {})
  return audio
}

let animationStarted = false
const startSvgAnimation = (duration = 1.4) => {
  if (animationStarted) return
  animationStarted = true
  if (!circlesElement) return
  const safeDuration = Math.max(duration, 0.8)
  circlesElement.style.setProperty('--click-duration', `${safeDuration}s`)
  circlesElement.classList.remove('animate-click')
  void circlesElement.offsetWidth
  circlesElement.classList.add('animate-click')
}

if (thankYouLink) {
  thankYouLink.addEventListener('mousedown', () => {
    const audio = playCheklSound()
    startSvgAnimation(audio.duration && !isNaN(audio.duration) ? audio.duration : 1.4)
  })

  thankYouLink.addEventListener('click', (event) => {
    event.preventDefault()
    const targetHref = thankYouLink.getAttribute('href') || './index.html'
    const audio = getButtonAudio(false)

    const navigate = () => window.location.href = targetHref
    audio.addEventListener('ended', navigate, { once: true })
    audio.addEventListener('error', navigate, { once: true })
  })
}

if (thankYouScreen) {
  thankYouScreen.addEventListener('mousedown', (event) => {
    if (!event.target.closest('.mix-btn')) playCheklSound()
  })
}