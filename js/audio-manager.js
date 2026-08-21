(function(){
  const AC = window.AudioContext || window.webkitAudioContext;
  let audioContext = null;
  let contextUnlocked = false;
  const buffers = {};
  const htmlCache = {};
  const htmlPools = {};
  const currentPlayers = {};
  const wasPlayingBeforeHide = {};
  const gainNodes = {};
  const pendingPlays = {};
  const fadeTimers = {};
  const manifest = {
    chelk: './audio/chelk.mp3',
    pop1: './audio/pop1.mp3',
    pop2: './audio/pop2.mp3',
    music: './audio/music.mp3'
  };
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  function createAudio(url) {
    try {
      const a = new Audio(url);
      a.preload = 'auto';
      a.autoplay = false;
      a.muted = false;
      try { a.load(); } catch (e) {}
      return a;
    } catch(e) { return null; }
  }

  function waitForAudioReady(audio, timeoutMs = 4000) {
    return new Promise((resolve) => {
      if (!audio) return resolve(false);
      try {
        if (audio.readyState >= 2 || audio.networkState === 2) return resolve(true);
        const cleanup = () => {
          try { audio.removeEventListener('canplaythrough', onReady); } catch (e) {}
          try { audio.removeEventListener('loadeddata', onReady); } catch (e) {}
          try { audio.removeEventListener('loadedmetadata', onReady); } catch (e) {}
          try { audio.removeEventListener('error', onError); } catch (e) {}
        };
        const onReady = () => {
          cleanup();
          resolve(true);
        };
        const onError = () => {
          cleanup();
          resolve(false);
        };
        audio.addEventListener('canplaythrough', onReady, { once: true });
        audio.addEventListener('loadeddata', onReady, { once: true });
        audio.addEventListener('loadedmetadata', onReady, { once: true });
        audio.addEventListener('error', onError, { once: true });
        try { audio.load(); } catch (e) {}
        setTimeout(() => {
          if (audio.readyState >= 2 || audio.networkState === 2) {
            cleanup();
            resolve(true);
          } else {
            cleanup();
            resolve(false);
          }
        }, timeoutMs);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function getPooledAudio(name, url) {
    if (!htmlPools[name]) htmlPools[name] = [];
    const pool = htmlPools[name];
    const reusable = pool.find((a) => a.paused || a.ended);
    if (reusable) { try { reusable.currentTime = 0; } catch(e){} return reusable; }
    const audio = createAudio(url);
    if (audio) pool.push(audio);
    return audio;
  }

  function unlockContext() {
    if (!audioContext) return Promise.resolve(false);
    if (audioContext.state === 'running') {
      contextUnlocked = true;
      return Promise.resolve(true);
    }
    return Promise.resolve(audioContext.resume())
      .then(() => {
        contextUnlocked = true;
        return true;
      })
      .catch(() => false);
  }

  function ensureUnlocked() {
    if (!audioContext) return Promise.resolve(false);
    if (contextUnlocked || audioContext.state === 'running') return Promise.resolve(true);
    const unlockPromise = unlockContext();
    return unlockPromise.then((ok) => ok || unlockContext()).catch(() => false);
  }

  function init() {
    if (!AC) return;
    try { audioContext = new AC(); } catch(e){ audioContext = null; }
    
    Object.keys(manifest).forEach((key) => {
      const url = manifest[key];
      htmlCache[key] = createAudio(url);
      if (isSafari && htmlCache[key]) {
        for (let i = 0; i < 2; i++) {
          const audio = createAudio(url);
          if (audio) (htmlPools[key] = htmlPools[key] || []).push(audio);
        }
      }
      if (!audioContext) return;
      fetch(url).then(r=>r.arrayBuffer()).then(ab=>{
        try{
          const dec = audioContext.decodeAudioData(ab, (buf)=>{ buffers[key] = buf });
          if (dec && typeof dec.then === 'function') dec.then(buf=>{ buffers[key]=buf }).catch(()=>{});
        }catch(err){ try{ audioContext.decodeAudioData(ab).then(buf=>{ buffers[key]=buf }).catch(()=>{}) }catch(e){} }
      }).catch(()=>{})
    });

    const unlock = () => {
      if (!audioContext) return;
      unlockContext().catch(() => {});
      ['touchstart', 'mousedown', 'pointerdown', 'keydown'].forEach((evt) => {
        document.removeEventListener(evt, unlock, { passive: true });
      });
    };
    ['touchstart', 'mousedown', 'pointerdown', 'keydown'].forEach((evt) => {
      document.addEventListener(evt, unlock, { once: true, passive: true });
    });
  }

  function stopPlayer(player) {
    if (!player) return;
    try { if (typeof player.pause === 'function') player.pause(); } catch(e) {}
    try { if (typeof player.stop === 'function') player.stop(); } catch(e) {}
    try { if (typeof player.disconnect === 'function') player.disconnect(); } catch(e) {}
    try { if (typeof player.currentTime === 'number') player.currentTime = 0; } catch(e) {}
    try { if (typeof player.volume === 'number') player.volume = 0; } catch(e) {}
  }

  function pausePlayerPreserveState(name) {
    const player = currentPlayers[name];
    if (!player) return;
    try {
      if (typeof player.pause === 'function' && typeof player.currentTime === 'number') {
        wasPlayingBeforeHide[name] = { type: 'html', time: player.currentTime, loop: !!player.loop };
        try { player.pause(); } catch (e) {}
        return;
      }
    } catch (e) {}
    try {
      if (typeof player.stop === 'function') {
        const wasLooping = player && player.loop ? true : false;
        wasPlayingBeforeHide[name] = { type: 'buffer', loop: wasLooping };
        try { player.stop(); } catch (e) {}
        try { delete currentPlayers[name]; } catch (e) {}
        return;
      }
    } catch (e) {}
  }

  function resumePlayerIfNeeded(name) {
    const meta = wasPlayingBeforeHide[name];
    if (!meta) return;
    
    if (name !== 'music') {
      try { delete wasPlayingBeforeHide[name]; } catch (e) {}
      return;
    }
    try {
      if (meta.type === 'html') {
        const existing = currentPlayers[name];
        if (existing && typeof existing.play === 'function') {
          try { existing.currentTime = meta.time || 0; } catch (e) {}
          try { existing.loop = !!meta.loop; existing.play().catch(()=>{}); } catch (e) {}
          delete wasPlayingBeforeHide[name];
          return;
        }
        play(name, { loop: !!meta.loop, forceImmediate: true }).catch(()=>{});
        delete wasPlayingBeforeHide[name];
        return;
      }
      if (meta.type === 'buffer') {
        play(name, { loop: !!meta.loop, forceImmediate: true }).catch(()=>{});
        delete wasPlayingBeforeHide[name];
        return;
      }
    } catch (e) {
      try { delete wasPlayingBeforeHide[name]; } catch (err) {}
    }
  }

  function clearFade(name) {
    if (fadeTimers[name]) {
      clearInterval(fadeTimers[name]);
      fadeTimers[name] = null;
    }
  }

  function applyVolume(name, volume) {
    const target = Math.max(0, Math.min(1, volume));
    const player = currentPlayers[name];
    const gain = gainNodes[name];

    if (gain && gain.gain) {
      try { gain.gain.value = target; } catch (e) {
        try { gain.gain.setValueAtTime(target, audioContext.currentTime); } catch (err) {}
      }
      return true;
    }

    if (player && typeof player.volume === 'number') {
      try { player.volume = target; } catch (e) {}
      return true;
    }

    return false;
  }

  function fadeVolume(name, volume, duration = 400) {
    const target = Math.max(0, Math.min(1, volume));
    const player = currentPlayers[name];
    if (!player) return false;

    clearFade(name);
    const startVolume = (gainNodes[name] && gainNodes[name].gain)
      ? gainNodes[name].gain.value
      : (player && typeof player.volume === 'number' ? player.volume : 0);

    if (duration <= 0) {
      applyVolume(name, target);
      return true;
    }

    const steps = Math.max(12, Math.round(duration / 16));
    const stepTime = Math.max(16, Math.round(duration / steps));
    let step = 0;

    fadeTimers[name] = setInterval(() => {
      step += 1;
      const progress = Math.min(1, step / steps);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVolume = startVolume + (target - startVolume) * eased;
      applyVolume(name, nextVolume);
      if (progress >= 1) {
        clearFade(name);
        applyVolume(name, target);
      }
    }, stepTime);

    return true;
  }

  function play(name, opts={}){
    const { loop=false, volume=1, delay=0, forceImmediate=false } = opts;
    const url = manifest[name] || name;
    const baseVolume = name === 'chelk' ? 0.6 : 1;
    const vol = Math.max(0, Math.min(1, volume * baseVolume));

    const playNow = () => {
      const existing = currentPlayers[name];
      if (existing && (name === 'music' || loop)) {
        stopPlayer(existing);
        delete currentPlayers[name];
      }

      const retryDelay = 180;
      const attemptPlayback = (source, attemptIndex = 0) => {
        const playSource = () => {
          try {
            if (source && typeof source.play === 'function') {
              const p = source.play();
              if (p && typeof p.catch === 'function') {
                p.catch(() => {
                  if (attemptIndex < 3) {
                    setTimeout(() => attemptPlayback(source, attemptIndex + 1), retryDelay + attemptIndex * 80);
                  }
                });
              }
            }
          } catch (e) {
            if (attemptIndex < 3) {
              setTimeout(() => attemptPlayback(source, attemptIndex + 1), retryDelay + attemptIndex * 80);
            }
          }
        };

        if (isSafari && source && typeof source.readyState === 'number') {
          waitForAudioReady(source, 4000).then((ready) => {
            if (!ready) {
              if (attemptIndex < 3) {
                setTimeout(() => attemptPlayback(source, attemptIndex + 1), retryDelay + attemptIndex * 80);
              }
              return;
            }
            playSource();
          });
          return;
        }

        playSource();
      };

      if (audioContext && audioContext.state === 'suspended') {
        ensureUnlocked().catch(() => {});
      }

      if (isSafari) {
        try {
          const audio = getPooledAudio(name, url);
          if (audio) {
            audio.loop = !!loop; audio.volume = vol;
            if (audio.readyState === 0) audio.load();
            try { audio.currentTime = 0; } catch (e) {}
            try { audio.volume = vol; } catch (e) {}
            if (pendingPlays[name]) {
              clearTimeout(pendingPlays[name]);
            }
            pendingPlays[name] = setTimeout(() => {
              delete pendingPlays[name];
              if (forceImmediate && isSafari) {
                try { audio.currentTime = 0; } catch (e) {}
                try { audio.play(); } catch (e) {}
                return;
              }
              attemptPlayback(audio, 0);
            }, isSafari ? 0 : 0);
            currentPlayers[name] = audio;
            return audio;
          }
        } catch(e){}
      }

      try {
        if (audioContext && buffers[name]) {
          ensureUnlocked().catch(() => {});
          const src = audioContext.createBufferSource();
          src.buffer = buffers[name];
          const gain = audioContext.createGain();
          gain.gain.value = vol;
          src.connect(gain); gain.connect(audioContext.destination);
          if (loop) src.loop = true;
          try{ src.start(0); }catch(e){ try{ src.start(); }catch(e2){} }
          currentPlayers[name] = src;
          gainNodes[name] = gain;
          return src;
        }
      } catch(e){}

      try {
        let a = htmlCache[name];
        if (!a) { a = createAudio(url); if (a) htmlCache[name] = a; }
        if (a) {
          a.loop = !!loop; a.volume = vol; try { a.currentTime = 0; } catch(e){}
          if (pendingPlays[name]) {
            clearTimeout(pendingPlays[name]);
          }
          pendingPlays[name] = setTimeout(() => {
            delete pendingPlays[name];
            if (forceImmediate && isSafari) {
              try { a.currentTime = 0; } catch (e) {}
              try { a.play(); } catch (e) {}
              return;
            }
            attemptPlayback(a, 0);
          }, isSafari ? 0 : 0);
          currentPlayers[name] = a;
          return a;
        }
      } catch(e){}
      return null;
    };

    if (delay > 0) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(playNow());
        }, delay);
      });
    }

    return playNow();
  }

  function stop(name) {
    clearFade(name);
    const player = currentPlayers[name];
    if (!player) return;
    stopPlayer(player);
    delete currentPlayers[name];
    delete gainNodes[name];
  }

  function isPlaying(name) {
    const player = currentPlayers[name];
    if (!player) return false;
    if (typeof player.paused === 'boolean') return !player.paused;
    if (typeof player.playbackState === 'number') return player.playbackState !== 3;
    return true;
  }

  function isReady(name){ return !!buffers[name]; }

  window.audioManager = { init, play, stop, isPlaying, isReady, fadeVolume, setVolume: fadeVolume, _internal:{buffers,htmlCache,htmlPools,manifest,currentPlayers,pendingPlays,gainNodes,fadeTimers} };

  try{ init(); }catch(e){}
  try {
    const handleVisibility = () => {
      try {
        if (document.hidden || document.visibilityState === 'hidden') {
          try {
            Object.keys(currentPlayers).forEach((n) => {
              try {
                if (isPlaying(n)) pausePlayerPreserveState(n);
              } catch (e) {}
            });
          } catch (e) {}
        } else {
          try {
            Object.keys(wasPlayingBeforeHide).forEach((n) => {
              try { resumePlayerIfNeeded(n); } catch (e) {}
            });
          } catch (e) {}
        }
      } catch (e) {}
    };
    document.addEventListener('visibilitychange', handleVisibility, { passive: true });
    window.addEventListener('pagehide', () => {
      try { Object.keys(currentPlayers).forEach((n) => { if (isPlaying(n)) pausePlayerPreserveState(n); }); } catch (e) {}
    }, { passive: true });
  } catch (e) {}
})();
