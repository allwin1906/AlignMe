import { DEFAULT_SETTINGS } from '@/engine'
import { MAX_HISTORY } from '@/storage/storage'
import { getScenario } from '@/simulation/scenarios'
import { generateReadings } from '@/simulation/scenarios'
import { CHART_WINDOW_MS, createInitialState, reduce, type Action, type AppState } from './controller'

const NOW = 1_700_000_000_000

function apply(state: AppState, ...actions: Action[]) {
  return actions.reduce(reduce, state)
}

function ticks(state: AppState, count: number) {
  let s = state
  for (let i = 0; i < count; i++) s = reduce(s, { type: 'TICK', now: NOW + i })
  return s
}

const fresh = () => createInitialState({ settings: DEFAULT_SETTINGS, baseline: null, history: [] })

describe('controller', () => {
  it('starts stopped and not calibrated', () => {
    const s = fresh()
    expect(s.running).toBe(false)
    expect(s.engine.postureState).toBe('NOT_CALIBRATED')
    expect(s.latest).toBeNull()
  })

  it('ignores ticks while stopped', () => {
    const s = fresh()
    expect(reduce(s, { type: 'TICK', now: NOW })).toBe(s)
  })

  it('advances simulated time by 100 ms per tick and produces a reading', () => {
    const s = ticks(apply(fresh(), { type: 'START' }), 3)
    expect(s.simTime).toBe(300)
    expect(s.latest?.timestamp).toBe(300)
  })

  it('cannot calibrate before any reading has arrived', () => {
    const s = fresh()
    expect(reduce(s, { type: 'CALIBRATE', now: NOW })).toBe(s)
  })

  it('calibrates from the live reading and logs it', () => {
    const s = apply(ticks(apply(fresh(), { type: 'START' }), 3), { type: 'CALIBRATE', now: NOW })
    expect(s.engine.postureState).toBe('GOOD_POSTURE')
    expect(s.engine.processor.baseline).not.toBeNull()
    expect(s.history.at(-1)).toMatchObject({ kind: 'CALIBRATED', source: 'Manual' })
  })

  it('raises an alert when the manual posture is held past the threshold', () => {
    let s = apply(ticks(apply(fresh(), { type: 'START' }), 3), { type: 'CALIBRATE', now: NOW })
    s = apply(s, { type: 'SET_MANUAL', angles: { pitch: s.manual.pitch + 25 } })
    s = ticks(s, 105)
    expect(s.engine.postureState).toBe('POOR_POSTURE_ALERT')
    expect(s.stats.alerts).toBe(1)
    const alert = s.history.find((h) => h.kind === 'STATE' && h.to === 'POOR_POSTURE_ALERT')
    expect(alert?.persistenceSeconds).toBeGreaterThanOrEqual(10)
  })

  it('tracks time spent in each state after calibration', () => {
    let s = apply(ticks(apply(fresh(), { type: 'START' }), 3), { type: 'CALIBRATE', now: NOW })
    s = ticks(s, 10)
    expect(s.stats.goodMs).toBe(1000)
  })

  it('runs a scenario with automatic calibration, alerts, then stops when it ends', () => {
    let s = apply(fresh(), { type: 'START_SCENARIO', scenarioId: 'sustained', now: NOW })
    expect(s.running).toBe(true)
    s = ticks(s, Math.ceil(getScenario('sustained').durationMs / 100) + 2)
    expect(s.history.some((h) => h.kind === 'CALIBRATED' && h.detail?.includes('Auto'))).toBe(true)
    expect(s.stats.alerts).toBe(1)
    expect(s.running).toBe(false)
    expect(s.scenarioFinished).toBe('sustained')
    expect(s.history.at(-1)).toMatchObject({ kind: 'SCENARIO_FINISHED' })
  })

  it('feeds the engine the same readings the evaluation suite uses', () => {
    let s = apply(ticks(apply(fresh(), { type: 'START' }), 4), { type: 'START_SCENARIO', scenarioId: 'brief', now: NOW })
    const seed = s.mode.kind === 'scenario' ? s.mode.seed : -1
    const startedAt = s.simTime
    s = ticks(s, 5)
    const expected = generateReadings(getScenario('brief'), { seed, startTimestamp: startedAt })[5]!.reading
    expect(s.latest?.raw).toEqual({ pitch: expected.pitch, roll: expected.roll })
    expect(s.latest?.timestamp).toBe(expected.timestamp)
  })

  it('keeps simulated time continuous across stop and start', () => {
    let s = ticks(apply(fresh(), { type: 'START' }), 5)
    s = ticks(apply(s, { type: 'STOP' }), 50)
    s = ticks(apply(s, { type: 'START' }), 1)
    expect(s.simTime).toBe(600)
    expect(s.latest?.discontinuity).toBe(false)
  })

  it('keeps only the last 60 s of chart points', () => {
    const s = ticks(apply(fresh(), { type: 'START' }), 900)
    expect(s.series[0]!.t).toBeGreaterThan(s.simTime - CHART_WINDOW_MS)
    expect(s.series.at(-1)!.t).toBe(s.simTime)
  })

  it('caps history at the maximum size', () => {
    let s = ticks(apply(fresh(), { type: 'START' }), 2)
    for (let i = 0; i < MAX_HISTORY + 10; i++) s = apply(s, { type: 'TICK', now: NOW + i }, { type: 'CALIBRATE', now: NOW + i })
    expect(s.history).toHaveLength(MAX_HISTORY)
  })

  it('clamps and logs settings changes', () => {
    const s = apply(fresh(), { type: 'UPDATE_SETTINGS', patch: { thresholdDeg: 99 }, now: NOW })
    expect(s.engine.settings.thresholdDeg).toBe(45)
    expect(s.history.at(-1)).toMatchObject({ kind: 'SETTINGS' })
  })

  it('resets calibration and logs it', () => {
    let s = apply(ticks(apply(fresh(), { type: 'START' }), 3), { type: 'CALIBRATE', now: NOW })
    s = apply(s, { type: 'RESET_CALIBRATION', now: NOW })
    expect(s.engine.postureState).toBe('NOT_CALIBRATED')
    expect(s.history.at(-1)).toMatchObject({ kind: 'CALIBRATION_RESET' })
  })

  it('restores a saved baseline as calibrated', () => {
    const s = createInitialState({ settings: DEFAULT_SETTINGS, baseline: { pitch: 4, roll: -1 }, history: [] })
    expect(s.engine.postureState).toBe('GOOD_POSTURE')
  })

  it('clears history', () => {
    let s = apply(ticks(apply(fresh(), { type: 'START' }), 3), { type: 'CALIBRATE', now: NOW })
    s = apply(s, { type: 'CLEAR_HISTORY' })
    expect(s.history).toEqual([])
  })
})
