import { calibrate, createEngine, resetCalibration, step, updateSettings, type EngineState } from './engine'
import { MAX_GAP_MS } from './processing'

const settings = { thresholdDeg: 15, persistenceSeconds: 10, smoothingWindow: 1 }

function feed(engine: EngineState, readings: Array<[pitch: number, roll: number, timestamp: number]>) {
  let current = engine
  const events = []
  let output = null
  for (const [pitch, roll, timestamp] of readings) {
    const result = step(current, { pitch, roll, timestamp })
    current = result.engine
    events.push(...result.events)
    output = result.output ?? output
  }
  return { engine: current, events, output: output! }
}

/** Readings every 100 ms (10 Hz) holding one pitch from `from` to `to` inclusive. */
function hold(pitch: number, from: number, to: number): Array<[number, number, number]> {
  const readings: Array<[number, number, number]> = []
  for (let t = from; t <= to; t += 100) readings.push([pitch, 0, t])
  return readings
}

const calibratedAtZero = () => calibrate(feed(createEngine(settings), [[0, 0, 0]]).engine)

describe('engine', () => {
  it('starts NOT_CALIBRATED with default settings when none are given', () => {
    const engine = createEngine()
    expect(engine.settings).toEqual({ thresholdDeg: 15, persistenceSeconds: 10, smoothingWindow: 3 })
    expect(engine.postureState).toBe('NOT_CALIBRATED')
  })

  it('does not classify posture before calibration', () => {
    const { output } = feed(createEngine(settings), [[40, 0, 0], [40, 0, 20_000]])
    expect(output.state).toBe('NOT_CALIBRATED')
    expect(output.deviation).toBeNull()
  })

  it('is GOOD_POSTURE immediately after calibrating', () => {
    expect(calibratedAtZero().postureState).toBe('GOOD_POSTURE')
  })

  it('runs a full sustained-slouch episode and recovery', () => {
    const { events, output } = feed(calibratedAtZero(), [[2, 0, 100], ...hold(20, 200, 10_200), [1, 0, 10_300]])
    expect(output.state).toBe('GOOD_POSTURE')
    const transitions = events.filter((e) => e.type === 'STATE_CHANGED').map((e) => e.type === 'STATE_CHANGED' && e.to)
    expect(transitions).toEqual(['TEMPORARY_DEVIATION', 'POOR_POSTURE_ALERT', 'GOOD_POSTURE'])
  })

  it('reports the deviation and persistence time on the state-change event', () => {
    const { events } = feed(calibratedAtZero(), hold(20, 200, 10_200))
    const alert = events.find((e) => e.type === 'STATE_CHANGED' && e.to === 'POOR_POSTURE_ALERT')
    expect(alert).toMatchObject({ from: 'TEMPORARY_DEVIATION', deviation: 20, persistenceSeconds: 10, timestamp: 10_200 })
  })

  it('smooths readings before classifying', () => {
    let engine = calibrate(feed(createEngine({ ...settings, smoothingWindow: 3 }), [[0, 0, 0]]).engine)
    const result = feed(engine, [[0, 0, 100], [0, 0, 200], [30, 0, 300]])
    engine = result.engine
    expect(result.output.deviation).toBeCloseTo(10)
    expect(result.output.state).toBe('GOOD_POSTURE')
  })

  it('rejects an invalid reading without changing state and counts it', () => {
    const engine = feed(calibratedAtZero(), [[20, 0, 100]]).engine
    const result = step(engine, { pitch: Number.NaN, roll: 0, timestamp: 200 })
    expect(result.output).toBeNull()
    expect(result.engine.postureState).toBe('TEMPORARY_DEVIATION')
    expect(result.engine.rejectedCount).toBe(1)
    expect(result.events).toEqual([{ type: 'READING_REJECTED', reason: 'INVALID_VALUE', timestamp: 200 }])
  })

  it('never alerts across a large timestamp gap', () => {
    const { output } = feed(calibratedAtZero(), [[20, 0, 100], [20, 0, 100 + MAX_GAP_MS + 30_000]])
    expect(output.state).toBe('TEMPORARY_DEVIATION')
    expect(output.persistenceSeconds).toBe(0)
  })

  it('clears an active alert when recalibrating and measures from the new baseline', () => {
    let engine = feed(calibratedAtZero(), hold(20, 100, 10_100)).engine
    expect(engine.postureState).toBe('POOR_POSTURE_ALERT')
    engine = calibrate(engine)
    expect(engine.postureState).toBe('GOOD_POSTURE')
    const { output } = feed(engine, [[22, 0, 10_200]])
    expect(output.deviation).toBeCloseTo(2)
    expect(output.state).toBe('GOOD_POSTURE')
  })

  it('returns to NOT_CALIBRATED after reset', () => {
    const engine = resetCalibration(feed(calibratedAtZero(), [[20, 0, 100]]).engine)
    expect(engine.postureState).toBe('NOT_CALIBRATED')
    expect(feed(engine, [[20, 0, 200]]).output.state).toBe('NOT_CALIBRATED')
  })

  it('validates settings updates against the bounds', () => {
    const engine = updateSettings(createEngine(settings), { thresholdDeg: 500, smoothingWindow: 2 })
    expect(engine.settings).toEqual({ thresholdDeg: 45, persistenceSeconds: 10, smoothingWindow: 2 })
  })
})
