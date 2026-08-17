// Прелоадер: логика и экспорт функции запуска
let preloaderHasRun = false;
const soundAudioCache = {
  chelk: new Audio('audio/chelk.mp3'),
  music: new Audio('audio/music.mp3'),
  pop1: new Audio('audio/pop1.mp3'),
  pop2: new Audio('audio/pop2.mp3'),
};
// Только критические активы для первого отрисовки — ничего не будет блокировать
const requiredInitialAssets = [];

function preloadAsset(url) {
  return fetch(url, { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to preload ${url}`);
      return response.arrayBuffer();
    })
    .catch((error) => {
      console.warn('Asset preload failed:', url, error);
      return null;
    });
}

// Не загружаем аудио автоматически - будут загружаться по требованию
Object.values(soundAudioCache).forEach((audio) => {
  try {
    audio.preload = 'none'; // Отключаем предварительную загрузку
  } catch (e) {}
});

export function runPreloader({ onComplete }) {
  const loadingSection = document.querySelector('section.loading');
  const tensElement = document.getElementById('tens');
  const unitsElement = document.getElementById('units');

  const preloaderState = {
    windowLoaded: false,
    requiredAssetsLoaded: false,
    modelLoaded: false,
    modelProgress: 0,
    modelTotal: 0,
    waitTasks: [],
  }
  let displayedPercent = 0;
  let targetPercent = 0;
  let animationFrame = null;
  let finished = false;
  let soundBtnClicked = false;
  const MAX_WAIT_MS = 15000;

  function animateDigit(element, newValue) {
    const oldValue = element.textContent;
    if (oldValue === newValue.toString()) return;
    element.textContent = newValue;
  }

  function renderPercent(value) {
    const percent = Math.min(99, Math.max(0, Math.round(value)));
    const tens = Math.floor(percent / 10);
    const units = percent % 10;
    if (tensElement.textContent !== tens.toString()) {
      animateDigit(tensElement, tens);
    }
    if (unitsElement.textContent !== units.toString()) {
      animateDigit(unitsElement, units);
    }
  }

  function setLoadingPercent(p) {
    const percent = Math.min(99, Math.max(1, Math.round(p)));
    if (percent > targetPercent) {
      targetPercent = percent;
    }
  }

  function getCombinedProgress() {
    const windowFraction = preloaderState.windowLoaded ? 1 : 0;
    const requiredAssetsFraction = preloaderState.requiredAssetsLoaded ? 1 : 0;

    let modelFraction = 0;
    if (preloaderState.modelTotal > 0) {
      modelFraction = Math.min(1, preloaderState.modelProgress / preloaderState.modelTotal);
    } else if (preloaderState.modelLoaded) {
      modelFraction = 1;
    }

    // Real progress is weighted toward the actual model load, not a binary 0/1 switch.
    return (windowFraction * 0.25) + (requiredAssetsFraction * 0.2) + (modelFraction * 0.55);
  }

  function updatePreloaderProgress() {
    setLoadingPercent(getCombinedProgress() * 100);
  }

  function reportModelProgress(loaded, total) {
    preloaderState.modelProgress = loaded;
    preloaderState.modelTotal = total || preloaderState.modelTotal;
    updatePreloaderProgress();
  }

  function markRequiredAssetsLoaded() {
    preloaderState.requiredAssetsLoaded = true;
    if (!preloaderState.modelTotal) preloaderState.modelTotal = preloaderState.modelProgress || 1;
    updatePreloaderProgress();
    tryFinishPreloader();
  }

  function markModelLoaded() {
    preloaderState.modelLoaded = true;
    if (!preloaderState.modelTotal) preloaderState.modelTotal = preloaderState.modelProgress || 1;
    updatePreloaderProgress();
    tryFinishPreloader();
  }

  function markCarouselModelsReady() {
    preloaderState.modelLoaded = true;
    preloaderState.requiredAssetsLoaded = true;
    if (!preloaderState.modelTotal) preloaderState.modelTotal = preloaderState.modelProgress || 1;
    updatePreloaderProgress();
    tryFinishPreloader();
  }

  function addWaitTask(task) {
    if (!task || typeof task.then !== 'function') return;
    const tracker = { done: false };
    preloaderState.waitTasks.push(tracker);
    Promise.resolve(task)
      .catch(() => {})
      .finally(() => {
        tracker.done = true;
        tryFinishPreloader();
      });
  }

  function areWaitTasksComplete() {
    return preloaderState.waitTasks.every((tracker) => tracker.done);
  }

  function markWindowLoaded() {
    preloaderState.windowLoaded = true;
    updatePreloaderProgress();
    tryFinishPreloader();
  }

  function tryFinishPreloader() {
    if (finished) return;
    const canFinish = preloaderState.windowLoaded && preloaderState.requiredAssetsLoaded;
    if (canFinish) {
      setTimeout(finishPreloader, 300);
    }
  }

  if (typeof window !== 'undefined') {
    window.preloader = window.preloader || {};
    const queued = Array.isArray(window.preloader._queue) ? window.preloader._queue.slice() : [];
    window.preloader.reportModelProgress = reportModelProgress;
    window.preloader.markModelLoaded = markModelLoaded;
    window.preloader.markCarouselModelsReady = markCarouselModelsReady;
    window.preloader.markRequiredAssetsLoaded = markRequiredAssetsLoaded;
    window.preloader.markWindowLoaded = markWindowLoaded;
    window.preloader.addWaitTask = addWaitTask;
    if (queued.length > 0) {
      window.preloader._queue = [];
      queued.forEach((item) => {
        const [name, ...args] = item;
        if (typeof window.preloader[name] === 'function') {
          window.preloader[name](...args);
        }
      });
    }
    // Start preloading the critical assets for the first screen.
    try {
      // Do not release the preloader before the 3D model is actually ready.
      // The head/carousel models report completion via markModelLoaded() after GLTF load success.
      const preloadHeadModelTask = Promise.resolve(null); // Head model will be preloaded separately
      if (typeof window !== 'undefined') {
        window.preloader.preloadHeadModel = () => preloadHeadModelTask;
      }

      // Don't wait for audio - load on demand instead
      // This significantly reduces initial LCP
    } catch (e) {}
  }

  function animateProgress() {
    if (finished) return;
    if (displayedPercent < targetPercent) {
      const diff = targetPercent - displayedPercent;
      const step = Math.max(0.2, diff * 0.08);
      displayedPercent = Math.min(displayedPercent + step, targetPercent);
      renderPercent(displayedPercent);
    }
    animationFrame = requestAnimationFrame(animateProgress);
    
    if (typeof window !== 'undefined') {
      window.__preloaderState__ = {
        progress: displayedPercent,
        complete: finished
      };
    }
  }

  function finishPreloader() {
    if (finished) return;
    finished = true;
    if (typeof window !== 'undefined') {
      window.__preloaderState__ = {
        progress: 99,
        complete: true
      };
    }
    if (animationFrame) cancelAnimationFrame(animationFrame);
    targetPercent = 99;
    displayedPercent = 99;
    renderPercent(99);
    const mainSection = document.getElementById('main-section');
    if (mainSection) {
      mainSection.classList.remove('visible');
      // mainSection.style.opacity = '0';
      
    }
    if (onComplete) {
      Promise.resolve(onComplete()).then(() => {
        setTimeout(() => {
          hideLoading();
        }, 300);
      });
    } else {
      setTimeout(() => {
        hideLoading();
      }, 300);
    }
  }

  function hideLoading() {
    loadingSection.classList.add('hide');

    let idleHintTimer = null;
    let idleHintAttached = false;

    function scheduleMainTopHint() {
      const mainSection = document.getElementById('main-section');
      const mainTopHint = mainSection ? mainSection.querySelector('.main-section__top .scroll-down') : null;
      if (!mainTopHint) return;

      if (idleHintTimer) clearTimeout(idleHintTimer);
      mainTopHint.classList.remove('scroll-down-hint-visible');

      idleHintTimer = setTimeout(() => {
        mainTopHint.classList.add('scroll-down-hint-visible');
      }, 3000);
    }

    function resetMainTopHintTimer() {
      const mainSection = document.getElementById('main-section');
      const mainTopHint = mainSection ? mainSection.querySelector('.main-section__top .scroll-down') : null;
      if (!mainTopHint) return;

      if (idleHintTimer) clearTimeout(idleHintTimer);
      mainTopHint.classList.remove('scroll-down-hint-visible');

      idleHintTimer = setTimeout(() => {
        mainTopHint.classList.add('scroll-down-hint-visible');
      }, 3000);
    }

    if (!idleHintAttached) {
      const activityEvents = ['wheel', 'scroll'];
      activityEvents.forEach((eventName) => {
        document.addEventListener(eventName, resetMainTopHintTimer, { passive: true });
      });
      idleHintAttached = true;
    }

    // Плавно показать основной контент только после исчезновения прелоадера
    setTimeout(() => {
      // Скрыть все элементы, кроме svg-background и показать soundOverlay
      const mainSection = document.getElementById('main-section');
      if (mainSection) {
          mainSection.className = 'visible';
              const introTop = document.querySelector('.main-section__top');
              if (introTop) {
                introTop.classList.add('show-after-sound');
              }
              scheduleMainTopHint();
        // Скрыть текст, карусель, элементы управления
        mainSection.querySelectorAll('.carousel, .text-overlay, .controls-wrapper').forEach(el => {
          el.classList.add('hidden-on-start');
        });
        // svg-background показать
        const svgBg = mainSection.querySelector('.svg-background');
        if (svgBg) {
          svgBg.classList.add('visible');
        }
      }
      // Показать soundOverlay
      const soundOverlay = document.getElementById('soundOverlay');
      const soundBtn = document.getElementById('soundBtn');
      const soundDescr = document.getElementById('soundDescr');
      const svgBg = mainSection ? mainSection.querySelector('.svg-background') : null;
      if (soundOverlay && soundBtn) {
        soundOverlay.style.display = 'block';
        // ВАЖНО: начинаем фоновую загрузку сразу после показа интерактивной страницы
        startBackgroundAssetLoading();
        // Сначала svg-background
        if (svgBg) svgBg.classList.add('visible');
        // Затем с задержкой появляется soundBtn
        setTimeout(() => {
          soundBtn.classList.add('visible');
          soundDescr.classList.add('visible');
        }, 700);
      }
      // loadingSection.style.display = 'none';
    }, 850);

    // Обработчик для кнопки sound
    setTimeout(() => {
      const soundBtn = document.getElementById('soundBtn');
      const soundDescr = document.getElementById('soundDescr');
      const header = document.getElementById('header');
      const carousel = document.getElementById('carousel');
      const choiseBtn = document.getElementById('choiseBtn');
      const slideCenter = document.querySelector('.slide.center');
      const slideLeft = document.querySelector('.slide.left');
      const slideRight = document.querySelector('.slide.right');
      
      if (soundBtn) {
        soundBtn.onclick = () => {
          if (soundBtnClicked) return;
          soundBtnClicked = true;
          soundBtn.disabled = true;
          soundBtn.classList.add('disabled');

          // Play background music (user gesture allows autoplay)
          try {
            // play chelk once and a looping background music
            try {
              if (window.audioManager && typeof window.audioManager.play === 'function') {
                window.audioManager.play('chelk', { loop: false, volume: 0.9, forceImmediate: true });
                // start music slightly delayed through audioManager
                setTimeout(() => {
                  try { playBackgroundMusic(0); } catch (e) {}
                }, 500);
              } else {
                const chelkAudio = soundAudioCache.chelk;
                chelkAudio.loop = false;
                chelkAudio.currentTime = 0;
                chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));

                const music = soundAudioCache.music;
                music.loop = true;
                music.currentTime = 0;
                window.bgAudio = music;
                setTimeout(() => {
                  music.play().catch((err) => console.warn('music playback failed:', err));
                }, 500);
              }
            } catch (e) {
              try {
                const chelkAudio = soundAudioCache.chelk;
                chelkAudio.loop = false;
                chelkAudio.currentTime = 0;
                chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));
              } catch (err) {}
            }

            // expose for debugging/control: bgAudio refers to looping music
            window.chelkAudio = chelkAudio;

            // Log current mainObject text to console on sound button click
            try {
              const mainObj = document.getElementById('mainObject');
              if (mainObj) console.log('mainObject on soundBtn:', mainObj.textContent);
            } catch (e) {
              console.warn('Failed to read #mainObject:', e);
            }
          } catch (e) {
            console.warn('Failed to start music:', e);
          }
          // Плавно показать все элементы
          const mainSection = document.getElementById('main-section');
          const introTop = document.querySelector('.main-section__top');
          if (mainSection) {
            mainSection.style.overflow = 'hidden';
            if (introTop) {
              introTop.style.display = 'none';
            }

            // If the carousel is not already prepared, build it now.
            if (!window.carouselBuildPromise) {
              try {
                window.carouselBuildPromise = import('./script.js').then((script) => {
                  if (script && script.buildCarousel) {
                    return script.buildCarousel();
                  }
                  return Promise.resolve();
                }).catch((e) => {
                  console.warn('Failed to import script for buildCarousel:', e);
                });
              } catch (e) {
                console.warn('Error scheduling buildCarousel:', e);
              }
            }

            setTimeout(() => {
              mainSection.querySelectorAll('.carousel, .text-overlay, .controls-wrapper').forEach(el => {
                  // show header after small delay
                  setTimeout(() => {
                    const header = document.getElementById('header');
                    if (header) {
                      header.classList.add('visible');
                      header.style.opacity = '';
                    }
                  }, 900);

                  setTimeout(() => {
                    const carousel = document.getElementById('carousel');
                    if (carousel) {
                      carousel.classList.add('visible');
                      carousel.style.opacity = '';
                    }

                    // slides are created by buildCarousel; query them fresh
                    const slideCenter = document.querySelector('.slide.center');
                    if (slideCenter) {
                      slideCenter.classList.add('visible');
                      slideCenter.style.opacity = '';
                    }

                      // If element is controls-wrapper, also mark it visible
                      el.classList.add('show-after-sound');
                      el.classList.remove('hidden-on-start');
                      if (el.classList && el.classList.contains('controls-wrapper')) {
                        el.classList.add('visible');
                      }
                  }, 2600);
                  
                  setTimeout(() => {
                    const slideLeft = document.querySelector('.slide.left');
                    const slideRight = document.querySelector('.slide.right');
                    if (slideLeft) {
                      slideLeft.classList.add('visible');
                      slideLeft.style.opacity = '';
                    }
                    if (slideRight) {
                      slideRight.classList.add('visible');
                      slideRight.style.opacity = '';
                    }

                    const choiseBtn = document.getElementById('choiseBtn');
                    if (choiseBtn) {
                      choiseBtn.classList.add('visible');
                      choiseBtn.style.opacity = '';
                    }

                    const help = document.querySelector('.help');
                    if (help) {
                      help.classList.add('visible');
                      help.style.opacity = '';
                    }

                    // When user confirms choice, fade out side slides, controls, text and svg, then remove from DOM
                    if (choiseBtn) {
                      choiseBtn.addEventListener('click', () => {
                        // show the scroll-section when user confirms choice
                        try {
                          const scrollSec = document.querySelector('.scroll-section');
                          if (scrollSec) {
                            scrollSec.classList.add('visible');
                          }
                        } catch (e) {}

                        const slideLeft = document.querySelector('.slide.left');
                        const slideRight = document.querySelector('.slide.right');
                        const controls = document.querySelector('.controls-wrapper');
                        const textOverlay = document.querySelector('.text-overlay');
                        const svgBg = document.querySelector('.svg-background');

                        const targets = [slideLeft, slideRight, controls, textOverlay, svgBg].filter(Boolean);
                        // start fade animation on elements and their canvases (WebGL canvas needs explicit transition)
                        // enable wheel-scaling for center model when user confirms
                        try {
                          import('./script.js').then((m) => {
                            if (m && m.enableCenterScrollScale) m.enableCenterScrollScale();
                          }).catch(() => {});
                        } catch (e) {}

                        targets.forEach((el) => {
                          el.classList.add('fade-out');
                          // also fade any canvas inside the element to ensure smooth WebGL fade
                          try {
                            const canvases = el.querySelectorAll && el.querySelectorAll('canvas');
                            if (canvases && canvases.length) {
                              canvases.forEach((c) => {
                                c.classList.add('fade-out');
                                c.style.transition = 'opacity 1.6s cubic-bezier(0.4,0,0.2,1)';
                              });
                            }
                          } catch (e) {
                            // ignore
                          }
                        });

                        // After transition, remove elements from DOM
                        const REMOVE_DELAY = 1700; // match CSS transition duration (1.6s) + small buffer
                        setTimeout(() => {
                          targets.forEach((el) => {
                            try {
                              if (el && el.parentNode) el.parentNode.removeChild(el);
                            } catch (e) {
                              console.warn('Failed to remove element after fade:', e);
                            }
                          });
                        }, REMOVE_DELAY);
                      }, { once: true });
                    }
                  }, 4000);
              });

            }, 400);


            // Масштабируем svg-background
            const svgBg = mainSection.querySelector('.svg-background');
            if (svgBg) svgBg.classList.add('scale-full');
          }
          soundBtn.classList.remove('visible');
          soundDescr.classList.remove('visible');
          setTimeout(() => {
            const soundOverlay = document.getElementById('soundOverlay');
            if (soundOverlay) soundOverlay.style.display = 'none';
          }, 800);
        };
      }
      // Music toggle button: плавное затухание и повторное проигрывание с начала
      const musicToggleBtn = document.getElementById('musicToggleBtn');

      function playBackgroundMusic(delay = 500, volume = 0.8) {
        try {
          const targetVolume = Math.max(0, Math.min(1, volume));
          if (window.audioManager && typeof window.audioManager.play === 'function') {
            const musicPlayer = window.audioManager.play('music', { loop: true, volume: targetVolume, delay: 0 });
            window.bgAudio = musicPlayer;
            return musicPlayer;
          }

          const music = window.bgAudio && window.bgAudio.tagName === 'AUDIO'
            ? window.bgAudio
            : new Audio('audio/music.mp3');
          music.loop = true;
          music.preload = 'auto';
          music.currentTime = 0;
          music.volume = targetVolume;
          window.bgAudio = music;
          setTimeout(() => {
            music.play().catch((err) => console.warn('music playback failed:', err));
          }, delay);
          return music;
        } catch (e) {
          console.warn('Failed to start music:', e);
          return null;
        }
      }

      function stopBackgroundMusic(audio, duration = 800) {
        if (window.audioManager && typeof window.audioManager.fadeVolume === 'function') {
          window.audioManager.fadeVolume('music', 0, duration);
          setTimeout(() => {
            try { window.audioManager.stop('music'); } catch (e) {}
          }, duration + 60);
          return true;
        }

        if (!audio) return false;

        const startVolume = Number.isFinite(audio.volume) ? audio.volume : 0.8;
        const steps = Math.max(12, Math.round(duration / 16));
        const stepTime = Math.max(16, Math.round(duration / steps));
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
          currentStep += 1;
          const progress = Math.min(1, currentStep / steps);
          const eased = 1 - Math.pow(1 - progress, 3);
          const nextVolume = startVolume + (0 - startVolume) * eased;
          try { audio.volume = nextVolume; } catch (e) {}
          if (progress >= 1) {
            clearInterval(fadeInterval);
            try { if (typeof audio.pause === 'function') audio.pause(); } catch (e) {}
            try { if (typeof audio.stop === 'function') audio.stop(); } catch (e) {}
            try { if (typeof audio.currentTime === 'number') audio.currentTime = 0; } catch (e) {}
            try { audio.volume = 0; } catch (e) {}
          }
        }, stepTime);

        return true;
      }
      function playToggleClickSound() {
        try {
          if (window.audioManager && typeof window.audioManager.play === 'function') {
            window.audioManager.play('chelk', { loop: false, volume: 0.9, forceImmediate: true });
            return;
          }

          const chelkAudio = new Audio('audio/chelk.mp3');
          chelkAudio.loop = false;
          chelkAudio.currentTime = 0;
          chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));
        } catch (e) {
          console.warn('Failed to play chelk audio:', e);
        }
      }

      if (musicToggleBtn) {
        musicToggleBtn.onclick = () => {
          const isPlaying = window.bgAudio && typeof window.bgAudio.paused === 'boolean'
            ? !window.bgAudio.paused
            : (window.audioManager && typeof window.audioManager.isPlaying === 'function'
              ? window.audioManager.isPlaying('music')
              : false);

          if (isPlaying) {
            playToggleClickSound();
            stopBackgroundMusic(window.bgAudio, 800);
            return;
          }

          playToggleClickSound();

          try {
            setTimeout(() => {
              try { playBackgroundMusic(0, 0.8); } catch (e) {}
            }, 500);
          } catch (e) {
            console.warn('Failed to start music from toggle:', e);
          }
        };
      }

      const phoneLink = document.querySelector('a[href="tel:+79162077558"]');
      if (phoneLink) {
        phoneLink.addEventListener('click', () => {
          try {
            const chelkAudio = new Audio('audio/chelk.mp3');
            chelkAudio.loop = false;
            chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));
          } catch (e) {
            console.warn('Failed to play chelk audio on phone click:', e);
          }
        });
      }
    }, 900);
  }

  // Ждем полной загрузки window, затем запускаем анимацию прогресса
  function startPreloader() {
    displayedPercent = 1;
    targetPercent = 1;
    renderPercent(1);
    animateProgress();
    setTimeout(() => {
      if (!finished) {
        // Fallback only after the timeout, so the loader never gets stuck forever.
        preloaderState.modelLoaded = true;
        preloaderState.requiredAssetsLoaded = true;
        updatePreloaderProgress();
        tryFinishPreloader();
      }
    }, MAX_WAIT_MS);
  }

  // Фоновая загрузка моделей и аудиофайлов после показа страницы
  function startBackgroundAssetLoading() {
    // Загружаем модели в фоне после того, как страница видна
    const carouselModels = [
      './models/t-shirt-black.glb',
      './models/soda_black.glb', 
      './models/cosmetic-black.glb',
      './models/head.glb'
    ];
    
    carouselModels.forEach((url) => {
      // Используем requestIdleCallback для загрузки только когда браузер свободен
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          preloadAsset(url).catch(() => {});
        }, { timeout: 5000 });
      } else {
        // Fallback для браузеров без requestIdleCallback
        setTimeout(() => {
          preloadAsset(url).catch(() => {});
        }, 2000);
      }
    });

    // Презагружаем аудиофайлы по требованию
    const audioFiles = [
      { key: 'music', url: 'audio/music.mp3' },
      { key: 'chelk', url: 'audio/chelk.mp3' },
      { key: 'pop1', url: 'audio/pop1.mp3' },
      { key: 'pop2', url: 'audio/pop2.mp3' }
    ];

    audioFiles.forEach(({ key, url }) => {
      // Загружаем аудиофайлы в фоне с меньшим приоритетом
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          if (soundAudioCache[key]) {
            soundAudioCache[key].preload = 'auto';
            try {
              const loadResult = soundAudioCache[key].load();
              if (loadResult && typeof loadResult.catch === 'function') {
                loadResult.catch(() => {});
              }
            } catch (e) {
              // ignore
            }
          }
        }, { timeout: 10000 });
      }
    });
  }

  if (document.readyState === 'complete') {
    markWindowLoaded();
    if (preloaderHasRun) {
      markModelLoaded();
    }
    startPreloader();
  } else {
    window.addEventListener('load', () => {
      markWindowLoaded();
      startPreloader();
    });
  }
  preloaderHasRun = true;
}

if (typeof window !== 'undefined') {
  window.runPreloader = window.runPreloader || runPreloader;
  window.preloader = window.preloader || {};
  window.preloader.addWaitTask = window.preloader.addWaitTask || addWaitTask;
}
