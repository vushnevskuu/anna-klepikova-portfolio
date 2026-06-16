import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { photos } from '../data/photos'
import { getEffectiveTransitionDuration } from '../config/scrollLabConfig'
import { useGalleryQueue } from '../hooks/useGalleryQueue'
import { resolveOrientation, useImagePreloader } from '../hooks/useImagePreloader'
import { useScrollLab } from '../hooks/useScrollLab'
import { useScrollSequence } from '../hooks/useScrollSequence'
import { useTouchSequence } from '../hooks/useTouchSequence'
import { PortfolioCounter } from './PortfolioCounter'
import { PortfolioHeader } from './PortfolioHeader'
import { PortfolioImage } from './PortfolioImage'
import { getPhotoOrientation } from '../utils/getPhotoOrientation'

const DESKTOP_BREAKPOINT = 768

type TransitionPhase = 'idle' | 'starting' | 'animating'

const FLASH_EFFECTS = new Set([
  'exposure-pulse',
  'camera-flash',
  'shutter-flash',
])

export function PortfolioViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const transitionTimerRef = useRef<number | null>(null)
  const performStepGenerationRef = useRef(0)
  const pendingPerformStepResolveRef = useRef<(() => void) | null>(null)
  const scrollControlsRef = useRef<{ resetGestureLock: () => void } | null>(null)

  const focusContainer = useCallback(() => {
    containerRef.current?.focus({ preventScroll: true })
  }, [])

  const { config, publishDebugState, isLabEnabled } = useScrollLab()
  const configRef = useRef(config)
  configRef.current = config

  const [displayIndex, setDisplayIndex] = useState(0)
  const [transitionTo, setTransitionTo] = useState<number | null>(null)
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle')
  const [overlayActive, setOverlayActive] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches,
  )
  const [orientations, setOrientations] = useState<
    Record<number, 'horizontal' | 'vertical'>
  >(() => {
    const initial: Record<number, 'horizontal' | 'vertical'> = {}
    photos.forEach((photo, index) => {
      if (photo.orientation) {
        initial[index] = photo.orientation
      } else if (photo.width !== undefined && photo.height !== undefined) {
        initial[index] = photo.width >= photo.height ? 'horizontal' : 'vertical'
      }
    })
    return initial
  })

  const finishPerformStep = useCallback(
    (generation: number, resolve: () => void) => {
      if (performStepGenerationRef.current !== generation) {
        return
      }

      pendingPerformStepResolveRef.current = null
      publishDebugState({ isTransitioning: false })
      resolve()
    },
    [publishDebugState],
  )

  const performStep = useCallback(
    (_direction: 1 | -1, nextIndex: number) =>
      new Promise<void>((resolve) => {
        pendingPerformStepResolveRef.current?.()
        pendingPerformStepResolveRef.current = resolve

        if (transitionTimerRef.current !== null) {
          window.clearTimeout(transitionTimerRef.current)
          transitionTimerRef.current = null
        }

        const generation = performStepGenerationRef.current + 1
        performStepGenerationRef.current = generation

        const currentConfig = configRef.current
        const duration = getEffectiveTransitionDuration(currentConfig)
        const isCut = currentConfig.transitionEffect === 'cut' || duration === 0

        publishDebugState({ isTransitioning: true })

        if (isCut) {
          setDisplayIndex(nextIndex)
          setTransitionTo(null)
          setTransitionPhase('idle')
          setOverlayActive(false)
          finishPerformStep(generation, resolve)
          return
        }

        setTransitionTo(nextIndex)
        setTransitionPhase('starting')
        setOverlayActive(false)

        requestAnimationFrame(() => {
          if (performStepGenerationRef.current !== generation) {
            return
          }

          setTransitionPhase('animating')

          if (FLASH_EFFECTS.has(currentConfig.transitionEffect)) {
            setOverlayActive(true)
          }

          transitionTimerRef.current = window.setTimeout(() => {
            setDisplayIndex(nextIndex)
            setTransitionTo(null)
            setTransitionPhase('idle')
            setOverlayActive(false)
            transitionTimerRef.current = null
            finishPerformStep(generation, resolve)
          }, duration)
        })
      }),
    [finishPerformStep, publishDebugState],
  )

  const decodePhotoRef = useRef<(index: number) => Promise<boolean>>(
    async () => true,
  )

  const { activeIndex, enqueueSteps, getPreloadIndices } = useGalleryQueue({
    length: photos.length,
    config,
    decodePhoto: (index) => decodePhotoRef.current(index),
    performStep,
    publishDebugState,
    onInputReady: () => scrollControlsRef.current?.resetGestureLock(),
  })

  const { decodePhoto } = useImagePreloader(
    photos,
    activeIndex,
    config.preloadDistance,
    getPreloadIndices,
  )
  decodePhotoRef.current = decodePhoto

  useScrollSequence({
    length: photos.length,
    config,
    enqueueSteps,
    containerRef,
    publishDebugState,
    enabled: photos.length > 1 && isDesktop,
    onRegisterControls: (controls) => {
      scrollControlsRef.current = controls
    },
  })

  useTouchSequence({
    length: photos.length,
    config,
    enqueueSteps,
    containerRef,
    enabled: photos.length > 1 && !isDesktop,
  })

  useEffect(() => {
    focusContainer()
  }, [focusContainer])

  useEffect(() => {
    if (!isLabEnabled) {
      return
    }

    publishDebugState({
      currentIndex: activeIndex,
      totalImages: photos.length,
      scrollMode: config.scrollMode,
    })
  }, [activeIndex, config.scrollMode, isLabEnabled, publishDebugState])

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = () => setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (transitionPhase !== 'idle' || transitionTo !== null) {
      return
    }

    setDisplayIndex(activeIndex)
  }, [activeIndex, transitionPhase, transitionTo])

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current)
      }
      pendingPerformStepResolveRef.current?.()
      pendingPerformStepResolveRef.current = null
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (photos.length <= 1 || event.repeat) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          event.preventDefault()
          enqueueSteps(1, 1)
          break
        case 'ArrowUp':
        case 'PageUp':
          event.preventDefault()
          enqueueSteps(-1, 1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enqueueSteps])

  const handleDimensions = useCallback(
    (index: number, naturalWidth: number, naturalHeight: number) => {
      const photo = photos[index]
      if (!photo) {
        return
      }
      setOrientations((prev) => ({
        ...prev,
        [index]: resolveOrientation(photo, naturalWidth, naturalHeight),
      }))
    },
    [],
  )

  const getPhotoLayout = (index: number): 'horizontal' | 'vertical' | 'mobile' => {
    if (!isDesktop) {
      return 'mobile'
    }
    return getPhotoOrientation(photos[index], index, orientations)
  }

  if (photos.length === 0) {
    return (
      <main
        className="portfolio-page portfolio-page--mobile"
        aria-label="Anna Klepikova photography portfolio gallery"
      >
        <div className="portfolio-layout">
          <PortfolioHeader layout="mobile" />
          <section className="portfolio-media" aria-label="Anna Klepikova photography portfolio">
            <p className="portfolio-image__error">No photographs in portfolio.</p>
          </section>
        </div>
      </main>
    )
  }

  const isTransitionActive = transitionTo !== null
  const layoutIndex = isTransitionActive ? displayIndex : activeIndex
  const orientation = getPhotoOrientation(photos[layoutIndex], layoutIndex, orientations)
  const layoutClass = isDesktop ? orientation : 'mobile'
  const isAnimating = transitionPhase === 'animating' && transitionTo !== null
  const currentPhotoIndex = isAnimating ? transitionTo : displayIndex
  const isOrientationChange =
    isAnimating &&
    transitionTo !== null &&
    getPhotoOrientation(photos[displayIndex], displayIndex, orientations) !==
      getPhotoOrientation(photos[transitionTo], transitionTo, orientations)

  const stageStyle = {
    '--transition-duration': `${config.transitionDuration}ms`,
    '--transition-easing': config.transitionEasing,
    '--flash-duration': `${config.flashDuration}ms`,
    '--flash-intensity': config.flashIntensity,
    '--flash-color': config.flashColor,
    '--translate-distance': `${config.translateDistance}px`,
    '--scale-amount': config.scaleAmount,
  } as CSSProperties

  return (
    <main
      ref={containerRef}
      className={`portfolio-page portfolio-page--${layoutClass}`}
      aria-label="Anna Klepikova photography portfolio gallery"
      tabIndex={0}
      onPointerDown={focusContainer}
    >
      <div className="portfolio-layout">
        <PortfolioHeader layout={isDesktop ? 'desktop' : 'mobile'} />

        <section className="portfolio-media" aria-label="Anna Klepikova photography portfolio">
          <div
            className={`portfolio-image-stage portfolio-image-stage--${layoutClass}`}
            data-transition-effect={config.transitionEffect}
            data-orientation-change={isOrientationChange ? 'true' : undefined}
            style={stageStyle}
          >
            {isAnimating && (
              <PortfolioImage
                photo={photos[displayIndex]}
                layerRole="previous"
                isVisible
                isLeaving
                photoLayout={getPhotoLayout(displayIndex)}
                priority={displayIndex === 0}
                onDimensions={(width, height) =>
                  handleDimensions(displayIndex, width, height)
                }
              />
            )}

            <PortfolioImage
              photo={photos[currentPhotoIndex]}
              layerRole="current"
              isVisible
              isEntering={isAnimating}
              photoLayout={getPhotoLayout(currentPhotoIndex)}
              priority={currentPhotoIndex === 0}
              onDimensions={(width, height) =>
                handleDimensions(currentPhotoIndex, width, height)
              }
            />

            <div
              className={`portfolio-transition-overlay${overlayActive ? ' is-active' : ''}`}
              aria-hidden="true"
            />
          </div>
        </section>
      </div>

      <PortfolioCounter current={activeIndex + 1} total={photos.length} />
    </main>
  )
}
