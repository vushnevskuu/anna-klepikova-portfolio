import { useEffect, useRef, type RefObject } from 'react'

type UseTouchSequenceOptions = {
  length: number
  activeIndexRef: RefObject<number>
  onIndexChange: (index: number) => void
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

const BASE_THRESHOLD = 80
const MIN_THRESHOLD = 30
const MAX_THRESHOLD = 100
const MAX_STEPS_PER_GESTURE = 4
const MIN_SWIPE_DISTANCE = 12

export function useTouchSequence({
  length,
  activeIndexRef,
  onIndexChange,
  containerRef,
  enabled = true,
}: UseTouchSequenceOptions): void {
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const accumulatedDelta = useRef(0)
  const onIndexChangeRef = useRef(onIndexChange)
  onIndexChangeRef.current = onIndexChange

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled || length <= 1) {
      return undefined
    }

    const applySteps = (delta: number, elapsed: number) => {
      if (Math.abs(delta) < MIN_SWIPE_DISTANCE) {
        return
      }

      const velocity = Math.abs(delta) / Math.max(elapsed, 1)
      const velocityFactor = Math.min(Math.max(velocity / 0.8, 1), 6)
      const effectiveThreshold = Math.max(
        MIN_THRESHOLD,
        Math.min(MAX_THRESHOLD, BASE_THRESHOLD / velocityFactor),
      )

      let steps = Math.floor(Math.abs(delta) / effectiveThreshold)
      steps = Math.min(steps, MAX_STEPS_PER_GESTURE)

      if (steps === 0) {
        steps = 1
      }

      const direction = delta < 0 ? 1 : -1
      const current = activeIndexRef.current ?? 0
      const next = Math.max(0, Math.min(length - 1, current + direction * steps))

      if (next !== current) {
        onIndexChangeRef.current(next)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return
      }
      touchStartY.current = event.touches[0].clientY
      touchStartTime.current = performance.now()
      accumulatedDelta.current = 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        return
      }
      event.preventDefault()
      const currentY = event.touches[0].clientY
      accumulatedDelta.current = currentY - touchStartY.current
    }

    const onTouchEnd = () => {
      const elapsed = performance.now() - touchStartTime.current
      applySteps(accumulatedDelta.current, elapsed)
      accumulatedDelta.current = 0
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: true })
    container.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [activeIndexRef, containerRef, enabled, length])
}
