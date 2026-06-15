import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { ScrollLabConfig, ScrollLabDebugState } from '../config/scrollLabConfig'
import { getMaxPendingSteps, getStepPauseMs } from '../config/scrollLabConfig'
import { stepIndex } from '../utils/wrapIndex'

type UseGalleryQueueOptions = {
  length: number
  config: ScrollLabConfig
  decodePhoto: (index: number) => Promise<boolean>
  performStep: (direction: 1 | -1, nextIndex: number) => Promise<void>
  publishDebugState?: (patch: Partial<ScrollLabDebugState>) => void
  onInputReady?: () => void
}

type UseGalleryQueueResult = {
  activeIndex: number
  activeIndexRef: RefObject<number>
  enqueueSteps: (direction: 1 | -1, stepCount: number) => void
}

export function useGalleryQueue({
  length,
  config,
  decodePhoto,
  performStep,
  publishDebugState,
  onInputReady,
}: UseGalleryQueueOptions): UseGalleryQueueResult {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const pendingStepsRef = useRef(0)
  const isTransitioningRef = useRef(false)
  const stepPauseTimerRef = useRef<number | null>(null)
  const performStepRef = useRef(performStep)
  const decodePhotoRef = useRef(decodePhoto)
  const configRef = useRef(config)
  const publishDebugStateRef = useRef(publishDebugState)
  const onInputReadyRef = useRef(onInputReady)

  activeIndexRef.current = activeIndex
  performStepRef.current = performStep
  decodePhotoRef.current = decodePhoto
  configRef.current = config
  publishDebugStateRef.current = publishDebugState
  onInputReadyRef.current = onInputReady

  const syncDebug = useCallback(() => {
    publishDebugStateRef.current?.({
      currentIndex: activeIndexRef.current,
      totalImages: length,
      isTransitioning: isTransitioningRef.current,
      pendingSteps: pendingStepsRef.current,
    })
  }, [length])

  const clearTimers = useCallback(() => {
    if (stepPauseTimerRef.current !== null) {
      window.clearTimeout(stepPauseTimerRef.current)
      stepPauseTimerRef.current = null
    }
  }, [])

  const processNextStep = useCallback(() => {
    if (length <= 1) {
      return
    }

    if (isTransitioningRef.current) {
      return
    }

    if (pendingStepsRef.current === 0) {
      syncDebug()
      return
    }

    const direction: 1 | -1 = pendingStepsRef.current > 0 ? 1 : -1
    pendingStepsRef.current -= direction
    isTransitioningRef.current = true
    syncDebug()

    const nextIndex = stepIndex(activeIndexRef.current, direction, length)

    void decodePhotoRef.current(nextIndex).then(() => {
      setActiveIndex(nextIndex)
      activeIndexRef.current = nextIndex
      syncDebug()

      void performStepRef.current(direction, nextIndex)
        .catch(() => undefined)
        .finally(() => {
          isTransitioningRef.current = false
          syncDebug()
          onInputReadyRef.current?.()

          const pauseMs =
            pendingStepsRef.current !== 0
              ? 0
              : getStepPauseMs(configRef.current)

          stepPauseTimerRef.current = window.setTimeout(() => {
            stepPauseTimerRef.current = null
            processNextStepRef.current()
          }, pauseMs)
        })
    })
  }, [length, syncDebug])

  const processNextStepRef = useRef(processNextStep)
  processNextStepRef.current = processNextStep

  const enqueueSteps = useCallback(
    (direction: 1 | -1, stepCount: number) => {
      if (length <= 1 || stepCount <= 0) {
        return
      }

      const currentConfig = configRef.current

      if (
        currentConfig.resetOnDirectionChange &&
        pendingStepsRef.current !== 0 &&
        Math.sign(pendingStepsRef.current) !== direction
      ) {
        pendingStepsRef.current = 0
      }

      const cappedSteps = Math.min(
        stepCount,
        currentConfig.maxStepsPerGesture,
        4,
      )
      const maxPending = getMaxPendingSteps(currentConfig)

      pendingStepsRef.current = Math.max(
        -maxPending,
        Math.min(
          maxPending,
          pendingStepsRef.current + direction * cappedSteps,
        ),
      )

      syncDebug()
      processNextStepRef.current()
    },
    [length, syncDebug],
  )

  useEffect(() => {
    syncDebug()
    return () => {
      clearTimers()
      isTransitioningRef.current = false
      pendingStepsRef.current = 0
    }
  }, [clearTimers, syncDebug])

  return {
    activeIndex,
    activeIndexRef,
    enqueueSteps,
  }
}
