import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  applyReducedMotionOverrides,
  clearStoredScrollLabConfig,
  DEFAULT_SCROLL_LAB_CONFIG,
  ENABLE_SCROLL_LAB,
  getProductionConfigExport,
  INITIAL_DEBUG_STATE,
  loadStoredScrollLabConfig,
  mergeScrollLabConfig,
  PRODUCTION_SCROLL_CONFIG,
  saveScrollLabConfig,
  SCROLL_LAB_PRESETS,
  type ScrollLabConfig,
  type ScrollLabDebugState,
  type ScrollLabPresetName,
} from '../config/scrollLabConfig'

type ScrollLabContextValue = {
  isLabEnabled: boolean
  panelOpen: boolean
  panelCollapsed: boolean
  config: ScrollLabConfig
  debugState: ScrollLabDebugState
  setPanelOpen: (open: boolean) => void
  setPanelCollapsed: (collapsed: boolean) => void
  updateConfig: (patch: Partial<ScrollLabConfig>) => void
  applyPreset: (name: ScrollLabPresetName) => void
  resetToDefault: () => void
  clearSavedSettings: () => void
  publishDebugState: (patch: Partial<ScrollLabDebugState>) => void
}

const ScrollLabContext = createContext<ScrollLabContextValue | null>(null)

function buildInitialConfig(): ScrollLabConfig {
  if (!ENABLE_SCROLL_LAB) {
    return PRODUCTION_SCROLL_CONFIG
  }

  const stored = loadStoredScrollLabConfig()
  return mergeScrollLabConfig(DEFAULT_SCROLL_LAB_CONFIG, stored ?? {})
}

export function ScrollLabProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ScrollLabConfig>(buildInitialConfig)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [debugState, setDebugState] = useState<ScrollLabDebugState>(INITIAL_DEBUG_STATE)
  const debugThrottleRef = useRef<number | null>(null)
  const pendingDebugPatchRef = useRef<Partial<ScrollLabDebugState>>({})

  const effectiveConfig = useMemo(
    () =>
      ENABLE_SCROLL_LAB
        ? applyReducedMotionOverrides(config)
        : applyReducedMotionOverrides(PRODUCTION_SCROLL_CONFIG),
    [config],
  )

  const updateConfig = useCallback((patch: Partial<ScrollLabConfig>) => {
    if (!ENABLE_SCROLL_LAB) {
      return
    }

    setConfig((current) => {
      const next = mergeScrollLabConfig(current, patch)
      saveScrollLabConfig(next)
      return next
    })
  }, [])

  const applyPreset = useCallback((name: ScrollLabPresetName) => {
    if (!ENABLE_SCROLL_LAB) {
      return
    }

    setConfig((current) => {
      const next = mergeScrollLabConfig(
        mergeScrollLabConfig(DEFAULT_SCROLL_LAB_CONFIG, SCROLL_LAB_PRESETS[name]),
        { enabled: current.enabled },
      )
      saveScrollLabConfig(next)
      return next
    })
  }, [])

  const resetToDefault = useCallback(() => {
    if (!ENABLE_SCROLL_LAB) {
      return
    }

    const next = { ...DEFAULT_SCROLL_LAB_CONFIG }
    saveScrollLabConfig(next)
    setConfig(next)
  }, [])

  const clearSavedSettings = useCallback(() => {
    if (!ENABLE_SCROLL_LAB) {
      return
    }

    clearStoredScrollLabConfig()
    setConfig({ ...DEFAULT_SCROLL_LAB_CONFIG })
  }, [])

  const publishDebugState = useCallback((patch: Partial<ScrollLabDebugState>) => {
    if (!ENABLE_SCROLL_LAB) {
      return
    }

    pendingDebugPatchRef.current = {
      ...pendingDebugPatchRef.current,
      ...patch,
    }

    if (debugThrottleRef.current !== null) {
      return
    }

    debugThrottleRef.current = window.setTimeout(() => {
      debugThrottleRef.current = null
      const pending = pendingDebugPatchRef.current
      pendingDebugPatchRef.current = {}
      setDebugState((current) => ({ ...current, ...pending }))
    }, 100)
  }, [])

  useEffect(() => {
    if (!ENABLE_SCROLL_LAB) {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isRangeInput =
        target instanceof HTMLInputElement && target.type === 'range'

      if (event.key === 'Escape' && panelOpen) {
        setPanelOpen(false)
        return
      }

      if (event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        setPanelOpen((open) => !open)
        return
      }

      if (isRangeInput && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.stopPropagation()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [panelOpen])

  useEffect(() => {
    return () => {
      if (debugThrottleRef.current !== null) {
        window.clearTimeout(debugThrottleRef.current)
      }
    }
  }, [])

  const value = useMemo<ScrollLabContextValue>(
    () => ({
      isLabEnabled: ENABLE_SCROLL_LAB,
      panelOpen,
      panelCollapsed,
      config: effectiveConfig,
      debugState,
      setPanelOpen,
      setPanelCollapsed,
      updateConfig,
      applyPreset,
      resetToDefault,
      clearSavedSettings,
      publishDebugState,
    }),
    [
      applyPreset,
      clearSavedSettings,
      debugState,
      effectiveConfig,
      panelCollapsed,
      panelOpen,
      publishDebugState,
      resetToDefault,
      updateConfig,
    ],
  )

  return (
    <ScrollLabContext.Provider value={value}>{children}</ScrollLabContext.Provider>
  )
}

export function useScrollLab(): ScrollLabContextValue {
  const context = useContext(ScrollLabContext)
  if (!context) {
    return {
      isLabEnabled: false,
      panelOpen: false,
      panelCollapsed: false,
      config: applyReducedMotionOverrides(PRODUCTION_SCROLL_CONFIG),
      debugState: INITIAL_DEBUG_STATE,
      setPanelOpen: () => undefined,
      setPanelCollapsed: () => undefined,
      updateConfig: () => undefined,
      applyPreset: () => undefined,
      resetToDefault: () => undefined,
      clearSavedSettings: () => undefined,
      publishDebugState: () => undefined,
    }
  }
  return context
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function serializeCurrentConfig(config: ScrollLabConfig): string {
  return JSON.stringify(config, null, 2)
}

export function serializeProductionConfig(): string {
  return JSON.stringify(getProductionConfigExport(), null, 2)
}
