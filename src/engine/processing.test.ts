import {
  MAX_GAP_MS,
  calculateDeviation,
  calibrate,
  createProcessor,
  processReading,
  resetCalibration,
  smoothedAngles,
} from './processing'
import type { Reading } from './types'

const r = (pitch: number, roll: number, timestamp: number): Reading => ({ pitch, roll, timestamp })

function feed(window: number, readings: Reading[]) {
  let state = createProcessor()
  let last = null as ReturnType<typeof processReading>['output'] | null
  for (const reading of readings) {
    const step = processReading(state, reading, window)
    state = step.state
    last = step.output
  }
  return { state, last: last! }
}

describe('calculateDeviation', () => {
  it('is zero when the reading equals the baseline', () => {
    expect(calculateDeviation({ pitch: 12.3, roll: -4.5 }, { pitch: 12.3, roll: -4.5 })).toBeCloseTo(0, 10)
  })

  it('equals the pitch difference for a pitch-only change', () => {
    expect(calculateDeviation({ pitch: 20, roll: 0 }, { pitch: 5, roll: 0 })).toBeCloseTo(15)
  })

  it('equals the roll difference for a roll-only change', () => {
    expect(calculateDeviation({ pitch: 0, roll: -7 }, { pitch: 0, roll: 5 })).toBeCloseTo(12)
  })

  it('combines pitch and roll as a Euclidean distance', () => {
    expect(calculateDeviation({ pitch: 3, roll: 4 }, { pitch: 0, roll: 0 })).toBeCloseTo(5)
  })
})

describe('smoothing', () => {
  it('with a window of 1 returns the latest reading unchanged', () => {
    const { last } = feed(1, [r(0, 0, 0), r(10, 4, 100)])
    expect(last.smoothed).toEqual({ pitch: 10, roll: 4 })
  })

  it('averages pitch and roll over the last N readings', () => {
    const { last } = feed(3, [r(100, 100, 0), r(3, 6, 100), r(6, 9, 200), r(9, 12, 300)])
    expect(last.smoothed.pitch).toBeCloseTo(6)
    expect(last.smoothed.roll).toBeCloseTo(9)
  })

  it('averages over fewer readings while the window is filling', () => {
    const { last } = feed(5, [r(2, 0, 0), r(4, 2, 100)])
    expect(last.smoothed).toEqual({ pitch: 3, roll: 1 })
  })

  it('gives a different result for different window sizes', () => {
    const readings = [r(0, 0, 0), r(0, 0, 100), r(10, 0, 200)]
    expect(feed(1, readings).last.smoothed.pitch).toBeCloseTo(10)
    expect(feed(3, readings).last.smoothed.pitch).toBeCloseTo(10 / 3)
  })

  it('trims the buffer when the window shrinks', () => {
    let state = feed(5, [r(1, 0, 0), r(2, 0, 100), r(3, 0, 200), r(4, 0, 300)]).state
    const step = processReading(state, r(5, 0, 400), 2)
    state = step.state
    expect(step.output!.smoothed.pitch).toBeCloseTo(4.5)
    expect(state.buffer).toHaveLength(2)
  })
})

describe('calibration', () => {
  it('starts not calibrated and reports no deviation', () => {
    const { state, last } = feed(3, [r(5, 5, 0)])
    expect(state.baseline).toBeNull()
    expect(last.calibrated).toBe(false)
    expect(last.deviation).toBeNull()
  })

  it('stores the current smoothed reading as the baseline', () => {
    const { state } = feed(3, [r(10, 2, 0), r(12, 4, 100)])
    const calibrated = calibrate(state)
    expect(calibrated.baseline).toEqual({ pitch: 11, roll: 3 })
  })

  it('clears the smoothing buffer after calibrating', () => {
    const { state } = feed(3, [r(10, 2, 0), r(12, 4, 100)])
    expect(calibrate(state).buffer).toHaveLength(0)
  })

  it('leaves state unchanged when there is no reading to calibrate from', () => {
    const state = createProcessor()
    expect(calibrate(state)).toBe(state)
  })

  it('reports zero deviation for a reading equal to the baseline', () => {
    let state = calibrate(feed(1, [r(8, -3, 0)]).state)
    const step = processReading(state, r(8, -3, 100), 1)
    state = step.state
    expect(step.output!.calibrated).toBe(true)
    expect(step.output!.deviation).toBeCloseTo(0, 10)
    expect(step.output!.baseline).toEqual({ pitch: 8, roll: -3 })
  })

  it('measures deviation relative to a new baseline after recalibrating', () => {
    let state = calibrate(feed(1, [r(0, 0, 0)]).state)
    state = processReading(state, r(20, 0, 100), 1).state
    state = calibrate(state)
    const step = processReading(state, r(25, 0, 200), 1)
    expect(step.output!.deviation).toBeCloseTo(5)
  })

  it('reset returns the processor to not calibrated', () => {
    const state = resetCalibration(calibrate(feed(1, [r(1, 1, 0)]).state))
    expect(state.baseline).toBeNull()
    expect(processReading(state, r(1, 1, 100), 1).output!.calibrated).toBe(false)
  })
})

describe('smoothedAngles', () => {
  it('returns null for an empty buffer', () => {
    expect(smoothedAngles([])).toBeNull()
  })
})

describe('processReading gaps and rejection', () => {
  it('rejects an invalid reading and keeps the state unchanged', () => {
    const { state } = feed(3, [r(1, 1, 0)])
    const step = processReading(state, r(Number.NaN, 0, 100), 3)
    expect(step.state).toBe(state)
    expect(step.rejected).toBe('INVALID_VALUE')
  })

  it('rejects a duplicate timestamp', () => {
    const { state } = feed(3, [r(1, 1, 100)])
    expect(processReading(state, r(2, 2, 100), 3).rejected).toBe('NON_MONOTONIC_TIMESTAMP')
  })

  it('flags a discontinuity and restarts smoothing after a large gap', () => {
    const { state } = feed(3, [r(30, 0, 0), r(30, 0, 100)])
    const step = processReading(state, r(0, 0, 100 + MAX_GAP_MS + 1), 3)
    expect(step.output!.discontinuity).toBe(true)
    expect(step.output!.smoothed).toEqual({ pitch: 0, roll: 0 })
  })

  it('does not flag a discontinuity for normal spacing', () => {
    const { last } = feed(3, [r(0, 0, 0), r(0, 0, 100)])
    expect(last.discontinuity).toBe(false)
  })
})
