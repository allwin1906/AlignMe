/**
 * Application controller: a pure reducer that owns the simulated clock, the
 * input source, the engine and the session data shown on the dashboard.
 * React wraps it in a hook; nothing here touches the DOM or real time.
 */
import {
  calibrate,
  createEngine,
  resetCalibration,
  step,
  updateSettings,
  type Angles,
  type Baseline,
  type EngineEvent,
  type EngineOutput,
  type EngineState,
  type PostureState,
  type Settings,
} from '@/engine'
import {
  NEUTRAL_POSTURE,
  SAMPLE_INTERVAL_MS,
  getScenario,
  manualReading,
  scenarioSample,
  type ScenarioId,
} from '@/simulation/scenarios'
import { MAX_HISTORY, type PersistedData } from '@/storage/storage'
import type { HistoryEntry } from './history'

export const CHART_WINDOW_MS = 60_000
export const SPEEDS = [1, 2, 5] as const
export type Speed = (typeof SPEEDS)[number]

export type SourceMode =
  | { kind: 'manual' }
  | { kind: 'scenario'; scenarioId: ScenarioId; startedAt: number; seed: number; calibrated: boolean }

export interface ChartPoint {
  /** Simulated time, ms. */
  t: number
  deviation: number | null
  state: PostureState
}

export interface SessionStats {
  goodMs: number
  deviationMs: number
  alertMs: number
  alerts: number
}

export interface AppState {
  engine: EngineState
  /** Monotonic simulated clock in ms. Only advances while running, so pausing never creates a gap. */
  simTime: number
  running: boolean
  speed: Speed
  mode: SourceMode
  /** Absolute angles chosen with the manual sliders. */
  manual: Angles
  latest: EngineOutput | null
  series: ChartPoint[]
  history: HistoryEntry[]
  stats: SessionStats
  scenarioFinished: ScenarioId | null
  seedCounter: number
  historySeq: number
}

export type Action =
  | { type: 'TICK'; now: number }
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'START_SCENARIO'; scenarioId: ScenarioId; now: number }
  | { type: 'USE_MANUAL' }
  | { type: 'SET_MANUAL'; angles: Partial<Angles> }
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'CALIBRATE'; now: number }
  | { type: 'RESET_CALIBRATION'; now: number }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<Settings>; now: number }
  | { type: 'CLEAR_HISTORY' }

const MANUAL_SEED = 7

export function createInitialState(persisted: PersistedData): AppState {
  return {
    engine: createEngine(persisted.settings, persisted.baseline),
    simTime: 0,
    running: false,
    speed: 1,
    mode: { kind: 'manual' },
    manual: { ...NEUTRAL_POSTURE },
    latest: null,
    series: [],
    history: persisted.history.slice(-MAX_HISTORY),
    stats: { goodMs: 0, deviationMs: 0, alertMs: 0, alerts: 0 },
    scenarioFinished: null,
    seedCounter: 0,
    historySeq: 0,
  }
}

export function sourceLabel(mode: SourceMode): string {
  return mode.kind === 'manual' ? 'Manual' : getScenario(mode.scenarioId).name
}

const fmt = (n: number) => `${n.toFixed(1)}°`
const describeBaseline = (b: Baseline | null) => (b ? `Baseline pitch ${fmt(b.pitch)}, roll ${fmt(b.roll)}` : 'No baseline')

function log(state: AppState, now: number, entry: Omit<HistoryEntry, 'id' | 'at' | 'source'>): AppState {
  const row: HistoryEntry = { id: `${now}-${state.historySeq}`, at: now, source: sourceLabel(state.mode), ...entry }
  return { ...state, history: [...state.history, row].slice(-MAX_HISTORY), historySeq: state.historySeq + 1 }
}

const blankEntry = { from: null, to: null, deviation: null, persistenceSeconds: null, detail: null }

function logEngineEvents(state: AppState, events: EngineEvent[], now: number): AppState {
  let next = state
  for (const event of events) {
    if (event.type !== 'STATE_CHANGED') continue
    next = log(next, now, {
      kind: 'STATE',
      from: event.from,
      to: event.to,
      deviation: event.deviation,
      persistenceSeconds: event.persistenceSeconds,
      detail: null,
    })
    if (event.to === 'POOR_POSTURE_ALERT') next = { ...next, stats: { ...next.stats, alerts: next.stats.alerts + 1 } }
  }
  return next
}

function addTime(stats: SessionStats, posture: PostureState): SessionStats {
  switch (posture) {
    case 'GOOD_POSTURE':
      return { ...stats, goodMs: stats.goodMs + SAMPLE_INTERVAL_MS }
    case 'TEMPORARY_DEVIATION':
      return { ...stats, deviationMs: stats.deviationMs + SAMPLE_INTERVAL_MS }
    case 'POOR_POSTURE_ALERT':
      return { ...stats, alertMs: stats.alertMs + SAMPLE_INTERVAL_MS }
    case 'NOT_CALIBRATED':
      return stats
  }
}

function applyCalibration(state: AppState, now: number, detail: string | null): AppState {
  const engine = calibrate(state.engine)
  if (engine === state.engine) return state
  const mode = state.mode.kind === 'scenario' ? { ...state.mode, calibrated: true } : state.mode
  const calibratedState = { ...state, engine, mode }
  return log(calibratedState, now, {
    ...blankEntry,
    kind: 'CALIBRATED',
    to: 'GOOD_POSTURE',
    detail: [detail, describeBaseline(engine.processor.baseline)].filter(Boolean).join(' · '),
  })
}

function tick(state: AppState, now: number): AppState {
  if (!state.running) return state
  const simTime = state.simTime + SAMPLE_INTERVAL_MS
  const { mode } = state

  let reading
  if (mode.kind === 'scenario') {
    const scenario = getScenario(mode.scenarioId)
    const t = simTime - mode.startedAt
    if (t > scenario.durationMs) {
      const finished = { ...state, running: false, scenarioFinished: mode.scenarioId }
      return log(finished, now, { ...blankEntry, kind: 'SCENARIO_FINISHED', detail: `${scenario.name} finished` })
    }
    reading = scenarioSample(scenario, mode.seed, t, simTime, state.engine.settings.thresholdDeg).reading
  } else {
    reading = manualReading(state.manual, MANUAL_SEED, simTime)
  }

  const result = step(state.engine, reading)
  let next: AppState = { ...state, simTime, engine: result.engine, latest: result.output ?? state.latest }
  next = logEngineEvents(next, result.events, now)
  next = { ...next, stats: addTime(next.stats, next.engine.postureState) }

  if (result.output) {
    const point: ChartPoint = { t: simTime, deviation: result.output.deviation, state: result.output.state }
    next = { ...next, series: [...next.series.filter((p) => p.t > simTime - CHART_WINDOW_MS), point] }
  }

  if (mode.kind === 'scenario' && !mode.calibrated && simTime - mode.startedAt >= getScenario(mode.scenarioId).calibrateAtMs) {
    next = applyCalibration(next, now, 'Auto-calibrated during the scenario’s upright lead-in')
  }
  return next
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TICK':
      return tick(state, action.now)
    case 'START':
      return state.running ? state : { ...state, running: true, scenarioFinished: null }
    case 'STOP':
      return state.running ? { ...state, running: false } : state
    case 'START_SCENARIO': {
      const seed = state.seedCounter + 1
      const started: AppState = {
        ...state,
        running: true,
        scenarioFinished: null,
        seedCounter: seed,
        mode: { kind: 'scenario', scenarioId: action.scenarioId, startedAt: state.simTime, seed, calibrated: false },
      }
      return log(started, action.now, { ...blankEntry, kind: 'SCENARIO_STARTED', detail: getScenario(action.scenarioId).description })
    }
    case 'USE_MANUAL':
      return state.mode.kind === 'manual' ? state : { ...state, mode: { kind: 'manual' }, scenarioFinished: null }
    case 'SET_MANUAL':
      return { ...state, manual: { ...state.manual, ...action.angles } }
    case 'SET_SPEED':
      return { ...state, speed: action.speed }
    case 'CALIBRATE':
      return applyCalibration(state, action.now, null)
    case 'RESET_CALIBRATION': {
      const reset = { ...state, engine: resetCalibration(state.engine) }
      return log(reset, action.now, { ...blankEntry, kind: 'CALIBRATION_RESET', to: 'NOT_CALIBRATED', detail: 'Calibration cleared' })
    }
    case 'UPDATE_SETTINGS': {
      const engine = updateSettings(state.engine, action.patch)
      const s = engine.settings
      const updated = { ...state, engine }
      return log(updated, action.now, {
        ...blankEntry,
        kind: 'SETTINGS',
        detail: `Threshold ${s.thresholdDeg}° · delay ${s.persistenceSeconds} s · smoothing ${s.smoothingWindow}`,
      })
    }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] }
  }
}

export function toPersisted(state: AppState): PersistedData {
  return { settings: state.engine.settings, baseline: state.engine.processor.baseline, history: state.history }
}
