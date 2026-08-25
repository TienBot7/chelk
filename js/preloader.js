let preloaderHasRun = false;
const soundAudioCache = {
  chelk: new Audio('audio/chelk.mp3'),
  music: new Audio('audio/music.mp3'),
  pop1: new Audio('audio/pop1.mp3'),
  pop2: new Audio('audio/pop2.mp3'),
};
const shopAssetUrls = [
  './img/shop/red.webp',
  './img/shop/green.webp',
  './img/shop/purple.webp',
];

const goodsAssetUrls = [
  './img/goods/cosmetic-black.webp',
  './img/goods/soda_black.webp',
  './img/goods/t-shirt-black.webp'
];

const mobilePriorityUrls = [
  './img/tube.webp',
  './img/t-shirt.webp',
  './img/cans.webp'
];

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
  let hasError = false;
  let soundBtnClicked = false;
  const MAX_WAIT_MS = 6000;
  const MOBILE_EARLY_FINISH_MS = 3500;
  const preloaderStartedAt = Date.now();

  function animateDigit(element, newValue) {
    const oldValue = element.textContent;
    if (oldValue === newValue.toString()) return;
    element.textContent = newValue;
  }

  function renderPercent(value) {
    if (hasError) return;
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

    return (windowFraction * 0.25) + (requiredAssetsFraction * 0.2) + (modelFraction * 0.55);
  }

  function updatePreloaderProgress() {
    if (hasError) return;
    setLoadingPercent(getCombinedProgress() * 100);
  }

  function showError() {
    if (finished || hasError) return;
    hasError = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    const counter = document.querySelector('.counter-container');
    if (counter) {
      counter.textContent = 'ERROR';
      counter.classList.add('preloader-error');
    }
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
    const canFinishBase = preloaderState.windowLoaded && preloaderState.requiredAssetsLoaded;
    const isMobile = (typeof window !== 'undefined') && (window.innerWidth <= 768);
    if (!canFinishBase) return;

    if (isMobile) {
      const sliderReady = typeof window !== 'undefined' && window.__sliderModelsReady__ === true;
      const forcedMobileFinish = Date.now() - preloaderStartedAt >= MOBILE_EARLY_FINISH_MS;
      if (sliderReady || forcedMobileFinish || areWaitTasksComplete()) {
        setTimeout(finishPreloader, 200);
      }
      return;
    }

    setTimeout(finishPreloader, 300);
  }

  if (typeof window !== 'undefined') {
    window.preloader = window.preloader || {};
    const queued = Array.isArray(window.preloader._queue) ? window.preloader._queue.slice() : [];
    window.preloader.reportModelProgress = reportModelProgress;
    window.preloader.markModelLoaded = markModelLoaded;
    window.preloader.markCarouselModelsReady = markCarouselModelsReady;
    window.preloader.showError = showError;
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
    try {
      const preloadHeadModelTask = Promise.resolve(null);
      if (typeof window !== 'undefined') {
        window.preloader.preloadHeadModel = () => preloadHeadModelTask;
      }
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

    setTimeout(() => {
      loadingSection.style.display = 'none';
    }, 800);

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

    setTimeout(() => {
      const mainSection = document.getElementById('main-section');
      if (mainSection) {
          mainSection.className = 'visible';
          const help = document.querySelector('.help');
          if (help) {
            help.classList.remove('visible', 'open');
            help.style.opacity = '0';
            help.style.visibility = 'hidden';
          }
              const introTop = document.querySelector('.main-section__top');
              if (introTop) {
                introTop.classList.add('show-after-sound');
              }
              scheduleMainTopHint();
        mainSection.querySelectorAll('.carousel, .text-overlay, .controls-wrapper').forEach(el => {
          el.classList.add('hidden-on-start');
        });
        const svgBg = mainSection.querySelector('.svg-background');
        if (svgBg) {
          svgBg.classList.add('visible');
        }
      }
      const soundOverlay = document.getElementById('soundOverlay');
      const soundBtn = document.getElementById('soundBtn');
      const soundDescr = document.getElementById('soundDescr');
      const svgBg = mainSection ? mainSection.querySelector('.svg-background') : null;
      if (soundOverlay && soundBtn) {
        soundOverlay.style.display = 'block';
        startBackgroundAssetLoading();
        if (svgBg) svgBg.classList.add('visible');
        setTimeout(() => {
          soundBtn.classList.add('visible');
          soundDescr.classList.add('visible');
        }, 700);
      }
    }, 850);

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

          try {
            try {
              if (window.audioManager && typeof window.audioManager.play === 'function') {
                window.audioManager.play('chelk', { loop: false, volume: 0.54, forceImmediate: true });
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

            window.chelkAudio = chelkAudio;

            try {
              const mainObj = document.getElementById('mainObject');
            } catch (e) {
              console.warn('Failed to read #mainObject:', e);
            }
          } catch (e) {
            console.warn('Failed to start music:', e);
          }
          const mainSection = document.getElementById('main-section');
          const introTop = document.querySelector('.main-section__top');
            if (mainSection) {
            try { mainSection.style.overflow = ''; } catch (e) {}
            if (introTop) {
              introTop.style.display = 'none';
            }

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

            const isSmallMobile = window.innerWidth <= 500;
            const carouselRevealDelay = isSmallMobile ? 1100 : 2600;

            setTimeout(() => {
              mainSection.querySelectorAll('.carousel, .text-overlay, .controls-wrapper').forEach(el => {
                  setTimeout(() => {
                    const header = document.getElementById('header');
                    if (header) {
                      header.classList.add('visible');
                      header.style.opacity = '';
                    }
                  }, isSmallMobile ? 300 : 900);

                  setTimeout(() => {
                    const carousel = document.getElementById('carousel');
                    if (carousel) {
                      carousel.classList.add('visible');
                      carousel.style.opacity = '';
                    }

                    const slideCenter = document.querySelector('.slide.center');
                    if (slideCenter) {
                      slideCenter.classList.add('visible');
                      slideCenter.style.opacity = '';
                    }
                      el.classList.add('show-after-sound');
                      el.classList.remove('hidden-on-start');
                      if (el.classList && el.classList.contains('controls-wrapper')) {
                        el.classList.add('visible');
                      }
                  }, carouselRevealDelay);
                  
                  const sideRevealDelay = isSmallMobile ? 2200 : 4000;

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
                      if (typeof window !== 'undefined') {
                        window.__allowHelpDisplay = true;
                      }
                      if (typeof window !== 'undefined' && typeof window.showHelpPrompt === 'function') {
                        window.showHelpPrompt();
                      }
                    }

                    if (choiseBtn) {
                      choiseBtn.addEventListener('click', () => {
                        if (typeof window !== 'undefined') {
                          window.__allowHelpDisplay = false;
                        }
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
                        try {
                          import('./script.js').then((m) => {
                            if (m && m.enableCenterScrollScale) m.enableCenterScrollScale();
                          }).catch(() => {});
                        } catch (e) {}

                        targets.forEach((el) => {
                          el.classList.add('fade-out');
                          try {
                            const canvases = el.querySelectorAll && el.querySelectorAll('canvas');
                            if (canvases && canvases.length) {
                              canvases.forEach((c) => {
                                c.classList.add('fade-out');
                                c.style.transition = 'opacity 1.6s cubic-bezier(0.4,0,0.2,1)';
                              });
                            }
                          } catch (e) {
                          }
                        });

                        const REMOVE_DELAY = 1700;
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
                  }, sideRevealDelay);
              });

            }, 400);

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
            window.audioManager.play('chelk', { loop: false, volume: 0.54, forceImmediate: true });
            return;
          }

          const chelkAudio = new Audio('audio/chelk.mp3');
          chelkAudio.loop = false;
          chelkAudio.currentTime = 0;
          chelkAudio.volume = 0.54;
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

  function getShopAssetUrlByChoice(value = '') {
    const raw = String(value || (typeof window !== 'undefined' ? (window.mainObject || '') : '') || '').trim().toLowerCase();
    if (raw.includes('хор') || raw.includes('soda') || raw.includes('red')) return './img/shop/red.webp';
    if (raw.includes('одеж') || raw.includes('cloth') || raw.includes('t-shirt') || raw.includes('green')) return './img/shop/green.webp';
    if (raw.includes('косм') || raw.includes('cos') || raw.includes('purple')) return './img/shop/purple.webp';
    return './img/shop/red.webp';
  }

  function preloadShopImages() {
    const selectedChoice = typeof window !== 'undefined' ? (window.mainObject || '') : '';
    const selectedUrl = getShopAssetUrlByChoice(selectedChoice);
    if (typeof window !== 'undefined' && window.innerWidth <= 500) return;
    if (!selectedUrl) return;

    try {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = selectedUrl;
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.preloadShopImageByChoice = (choice = '') => {
      const selectedUrl = getShopAssetUrlByChoice(choice || (window.mainObject || ''));
      if (!selectedUrl || window.innerWidth <= 500) return;
      try {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = selectedUrl;
      } catch (e) {}
    };
  }

  function startPreloader() {
    preloadShopImages();
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 500) {
        addWaitTask(preloadGoodsImages(mobilePriorityUrls));
        addWaitTask(preloadGoodsImages());
      }
    } catch (e) {}
    displayedPercent = 1;
    targetPercent = 1;
    renderPercent(1);
    animateProgress();
    setTimeout(() => {
      if (!finished) {
        preloaderState.modelLoaded = true;
        preloaderState.requiredAssetsLoaded = true;
        preloaderState.windowLoaded = true;
        updatePreloaderProgress();
        tryFinishPreloader();
      }
    }, MAX_WAIT_MS);
  }

  function preloadGoodsImages(urls = null, timeoutMs = 10000) {
    const sources = Array.isArray(urls) && urls.length ? urls.slice() : (Array.isArray(goodsAssetUrls) ? goodsAssetUrls.slice() : []);
    if (!sources.length) return Promise.resolve();
    return new Promise((resolve) => {
      let remaining = sources.length;
      let finished = false;
      const onDone = () => {
        if (finished) return;
        finished = true;
        resolve(true);
      };
      sources.forEach((u) => {
        try {
          const img = new Image();
          img.decoding = 'async';
          img.loading = 'eager';
          img.onload = () => {
            remaining -= 1;
            if (remaining <= 0) onDone();
          };
          img.onerror = () => {
            remaining -= 1;
            if (remaining <= 0) onDone();
          };
          img.src = u;
        } catch (e) {
          remaining -= 1;
          if (remaining <= 0) onDone();
        }
      });

      setTimeout(() => onDone(), timeoutMs);
    });
  }

  function startBackgroundAssetLoading() {
    preloadShopImages();
    let carouselModels = [
      './models/t-shirt-black.glb',
      './models/soda_black.glb',
      './models/cosmetic-black.glb',
      './models/head.glb'
    ];

    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 500) {
        carouselModels = [];
      }
    } catch (e) {}

    carouselModels.forEach((url) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          preloadAsset(url).catch(() => {});
        }, { timeout: 5000 });
      } else {
        setTimeout(() => {
          preloadAsset(url).catch(() => {});
        }, 2000);
      }
    });

    const audioFiles = [
      { key: 'music', url: 'audio/music.mp3' },
      { key: 'chelk', url: 'audio/chelk.mp3' },
      { key: 'pop1', url: 'audio/pop1.mp3' },
      { key: 'pop2', url: 'audio/pop2.mp3' }
    ];

    audioFiles.forEach(({ key, url }) => {
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