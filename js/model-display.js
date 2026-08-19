import { WebGLRenderer, AmbientLight, DirectionalLight, PointLight, MeshStandardMaterial } from 'three';

export function createModelRenderer(canvas) {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isLowPowerDevice = typeof window !== 'undefined' && (
    window.innerWidth <= 500 || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  );
  const isAndroidDevice = typeof navigator !== 'undefined' && /Android/i.test(userAgent);
  let renderer;
  try {
    // Basic feature-detect: ensure canvas can obtain a WebGL context before constructing renderer
    const canGet = (canvas && (canvas.getContext && (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))));
    if (!canGet) {
      console.error('WebGL context unavailable on this device/browser (model-display).');
      // Create a visible fallback indicator so the user is not left with a white canvas
      try {
        const note = document.createElement('div');
        note.className = 'webgl-fallback-note';
        note.textContent = '3D not supported on this device — showing simplified content';
        note.style.position = 'absolute';
        note.style.left = '0';
        note.style.right = '0';
        note.style.top = '0';
        note.style.bottom = '0';
        note.style.display = 'flex';
        note.style.alignItems = 'center';
        note.style.justifyContent = 'center';
        note.style.background = 'rgba(0,0,0,0.6)';
        note.style.color = 'white';
        note.style.zIndex = '9999';
        if (canvas && canvas.parentNode) canvas.parentNode.appendChild(note);
      } catch (e) {}
      throw new Error('WebGL unavailable');
    }

    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !isLowPowerDevice,
      preserveDrawingBuffer: false,
      powerPreference: isAndroidDevice ? 'low-power' : (isLowPowerDevice ? 'low-power' : 'high-performance'),
    });
  } catch (e) {
    console.error('Failed to create WebGLRenderer:', e);
    throw e;
  }

  const initialDpr = isLowPowerDevice ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(initialDpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMappingExposure = 0.75;
  renderer.shadowMap.enabled = !isLowPowerDevice;

  if (renderer.domElement) {
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      console.warn('WebGL context lost:', event);
      event.preventDefault();
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored');
      renderer.setPixelRatio(initialDpr);
    });
  }

  return renderer;
}

export function setupLighting(scene) {
  const ambientLight = new AmbientLight(0xffffff, 0);
  scene.add(ambientLight);

  const mainLight = new DirectionalLight(0xffffff, 4.8);
  mainLight.position.set(2, 4.8, 3);
  scene.add(mainLight);

  const rightLight = new DirectionalLight(0xffffff, 1.6);
  rightLight.position.set(1.8, 2, 1.1);
  scene.add(rightLight);

  const leftLight = new DirectionalLight(0xffffff, 1.5);
  leftLight.position.set(-8, 4.2, -5);
  scene.add(leftLight);

  const backLight = new DirectionalLight(0xffffff, 3.2);
  backLight.position.set(0.1, 1, -1);
  scene.add(backLight);

  const fillLight = new PointLight(0xffffff, 3.2);
  fillLight.position.set(3, -2, 3);
  scene.add(fillLight);

  try {
    scene.userData = scene.userData || {};
    scene.userData.lights = [ambientLight, mainLight, rightLight, leftLight, backLight, fillLight];
    scene.userData.lights.forEach((light) => {
      if (light) {
        light.userData = light.userData || {};
        light.userData.origIntensity = light.intensity || 0;
      }
    });
  } catch (e) {
    // ignore
  }
}

export function enhanceMaterials(model) {
  model.traverse((child) => {
    if (!child.isMesh) return;
    if (!(child.material instanceof MeshStandardMaterial)) {
      const oldMat = child.material;
      const newMat = new MeshStandardMaterial({
        color: oldMat.color,
        map: oldMat.map,
        metalness: 0.45,
        roughness: 0.6,
        transparent: !!oldMat.transparent,
        opacity: oldMat.opacity,
        side: oldMat.side,
      });
      child.material = newMat;
    }

    try {
      child.userData = child.userData || {};
      if (child.material && child.material.color) child.userData.origColor = child.material.color.clone();
      if (child.material && child.material.emissive) child.userData.origEmissive = child.material.emissive.clone();
    } catch (e) {
      // ignore
    }

    child.castShadow = true;
    child.receiveShadow = true;
  });
}