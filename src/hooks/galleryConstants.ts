export const NORMAL_STEP_THRESHOLD = 90
export const GESTURE_END_DELAY = 140
export const TRANSITION_DURATION = 220
export const STEP_PAUSE = 45
export const MAX_PENDING_STEPS = 5
export const REDUCED_MOTION_TRANSITION_DURATION = 80

export function getTransitionDuration(): number {
  if (typeof window === 'undefined') {
    return TRANSITION_DURATION
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? REDUCED_MOTION_TRANSITION_DURATION
    : TRANSITION_DURATION
}
