let zSpacing = -1000,
    lastPos = 0,
    $frames = document.getElementsByClassName('frame'),
    frames = Array.from($frames),
    zVals = []

let virtualTop = 0
let virtualTopTarget = 0
const maxTop = Math.max(1, frames.length * Math.abs(zSpacing))
let ticking = false
let wheelAnimating = false
const WHEEL_SCROLL_SCALE = 0.75
const WHEEL_SCROLL_LERP = 0.22
let videoActivated = false
let hideScrollSectionTimeout = null
let scrollHintTimeout = null
const SCROLL_HINT_DELAY = 3000
let scrollHintObserver = null
let slideTransformRestoreTimer = null
const isLowPowerScroll = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent) && window.innerWidth <= 768
const SCROLL_UPDATE_EPSILON = isLowPowerScroll ? 0.8 : 0.3
let lastAppliedTop = null

function clearScrollHintTimeout() {
    if (scrollHintTimeout) {
        clearTimeout(scrollHintTimeout)
        scrollHintTimeout = null
    }
}

function playScrollCardClickSound() {
    try {
        if (window.audioManager && typeof window.audioManager.play === 'function') {
            window.audioManager.play('chelk', { loop: false, volume: 0.54, forceImmediate: true })
            return
        }
    } catch (e) {}

    try {
        const audio = new Audio('audio/chelk.mp3')
        audio.volume = 0.54
        audio.currentTime = 0
        audio.play().catch(() => {})
    } catch (e) {}
}

function scheduleScrollHintReveal(scrollSection) {
    const scrollHint = scrollSection ? scrollSection.querySelector('.scroll-down') : null
    if (!scrollSection || !scrollHint || !scrollSection.classList.contains('visible')) return
    if (scrollHint.classList.contains('scroll-down-hint-visible')) return
    if (scrollHint.classList.contains('scroll-down-hint-scrolled')) return
    if (scrollHintTimeout) return
    scrollHintTimeout = setTimeout(() => {
        scrollHintTimeout = null
        if (!scrollSection.classList.contains('visible') || scrollHint.classList.contains('scroll-down-hint-scrolled')) return
        scrollHint.classList.add('scroll-down-hint-visible')
    }, SCROLL_HINT_DELAY)
}

function initScrollHintObserver() {
    const scrollSection = document.querySelector('.scroll-section')
    if (!scrollSection || scrollHintObserver) return
    scrollHintObserver = new MutationObserver(() => {
        const isVisible = scrollSection.classList.contains('visible')
        const scrollHint = scrollSection.querySelector('.scroll-down')
        const isScrolled = scrollHint && scrollHint.classList.contains('scroll-down-hint-scrolled')
        if (isVisible && !isScrolled) {
            scheduleScrollHintReveal(scrollSection)
        } else {
            clearScrollHintTimeout()
            if (!isVisible && scrollHint) {
                scrollHint.classList.remove('scroll-down-hint-visible')
            }
        }
    })
    scrollHintObserver.observe(scrollSection, { attributes: true, attributeFilter: ['class'] })
    if (scrollSection.classList.contains('visible')) {
        scheduleScrollHintReveal(scrollSection)
    }
}

function isScrollSectionVisible(){
    const scrollSection = document.querySelector('.scroll-section')
    return Boolean(scrollSection && scrollSection.classList.contains('visible'))
}

function isNearZeroOpacity(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return true
    const numericValue = Number(value)
    return Math.abs(numericValue) < 1e-6
}

function updateFrames(top){
    if (lastAppliedTop !== null && Math.abs(lastAppliedTop - top) < SCROLL_UPDATE_EPSILON) {
        return
    }
    lastAppliedTop = top

    const delta = lastPos - top
    lastPos = top
    try {
        const sc = document.querySelector('.slide.center')
        if (sc) {
            if (!sc.classList.contains('no-transition')) {
                sc.classList.add('no-transition')
                if (slideTransformRestoreTimer) clearTimeout(slideTransformRestoreTimer)
                slideTransformRestoreTimer = setTimeout(() => {
                    try { sc.classList.remove('no-transition') } catch (e) {}
                    slideTransformRestoreTimer = null
                }, 120)
            }
        }
    } catch (e) {}
    let maxOpacity = 0
    frames.forEach(function(frame, i){
        if (zVals[i] === undefined) zVals[i] = (i * zSpacing) + zSpacing
        zVals[i] += delta * -5.5
        const opacityValue = 1 - Math.min(Math.max((Math.abs(zVals[i]) - Math.abs(zSpacing) / 4) / Math.abs(zSpacing), 0), 1)
        const opacity = Math.abs(opacityValue) < 0.001 ? 0 : opacityValue
        frame.style.setProperty('--frame-transform-z', zVals[i] + 'px')
        frame.style.setProperty('--frame-opacity', opacity)
        if (opacity > maxOpacity) maxOpacity = opacity
    })
    const indices = frames.map((_, i) => i)
    indices.sort((a, b) => zVals[b] - zVals[a])
    indices.forEach((idx, rank) => {
        const frame = frames[idx]
        const opacity = Number(frame.style.getPropertyValue('--frame-opacity')) || 0
        const isVisible = opacity > 0.03
        frame.style.setProperty('--frame-z-index', String(100 + (indices.length - rank)))
    })

    const endThreshold = 0.98
    const endReached = (top / maxTop) >= endThreshold
    let centerOpacity = null
    try {
        const slideCenter = document.querySelector('.slide.center')
        if (slideCenter) {
            const cs = window.getComputedStyle(slideCenter)
            centerOpacity = Number(cs && cs.opacity != null ? cs.opacity : null)
        }
    } catch(e) {}
    const centerIsTinyZero = (centerOpacity !== null) ? isNearZeroOpacity(centerOpacity) : endReached

    try {
        const carouselVideo = document.querySelector('#carousel .scroll-bg-video')
        if (carouselVideo && videoActivated) {
            if (centerIsTinyZero) {
                carouselVideo.classList.remove('visible')
                try { carouselVideo.pause && carouselVideo.pause() } catch(e){}
            } else {
                carouselVideo.classList.add('visible')
                try { carouselVideo.play && carouselVideo.play().catch(()=>{}) } catch(e){}
            }
        }
    } catch(e) {}

    try {
        const headSection = document.querySelector('.head')
        const scrollSection = document.querySelector('.scroll-section')
        const help = document.querySelector('.help')
        if (headSection) {
            const shouldShowHead = !(top === 0) && centerIsTinyZero
            if (shouldShowHead) {
                headSection.classList.add('visible')
                const mainSection = document.getElementById('main-section')
                if (mainSection) {
                    mainSection.classList.remove('visible')
                }
            } else {
                headSection.classList.remove('visible')
                if (help) {
                    help.classList.remove('open', 'visible')
                    help.style.opacity = '0'
                    help.style.visibility = 'hidden'
                }
            }

            if (headSection.classList.contains('visible') && scrollSection) {
                scrollSection.classList.remove('visible')
                scrollSection.style.display = 'none'
            }
        }
    } catch(e) {}

    const scrollSection = document.querySelector('.scroll-section')
    if (scrollSection && scrollSection.classList.contains('visible')) {
        const scrollHint = scrollSection.querySelector('.scroll-down')
        if (scrollHint) {
            if (top > 2) {
                scrollHint.classList.add('scroll-down-hint-scrolled')
                scrollHint.classList.remove('scroll-down-hint-visible')
                clearScrollHintTimeout()
            } else {
                scrollHint.classList.remove('scroll-down-hint-scrolled')
                if (!scrollHint.classList.contains('scroll-down-hint-visible')) {
                    scheduleScrollHintReveal(scrollSection)
                }
            }
        }
    } else {
        clearScrollHintTimeout()
    }

    try {
        const scrollSection = document.querySelector('.scroll-section')
        if (scrollSection) {
            if (endReached) {
                if (!hideScrollSectionTimeout) {
                    hideScrollSectionTimeout = setTimeout(() => {
                        scrollSection.style.display = 'none'
                        hideScrollSectionTimeout = null
                    }, 900)
                }
            } else {
                if (hideScrollSectionTimeout) {
                    clearTimeout(hideScrollSectionTimeout)
                    hideScrollSectionTimeout = null
                }
                if (scrollSection.style.display === 'none') scrollSection.style.display = ''
            }
        }
    } catch(e) {}
}

function onScrollNative(){
    if (!isScrollSectionVisible()) return
    const top = document.documentElement.scrollTop || document.body.scrollTop
    updateFrames(top)
}

function onWheel(e){
    if (!isScrollSectionVisible()) return
    virtualTopTarget = Math.min(Math.max(0, virtualTopTarget + e.deltaY * WHEEL_SCROLL_SCALE), maxTop)
    if (!wheelAnimating) {
        wheelAnimating = true
        window.requestAnimationFrame(animateWheelScroll)
    }
}

function animateWheelScroll(){
    if (!wheelAnimating) return
    const delta = virtualTopTarget - virtualTop
    if (Math.abs(delta) < 0.5) {
        virtualTop = virtualTopTarget
        wheelAnimating = false
    } else {
        virtualTop += delta * WHEEL_SCROLL_LERP
    }
    updateFrames(virtualTop)
    if (wheelAnimating) {
        window.requestAnimationFrame(animateWheelScroll)
    }
}

function onTouch(e){
    if (e.touches && e.touches.length) {
    }
}

let lastTouchY = null
function onTouchMove(e){
    if (!isScrollSectionVisible()) return
    if (!e.touches || !e.touches.length) return
    const y = e.touches[0].clientY
    if (lastTouchY !== null) {
        const deltaY = lastTouchY - y
        virtualTop = Math.min(Math.max(0, virtualTop + deltaY), maxTop)
        updateFrames(virtualTop)
    }
    lastTouchY = y
}

window.addEventListener('scroll', onScrollNative, {passive: true})
window.addEventListener('wheel', onWheel, {passive: true})
window.addEventListener('touchstart', e => { lastTouchY = e.touches[0] ? e.touches[0].clientY : null }, {passive: true})
window.addEventListener('touchmove', onTouchMove, {passive: true})
window.requestAnimationFrame(animateWheelScroll)

try {
    initScrollHintObserver()
} catch (e) {}

updateFrames(0)

document.querySelectorAll('.scroll-card').forEach(button => {
    const card = button.closest('.scroll-card')
    if (!card) return
    button.setAttribute('aria-expanded', 'false')
    button.addEventListener('click', () => {
        playScrollCardClickSound()
        const expanded = button.getAttribute('aria-expanded') === 'true'
        button.setAttribute('aria-expanded', String(!expanded))
        card.classList.toggle('open', !expanded)
    })
})

try {
    const choiceBtn = document.getElementById('choiseBtn')
    const carouselVideo = document.querySelector('#carousel .scroll-bg-video')
    if (choiceBtn && carouselVideo) {
        choiceBtn.addEventListener('click', () => {
            videoActivated = true
            carouselVideo.classList.add('visible')
            carouselVideo.play && carouselVideo.play().catch(() => {})
        })
    }
} catch (e) {
}