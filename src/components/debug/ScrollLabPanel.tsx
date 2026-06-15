import { useState, type ChangeEvent } from 'react'
import {
  ENABLE_SCROLL_LAB,
  SCROLL_LAB_PRESETS,
  type ScrollLabPresetName,
  type ScrollMode,
  type TransitionEffect,
} from '../../config/scrollLabConfig'
import {
  copyTextToClipboard,
  serializeCurrentConfig,
  serializeProductionConfig,
  useScrollLab,
} from '../../hooks/useScrollLab'
import './ScrollLabPanel.css'

const SCROLL_MODES: ScrollMode[] = [
  'gesture-snap',
  'threshold-snap',
  'cooldown-snap',
  'raw-wheel',
  'velocity-experimental',
]

const TRANSITION_EFFECTS: TransitionEffect[] = [
  'cut',
  'crossfade',
  'exposure-pulse',
  'camera-flash',
  'shutter-flash',
  'soft-slide',
  'scale-fade',
  'film-blink',
]

const EASING_OPTIONS = [
  'linear',
  'ease',
  'ease-out',
  'cubic-bezier(0.22, 1, 0.36, 1)',
  'cubic-bezier(0.16, 1, 0.3, 1)',
] as const

const PRESET_NAMES = Object.keys(SCROLL_LAB_PRESETS) as ScrollLabPresetName[]

type RangeFieldProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (next) => String(next),
}: RangeFieldProps) {
  return (
    <div className="scroll-lab-panel__field scroll-lab-panel__field--stack">
      <label className="scroll-lab-panel__label">
        <span>{label}</span>
        <span className="scroll-lab-panel__value">{format(value)}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    </div>
  )
}

function stopGalleryPropagation(event: React.WheelEvent | React.TouchEvent) {
  event.stopPropagation()
}

export function ScrollLabPanel() {
  const {
    isLabEnabled,
    panelOpen,
    panelCollapsed,
    config,
    debugState,
    setPanelOpen,
    setPanelCollapsed,
    updateConfig,
    applyPreset,
    resetToDefault,
    clearSavedSettings,
  } = useScrollLab()

  const [statusMessage, setStatusMessage] = useState('')

  if (!isLabEnabled) {
    return null
  }

  const showStatus = (message: string) => {
    setStatusMessage(message)
    window.setTimeout(() => setStatusMessage(''), 1800)
  }

  const handleCopyConfig = async () => {
    const copied = await copyTextToClipboard(serializeCurrentConfig(config))
    showStatus(copied ? 'Config copied to clipboard.' : 'Failed to copy config.')
  }

  const handleCopyProductionConfig = async () => {
    const copied = await copyTextToClipboard(serializeProductionConfig())
    showStatus(
      copied ? 'Production config copied.' : 'Failed to copy production config.',
    )
  }

  const onCheckbox =
    (key: keyof typeof config) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      updateConfig({ [key]: event.target.checked })
    }

  if (!panelOpen) {
    return (
      <button
        type="button"
        className="scroll-lab-toggle"
        onClick={() => setPanelOpen(true)}
      >
        Scroll Lab
      </button>
    )
  }

  return (
    <aside
      className="scroll-lab-panel"
      aria-label="Scroll Lab debug panel"
      onWheel={stopGalleryPropagation}
      onTouchMove={stopGalleryPropagation}
    >
      <div className="scroll-lab-panel__header">
        <h2 className="scroll-lab-panel__title">Scroll Lab</h2>
        <div>
          <button
            type="button"
            className="scroll-lab-panel__icon-button"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            aria-expanded={!panelCollapsed}
          >
            {panelCollapsed ? '+' : '−'}
          </button>
          <button
            type="button"
            className="scroll-lab-panel__icon-button"
            onClick={() => setPanelOpen(false)}
            aria-label="Close Scroll Lab"
          >
            ×
          </button>
        </div>
      </div>

      {!panelCollapsed && (
        <>
          <div className="scroll-lab-panel__actions">
            <button type="button" onClick={resetToDefault}>
              Reset to default
            </button>
            <button type="button" onClick={handleCopyConfig}>
              Copy config
            </button>
            <button type="button" onClick={handleCopyProductionConfig}>
              Copy production config
            </button>
            <button type="button" onClick={clearSavedSettings}>
              Clear saved settings
            </button>
          </div>

          <section className="scroll-lab-panel__section">
            <h3 className="scroll-lab-panel__section-title">Presets</h3>
            <div className="scroll-lab-panel__presets">
              {PRESET_NAMES.map((name) => (
                <button key={name} type="button" onClick={() => applyPreset(name)}>
                  {name}
                </button>
              ))}
            </div>
          </section>

          <section className="scroll-lab-panel__section">
            <h3 className="scroll-lab-panel__section-title">Scroll</h3>

            <div className="scroll-lab-panel__field scroll-lab-panel__field--stack">
              <label className="scroll-lab-panel__label">
                Scroll mode
                <select
                  value={config.scrollMode}
                  onChange={(event) =>
                    updateConfig({ scrollMode: event.target.value as ScrollMode })
                  }
                >
                  {SCROLL_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              {config.scrollMode === 'raw-wheel' && (
                <p className="scroll-lab-panel__warning">
                  Experimental: may feel too sensitive on trackpads.
                </p>
              )}
              {config.scrollMode === 'velocity-experimental' && (
                <p className="scroll-lab-panel__warning">
                  Experimental velocity mode.
                </p>
              )}
            </div>

            <label className="scroll-lab-panel__checkbox">
              <input
                type="checkbox"
                checked={config.oneGestureOnePhoto}
                onChange={onCheckbox('oneGestureOnePhoto')}
              />
              One gesture = one photo
            </label>

            <RangeField
              label="Wheel threshold"
              value={config.wheelThreshold}
              min={10}
              max={160}
              step={5}
              onChange={(wheelThreshold) => updateConfig({ wheelThreshold })}
            />

            <RangeField
              label="Gesture end delay"
              value={config.gestureEndDelay}
              min={50}
              max={350}
              step={10}
              format={(value) => `${value} ms`}
              onChange={(gestureEndDelay) => updateConfig({ gestureEndDelay })}
            />

            <RangeField
              label="Transition lock duration"
              value={config.transitionLockDuration}
              min={0}
              max={600}
              step={10}
              format={(value) => `${value} ms`}
              onChange={(transitionLockDuration) =>
                updateConfig({ transitionLockDuration })
              }
            />

            <RangeField
              label="Minimum wheel delta"
              value={config.minimumWheelDelta}
              min={0}
              max={10}
              step={0.5}
              onChange={(minimumWheelDelta) => updateConfig({ minimumWheelDelta })}
            />

            <RangeField
              label="Max steps per gesture"
              value={config.maxStepsPerGesture}
              min={1}
              max={5}
              step={1}
              onChange={(maxStepsPerGesture) => updateConfig({ maxStepsPerGesture })}
            />

            <label className="scroll-lab-panel__checkbox">
              <input
                type="checkbox"
                checked={config.allowPendingStep}
                onChange={onCheckbox('allowPendingStep')}
              />
              Allow one pending step
            </label>

            <label className="scroll-lab-panel__checkbox">
              <input
                type="checkbox"
                checked={config.resetOnDirectionChange}
                onChange={onCheckbox('resetOnDirectionChange')}
              />
              Reset accumulator on direction change
            </label>

            <label className="scroll-lab-panel__checkbox">
              <input
                type="checkbox"
                checked={config.invertDirection}
                onChange={onCheckbox('invertDirection')}
              />
              Invert direction
            </label>
          </section>

          <section className="scroll-lab-panel__section">
            <h3 className="scroll-lab-panel__section-title">Transition</h3>

            <div className="scroll-lab-panel__field scroll-lab-panel__field--stack">
              <label className="scroll-lab-panel__label">
                Transition effect
                <select
                  value={config.transitionEffect}
                  onChange={(event) =>
                    updateConfig({
                      transitionEffect: event.target.value as TransitionEffect,
                    })
                  }
                >
                  {TRANSITION_EFFECTS.map((effect) => (
                    <option key={effect} value={effect}>
                      {effect}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <RangeField
              label="Transition duration"
              value={config.transitionDuration}
              min={0}
              max={600}
              step={10}
              format={(value) => `${value} ms`}
              onChange={(transitionDuration) => updateConfig({ transitionDuration })}
            />

            <div className="scroll-lab-panel__field scroll-lab-panel__field--stack">
              <label className="scroll-lab-panel__label">
                Transition easing
                <select
                  value={config.transitionEasing}
                  onChange={(event) =>
                    updateConfig({ transitionEasing: event.target.value })
                  }
                >
                  {EASING_OPTIONS.map((easing) => (
                    <option key={easing} value={easing}>
                      {easing}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <RangeField
              label="Flash duration"
              value={config.flashDuration}
              min={30}
              max={300}
              step={10}
              format={(value) => `${value} ms`}
              onChange={(flashDuration) => updateConfig({ flashDuration })}
            />

            <RangeField
              label="Flash intensity"
              value={config.flashIntensity}
              min={0}
              max={1}
              step={0.02}
              format={(value) => value.toFixed(2)}
              onChange={(flashIntensity) => updateConfig({ flashIntensity })}
            />

            <div className="scroll-lab-panel__field scroll-lab-panel__field--stack">
              <label className="scroll-lab-panel__label">
                Flash color
                <input
                  type="color"
                  value={config.flashColor}
                  onChange={(event) => updateConfig({ flashColor: event.target.value })}
                />
              </label>
            </div>

            <RangeField
              label="Translate distance"
              value={config.translateDistance}
              min={0}
              max={20}
              step={1}
              format={(value) => `${value}px`}
              onChange={(translateDistance) => updateConfig({ translateDistance })}
            />

            <RangeField
              label="Scale amount"
              value={config.scaleAmount}
              min={0}
              max={0.04}
              step={0.001}
              format={(value) => value.toFixed(3)}
              onChange={(scaleAmount) => updateConfig({ scaleAmount })}
            />
          </section>

          <section className="scroll-lab-panel__section">
            <h3 className="scroll-lab-panel__section-title">Live State</h3>
            <dl className="scroll-lab-panel__live">
              <dt>Index</dt>
              <dd>
                {debugState.currentIndex + 1} / {debugState.totalImages}
              </dd>
              <dt>Scroll mode</dt>
              <dd>{debugState.scrollMode}</dd>
              <dt>Gesture active</dt>
              <dd>{debugState.gestureActive ? 'yes' : 'no'}</dd>
              <dt>Gesture locked</dt>
              <dd>{debugState.gestureLocked ? 'yes' : 'no'}</dd>
              <dt>Accumulated delta</dt>
              <dd>{debugState.accumulatedDelta.toFixed(1)}</dd>
              <dt>Direction</dt>
              <dd>{debugState.currentDirection || '—'}</dd>
              <dt>Transitioning</dt>
              <dd>{debugState.isTransitioning ? 'yes' : 'no'}</dd>
              <dt>Pending steps</dt>
              <dd>{debugState.pendingSteps}</dd>
              <dt>Last wheel delta</dt>
              <dd>{debugState.lastWheelDelta.toFixed(1)}</dd>
              <dt>Last gesture ms</dt>
              <dd>{debugState.lastGestureDuration.toFixed(0)}</dd>
            </dl>
          </section>

          <p className="scroll-lab-panel__status">{statusMessage}</p>
        </>
      )}
    </aside>
  )
}

export { ENABLE_SCROLL_LAB }
