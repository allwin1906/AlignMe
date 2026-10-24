/**
 * Scripted posture scenarios for the simulation input layer.
 * Each scenario describes noise-free trunk angles relative to the user's
 * neutral posture; generateReadings adds the neutral offset and seeded noise.
 */
import type { Angles, Reading } from '@/engine'
import { createRng } from './rng'

export type ScenarioId = 'good' | 'brief' | 'everyday' | 'sustained' | 'recovery' | 'boundary'

export interface ScenarioContext {
  thresholdDeg: number
}

export interface ScenarioDefinition {
  id: ScenarioId
  name: string
  description: string
  durationMs: number
  /** Simulated time at which the runner takes the calibration (always during a neutral lead-in). */
  calibrateAtMs: number
  /** Noise-free angles relative to neutral at `t` ms after the scenario starts. */
  profile(t: number, ctx: ScenarioContext): Angles
  /** Standard deviation of the per-axis sensor-like noise, in degrees. */
  noiseSd: number
  /** Observational scenarios are excluded from the labelled confusion matrix. */
  observational: boolean
}

/** The simulated wearer's natural upright posture (degrees). */
export const NEUTRAL_POSTURE: Angles = { pitch: 4, roll: -1 }
export const SAMPLE_INTERVAL_MS = 100
export const DEFAULT_NOISE_SD = 0.6

/** Piecewise-linear curve through [time ms, value] points. */
export function keyframes(points: ReadonlyArray<readonly [number, number]>): (t: number) => number {
  return (t) => {
    const first = points[0]!
    if (t <= first[0]) return first[1]
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i]!
      const [t0, v0] = points[i - 1]!
      if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0)
    }
    return points[points.length - 1]![1]
  }
}

const sway = (t: number, amplitude: number, periodMs: number) => amplitude * Math.sin((2 * Math.PI * t) / periodMs)
const idle = (t: number): Angles => ({ pitch: sway(t, 2, 7000), roll: sway(t, 1.2, 11_000) })
const plus = (a: Angles, b: Angles): Angles => ({ pitch: a.pitch + b.pitch, roll: a.roll + b.roll })

const briefPitch = keyframes([
  [0, 0],
  [5000, 0],
  [5500, 25],
  [9000, 25],
  [9500, 0],
])

const everydayPitch = keyframes([
  [0, 0],
  [8000, 0], [8500, 28], [11_000, 28], [11_500, 0], // reach forward for a cup
  [20_000, 0], [20_500, 6], [24_000, 6], [24_500, 0], // turn to talk
  [33_000, 0], [33_500, -20], [36_000, -20], [36_500, 0], // stretch back
  [45_000, 0], [45_600, 30], [49_000, 30], [49_600, 0], // pick something up
])
const everydayRoll = keyframes([
  [0, 0],
  [20_000, 0], [20_500, 20], [24_000, 20], [24_500, 0],
  [45_000, 0], [45_600, 8], [49_000, 8], [49_600, 0],
])

const sustainedPitch = keyframes([
  [0, 0],
  [5000, 0],
  [7000, 24],
])

const recoveryPitch = keyframes([
  [0, 0],
  [5000, 0],
  [6000, 24],
  [20_000, 24],
  [21_500, 0],
])

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'good',
    name: 'Good posture',
    description: 'Upright sitting with natural sway. No alert expected.',
    durationMs: 30_000,
    calibrateAtMs: 2000,
    profile: (t) => idle(t),
    noiseSd: DEFAULT_NOISE_SD,
    observational: false,
  },
  {
    id: 'brief',
    name: 'Brief deviation',
    description: 'Leans forward past the threshold for about 4 s, then returns. No alert expected.',
    durationMs: 19_500,
    calibrateAtMs: 2000,
    profile: (t) => plus(idle(t), { pitch: briefPitch(t), roll: 0 }),
    noiseSd: DEFAULT_NOISE_SD,
    observational: false,
  },
  {
    id: 'everyday',
    name: 'Everyday movements',
    description: 'Reaching, turning to talk, stretching and picking something up, each under 5 s. No alert expected.',
    durationMs: 60_000,
    calibrateAtMs: 2000,
    profile: (t) => plus(idle(t), { pitch: everydayPitch(t), roll: everydayRoll(t) }),
    noiseSd: DEFAULT_NOISE_SD,
    observational: false,
  },
  {
    id: 'sustained',
    name: 'Sustained slouch',
    description: 'Slouches forward about 24° and stays there. Alert expected after the persistence time.',
    durationMs: 25_000,
    calibrateAtMs: 2000,
    profile: (t) => plus(idle(t), { pitch: sustainedPitch(t), roll: 0 }),
    noiseSd: DEFAULT_NOISE_SD,
    observational: false,
  },
  {
    id: 'recovery',
    name: 'Slouch and recovery',
    description: 'Slouches long enough to alert, then sits upright again. Alert, then back to good posture.',
    durationMs: 32_000,
    calibrateAtMs: 2000,
    profile: (t) => plus(idle(t), { pitch: recoveryPitch(t), roll: 0 }),
    noiseSd: DEFAULT_NOISE_SD,
    observational: false,
  },
  {
    id: 'boundary',
    name: 'Noisy boundary',
    description: 'Hovers right at the threshold with extra noise. Observational: shows how often the state flips.',
    durationMs: 26_000,
    calibrateAtMs: 2000,
    profile: (t, ctx) => ({ pitch: keyframes([[0, 0], [5000, 0], [6000, ctx.thresholdDeg]])(t), roll: 0 }),
    noiseSd: 1.5,
    observational: true,
  },
]

export function getScenario(id: ScenarioId): ScenarioDefinition {
  const scenario = SCENARIOS.find((s) => s.id === id)
  if (!scenario) throw new Error(`Unknown scenario: ${id}`)
  return scenario
}

export interface SimulatedSample {
  /** Milliseconds since the scenario started. */
  t: number
  reading: Reading
  /** Noise-free angles relative to neutral, used as ground truth in evaluation. */
  truth: Angles
}

export interface GenerateOptions {
  seed: number
  startTimestamp?: number
  noiseSd?: number
  thresholdDeg?: number
}

export function generateReadings(scenario: ScenarioDefinition, options: GenerateOptions): SimulatedSample[] {
  const { seed, startTimestamp = 0, noiseSd = scenario.noiseSd, thresholdDeg = 15 } = options
  const rng = createRng(seed)
  const samples: SimulatedSample[] = []
  for (let t = 0; t <= scenario.durationMs; t += SAMPLE_INTERVAL_MS) {
    const truth = scenario.profile(t, { thresholdDeg })
    samples.push({
      t,
      truth,
      reading: {
        pitch: NEUTRAL_POSTURE.pitch + truth.pitch + rng.gaussian() * noiseSd,
        roll: NEUTRAL_POSTURE.roll + truth.roll + rng.gaussian() * noiseSd,
        timestamp: startTimestamp + t,
      },
    })
  }
  return samples
}
