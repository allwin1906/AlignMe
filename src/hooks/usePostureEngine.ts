import { useEffect, useMemo, useReducer, useState } from 'react'
import { createInitialState, reduce, toPersisted, type AppState, type Speed } from '@/app/controller'
import type { Angles, Settings } from '@/engine'
import type { ScenarioId } from '@/simulation/scenarios'
import { browserStore, loadPersisted, savePersisted, type StorageStatus } from '@/storage/storage'
import { SAMPLE_INTERVAL_MS } from '@/simulation/scenarios'

const SOUND_KEY = 'alignme:sound'

function readSoundPref(): boolean {
  try {
    return browserStore()?.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export interface PostureModel {
  state: AppState
  storageStatus: StorageStatus
  soundOn: boolean
  /** True when the simulation was paused because the tab was hidden. */
  pausedByVisibility: boolean
  actions: {
    start(): void
    stop(): void
    startScenario(id: ScenarioId): void
    useManual(): void
    setManual(angles: Partial<Angles>): void
    setSpeed(speed: Speed): void
    calibrate(): void
    resetCalibration(): void
    updateSettings(patch: Partial<Settings>): void
    clearHistory(): void
    setSoundOn(on: boolean): void
  }
}

/**
 * The only bridge between React and the engine. Drives the simulated clock
 * with a timer, pauses while the tab is hidden, and persists settings,
 * baseline and history locally.
 */
export function usePostureEngine(options: { persist?: boolean } = {}): PostureModel {
  const persist = options.persist ?? true
  const [loaded] = useState(() => (persist ? loadPersisted() : loadPersisted(null)))
  const [state, dispatch] = useReducer(reduce, loaded.data, createInitialState)
  const [soundOn, setSoundOnState] = useState(() => (persist ? readSoundPref() : true))
  const [pausedByVisibility, setPausedByVisibility] = useState(false)

  useEffect(() => {
    if (!state.running) return
    const id = window.setInterval(() => dispatch({ type: 'TICK', now: Date.now() }), SAMPLE_INTERVAL_MS / state.speed)
    return () => window.clearInterval(id)
  }, [state.running, state.speed])

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && state.running) {
        dispatch({ type: 'STOP' })
        setPausedByVisibility(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [state.running])

  const persisted = useMemo(
    () => toPersisted(state),
    // Only these three fields are persisted; avoid writing on every tick.
    [state.engine.settings, state.engine.processor.baseline, state.history],
  )
  useEffect(() => {
    if (persist) savePersisted(persisted)
  }, [persist, persisted])

  const actions = useMemo<PostureModel['actions']>(
    () => ({
      start: () => {
        setPausedByVisibility(false)
        dispatch({ type: 'START' })
      },
      stop: () => dispatch({ type: 'STOP' }),
      startScenario: (scenarioId) => {
        setPausedByVisibility(false)
        dispatch({ type: 'START_SCENARIO', scenarioId, now: Date.now() })
      },
      useManual: () => dispatch({ type: 'USE_MANUAL' }),
      setManual: (angles) => dispatch({ type: 'SET_MANUAL', angles }),
      setSpeed: (speed) => dispatch({ type: 'SET_SPEED', speed }),
      calibrate: () => dispatch({ type: 'CALIBRATE', now: Date.now() }),
      resetCalibration: () => dispatch({ type: 'RESET_CALIBRATION', now: Date.now() }),
      updateSettings: (patch) => dispatch({ type: 'UPDATE_SETTINGS', patch, now: Date.now() }),
      clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
      setSoundOn: (on) => {
        setSoundOnState(on)
        if (!persist) return
        try {
          browserStore()?.setItem(SOUND_KEY, on ? 'on' : 'off')
        } catch {
          // Storage unavailable: the preference lasts for this session only.
        }
      },
    }),
    [persist],
  )

  return { state, storageStatus: loaded.status, soundOn, pausedByVisibility, actions }
}
