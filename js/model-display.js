import { WebGLRenderer, AmbientLight, DirectionalLight, PointLight, MeshStandardMaterial } from 'three';

export function createModelRenderer(canvas) {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isLowPowerDevice = typeof window !== 'undefined' && (
    window.innerWidth <= 500 || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  );
  const isAndroidDevice = typeof navigator !== 'undefined' && /Android/i.test(userAgent);
  let renderer;

  // Helper: try to obtain a WebGL context from a canvas with given attributes
  function tryGetContext(c, attrs) {
    try {
      if (!c || !c.getContext) return null;
      return c.getContext('webgl2', attrs) || c.getContext('webgl', attrs) || c.getContext('experimental-webgl', attrs) || null;
    } catch (e) {
      return null;
    }
  }

  // Attempt multiple strategies to create a WebGL context/renderer.
  // This increases chance on flaky Android webviews: try various attributes, ephemeral canvas, and a small retry/backoff.
  function createRendererWithRetries(targetCanvas) {
    const maxAttempts = isLowPowerDevice ? 2 : 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const attrsList = [
          { antialias: false, preserveDrawingBuffer: false, powerPreference: isAndroidDevice ? 'low-power' : 'default' },
          { antialias: false, preserveDrawingBuffer: false, powerPreference: 'default' },
          { antialias: false, preserveDrawingBuffer: false },
        ];
        for (let a = 0; a < attrsList.length; a++) {
          const attrs = attrsList[a];
          const ctx = tryGetContext(targetCanvas, attrs);
          if (ctx) {
            return new WebGLRenderer({ canvas: targetCanvas, alpha: true, antialias: !isLowPowerDevice, preserveDrawingBuffer: false, powerPreference: attrs.powerPreference || 'default' });
          }

          try {
            const ep = document.createElement('canvas');
            ep.width = Math.max(1, targetCanvas ? targetCanvas.clientWidth : 64);
            ep.height = Math.max(1, targetCanvas ? targetCanvas.clientHeight : 64);
            const epCtx = tryGetContext(ep, attrs);
            if (epCtx) {
              const rend = new WebGLRenderer({ canvas: ep, alpha: true, antialias: !isLowPowerDevice, preserveDrawingBuffer: false, powerPreference: attrs.powerPreference || 'default' });
              if (targetCanvas && targetCanvas.parentNode && rend.domElement) {
                rend.domElement.style.width = '100%';
                rend.domElement.style.height = '100%';
                rend.domElement.style.display = 'block';
                try {
                  targetCanvas.parentNode.replaceChild(rend.domElement, targetCanvas);
                } catch (e) {}
              }
              return rend;
            }
          } catch (e) {}
        }
      } catch (e) {
        // continue to next attempt without blocking the main thread
      }
    }
    return null;
  }

  try {
    const rend = createRendererWithRetries(canvas);
    if (!rend) {
      console.warn('WebGL context unavailable on this device/browser (model-display), keeping a safe fallback renderer to avoid blank slides.');
      const safeRenderer = {
        domElement: canvas,
        shadowMap: { enabled: false },
        setPixelRatio: () => {},
        setClearColor: () => {},
        setSize: () => {},
        render: () => {},
        dispose: () => {},
        toneMappingExposure: isLowPowerDevice ? 0.6 : 0.75,
      };
      // show a lightweight overlay so the user sees the slider is still alive instead of a blank white canvas
      try {
        if (canvas && canvas.parentNode) {
          const note = document.createElement('div');
          note.className = 'webgl-fallback-note retry-enable-3d';
          note.innerHTML = '<div style="text-align:center;padding:12px;color:white;">3D loading…</div>';
          note.style.position = 'absolute';
          note.style.left = '0';
          note.style.right = '0';
          note.style.top = '0';
          note.style.bottom = '0';
          note.style.display = 'flex';
          note.style.alignItems = 'center';
          note.style.justifyContent = 'center';
          note.style.background = 'rgba(0,0,0,0.18)';
          note.style.zIndex = '9999';
          note.style.cursor = 'pointer';
          canvas.parentNode.appendChild(note);
          note.addEventListener('click', () => {
            try {
              const retryRend = createRendererWithRetries(canvas);
              if (retryRend) {
                if (note.parentNode) note.parentNode.removeChild(note);
                renderer = retryRend;
                const initialDpr = isLowPowerDevice ? 1 : Math.min(window.devicePixelRatio || 1, 2);
                renderer.setPixelRatio(initialDpr);
                renderer.setClearColor(0x000000, 0);
                renderer.toneMappingExposure = isLowPowerDevice ? 0.6 : 0.75;
                renderer.shadowMap.enabled = !isLowPowerDevice;
                renderer.shadowMap.type = 0;
                renderer.sortObjects = !isLowPowerDevice;
              }
            } catch (e) {
              console.warn('Retry create renderer failed', e);
            }
          }, { once: true });
        }
      } catch (e) {}
      renderer = safeRenderer;
    } else {
      renderer = rend;
    }
  } catch (e) {
    console.warn('Failed to create WebGLRenderer; using safe fallback renderer to avoid blank slides:', e);
    renderer = {
      domElement: canvas,
      shadowMap: { enabled: false },
      setPixelRatio: () => {},
      setClearColor: () => {},
      setSize: () => {},
      render: () => {},
      dispose: () => {},
      toneMappingExposure: isLowPowerDevice ? 0.6 : 0.75,
    };
  }

  const initialDpr = isLowPowerDevice ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(initialDpr);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMappingExposure = isLowPowerDevice ? 0.6 : 0.75;
  renderer.shadowMap.enabled = !isLowPowerDevice;
  renderer.shadowMap.type = 0;
  renderer.sortObjects = !isLowPowerDevice;

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
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isLowPowerDevice = typeof window !== 'undefined' && (
    window.innerWidth <= 500 || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  );

  const ambientLight = new AmbientLight(0xffffff, isLowPowerDevice ? 1.1 : 0.8);
  scene.add(ambientLight);

  const mainLight = new DirectionalLight(0xffffff, isLowPowerDevice ? 1.8 : 4.8);
  mainLight.position.set(2, 4.8, 3);
  scene.add(mainLight);

  const rightLight = new DirectionalLight(0xffffff, isLowPowerDevice ? 0.8 : 1.6);
  rightLight.position.set(1.8, 2, 1.1);
  scene.add(rightLight);

  const leftLight = new DirectionalLight(0xffffff, isLowPowerDevice ? 0.7 : 1.5);
  leftLight.position.set(-8, 4.2, -5);
  scene.add(leftLight);

  const backLight = new DirectionalLight(0xffffff, isLowPowerDevice ? 0.9 : 3.2);
  backLight.position.set(0.1, 1, -1);
  scene.add(backLight);

  const fillLight = new PointLight(0xffffff, isLowPowerDevice ? 1.2 : 3.2);
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
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isLowPowerDevice = typeof window !== 'undefined' && (
    window.innerWidth <= 500 || /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  );

  model.traverse((child) => {
    if (!child.isMesh) return;

    if (isLowPowerDevice && child.material && child.material instanceof MeshStandardMaterial) {
      child.material.roughness = Math.min(child.material.roughness || 0.6, 1.0);
      child.material.metalness = Math.min(child.material.metalness || 0.45, 0.2);
      child.material.envMapIntensity = 0.3;
    } else if (!(child.material instanceof MeshStandardMaterial)) {
      const oldMat = child.material;
      const newMat = new MeshStandardMaterial({
        color: oldMat.color,
        map: oldMat.map,
        metalness: isLowPowerDevice ? 0.18 : 0.45,
        roughness: isLowPowerDevice ? 0.9 : 0.6,
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

    child.castShadow = !isLowPowerDevice;
    child.receiveShadow = !isLowPowerDevice;
  });
}