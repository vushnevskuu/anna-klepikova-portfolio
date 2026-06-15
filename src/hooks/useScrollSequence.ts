import { useEffect, useRef, type RefObject } from 'react'
import type { ScrollLabConfig, ScrollLabDebugState } from '../config/scrollLabConfig'

type UseScrollSequenceOptions = {
  length: number
  config: ScrollLabConfig
  enqueueSteps: (direction: 1 | -1, stepCount: number) => void
  containerRef: RefObject<HTMLElement | null>
  publishDebugState?: (patch: Partial<ScrollLabDebugState>) => void
  enabled?: boolean
  onRegisterControls?: (controls: { resetGestureLock: () => void }) => void
}

const GESTURE_BURST_GAP_MS = 72

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight
  }

  return event.deltaY
}

function getVelocityStepCount(absoluteDelta: number, velocity: number): number {
  if (velocity > 4.5 || absoluteDelta > 700) {
    return 4
  }

  if (velocity > 3 || absoluteDelta > 450) {
    return 3
  }

  if (velocity > 1.8 || absoluteDelta > 260) {
    return 2
  }

  return 1
}

export function useScrollSequence({
  length,
  config,
  enqueueSteps,
  containerRef,
  publishDebugState,
  enabled = true,
  onRegisterControls,
}: UseScrollSequenceOptions): void {
  const accumulatedDeltaRef = useRef(0)
  const smoothedVelocityRef = useRef(0)
  const lastWheelTimeRef = useRef(0)
  const lastWheelBurstTimeRef = useRef(0)
  const gestureEndTimerRef = useRef<number | null>(null)
  const lastDirectionRef = useRef<1 | -1 | 0>(0)
  const gestureLockedRef = useRef(false)
  const cooldownUntilRef = useRef(0)
  const gestureStartedAtRef = useRef(0)
  const enqueueStepsRef = useRef(enqueueSteps)
  const configRef = useRef(config)
  const publishDebugStateRef = useRef(publishDebugState)
  const onRegisterControlsRef = useRef(onRegisterControls)

  enqueueStepsRef.current = enqueueSteps
  configRef.current = config
  publishDebugStateRef.current = publishDebugState
  onRegisterControlsRef.current = onRegisterControls

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled || length <= 1) {
      return undefined
    }

    const publish = (patch: Partial<ScrollLabDebugState>) => {
      publishDebugStateRef.current?.({
        scrollMode: configRef.current.scrollMode,
        ...patch,
      })
    }

    const resetGestureLock = () => {
      accumulatedDeltaRef.current = 0
      smoothedVelocityRef.current = 0
      lastDirectionRef.current = 0
      gestureLockedRef.current = false
      if (gestureEndTimerRef.current !== null) {
        window.clearTimeout(gestureEndTimerRef.current)
        gestureEndTimerRef.current = null
      }
      publish({
        gestureActive: false,
        gestureLocked: false,
        accumulatedDelta: 0,
        currentDirection: 0,
      })
    }

    onRegisterControlsRef.current?.({ resetGestureLock })

    const resetGesture = () => {
      resetGestureLock()
      publish({
        lastGestureDuration: performance.now() - gestureStartedAtRef.current,
      })
    }

    const scheduleGestureEnd = () => {
      if (gestureEndTimerRef.current !== null) {
        window.clearTimeout(gestureEndTimerRef.current)
      }

      gestureEndTimerRef.current = window.setTimeout(() => {
        gestureEndTimerRef.current = null
        resetGesture()
      }, configRef.current.gestureEndDelay)
    }

    const applyDirection = (rawDirection: 1 | -1): 1 | -1 => {
      return configRef.current.invertDirection ? (-rawDirection as 1 | -1) : rawDirection
    }

    const maybeResetDirection = (direction: 1 | -1) => {
      if (
        configRef.current.resetOnDirectionChange &&
        lastDirectionRef.current !== 0 &&
        direction !== lastDirectionRef.current
      ) {
        accumulatedDeltaRef.current = 0
      }
      lastDirectionRef.current = direction
    }

    const enqueueFromWheel = (direction: 1 | -1, stepCount: number) => {
      const appliedDirection = applyDirection(direction)
      maybeResetDirection(appliedDirection)
      enqueueStepsRef.current(appliedDirection, stepCount)

      if (
        configRef.current.scrollMode === 'gesture-snap' ||
        configRef.current.oneGestureOnePhoto
      ) {
        gestureLockedRef.current = true
        accumulatedDeltaRef.current = 0
      }

      publish({
        gestureLocked: gestureLockedRef.current,
        accumulatedDelta: accumulatedDeltaRef.current,
        currentDirection: appliedDirection,
      })
    }

    const onWheel = (event: WheelEvent) => {
      const target = event.target
      if (!(target instanceof Node) || !container.contains(target)) {
        return
      }

      event.preventDefault()

      const currentConfig = configRef.current
      const delta = normalizeWheelDelta(event)
      if (delta === 0) {
        return
      }

      const now = performance.now()
      const gapSinceLastWheel = now - lastWheelBurstTimeRef.current
      const isNewGesture = gapSinceLastWheel > GESTURE_BURST_GAP_MS

      if (gestureStartedAtRef.current === 0 || !publishDebugStateRef.current) {
        gestureStartedAtRef.current = now
      }

      if (currentConfig.scrollMode === 'cooldown-snap' && now < cooldownUntilRef.current) {
        publish({ gestureLocked: true, lastWheelDelta: delta })
        lastWheelBurstTimeRef.current = now
        return
      }

      if (
        (currentConfig.scrollMode === 'gesture-snap' || currentConfig.oneGestureOnePhoto) &&
        gestureLockedRef.current &&
        !isNewGesture
      ) {
        publish({
          gestureActive: true,
          gestureLocked: true,
          lastWheelDelta: delta,
        })
        scheduleGestureEnd()
        lastWheelBurstTimeRef.current = now
        return
      }

      if (gestureLockedRef.current && isNewGesture) {
        gestureLockedRef.current = false
        accumulatedDeltaRef.current = 0
        smoothedVelocityRef.current = 0
      }

      const rawDirection: 1 | -1 = delta > 0 ? 1 : -1
      maybeResetDirection(applyDirection(rawDirection))

      const elapsed = Math.max(now - lastWheelTimeRef.current, 8)
      const instantaneousVelocity = Math.abs(delta) / elapsed
      smoothedVelocityRef.current =
        smoothedVelocityRef.current * 0.75 + instantaneousVelocity * 0.25

      lastWheelTimeRef.current = now
      accumulatedDeltaRef.current += delta

      publish({
        gestureActive: true,
        gestureLocked: gestureLockedRef.current,
        accumulatedDelta: accumulatedDeltaRef.current,
        currentDirection: lastDirectionRef.current,
        lastWheelDelta: delta,
      })

      scheduleGestureEnd()

      switch (currentConfig.scrollMode) {
        case 'raw-wheel': {
          const minDelta = Math.max(currentConfig.minimumWheelDelta, 1)
          if (Math.abs(delta) < minDelta) {
            break
          }
          enqueueFromWheel(rawDirection, 1)
          break
        }
        case 'cooldown-snap': {
          if (Math.abs(accumulatedDeltaRef.current) < currentConfig.wheelThreshold) {
            break
          }
          enqueueFromWheel(rawDirection, 1)
          accumulatedDeltaRef.current = 0
          cooldownUntilRef.current = now + currentConfig.transitionLockDuration
          break
        }
        case 'velocity-experimental': {
          if (Math.abs(accumulatedDeltaRef.current) < currentConfig.wheelThreshold) {
            break
          }
          const stepCount = Math.min(
            getVelocityStepCount(
              Math.abs(accumulatedDeltaRef.current),
              smoothedVelocityRef.current,
            ),
            currentConfig.maxStepsPerGesture,
            4,
          )
          enqueueFromWheel(rawDirection, stepCount)
          accumulatedDeltaRef.current -=
            rawDirection * currentConfig.wheelThreshold * stepCount
          break
        }
        case 'gesture-snap':
        case 'threshold-snap':
        default: {
          if (Math.abs(accumulatedDeltaRef.current) < currentConfig.wheelThreshold) {
            break
          }

          const stepCount =
            currentConfig.scrollMode === 'gesture-snap' ||
            currentConfig.oneGestureOnePhoto
              ? 1
              : Math.min(
                  getVelocityStepCount(
                    Math.abs(accumulatedDeltaRef.current),
                    smoothedVelocityRef.current,
                  ),
                  currentConfig.maxStepsPerGesture,
                  4,
                )

          enqueueFromWheel(rawDirection, stepCount)

          if (stepCount === 1 && smoothedVelocityRef.current < 1.8) {
            accumulatedDeltaRef.current = 0
          } else {
            accumulatedDeltaRef.current -=
              rawDirection * currentConfig.wheelThreshold * stepCount
          }
          break
        }
      }

      lastWheelBurstTimeRef.current = now
    }

    window.addEventListener('wheel', onWheel, { passive: false, capture: true })

    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true })
      if (gestureEndTimerRef.current !== null) {
        window.clearTimeout(gestureEndTimerRef.current)
      }
    }
  }, [containerRef, enabled, length])
}
