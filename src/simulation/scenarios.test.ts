import { createRng } from './rng'
import { NEUTRAL_POSTURE, SCENARIOS, generateReadings, getScenario, keyframes } from './scenarios'

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.gaussian()]).toEqual([b.next(), b.next(), b.gaussian()])
  })

  it('produces different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })

  it('returns uniform values in [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('keyframes', () => {
  const curve = keyframes([
    [0, 0],
    [1000, 10],
    [3000, 10],
  ])

  it('interpolates linearly between points', () => {
    expect(curve(500)).toBeCloseTo(5)
  })

  it('holds the first and last values outside the range', () => {
    expect(curve(-100)).toBe(0)
    expect(curve(9999)).toBe(10)
  })
})

describe('generateReadings', () => {
  const scenario = getScenario('sustained')

  it('samples at 10 Hz across the scenario duration', () => {
    const samples = generateReadings(scenario, { seed: 1 })
    expect(samples[0]!.reading.timestamp).toBe(0)
    expect(samples[1]!.reading.timestamp).toBe(100)
    expect(samples).toHaveLength(Math.floor(scenario.durationMs / 100) + 1)
  })

  it('offsets readings by the start timestamp', () => {
    const samples = generateReadings(scenario, { seed: 1, startTimestamp: 5000 })
    expect(samples[0]!.reading.timestamp).toBe(5000)
    expect(samples[0]!.t).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    expect(generateReadings(scenario, { seed: 3 })).toEqual(generateReadings(scenario, { seed: 3 }))
  })

  it('adds noise around the noise-free truth', () => {
    const samples = generateReadings(scenario, { seed: 3 })
    const first = samples[0]!
    expect(first.reading.pitch).not.toBe(NEUTRAL_POSTURE.pitch + first.truth.pitch)
    expect(Math.abs(first.reading.pitch - (NEUTRAL_POSTURE.pitch + first.truth.pitch))).toBeLessThan(5)
  })

  it('produces no noise when the noise level is zero', () => {
    const samples = generateReadings(scenario, { seed: 3, noiseSd: 0 })
    for (const s of samples) {
      expect(s.reading.pitch).toBeCloseTo(NEUTRAL_POSTURE.pitch + s.truth.pitch)
      expect(s.reading.roll).toBeCloseTo(NEUTRAL_POSTURE.roll + s.truth.roll)
    }
  })
})

describe('scenario catalogue', () => {
  it('defines every scenario the dashboard offers', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual(['good', 'brief', 'everyday', 'sustained', 'recovery', 'boundary'])
  })

  it('keeps every scenario neutral at its calibration time', () => {
    for (const s of SCENARIOS) {
      const truth = s.profile(s.calibrateAtMs, { thresholdDeg: 15 })
      expect(Math.hypot(truth.pitch, truth.roll)).toBeLessThan(3)
    }
  })

  it('makes the noisy-boundary scenario hover at the configured threshold', () => {
    const boundary = getScenario('boundary')
    expect(boundary.profile(15_000, { thresholdDeg: 22 }).pitch).toBeCloseTo(22)
  })
})
