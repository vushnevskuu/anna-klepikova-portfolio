import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { photos } from '../data/photos'
import { resolveOrientation, useImagePreloader } from '../hooks/useImagePreloader'
import { useScrollSequence } from '../hooks/useScrollSequence'
import { useTouchSequence } from '../hooks/useTouchSequence'
import { PortfolioCounter } from './PortfolioCounter'
import { PortfolioHeader } from './PortfolioHeader'
import { PortfolioImage } from './PortfolioImage'
import { getPhotoOrientation } from '../utils/getPhotoOrientation'

const DESKTOP_BREAKPOINT = 768
const CROSSFADE_MS = 200

function getCrossfadeDuration(): number {
  if (typeof window === 'undefined') {
    return CROSSFADE_MS
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : CROSSFADE_MS
}

export function PortfolioViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeIndexRef = useRef(0)
  const displayIndexRef = useRef(0)
  const transitionTimerRef = useRef<number | null>(null)

  const [activeIndex, setActiveIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [transitionTo, setTransitionTo] = useState<number | null>(null)
  const [incomingVisible, setIncomingVisible] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches,
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

  activeIndexRef.current = activeIndex
  displayIndexRef.current = displayIndex

  const { decodePhoto } = useImagePreloader(photos, activeIndex)

  const handleIndexChange = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  const clampAndSetIndex = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(photos.length - 1, next))
    if (clamped !== activeIndexRef.current) {
      handleIndexChange(clamped)
    }
  }, [handleIndexChange])

  useScrollSequence({
    length: photos.length,
    activeIndexRef,
    onIndexChange: handleIndexChange,
    containerRef,
    enabled: photos.length > 1,
  })

  useTouchSequence({
    length: photos.length,
    activeIndexRef,
    onIndexChange: handleIndexChange,
    containerRef,
    enabled: photos.length > 1,
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const onChange = () => setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (photos.length === 0) {
      return undefined
    }

    let cancelled = false
    const target = activeIndex

    void decodePhoto(target).then(() => {
      if (cancelled || target !== activeIndexRef.current) {
        return
      }

      if (target === displayIndexRef.current) {
        return
      }

      if (getCrossfadeDuration() === 0) {
        setDisplayIndex(target)
        setTransitionTo(null)
        return
      }

      setTransitionTo(target)
    })

    return () => {
      cancelled = true
    }
  }, [activeIndex, decodePhoto])

  useEffect(() => {
    if (transitionTo === null) {
      setIncomingVisible(false)
      return undefined
    }

    setIncomingVisible(false)
    const frameId = requestAnimationFrame(() => {
      setIncomingVisible(true)
    })

    return () => cancelAnimationFrame(frameId)
  }, [transitionTo])

  useEffect(() => {
    if (transitionTo === null) {
      return undefined
    }

    const duration = getCrossfadeDuration()

    if (duration === 0) {
      setDisplayIndex(transitionTo)
      setTransitionTo(null)
      return undefined
    }

    transitionTimerRef.current = window.setTimeout(() => {
      setDisplayIndex(transitionTo)
      setTransitionTo(null)
    }, duration)

    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current)
      }
    }
  }, [transitionTo])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (photos.length <= 1) {
        return
      }

      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          event.preventDefault()
          clampAndSetIndex(activeIndexRef.current + 1)
          break
        case 'ArrowUp':
        case 'PageUp':
          event.preventDefault()
          clampAndSetIndex(activeIndexRef.current - 1)
          break
        case 'Home':
          event.preventDefault()
          clampAndSetIndex(0)
          break
        case 'End':
          event.preventDefault()
          clampAndSetIndex(photos.length - 1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clampAndSetIndex])

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
      <main className="portfolio-page portfolio-page--mobile" aria-label="Photography portfolio gallery">
        <div className="portfolio-layout">
          <PortfolioHeader layout="mobile" />
          <section className="portfolio-media" aria-label="Photography portfolio">
            <p className="portfolio-image__error">No photographs in portfolio.</p>
          </section>
        </div>
      </main>
    )
  }

  const orientation = getPhotoOrientation(photos[activeIndex], activeIndex, orientations)
  const layoutClass = isDesktop ? orientation : 'mobile'

  return (
    <main
      ref={containerRef}
      className={`portfolio-page portfolio-page--${layoutClass}`}
      aria-label="Photography portfolio gallery"
      tabIndex={0}
    >
      <div className="portfolio-layout">
        <PortfolioHeader layout={isDesktop ? 'desktop' : 'mobile'} />

        <section className="portfolio-media" aria-label="Photography portfolio">
          <div className={`portfolio-image-stage portfolio-image-stage--${layoutClass}`}>
            <PortfolioImage
              photo={photos[displayIndex]}
              visible={transitionTo === null || !incomingVisible}
              photoLayout={getPhotoLayout(displayIndex)}
              priority={displayIndex === 0}
              onDimensions={(width, height) =>
                handleDimensions(displayIndex, width, height)
              }
            />

            {transitionTo !== null && transitionTo !== displayIndex && (
              <PortfolioImage
                photo={photos[transitionTo]}
                visible={incomingVisible}
                photoLayout={getPhotoLayout(transitionTo)}
                priority={transitionTo === 0}
                onDimensions={(width, height) =>
                  handleDimensions(transitionTo, width, height)
                }
              />
            )}
          </div>
        </section>
      </div>

      <PortfolioCounter current={activeIndex + 1} total={photos.length} />
    </main>
  )
}
