/**
 * Shared evaluation suite. The same code runs in Vitest and in the dashboard's
 * Tests tab, so the numbers shown in the app are computed, never hard-coded.
 * Results describe software behaviour on designed, simulated scenarios only.
 */
import {
  DEFAULT_SETTINGS,
  calculateDeviation,
  calibrate,
  createEngine,
  resetCalibration,
  sanitizeSettings,
  step,
  updateSettings,
  type EngineState,
  type PostureState,
  type Settings,
} from '@/engine'
import { SAMPLE_INTERVAL_MS, SCENARIOS, generateReadings, type ScenarioDefinition, type ScenarioId } from '@/simulation/scenarios'

export interface ScenarioRunOptions {
  seed: number
  settings: Settings
  /** Calibrate at the scenario's calibration time. Defaults to true. */
  calibrate?: boolean
}

export interface ScenarioRun {
  scenarioId: ScenarioId
  seed: number
  /** Ground truth: the noise-free signal stays at or above the threshold for at least the persistence time. */
  expectedAlert: boolean
  alertEpisodes: number
  /** Episodes a per-reading (instant) classifier would alert on: every entry into a deviation. */
  instantAlertEpisodes: number
  /** Number of state changes after calibration. */
  stateFlips: number
  detectionDelaySeconds: number | null
  finalState: PostureState
}

export function runScenario(scenario: ScenarioDefinition, options: ScenarioRunOptions): ScenarioRun {
  const { seed, settings, calibrate: shouldCalibrate = true } = options
  const samples = generateReadings(scenario, { seed, thresholdDeg: settings.thresholdDeg })
  let engine: EngineState = createEngine(settings)
  let calibrated = false
  let alertEpisodes = 0
  let instantAlertEpisodes = 0
  let stateFlips = 0
  let firstAlertT: number | null = null

  // Ground truth: start of the first run of samples at or above the threshold lasting the persistence time.
  let runStart: number | null = null
  let truthStart: number | null = null
  for (const { t, truth } of samples) {
    if (calculateDeviation(truth, { pitch: 0, roll: 0 }) >= settings.thresholdDeg) {
      runStart ??= t
      if (truthStart === null && t - runStart >= settings.persistenceSeconds * 1000) truthStart = runStart
    } else {
      runStart = null
    }
  }

  for (const { t, reading } of samples) {
    const result = step(engine, reading)
    engine = result.engine
    if (calibrated) {
      for (const event of result.events) {
        if (event.type !== 'STATE_CHANGED') continue
        stateFlips++
        if (event.to === 'POOR_POSTURE_ALERT') {
          alertEpisodes++
          firstAlertT ??= t
        }
        if (event.from === 'GOOD_POSTURE' && event.to !== 'GOOD_POSTURE') instantAlertEpisodes++
      }
    }
    if (shouldCalibrate && !calibrated && t >= scenario.calibrateAtMs) {
      engine = calibrate(engine)
      calibrated = true
    }
  }

  return {
    scenarioId: scenario.id,
    seed,
    expectedAlert: truthStart !== null,
    alertEpisodes,
    instantAlertEpisodes,
    stateFlips,
    detectionDelaySeconds: truthStart !== null && firstAlertT !== null ? (firstAlertT - truthStart) / 1000 : null,
    finalState: engine.postureState,
  }
}

export interface Confusion {
  tp: number
  fp: number
  fn: number
  tn: number
}

export interface Metrics {
  accuracy: number | null
  precision: number | null
  recall: number | null
  f1: number | null
}

const ratio = (num: number, den: number) => (den === 0 ? null : num / den)

export function computeMetrics({ tp, fp, fn, tn }: Confusion): Metrics {
  const precision = ratio(tp, tp + fp)
  const recall = ratio(tp, tp + fn)
  const f1 = precision === null || recall === null || precision + recall === 0 ? null : (2 * precision * recall) / (precision + recall)
  return { accuracy: ratio(tp + tn, tp + fp + fn + tn), precision, recall, f1 }
}

export interface ScenarioSummary {
  scenarioId: ScenarioId
  name: string
  runs: number
  expectedAlert: boolean
  runsWithAlert: number
  instantAlertEpisodes: number
  meanStateFlips: number
}

export interface EvaluationReport {
  settings: Settings
  seedsPerScenario: number
  totalRuns: number
  confusion: Confusion
  metrics: Metrics
  falseAlerts: number
  missedAlerts: number
  detectionDelay: { count: number; meanSeconds: number | null; minSeconds: number | null; maxSeconds: number | null }
  /** Same no-alert runs scored two ways: AlignMe's persistence rule vs alerting on every crossing. */
  comparison: { noAlertRuns: number; persistentFalseAlertEpisodes: number; instantFalseAlertEpisodes: number }
  scenarios: ScenarioSummary[]
  boundary: { runs: number; meanStateFlips: number }
}

export function runEvaluation(options: { seedsPerScenario?: number; settings?: Partial<Settings> } = {}): EvaluationReport {
  const seedsPerScenario = options.seedsPerScenario ?? 20
  const settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...options.settings })
  const confusion: Confusion = { tp: 0, fp: 0, fn: 0, tn: 0 }
  const delays: number[] = []
  const comparison = { noAlertRuns: 0, persistentFalseAlertEpisodes: 0, instantFalseAlertEpisodes: 0 }
  const scenarios: ScenarioSummary[] = []
  let boundary = { runs: 0, meanStateFlips: 0 }

  for (const scenario of SCENARIOS) {
    const runs = Array.from({ length: seedsPerScenario }, (_, i) => runScenario(scenario, { seed: i + 1, settings }))
    const meanStateFlips = runs.reduce((sum, r) => sum + r.stateFlips, 0) / runs.length
    if (scenario.observational) {
      boundary = { runs: runs.length, meanStateFlips }
      continue
    }
    for (const run of runs) {
      const alerted = run.alertEpisodes > 0
      if (run.expectedAlert && alerted) confusion.tp++
      else if (run.expectedAlert) confusion.fn++
      else if (alerted) confusion.fp++
      else confusion.tn++
      if (run.detectionDelaySeconds !== null) delays.push(run.detectionDelaySeconds)
      if (!run.expectedAlert) {
        comparison.noAlertRuns++
        comparison.persistentFalseAlertEpisodes += run.alertEpisodes
        comparison.instantFalseAlertEpisodes += run.instantAlertEpisodes
      }
    }
    scenarios.push({
      scenarioId: scenario.id,
      name: scenario.name,
      runs: runs.length,
      expectedAlert: runs.some((r) => r.expectedAlert),
      runsWithAlert: runs.filter((r) => r.alertEpisodes > 0).length,
      instantAlertEpisodes: runs.reduce((sum, r) => sum + r.instantAlertEpisodes, 0),
      meanStateFlips,
    })
  }

  return {
    settings,
    seedsPerScenario,
    totalRuns: confusion.tp + confusion.fp + confusion.fn + confusion.tn,
    confusion,
    metrics: computeMetrics(confusion),
    falseAlerts: confusion.fp,
    missedAlerts: confusion.fn,
    detectionDelay: {
      count: delays.length,
      meanSeconds: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
      minSeconds: delays.length ? Math.min(...delays) : null,
      maxSeconds: delays.length ? Math.max(...delays) : null,
    },
    comparison,
    scenarios,
    boundary,
  }
}

export interface SelfCheck {
  id: string
  module: 'Module 1' | 'Module 2' | 'Scenarios'
  name: string
  passed: boolean
  detail: string
}

const near = (a: number | null | undefined, b: number, eps = 1e-6) => a !== null && a !== undefined && Math.abs(a - b) < eps

/** Feed (pitch, roll) pairs at 10 Hz starting from `from` ms. */
function feed(engine: EngineState, pairs: Array<[number, number]>, from: number) {
  let current = engine
  let last = null as ReturnType<typeof step>['output']
  pairs.forEach(([pitch, roll], i) => {
    const result = step(current, { pitch, roll, timestamp: from + i * SAMPLE_INTERVAL_MS })
    current = result.engine
    last = result.output ?? last
  })
  return { engine: current, output: last }
}

const repeat = (pair: [number, number], seconds: number) =>
  Array.from({ length: Math.round((seconds * 1000) / SAMPLE_INTERVAL_MS) + 1 }, () => pair)

/** Deterministic checks of the acceptance criteria, shown in the Tests tab. */
export function runSelfChecks(): SelfCheck[] {
  const checks: SelfCheck[] = []
  const add = (module: SelfCheck['module'], id: string, name: string, run: () => [boolean, string]) => {
    try {
      const [passed, detail] = run()
      checks.push({ id, module, name, passed, detail })
    } catch (error) {
      checks.push({ id, module, name, passed: false, detail: String(error) })
    }
  }
  const base = { ...DEFAULT_SETTINGS, smoothingWindow: 1 }
  const calibratedAt = (pitch: number, roll: number) => calibrate(feed(createEngine(base), [[pitch, roll]], 0).engine)

  add('Module 1', 'calibration', 'Calibration stores the current reading as baseline', () => {
    const engine = calibratedAt(8, -3)
    return [near(engine.processor.baseline?.pitch, 8) && near(engine.processor.baseline?.roll, -3), 'baseline = (8°, −3°)']
  })
  add('Module 1', 'zero-deviation', 'A reading equal to the baseline gives zero deviation', () => {
    const { output } = feed(calibratedAt(8, -3), [[8, -3]], 100)
    return [near(output?.deviation, 0), `deviation = ${output?.deviation?.toFixed(3)}°`]
  })
  add('Module 1', 'pitch-only', 'Pitch-only change gives the pitch difference', () => {
    const { output } = feed(calibratedAt(0, 0), [[12, 0]], 100)
    return [near(output?.deviation, 12), `deviation = ${output?.deviation?.toFixed(2)}°`]
  })
  add('Module 1', 'roll-only', 'Roll-only change gives the roll difference', () => {
    const { output } = feed(calibratedAt(0, 0), [[0, -9]], 100)
    return [near(output?.deviation, 9), `deviation = ${output?.deviation?.toFixed(2)}°`]
  })
  add('Module 1', 'smoothing', 'Rolling mean averages the last N readings', () => {
    const { output } = feed(createEngine({ ...base, smoothingWindow: 3 }), [[100, 0], [3, 0], [6, 0], [9, 0]], 0)
    return [near(output?.smoothed.pitch, 6), `mean of last 3 pitches = ${output?.smoothed.pitch.toFixed(2)}°`]
  })
  add('Module 1', 'reset', 'Reset calibration returns to NOT_CALIBRATED', () => {
    const engine = resetCalibration(calibratedAt(1, 1))
    return [engine.postureState === 'NOT_CALIBRATED' && engine.processor.baseline === null, engine.postureState]
  })
  add('Module 1', 'invalid-input', 'Invalid input is rejected without changing state', () => {
    const engine = calibratedAt(0, 0)
    const result = step(engine, { pitch: Number.NaN, roll: 0, timestamp: 100 })
    return [result.output === null && result.engine.postureState === 'GOOD_POSTURE', 'NaN pitch rejected']
  })
  add('Module 1', 'settings-bounds', 'Settings are clamped to safe bounds', () => {
    const s = updateSettings(createEngine(), { thresholdDeg: 500, persistenceSeconds: 0 }).settings
    return [s.thresholdDeg === 45 && s.persistenceSeconds === 2, `threshold ${s.thresholdDeg}°, persistence ${s.persistenceSeconds} s`]
  })
  add('Module 2', 'not-calibrated', 'No classification before calibration', () => {
    const { output } = feed(createEngine(base), repeat([40, 0], 12), 0)
    return [output?.state === 'NOT_CALIBRATED', output?.state ?? 'none']
  })
  add('Module 2', 'good', 'A neutral reading returns GOOD_POSTURE', () => {
    const { output } = feed(calibratedAt(0, 0), [[2, 1]], 100)
    return [output?.state === 'GOOD_POSTURE', output?.state ?? 'none']
  })
  add('Module 2', 'temporary', 'First above-threshold reading returns TEMPORARY_DEVIATION', () => {
    const { output } = feed(calibratedAt(0, 0), [[20, 0]], 100)
    return [output?.state === 'TEMPORARY_DEVIATION', output?.state ?? 'none']
  })
  add('Module 2', 'short-no-alert', 'A deviation shorter than the persistence time does not alert', () => {
    const { output } = feed(calibratedAt(0, 0), repeat([20, 0], 9.9), 100)
    return [output?.state === 'TEMPORARY_DEVIATION', `${output?.persistenceSeconds.toFixed(1)} s → ${output?.state}`]
  })
  add('Module 2', 'sustained-alert', 'A sustained deviation triggers POOR_POSTURE_ALERT', () => {
    const { output } = feed(calibratedAt(0, 0), repeat([20, 0], 10), 100)
    return [output?.state === 'POOR_POSTURE_ALERT', `${output?.persistenceSeconds.toFixed(1)} s → ${output?.state}`]
  })
  add('Module 2', 'recovery', 'Recovery resets the timer and returns to GOOD_POSTURE', () => {
    const slouched = feed(calibratedAt(0, 0), repeat([20, 0], 11), 100)
    const { output } = feed(slouched.engine, [[1, 0]], 11_300)
    return [output?.state === 'GOOD_POSTURE' && output.deviationSince === null, `${output?.state}, timer cleared`]
  })
  add('Module 2', 'new-episode', 'A new deviation starts a fresh timer', () => {
    const first = feed(calibratedAt(0, 0), [...repeat([20, 0], 8), [1, 0]], 100)
    const { output } = feed(first.engine, repeat([20, 0], 3), 9200)
    return [near(output?.persistenceSeconds, 3) && output?.state === 'TEMPORARY_DEVIATION', `${output?.persistenceSeconds.toFixed(1)} s`]
  })
  add('Module 2', 'recalibrate-alert', 'Calibrating during an alert clears it', () => {
    const engine = calibrate(feed(calibratedAt(0, 0), repeat([20, 0], 11), 100).engine)
    return [engine.postureState === 'GOOD_POSTURE', engine.postureState]
  })

  const report = runEvaluation({ seedsPerScenario: 5 })
  for (const summary of report.scenarios) {
    add('Scenarios', `scenario-${summary.scenarioId}`, `${summary.name}: ${summary.expectedAlert ? 'alert' : 'no alert'} in every run`, () => [
      summary.expectedAlert ? summary.runsWithAlert === summary.runs : summary.runsWithAlert === 0,
      `${summary.runsWithAlert}/${summary.runs} runs alerted`,
    ])
  }
  return checks
}
