import { createDetector, evaluate, type DetectorState } from './detector'

const settings = { thresholdDeg: 15, persistenceSeconds: 10 }

function run(inputs: Array<[deviation: number | null, timestamp: number, discontinuity?: boolean]>, s = settings) {
  let detector: DetectorState = createDetector()
  const results = []
  for (const [deviation, timestamp, discontinuity = false] of inputs) {
    const step = evaluate(detector, { deviation, timestamp, discontinuity }, s)
    detector = step.detector
    results.push(step.result)
  }
  return { detector, results, last: results[results.length - 1]! }
}

describe('evaluate', () => {
  it('returns NOT_CALIBRATED when there is no deviation score', () => {
    expect(run([[null, 0]]).last.state).toBe('NOT_CALIBRATED')
  })

  it('returns GOOD_POSTURE for a neutral reading', () => {
    expect(run([[2, 0]]).last).toEqual({ state: 'GOOD_POSTURE', persistenceSeconds: 0, deviationSince: null })
  })

  it('returns TEMPORARY_DEVIATION for the first above-threshold reading', () => {
    expect(run([[20, 1000]]).last).toEqual({ state: 'TEMPORARY_DEVIATION', persistenceSeconds: 0, deviationSince: 1000 })
  })

  it('treats a deviation exactly at the threshold as deviating', () => {
    expect(run([[15, 0]]).last.state).toBe('TEMPORARY_DEVIATION')
  })

  it('does not alert for a deviation shorter than the persistence time', () => {
    const { results } = run([
      [20, 0],
      [20, 5000],
      [20, 9900],
      [3, 10_000],
    ])
    expect(results.map((r) => r.state)).not.toContain('POOR_POSTURE_ALERT')
    expect(results[2]!.persistenceSeconds).toBeCloseTo(9.9)
  })

  it('alerts when the deviation lasts exactly the persistence time', () => {
    const { last } = run([
      [20, 0],
      [20, 10_000],
    ])
    expect(last).toEqual({ state: 'POOR_POSTURE_ALERT', persistenceSeconds: 10, deviationSince: 0 })
  })

  it('stays in alert while the deviation continues', () => {
    expect(run([[20, 0], [20, 10_000], [25, 15_000]]).last.state).toBe('POOR_POSTURE_ALERT')
  })

  it('returns to GOOD_POSTURE and resets the timer when posture recovers', () => {
    const { last, detector } = run([[20, 0], [20, 12_000], [4, 12_100]])
    expect(last).toEqual({ state: 'GOOD_POSTURE', persistenceSeconds: 0, deviationSince: null })
    expect(detector.deviationSince).toBeNull()
  })

  it('starts a fresh timer for a new deviation episode', () => {
    const { last } = run([[20, 0], [20, 8000], [2, 8100], [20, 9000], [20, 12_000]])
    expect(last).toEqual({ state: 'TEMPORARY_DEVIATION', persistenceSeconds: 3, deviationSince: 9000 })
  })

  it('restarts the episode after a discontinuity so a gap never counts as persisted posture', () => {
    const { last } = run([[20, 0], [20, 1000], [20, 60_000, true]])
    expect(last).toEqual({ state: 'TEMPORARY_DEVIATION', persistenceSeconds: 0, deviationSince: 60_000 })
  })
})

describe('settings changes during an episode', () => {
  it('keeps the original start time when the deviation is still above a new threshold', () => {
    let detector = createDetector()
    detector = evaluate(detector, { deviation: 20, timestamp: 0, discontinuity: false }, settings).detector
    const step = evaluate(detector, { deviation: 20, timestamp: 4000, discontinuity: false }, { ...settings, thresholdDeg: 18 })
    expect(step.result).toEqual({ state: 'TEMPORARY_DEVIATION', persistenceSeconds: 4, deviationSince: 0 })
  })

  it('ends the episode when a raised threshold puts the deviation below it', () => {
    let detector = createDetector()
    detector = evaluate(detector, { deviation: 20, timestamp: 0, discontinuity: false }, settings).detector
    const step = evaluate(detector, { deviation: 20, timestamp: 4000, discontinuity: false }, { ...settings, thresholdDeg: 25 })
    expect(step.result.state).toBe('GOOD_POSTURE')
  })

  it('measures a shortened persistence time against the existing start time', () => {
    let detector = createDetector()
    detector = evaluate(detector, { deviation: 20, timestamp: 0, discontinuity: false }, settings).detector
    const step = evaluate(detector, { deviation: 20, timestamp: 6000, discontinuity: false }, { ...settings, persistenceSeconds: 5 })
    expect(step.result.state).toBe('POOR_POSTURE_ALERT')
  })
})

describe('threshold flicker (no hysteresis in v1)', () => {
  it('switches state on every crossing of the threshold', () => {
    const { results } = run([[14.9, 0], [15.1, 100], [14.9, 200], [15.1, 300]])
    expect(results.map((r) => r.state)).toEqual([
      'GOOD_POSTURE',
      'TEMPORARY_DEVIATION',
      'GOOD_POSTURE',
      'TEMPORARY_DEVIATION',
    ])
  })
})
