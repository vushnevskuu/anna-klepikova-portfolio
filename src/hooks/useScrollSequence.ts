import { useEffect, useRef, type RefObject } from 'react'

type UseScrollSequenceOptions = {
  length: number
  activeIndexRef: RefObject<number>
  onIndexChange: (index: number) => void
  containerRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

const BASE_THRESHOLD = 100
const MIN_THRESHOLD = 40
const MAX_THRESHOLD = 120
const MAX_STEPS_PER_FRAME = 3

function normalizeDeltaY(event: WheelEvent): number {
  let delta = event.deltaY
  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      delta *= 16
      break
    case WheelEvent.DOM_DELTA_PAGE:
      delta *= window.innerHeight
      break
    default:
      break
  }
  return delta
}

export function useScrollSequence({
  length,
  activeIndexRef,
  onIndexChange,
  containerRef,
  enabled = true,
}: UseScrollSequenceOptions): void {
  const accumulatedDelta = useRef(0)
  const lastEventTime = useRef(0)
  const rafId = useRef<number | null>(null)
  const onIndexChangeRef = useRef(onIndexChange)
  onIndexChangeRef.current = onIndexChange

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled || length <= 1) {
      return undefined
    }

    const processAccumulated = () => {
      rafId.current = null
      const delta = accumulatedDelta.current

      if (Math.abs(delta) < MIN_THRESHOLD) {
        return
      }

      const now = performance.now()
      const elapsed = Math.max(now - lastEventTime.current, 1)
      const velocity = Math.abs(delta) / elapsed
      const velocityFactor = Math.min(Math.max(velocity / 1.5, 1), 5)
      const effectiveThreshold = Math.max(
        MIN_THRESHOLD,
        Math.min(MAX_THRESHOLD, BASE_THRESHOLD / velocityFactor),
      )

      let steps = Math.floor(Math.abs(delta) / effectiveThreshold)
      steps = Math.min(steps, MAX_STEPS_PER_FRAME)

      if (steps === 0) {
        return
      }

      const direction = delta > 0 ? 1 : -1
      accumulatedDelta.current -= direction * steps * effectiveThreshold

      const current = activeIndexRef.current ?? 0
      const next = Math.max(0, Math.min(length - 1, current + direction * steps))

      if (next !== current) {
        onIndexChangeRef.current(next)
      }
    }

    const scheduleProcess = () => {
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(processAccumulated)
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      lastEventTime.current = performance.now()
      accumulatedDelta.current += normalizeDeltaY(event)
      scheduleProcess()
    }

    container.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', onWheel)
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [activeIndexRef, containerRef, enabled, length])
}
