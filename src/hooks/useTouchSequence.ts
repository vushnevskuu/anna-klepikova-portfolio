import { useEffect, useRef, type RefObject } from 'react'
import type { ScrollLabConfig } from '../config/scrollLabConfig'

type UseTouchSequenceOptions = {
  length: number
  config: ScrollLabConfig
  enqueueSteps: (direction: 1 | -1, stepCount: number) => void
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

const MIN_SWIPE_DISTANCE = 12

function getTouchStepCount(distance: number, velocity: number, maxSteps: number): number {
  if (velocity > 2.2 || distance > 420) {
    return Math.min(3, maxSteps)
  }

  if (velocity > 1.4 || distance > 260) {
    return Math.min(2, maxSteps)
  }

  return 1
}

function isInsideContainer(target: EventTarget | null, container: HTMLElement): boolean {
  return target instanceof Node && container.contains(target)
}

export function useTouchSequence({
  length,
  config,
  enqueueSteps,
  containerRef,
  enabled = true,
}: UseTouchSequenceOptions): void {
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)
  const accumulatedDelta = useRef(0)
  const touchActive = useRef(false)
  const enqueueStepsRef = useRef(enqueueSteps)
  const configRef = useRef(config)

  enqueueStepsRef.current = enqueueSteps
  configRef.current = config

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled || length <= 1) {
      return undefined
    }

    const onTouchStart = (event: TouchEvent) => {
      if (!isInsideContainer(event.target, container) || event.touches.length !== 1) {
        return
      }

      touchActive.current = true
      touchStartY.current = event.touches[0].clientY
      touchStartTime.current = performance.now()
      accumulatedDelta.current = 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!touchActive.current || event.touches.length !== 1) {
        return
      }

      if (!isInsideContainer(event.target, container)) {
        return
      }

      event.preventDefault()
      accumulatedDelta.current = event.touches[0].clientY - touchStartY.current
    }

    const finishTouch = (event: TouchEvent) => {
      if (!touchActive.current) {
        return
      }

      touchActive.current = false

      if (!isInsideContainer(event.target, container)) {
        accumulatedDelta.current = 0
        return
      }

      const currentConfig = configRef.current
      const delta = accumulatedDelta.current
      const elapsed = performance.now() - touchStartTime.current

      if (Math.abs(delta) < MIN_SWIPE_DISTANCE) {
        accumulatedDelta.current = 0
        return
      }

      const velocity = Math.abs(delta) / Math.max(elapsed, 1)
      const rawDirection: 1 | -1 = delta < 0 ? 1 : -1
      const direction = currentConfig.invertDirection
        ? (-rawDirection as 1 | -1)
        : rawDirection

      let stepCount = 1
      if (
        currentConfig.scrollMode === 'gesture-snap' ||
        currentConfig.oneGestureOnePhoto
      ) {
        stepCount = 1
      } else {
        stepCount = getTouchStepCount(
          Math.abs(delta),
          velocity,
          currentConfig.maxStepsPerGesture,
        )
      }

      enqueueStepsRef.current(direction, stepCount)
      accumulatedDelta.current = 0
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    container.addEventListener('touchend', finishTouch, { passive: true, capture: true })
    container.addEventListener('touchcancel', finishTouch, { passive: true, capture: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart, { capture: true })
      container.removeEventListener('touchmove', onTouchMove, { capture: true })
      container.removeEventListener('touchend', finishTouch, { capture: true })
      container.removeEventListener('touchcancel', finishTouch, { capture: true })
    }
  }, [containerRef, enabled, length])
}
