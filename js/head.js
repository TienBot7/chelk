import { WebGLRenderer, Scene, PerspectiveCamera, Color, AmbientLight, PointLight, Group, Raycaster, Vector2, Vector3, Box3 } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

const isAndroidDevice = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const useHeadImageFallback = () => window.innerWidth <= 500
const isLowPowerHeadRender = isMobileDevice && window.innerWidth <= 768
const MAX_HEAD_CANVAS_HEIGHT = 1080
const HEAD_RENDER_INTERVAL = isLowPowerHeadRender ? 33 : 16
let lastPointerSample = { x: 0, y: 0 }
let pointerRaycastCooldownUntil = 0
let headImageFallback = null
const mobileHeadFallbackEnabled = useHeadImageFallback()

function getHeadCanvasSize() {
  const width = window.innerWidth
  const height = Math.min(window.innerHeight, MAX_HEAD_CANVAS_HEIGHT)
  return { width, height }
}

// --- ИНИЦИАЛИЗАЦИЯ ---
const canvas = document.getElementById('canvas')
if (canvas) {
  canvas.style.width = '100%'
  canvas.style.height = `${Math.min(window.innerHeight, MAX_HEAD_CANVAS_HEIGHT)}px`
  canvas.style.display = 'block'
}
const renderer = mobileHeadFallbackEnabled ? null : new WebGLRenderer({
  canvas,
  antialias: !isAndroidDevice,
  alpha: true,
  preserveDrawingBuffer: false,
  powerPreference: isAndroidDevice ? 'low-power' : 'high-performance',
})
if (renderer) {
  const headCanvasSize = getHeadCanvasSize()
  renderer.setSize(headCanvasSize.width, headCanvasSize.height)
  renderer.setPixelRatio(isMobileDevice ? 1 : Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x121315, 1)
  renderer.shadowMap.enabled = false

  if (renderer.domElement) {
    renderer.domElement.style.position = 'fixed'
    renderer.domElement.style.bottom = '0'
    renderer.domElement.style.left = '0'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = `${Math.min(window.innerHeight, MAX_HEAD_CANVAS_HEIGHT)}px`
    renderer.domElement.style.maxHeight = `${MAX_HEAD_CANVAS_HEIGHT}px`
    renderer.domElement.style.display = 'block'
  }

  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    console.warn('WebGL context lost:', event)
    event.preventDefault()
  })
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.info('WebGL context restored')
    const restoredSize = getHeadCanvasSize()
    renderer.setSize(restoredSize.width, restoredSize.height)
    renderer.setPixelRatio(isMobileDevice ? 1 : Math.min(window.devicePixelRatio || 1, 2))
  })
}

const scene = mobileHeadFallbackEnabled ? null : new Scene()
if (scene) {
  scene.background = new Color(0x121315)
}

const initialHeadCanvasSize = getHeadCanvasSize()

// === ПРЕДУСТАНОВЛЕННЫЕ НАСТРОЙКИ КАМЕРЫ ===
const camera = mobileHeadFallbackEnabled ? null : new PerspectiveCamera(45, initialHeadCanvasSize.width / initialHeadCanvasSize.height, 0.1, 1000)
if (camera) {
  camera.position.set(0.0, 0.8, 0.5)
}

const controls = mobileHeadFallbackEnabled ? null : new OrbitControls(camera, renderer.domElement)
if (controls) {
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.rotateSpeed = 1.5
  controls.zoomSpeed = 1.3
  controls.panSpeed = 0.9
  controls.target.set(0.0, 0.6, -0.1)
  // Запрещаем вращение камеры пользователем — модель не будет вращаться от управления камерой
  controls.enableRotate = false
  // Запрещаем изменение масштаба камеры (скролл/пинч) — модель не будет увеличиваться/уменьшаться
  controls.enableZoom = false
}

// === ОСВЕЩЕНИЕ (предустановленные параметры) ===
// Окружающий свет
const ambientLight = mobileHeadFallbackEnabled ? null : new AmbientLight(0xffffff, 0.35)
if (ambientLight && scene) {
  scene.add(ambientLight)
}

// Контровой левый
const rimLeftLight = mobileHeadFallbackEnabled ? null : new PointLight(0xc4142d, 0.7)
if (rimLeftLight) {
  rimLeftLight.position.set(-2.4, 1.2, -7.0)
  rimLeftLight.distance = 20
  rimLeftLight.decay = 1.0
  scene.add(rimLeftLight)
}

// Контровой правый
const rimRightLight = mobileHeadFallbackEnabled ? null : new PointLight(0xc4142d, 2.1)
if (rimRightLight) {
  rimRightLight.position.set(2.8, -1.0, -6.0)
  rimRightLight.distance = 20
  rimRightLight.decay = 1.0
  scene.add(rimRightLight)
}

// Передний свет (фиксированный белый)
const frontLight = mobileHeadFallbackEnabled ? null : new PointLight(0xffffff, 2.5)
if (frontLight) {
  frontLight.position.set(1.4, 1.7, 3.0)
  frontLight.distance = 10
  frontLight.decay = 1.0
  scene.add(frontLight)
}

// Fill light (фиксированный голубой)
const fillLight = mobileHeadFallbackEnabled ? null : new PointLight(0x87a9fe, 0.45)
if (fillLight) {
  fillLight.position.set(1.2, 1.0, 2.0)
  fillLight.distance = 12
  fillLight.decay = 1.0
  scene.add(fillLight)
}

// Группа для экспорта
const exportGroup = mobileHeadFallbackEnabled ? null : new Group()
if (exportGroup && scene) {
  scene.add(exportGroup)
  exportGroup.add(ambientLight)
  exportGroup.add(rimLeftLight)
  exportGroup.add(rimRightLight)
  exportGroup.add(frontLight)
  exportGroup.add(fillLight)
}

const headHighlightLight = mobileHeadFallbackEnabled ? null : new PointLight(0xFFAA66, 0.0)
if (headHighlightLight) {
  headHighlightLight.position.set(0, 0.7, 0.5)
  headHighlightLight.distance = 3.0
  headHighlightLight.decay = 1.2
  scene.add(headHighlightLight)
}

const headGlowLight = mobileHeadFallbackEnabled ? null : new PointLight(0xFF8855, 0.0)
if (headGlowLight) {
  headGlowLight.distance = 2.5
  headGlowLight.decay = 1.5
  scene.add(headGlowLight)
}

if (exportGroup) {
  exportGroup.add(headHighlightLight)
  exportGroup.add(headGlowLight)
}

let currentModel = null
let raycaster = new Raycaster()
let mouseVector = new Vector2()
let targetHighlightIntensity = 0
let currentHighlightIntensity = 0
let targetGlowIntensity = 0
let currentGlowIntensity = 0
let headMeshes = []

// Параметры слежения модели за курсором (горизонталь + вертикаль)
let targetModelRotationY = 0
let targetModelRotationX = 0
// Горизонталь: немного увеличим общую амплитуду и добавим отдельный множитель для левой стороны
const maxFollowAngle = Math.PI / 5 // ~36°
const maxLeftMultiplier = 2.8 // левый поворот сильнее (умножает амплитуду влево)
// Вертикаль: уменьшаем амплитуду вверх/вниз
const maxPitch = Math.PI / 36 // ~5°
// Когда курсор поднимается вверх, усиливаем вертикальную амплитуду
const upPitchMultiplier = 4.0 // множитель амплитуды при движении вверх (увеличен)
const followLerp = 0.04 // сглаживание поворота (уменьшено для более плавного движения)

// === УПРАВЛЕНИЕ ЦВЕТОМ ===
function updateLightColor(color) {
  if (rimLeftLight) rimLeftLight.color.set(color)
  if (rimRightLight) rimRightLight.color.set(color)
}

// Map `mainObject` names to rim colors and apply when selection changes
function applyColorForMainObject(name) {
  if (!name) return;
  const map = {
    'Хорека': '#C4142D',
    'Косметика': '#7B1D7B',
    'Одежда': '#1D737B'
  };
  const color = map[name] || null;
  if (color) updateLightColor(color);
}

function applyFormStylesForMainObject(name) {
  const button = document.querySelector('.form__submit-btn');
  const photos = Array.from(document.querySelectorAll('.form__photo'));
  if (!button && photos.length === 0) return;

  const map = {
    'Хорека': { color: '#C4142D', grayscale: false },
    'Косметика': { color: '#7B1D7B', grayscale: true },
    'Одежда': { color: '#1D737B', grayscale: true }
  };

  const style = (name && map[name]) || null;

  if (button) {
    if (style) {
      button.style.backgroundColor = style.color;
    } else {
      button.style.backgroundColor = '';
    }
  }

  photos.forEach((photo) => {
    if (style && style.grayscale) {
      photo.style.filter = 'grayscale(100%)';
    } else {
      photo.style.filter = '';
    }
  });
}

// Listen for selection changes dispatched from script.js
window.addEventListener('mainObjectChange', (e) => {
  const name = e && e.detail ? e.detail : null;
  try {
    applyColorForMainObject(name);
    applyFormStylesForMainObject(name);
  } catch (err) {}
  if (useHeadImageFallback()) {
    ensureHeadImageFallback()
  }
});

// Initial sync: if there's an element `#mainObject` present, set color accordingly
try {
  const el = document.getElementById('mainObject');
  if (el && el.textContent) {
    const name = el.textContent.trim();
    applyColorForMainObject(name);
    applyFormStylesForMainObject(name);
  }
} catch (e) {}

// Color preset UI removed — color controlled programmatically

function getHeadImageVariantName() {
  const selectedText = (document.getElementById('mainObject')?.textContent || window.mainObject || '').trim()
  if (/хорека/i.test(selectedText)) return 'red'
  if (/одежда/i.test(selectedText)) return 'green'
  if (/косметика/i.test(selectedText)) return 'purple'
  return 'red'
}

function ensureHeadImageFallback() {
  if (!useHeadImageFallback()) return
  const container = document.querySelector('.viewer-container') || document.body
  if (!container) return

  if (!headImageFallback) {
    headImageFallback = document.createElement('img')
    headImageFallback.id = 'head-image-fallback'
    headImageFallback.alt = 'Head preview'
    headImageFallback.style.position = 'absolute'
    headImageFallback.style.left = '0'
    headImageFallback.style.right = '0'
    headImageFallback.style.bottom = '0'
    headImageFallback.style.top = 'auto'
    headImageFallback.style.width = '100%'
    headImageFallback.style.height = '100%'
    headImageFallback.style.objectFit = 'contain'
    headImageFallback.style.objectPosition = 'center bottom'
    headImageFallback.style.pointerEvents = 'auto'
    headImageFallback.style.display = 'block'
    headImageFallback.style.userSelect = 'none'
    headImageFallback.style.cursor = 'pointer'
    headImageFallback.style.transition = 'transform 140ms ease-out, filter 140ms ease-out'
    headImageFallback.style.zIndex = '0'
    headImageFallback.style.webkitTapHighlightColor = 'transparent'
    headImageFallback.style.outline = 'none'
    headImageFallback.style.boxShadow = 'none'
    headImageFallback.style.webkitUserSelect = 'none'
    headImageFallback.style.userSelect = 'none'
    headImageFallback.addEventListener('pointerdown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (typeof window.triggerBubbleSpawn === 'function') {
        const rect = headImageFallback.getBoundingClientRect()
        const point = {
          sx: (event.clientX - rect.left) / Math.max(rect.width, 1),
          sy: (event.clientY - rect.top) / Math.max(rect.height, 1),
        }
        window.triggerBubbleSpawn({ triggeredBy: 'head', sourcePoint: point })
      }
    }, { passive: false })
    container.appendChild(headImageFallback)
  }

  const variant = getHeadImageVariantName()
  headImageFallback.src = `./img/head/${variant}.png`
  headImageFallback.style.display = 'block'
  if (canvas) {
    canvas.style.display = 'none'
    canvas.style.opacity = '0'
    canvas.style.pointerEvents = 'none'
  }
}

function updateHeadFallbackTransform() {
  if (!headImageFallback || !useHeadImageFallback()) return

  const tiltX = (targetModelRotationX || 0) * -14
  const tiltY = (targetModelRotationY || 0) * 18
  const shiftX = (targetModelRotationY || 0) * 18
  const shiftY = (targetModelRotationX || 0) * -10

  headImageFallback.style.transform = `translate(${shiftX}px, ${shiftY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
  headImageFallback.style.transformOrigin = 'center bottom'
}

// === ЗАГРУЗКА МОДЕЛИ ===
const loader = new GLTFLoader()

function getHeadModelScaleFactor() {
  const width = window.innerWidth
  if (width <= 390) return 0.78
  if (width <= 768) return 0.8
  if (width <= 1024) return 1
  if (width <= 1440) return 1.1
  return 1.22
}

function getHeadModelYOffset() {
  return window.innerWidth <= 1024 ? 0.04 : -0.02
}

function getHeadModelPosition() {
  const width = window.innerWidth
  
  if (width <= 500) {
    return new Vector3(0.005, getHeadModelYOffset() + 0, 0.01)
  }
  if (width <= 768) {
    return new Vector3(0.005, getHeadModelYOffset() + 0.005, 0.01)
  }
  if (width <= 1024) {
    return new Vector3(0.005, getHeadModelYOffset() - 0.065, 0.01)
  }
  else if (width <= 1440) {
    // return new Vector3(0.01, getHeadModelYOffset(), 0.01)
    return new Vector3(0.02, getHeadModelYOffset() - 0.06, 0.01)
  }
  return new Vector3(-0.001, getHeadModelYOffset() - 0.11, 0.01)
}

function applyHeadModelLayout(model = currentModel) {
  if (!model) return
  model.position.copy(getHeadModelPosition())
  model.rotation.set(0, 0, 0)
  model.scale.setScalar(getHeadModelScaleFactor())
}

// Загружает модель по URL (локальный файл в проекте)
function loadModelFromURL(url, name = '') {

  loader.load(
    url,
    (gltf) => {
      if (currentModel) {
        exportGroup.remove(currentModel)
        currentModel = null
      }

      currentModel = gltf.scene

      applyHeadModelLayout(currentModel)

      exportGroup.add(currentModel)

      const box = new Box3().setFromObject(currentModel)
      const modelCenterX = (box.min.x + box.max.x) / 2
      const modelCenterZ = (box.min.z + box.max.z) / 2
      const headHeight = box.max.y
      headHighlightLight.position.set(modelCenterX, headHeight - 0.1, modelCenterZ + 0.3)
      headGlowLight.position.set(modelCenterX, headHeight - 0.15, modelCenterZ + 0.25)
      findHeadMeshes(currentModel)
      const size = box.getSize(new Vector3())
      try {
        if (window.preloader && typeof window.preloader.markModelLoaded === 'function') {
          window.preloader.markModelLoaded()
        }
      } catch (e) {}
    },
    (xhr) => {
      if (xhr && xhr.total) {
        const percent = Math.floor((xhr.loaded / xhr.total) * 100)
        try {
          if (window.preloader && typeof window.preloader.reportModelProgress === 'function') {
            window.preloader.reportModelProgress(xhr.loaded, xhr.total)
          }
        } catch (e) {}
      }
    },
    (error) => {
      console.error('Ошибка загрузки', error)
    },
  )
}

// On mobile, delay the heavy 3D model startup until the page has settled so the first render is not blocked.
if (useHeadImageFallback()) {
  ensureHeadImageFallback()
} else if (isMobileDevice) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      loadModelFromURL('./models/head.glb', 'head.glb')
    }, 1200)
  }, { once: true })
} else {
  loadModelFromURL('./models/head.glb', 'head.glb')
}

function findHeadMeshes(model) {
  headMeshes = []
  model.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase()
      if (name.includes('head') || name.includes('skull') || name.includes('face') || name.includes('cranium') || name === 'neck' || name.includes('helmet') || name.includes('hair')) {
        headMeshes.push(child)
      }
    }
  })

  if (headMeshes.length === 0) {
    let highestY = -Infinity
    let highestMesh = null
    model.traverse((child) => {
      if (child.isMesh) {
        const box = new Box3().setFromObject(child)
        const centerY = (box.min.y + box.max.y) / 2
        if (centerY > highestY) {
          highestY = centerY
          highestMesh = child
        }
      }
    })
    if (highestMesh) {
      headMeshes = [highestMesh]
    } else {
      headMeshes = null
    }
  }
}

function updateHeadlightIntensity(deltaTime) {
  if (!headHighlightLight || !headGlowLight || !rimLeftLight) return
  const lerpSpeed = 8.0
  currentHighlightIntensity += (targetHighlightIntensity - currentHighlightIntensity) * Math.min(1.0, lerpSpeed * deltaTime)
  currentGlowIntensity += (targetGlowIntensity - currentGlowIntensity) * Math.min(1.0, lerpSpeed * deltaTime)
  headHighlightLight.intensity = currentHighlightIntensity
  headGlowLight.intensity = currentGlowIntensity
  const boostedColor = rimLeftLight.color.clone().multiplyScalar(1.3)
  headHighlightLight.color.set(boostedColor)
  headGlowLight.color.set(rimLeftLight.color)
}

function checkHeadHover(clientX, clientY) {
  if (useHeadImageFallback()) {
    return true
  }

  if (!currentModel) {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    return
  }

  if (!renderer || !renderer.domElement) {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    return false
  }

  const rect = renderer.domElement.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    return
  }

  mouseVector.x = (x / rect.width) * 2 - 1
  mouseVector.y = -(y / rect.height) * 2 + 1
  raycaster.setFromCamera(mouseVector, camera)

  let intersects = []
  if (Array.isArray(headMeshes) && headMeshes.length > 0) {
    intersects = raycaster.intersectObjects(headMeshes, true)
  } else if (headMeshes === null) {
    const allMeshes = []
    currentModel.traverse((child) => { if (child.isMesh) allMeshes.push(child) })
    const allIntersects = raycaster.intersectObjects(allMeshes, true)
    if (allIntersects.length > 0) {
      const hitPoint = allIntersects[0].point
      const modelBox = new Box3().setFromObject(currentModel)
      const headThreshold = modelBox.min.y + (modelBox.max.y - modelBox.min.y) * 0.7
      if (hitPoint.y > headThreshold) intersects = [allIntersects[0]]
    }
  }

  if (intersects.length > 0) {
    targetHighlightIntensity = 2.2
    targetGlowIntensity = 1.5
    const hitPoint = intersects[0].point
    headHighlightLight.position.copy(hitPoint.clone().add(new Vector3(0.1, 0.25, 0.25)))
    headGlowLight.position.copy(hitPoint.clone().add(new Vector3(0.05, 0.15, 0.2)))
    if (renderer && renderer.domElement) renderer.domElement.style.cursor = 'pointer'
    return true
  } else {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    if (renderer && renderer.domElement) renderer.domElement.style.cursor = 'default'
    return false
  }
}

// Обработчики указателя: обновляют целевой угол поворота модели
function updateTargetFromPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  // Горизонталь
  const x = (clientX - rect.left) / rect.width // 0..1
  const nx = (x - 0.5) * 2 // -1..1
  // Для правой стороны используем базовую амплитуду, для левой — усилитель
  if (nx >= 0) {
    targetModelRotationY = nx * maxFollowAngle
  } else {
    targetModelRotationY = nx * maxFollowAngle * maxLeftMultiplier
  }
  // Вертикальное смещение игнорируем — модель двигается только влево/вправо
  targetModelRotationX = 0
}

// Track pointer globally so the head follows the cursor even when hovering UI elements.
// Use Pointer Events to cover mouse and touch in one handler; keep buttons clickable.
function playHeadClickSound() {
  try {
    if (window.audioManager && typeof window.audioManager.play === 'function') {
      window.audioManager.play('chelk', { loop: false, volume: 0.9 })
      return
    }
    const audio = new Audio('audio/chelk.mp3')
    audio.loop = false
    audio.play().catch((err) => console.warn('Head chelk playback failed:', err))
  } catch (err) {
    console.warn('Failed to play head click sound:', err)
  }
}

window.addEventListener('pointermove', (e) => {
  try {
    if (useHeadImageFallback()) {
      updateTargetFromPointer(e.clientX, e.clientY)
      updateHeadFallbackTransform()
      return
    }

    const now = performance.now()
    const dx = Math.abs(e.clientX - lastPointerSample.x)
    const dy = Math.abs(e.clientY - lastPointerSample.y)
    const shouldSkipRaycast = isLowPowerHeadRender && now < pointerRaycastCooldownUntil && dx < 2 && dy < 2
    if (shouldSkipRaycast) return

    lastPointerSample = { x: e.clientX, y: e.clientY }
    pointerRaycastCooldownUntil = now + (isLowPowerHeadRender ? 34 : 16)
    updateTargetFromPointer(e.clientX, e.clientY)
    checkHeadHover(e.clientX, e.clientY)
  } catch (err) {}
}, { passive: true })

window.addEventListener('pointerdown', (e) => {
  try {
    const headSection = document.querySelector('section.head') || document.querySelector('.head')
    if (!headSection || !headSection.classList.contains('visible')) return

    if (useHeadImageFallback()) {
      if (typeof window.triggerBubbleSpawn === 'function') {
        const rect = headImageFallback?.getBoundingClientRect?.() || null
        const sourcePoint = rect ? {
          sx: (e.clientX - rect.left) / Math.max(rect.width, 1),
          sy: (e.clientY - rect.top) / Math.max(rect.height, 1),
        } : undefined
        playHeadClickSound()
        window.triggerBubbleSpawn({ triggeredBy: 'head', sourcePoint })
      }
      return
    }

    if (checkHeadHover(e.clientX, e.clientY) && typeof window.triggerBubbleSpawn === 'function') {
      playHeadClickSound()
      window.triggerBubbleSpawn({ triggeredBy: 'head' })
    }
  } catch (err) {}
}, { passive: true })

// When pointer leaves the page/window (relatedTarget === null), reset head to neutral.
window.addEventListener('pointerout', (e) => {
  try {
    if (!e.relatedTarget) {
      targetModelRotationY = 0
      targetModelRotationX = 0
      targetHighlightIntensity = 0
      targetGlowIntensity = 0
    }
  } catch (err) {}
})

// reset view UI removed; keep programmatic reset function if needed
function resetView() {
  camera.position.set(0.0, 0.8, 0.5)
  controls.target.set(0.0, 0.6, -0.1)
  controls.update()
  applyHeadModelLayout(currentModel)
}

// Загрузка моделей отключена (UI скрыт и обработчики блокированы)

// === ЭКСПОРТ В GLB ===
// Export UI removed; exporter function kept if needed programmatically
function exportSceneToGLB(filename = 'exported_scene.glb') {
  if (!currentModel) {
    console.warn('Export skipped — no model loaded')
    return
  }
  const exportScene = new Scene()
  exportScene.background = scene.background.clone()
  const lightsToClone = [ambientLight, rimLeftLight, rimRightLight, frontLight, fillLight]
  lightsToClone.forEach((light) => {
    const clonedLight = light.clone()
    clonedLight.position.copy(light.position)
    clonedLight.intensity = light.intensity
    clonedLight.color = light.color.clone()
    clonedLight.distance = light.distance
    clonedLight.decay = light.decay
    clonedLight.visible = light.visible
    exportScene.add(clonedLight)
  })
  if (currentModel) {
    const clonedModel = currentModel.clone(true)
    clonedModel.position.copy(currentModel.position)
    clonedModel.rotation.copy(currentModel.rotation)
    clonedModel.scale.copy(currentModel.scale)
    exportScene.add(clonedModel)
  }
  const exporter = new GLTFExporter()
  exporter.parse(exportScene, (result) => {
    const blob = new Blob([result], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    console.log('Export finished:', filename)
  }, (error) => { console.error('Ошибка экспорта:', error) }, { binary: true, animations: [] })

}

// Settings UI removed

window.addEventListener('resize', () => {
  if (useHeadImageFallback()) {
    ensureHeadImageFallback()
    return
  }

  if (!renderer || !camera) return

  const sized = getHeadCanvasSize()
  const aspect = sized.width / sized.height
  camera.aspect = aspect
  camera.updateProjectionMatrix()
  canvas.style.height = `${sized.height}px`
  renderer.domElement.style.height = `${sized.height}px`
  renderer.domElement.style.maxHeight = `${MAX_HEAD_CANVAS_HEIGHT}px`
  renderer.setSize(sized.width, sized.height)
  renderer.setPixelRatio(isMobileDevice ? 1 : Math.min(window.devicePixelRatio || 1, 2))
  applyHeadModelLayout(currentModel)
})

// Fade head elements on scroll while keeping bubbles visible.
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function initHeadScrollFade() {
  try {
    const canvasEl = document.getElementById('canvas');
    const titleL = document.querySelector('.head__title.left');
    const titleR = document.querySelector('.head__title.right');
    const desc = document.querySelector('.head__description');
    const headSection = document.querySelector('section.head') || document.querySelector('.head');
    const linesEl = document.querySelector('.lines');
    const carouselTrack = document.querySelector('.carousel-track');
    const scrollSection = document.querySelector('.scroll-section');
    const bubblesContainer = headSection.querySelector('.bubbles-container');
    if (!canvasEl || !headSection) return;

    // Simple, predictable opacity transitions
    [headSection, canvasEl, titleL, titleR, desc, bubblesContainer].forEach((el) => {
      try { if (el) el.style.transition = 'opacity 1200ms ease'; } catch (e) {}
    });
    if (headSection) {
      try {
        headSection.style.transition = 'opacity 1200ms ease, visibility 0ms linear 0ms';
      } catch (e) {}
    }
    if (carouselTrack) {
      try { carouselTrack.style.transition = 'opacity 600ms cubic-bezier(0.2,0,0.1,1), visibility 0ms linear 0ms'; } catch (e) {}
    }

    let fadeWheel = 0;
    let lastExtrasVisible = null;
    let hasScrolled = false;
    let headPermanentlyHidden = false;
    const fadeMax = Math.max(window.innerHeight * 0.8, 320);
    const gameSection = document.querySelector('.game');

    if (gameSection) {
      try {
        gameSection.style.transition = 'opacity 900ms ease';
        gameSection.style.opacity = '0';
        gameSection.style.pointerEvents = 'none';
        gameSection.style.visibility = 'hidden';
      } catch (e) {}
    }

    function showExtras() {
      try {
        if (linesEl) {
          linesEl.classList.remove('visible');
        }
        if (scrollSection) {
          scrollSection.classList.remove('visible');
          scrollSection.style.display = 'none';
        }
      } catch (e) {}
    }

    function updateExtras() {
      if (lastExtrasVisible === false) return;
      lastExtrasVisible = false;
      showExtras();
    }

    function shouldRunFade() {
      return Boolean(window.bubbleClick) && !headPermanentlyHidden;
    }

    let headHideTimeout = null;
    function clearHeadHideTimeout() {
      if (headHideTimeout) {
        clearTimeout(headHideTimeout);
        headHideTimeout = null;
      }
    }
    function scheduleHeadHide() {
      clearHeadHideTimeout();
      if (!headSection) return;
      headHideTimeout = setTimeout(() => {
        try {
          if (parseFloat(headSection.style.opacity) <= 0.01) {
            headSection.style.setProperty('display', 'none', 'important');
            headSection.classList.remove('visible');
            headSection.classList.add('head-hidden-permanent');
            headPermanentlyHidden = true;
          }
        } catch (e) {}
        headHideTimeout = null;
      }, 80);
    }

    function updateFade(opacity) {
      if (headPermanentlyHidden) return;
      const visibleOpacity = String(opacity);
      if (headSection && opacity > 0 && headSection.style.display === 'none') {
        headSection.style.display = 'flex';
      }
      [headSection, canvasEl, titleL, titleR, desc, bubblesContainer].forEach((el) => { try { if (el) el.style.opacity = visibleOpacity; } catch (e) {} });
      if (headSection) {
        try {
          headSection.style.pointerEvents = opacity > 0.01 ? 'auto' : 'none';
          if (bubblesContainer) bubblesContainer.style.pointerEvents = opacity > 0.01 ? 'auto' : 'none';
          headSection.style.visibility = opacity > 0 ? 'visible' : 'hidden';
          if (opacity <= 0.01) {
            scheduleHeadHide();
          } else {
            clearHeadHideTimeout();
          }
        } catch (e) {}
      }
      if (carouselTrack) {
        try {
          carouselTrack.style.opacity = '';
          carouselTrack.style.pointerEvents = '';
          carouselTrack.style.visibility = '';
        } catch (e) {}
      }
      if (gameSection) {
        const gameOp = 1 - opacity;
        try {
          gameSection.style.opacity = String(gameOp);
          gameSection.style.pointerEvents = gameOp > 0.05 ? 'auto' : 'none';
          gameSection.style.visibility = gameOp > 0 ? 'visible' : 'hidden';
        } catch (e) {}
      }
      updateExtras(opacity);
    }

    function handleWheel(e) {
      if (!shouldRunFade()) return;
      try {
        const delta = e.deltaY || 0;
        if (delta !== 0) hasScrolled = true;
        fadeWheel = Math.max(0, Math.min(fadeMax, fadeWheel + delta));
        const progress = fadeWheel / fadeMax;
        const op = 1 - Math.pow(Math.min(1, progress), 2);
        updateFade(op);
      } catch (e) {}
    }

    function handleTouchMove(e) {
      if (!shouldRunFade() || !e.touches || !e.touches.length) return;
      try {
        const y = e.touches[0].clientY;
        if (typeof window._lastHeadTouchY === 'number') {
          const delta = window._lastHeadTouchY - y;
          if (delta !== 0) hasScrolled = true;
          fadeWheel = Math.max(0, Math.min(fadeMax, fadeWheel + delta));
          const progress = fadeWheel / fadeMax;
          const op = 1 - Math.pow(Math.min(1, progress), 2);
          updateFade(op);
        }
        window._lastHeadTouchY = y;
      } catch (e) {}
    }

    function resetTouch() {
      window._lastHeadTouchY = null;
    }

    window.resetHeadScrollFade = function() {
      headPermanentlyHidden = false;
      fadeWheel = 0;
      clearHeadHideTimeout();
      if (headSection) {
        headSection.style.display = 'flex';
        headSection.classList.remove('head-hidden-permanent');
        headSection.classList.add('visible');
        headSection.style.opacity = '1';
        headSection.style.pointerEvents = 'auto';
        headSection.style.visibility = 'visible';
      }
      const mainSection = document.getElementById('main-section');
      if (mainSection) {
        mainSection.classList.remove('visible');
      }
      if (carouselTrack) {
        carouselTrack.style.opacity = '';
        carouselTrack.style.pointerEvents = '';
        carouselTrack.style.visibility = '';
      }
      if (gameSection) {
        gameSection.style.opacity = '0';
        gameSection.style.pointerEvents = 'none';
        gameSection.style.visibility = 'hidden';
      }
      if (linesEl) {
        linesEl.classList.add('visible');
      }
      if (scrollSection) {
        scrollSection.classList.remove('visible');
        scrollSection.style.display = 'none';
      }
      if (headSection) {
        headSection.classList.remove('scroll-hint-visible');
      }
      if (typeof window !== 'undefined') {
        window.headBubbleClicks = 0;
      }
    }

    function onScroll() {
      if (!shouldRunFade()) return;
      const top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (top !== 0) hasScrolled = true;
      fadeWheel = Math.max(0, Math.min(fadeMax, top));
      const progress = fadeWheel / fadeMax;
      const op = 1 - Math.pow(Math.min(1, progress), 2);
      updateFade(op);
    }

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', resetTouch, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      fadeWheel = Math.min(fadeWheel, Math.max(window.innerHeight * 0.8, 320));
    }, { passive: true });
    if (window.bubbleClick) {
      updateFade(1);
    }
  } catch (e) {}
}

// init on load (if head elements already present)
try { if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initHeadScrollFade, 80); else window.addEventListener('DOMContentLoaded', () => setTimeout(initHeadScrollFade, 80)); } catch (e) {}

let lastFrameTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min(0.033, (now - lastFrameTime) / 1000)
  lastFrameTime = now

  if (useHeadImageFallback()) {
    updateHeadFallbackTransform()
    return
  }

  if (isLowPowerHeadRender && delta * 1000 < HEAD_RENDER_INTERVAL) {
    return
  }

  updateHeadlightIntensity(delta)
  controls.update()
  // Плавный поворот модели к целевому углу, вычисленному по указателю
  if (currentModel) {
    // Горизонталь (yaw)
    const deltaY = targetModelRotationY - currentModel.rotation.y
    currentModel.rotation.y += deltaY * followLerp
    // Вертикаль (pitch) не используется — плавно возвращаемся к 0
    currentModel.rotation.x += (0 - currentModel.rotation.x) * followLerp
  }
  renderer.render(scene, camera)
}
animate()
