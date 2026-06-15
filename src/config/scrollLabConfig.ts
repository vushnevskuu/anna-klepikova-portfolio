export type ScrollMode =
  | 'gesture-snap'
  | 'threshold-snap'
  | 'cooldown-snap'
  | 'raw-wheel'
  | 'velocity-experimental'

export type TransitionEffect =
  | 'cut'
  | 'crossfade'
  | 'exposure-pulse'
  | 'camera-flash'
  | 'shutter-flash'
  | 'soft-slide'
  | 'scale-fade'
  | 'film-blink'

export type ScrollLabConfig = {
  enabled: boolean
  scrollMode: ScrollMode
  wheelThreshold: number
  gestureEndDelay: number
  transitionLockDuration: number
  minimumWheelDelta: number
  oneGestureOnePhoto: boolean
  maxStepsPerGesture: number
  allowPendingStep: boolean
  resetOnDirectionChange: boolean
  invertDirection: boolean
  transitionEffect: TransitionEffect
  transitionDuration: number
  transitionEasing: string
  flashDuration: number
  flashIntensity: number
  flashColor: string
  translateDistance: number
  scaleAmount: number
  preloadDistance: number
}

export const ENABLE_SCROLL_LAB =
  import.meta.env.VITE_ENABLE_SCROLL_LAB === 'true'

export const SCROLL_LAB_STORAGE_KEY = 'photographer-scroll-lab-config'

export const PRODUCTION_SCROLL_CONFIG: ScrollLabConfig = {
  enabled: false,
  scrollMode: 'cooldown-snap',
  wheelThreshold: 10,
  gestureEndDelay: 80,
  transitionLockDuration: 40,
  minimumWheelDelta: 0,
  oneGestureOnePhoto: true,
  maxStepsPerGesture: 1,
  allowPendingStep: true,
  resetOnDirectionChange: true,
  invertDirection: false,
  transitionEffect: 'soft-slide',
  transitionDuration: 600,
  transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  flashDuration: 130,
  flashIntensity: 0.6,
  flashColor: '#ffffff',
  translateDistance: 0,
  scaleAmount: 0,
  preloadDistance: 2,
}

export const DEFAULT_SCROLL_LAB_CONFIG: ScrollLabConfig = {
  enabled: true,
  scrollMode: 'cooldown-snap',
  wheelThreshold: 10,
  gestureEndDelay: 80,
  transitionLockDuration: 40,
  minimumWheelDelta: 0,
  oneGestureOnePhoto: true,
  maxStepsPerGesture: 1,
  allowPendingStep: true,
  resetOnDirectionChange: true,
  invertDirection: false,
  transitionEffect: 'soft-slide',
  transitionDuration: 600,
  transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  flashDuration: 130,
  flashIntensity: 0.6,
  flashColor: '#ffffff',
  translateDistance: 0,
  scaleAmount: 0,
  preloadDistance: 2,
}

export type ScrollLabPresetName =
  | 'Editorial Snap'
  | 'Soft Exposure'
  | 'Camera Flash'
  | 'Film Blink'
  | 'Pure Cut'
  | 'Experimental Fast'

export const SCROLL_LAB_PRESETS: Record<
  ScrollLabPresetName,
  Partial<ScrollLabConfig>
> = {
  'Editorial Snap': {
    scrollMode: 'gesture-snap',
    wheelThreshold: 45,
    gestureEndDelay: 130,
    transitionLockDuration: 190,
    oneGestureOnePhoto: true,
    maxStepsPerGesture: 1,
    transitionEffect: 'crossfade',
    transitionDuration: 190,
    transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    translateDistance: 0,
    scaleAmount: 0,
  },
  'Soft Exposure': {
    scrollMode: 'gesture-snap',
    wheelThreshold: 45,
    gestureEndDelay: 140,
    transitionLockDuration: 200,
    oneGestureOnePhoto: true,
    maxStepsPerGesture: 1,
    transitionEffect: 'exposure-pulse',
    transitionDuration: 190,
    flashDuration: 100,
    flashIntensity: 0.2,
    flashColor: '#ffffff',
  },
  'Camera Flash': {
    scrollMode: 'gesture-snap',
    wheelThreshold: 50,
    gestureEndDelay: 150,
    transitionLockDuration: 210,
    oneGestureOnePhoto: true,
    maxStepsPerGesture: 1,
    transitionEffect: 'camera-flash',
    transitionDuration: 200,
    flashDuration: 90,
    flashIntensity: 0.34,
    flashColor: '#ffffff',
  },
  'Film Blink': {
    scrollMode: 'gesture-snap',
    wheelThreshold: 45,
    gestureEndDelay: 140,
    transitionLockDuration: 200,
    oneGestureOnePhoto: true,
    maxStepsPerGesture: 1,
    transitionEffect: 'film-blink',
    transitionDuration: 180,
  },
  'Pure Cut': {
    scrollMode: 'gesture-snap',
    wheelThreshold: 45,
    gestureEndDelay: 120,
    transitionLockDuration: 100,
    oneGestureOnePhoto: true,
    maxStepsPerGesture: 1,
    transitionEffect: 'cut',
    transitionDuration: 0,
  },
  'Experimental Fast': {
    scrollMode: 'cooldown-snap',
    wheelThreshold: 30,
    gestureEndDelay: 80,
    transitionLockDuration: 140,
    oneGestureOnePhoto: false,
    maxStepsPerGesture: 2,
    transitionEffect: 'soft-slide',
    transitionDuration: 150,
    translateDistance: 4,
  },
}

export type ScrollLabDebugState = {
  currentIndex: number
  totalImages: number
  scrollMode: ScrollMode
  gestureActive: boolean
  gestureLocked: boolean
  accumulatedDelta: number
  currentDirection: 1 | -1 | 0
  isTransitioning: boolean
  pendingSteps: number
  lastWheelDelta: number
  lastGestureDuration: number
}

export const INITIAL_DEBUG_STATE: ScrollLabDebugState = {
  currentIndex: 0,
  totalImages: 0,
  scrollMode: 'gesture-snap',
  gestureActive: false,
  gestureLocked: false,
  accumulatedDelta: 0,
  currentDirection: 0,
  isTransitioning: false,
  pendingSteps: 0,
  lastWheelDelta: 0,
  lastGestureDuration: 0,
}

export function mergeScrollLabConfig(
  base: ScrollLabConfig,
  patch: Partial<ScrollLabConfig>,
): ScrollLabConfig {
  return { ...base, ...patch }
}

export function loadStoredScrollLabConfig(): Partial<ScrollLabConfig> | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SCROLL_LAB_STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as Partial<ScrollLabConfig>
  } catch {
    return null
  }
}

export function saveScrollLabConfig(config: ScrollLabConfig): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SCROLL_LAB_STORAGE_KEY, JSON.stringify(config))
}

export function clearStoredScrollLabConfig(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SCROLL_LAB_STORAGE_KEY)
}

export function getProductionConfigExport(): Omit<ScrollLabConfig, 'enabled'> {
  const { enabled: _enabled, ...rest } = PRODUCTION_SCROLL_CONFIG
  return rest
}

export function applyReducedMotionOverrides(
  config: ScrollLabConfig,
): ScrollLabConfig {
  if (typeof window === 'undefined') {
    return config
  }

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return config
  }

  return {
    ...config,
    transitionDuration: Math.min(config.transitionDuration, 100),
    flashDuration: Math.min(config.flashDuration, 100),
    flashIntensity: Math.min(config.flashIntensity, 0.12),
    translateDistance: 0,
    scaleAmount: 0,
  }
}

export function getEffectiveTransitionDuration(config: ScrollLabConfig): number {
  return applyReducedMotionOverrides(config).transitionDuration
}

export function getStepPauseMs(config: ScrollLabConfig): number {
  return Math.max(20, Math.min(45, Math.round(config.transitionLockDuration * 0.24)))
}

export function getMaxPendingSteps(config: ScrollLabConfig): number {
  return config.allowPendingStep ? 5 : 1
}
