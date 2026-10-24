import { DEFAULT_SETTINGS } from '@/engine'
import { getScenario } from '@/simulation/scenarios'
import { computeMetrics, runEvaluation, runScenario, runSelfChecks } from './evaluation'

describe('runScenario', () => {
  it('raises no alert for good posture', () => {
    const run = runScenario(getScenario('good'), { seed: 1, settings: DEFAULT_SETTINGS })
    expect(run.expectedAlert).toBe(false)
    expect(run.alertEpisodes).toBe(0)
  })

  it('raises no alert for a brief deviation, though an instant classifier would', () => {
    const run = runScenario(getScenario('brief'), { seed: 1, settings: DEFAULT_SETTINGS })
    expect(run.expectedAlert).toBe(false)
    expect(run.alertEpisodes).toBe(0)
    expect(run.instantAlertEpisodes).toBe(1)
  })

  it('counts each everyday movement as an instant alert but raises no persistent alert', () => {
    const run = runScenario(getScenario('everyday'), { seed: 1, settings: DEFAULT_SETTINGS })
    expect(run.alertEpisodes).toBe(0)
    expect(run.instantAlertEpisodes).toBeGreaterThanOrEqual(4)
  })

  it('alerts for a sustained slouch about one persistence period after it starts', () => {
    const run = runScenario(getScenario('sustained'), { seed: 1, settings: DEFAULT_SETTINGS })
    expect(run.expectedAlert).toBe(true)
    expect(run.alertEpisodes).toBe(1)
    expect(run.detectionDelaySeconds).toBeGreaterThanOrEqual(10)
    expect(run.detectionDelaySeconds).toBeLessThan(11)
  })

  it('returns to good posture after recovery', () => {
    const run = runScenario(getScenario('recovery'), { seed: 1, settings: DEFAULT_SETTINGS })
    expect(run.alertEpisodes).toBe(1)
    expect(run.finalState).toBe('GOOD_POSTURE')
  })

  it('records state flips in the noisy-boundary scenario', () => {
    const run = runScenario(getScenario('boundary'), { seed: 1, settings: DEFAULT_SETTINGS })
    expect(run.stateFlips).toBeGreaterThan(2)
  })

  it('stays not calibrated when calibration is skipped', () => {
    const run = runScenario(getScenario('sustained'), { seed: 1, settings: DEFAULT_SETTINGS, calibrate: false })
    expect(run.alertEpisodes).toBe(0)
    expect(run.finalState).toBe('NOT_CALIBRATED')
  })
})

describe('computeMetrics', () => {
  it('derives accuracy, precision, recall and F1 from the confusion matrix', () => {
    const m = computeMetrics({ tp: 8, fp: 2, fn: 2, tn: 8 })
    expect(m.accuracy).toBeCloseTo(0.8)
    expect(m.precision).toBeCloseTo(0.8)
    expect(m.recall).toBeCloseTo(0.8)
    expect(m.f1).toBeCloseTo(0.8)
  })

  it('reports undefined ratios as null instead of dividing by zero', () => {
    const m = computeMetrics({ tp: 0, fp: 0, fn: 0, tn: 5 })
    expect(m.precision).toBeNull()
    expect(m.recall).toBeNull()
    expect(m.f1).toBeNull()
    expect(m.accuracy).toBe(1)
  })
})

describe('runEvaluation', () => {
  const report = runEvaluation({ seedsPerScenario: 20 })

  it('runs every labelled scenario once per seed', () => {
    expect(report.totalRuns).toBe(100)
    expect(report.confusion.tp + report.confusion.fp + report.confusion.fn + report.confusion.tn).toBe(100)
  })

  it('detects every sustained deviation with no false alerts on the designed scenarios', () => {
    expect(report.confusion).toEqual({ tp: 40, fp: 0, fn: 0, tn: 60 })
    expect(report.falseAlerts).toBe(0)
    expect(report.missedAlerts).toBe(0)
  })

  it('shows the persistence timer removing the alerts an instant classifier raises', () => {
    expect(report.comparison.instantFalseAlertEpisodes).toBeGreaterThan(report.comparison.persistentFalseAlertEpisodes)
    expect(report.comparison.persistentFalseAlertEpisodes).toBe(0)
  })

  it('summarises detection delay', () => {
    expect(report.detectionDelay.count).toBe(40)
    expect(report.detectionDelay.meanSeconds).toBeGreaterThanOrEqual(10)
  })

  it('is reproducible', () => {
    expect(runEvaluation({ seedsPerScenario: 20 })).toEqual(report)
  })
})

describe('runSelfChecks', () => {
  it('passes every deterministic check', () => {
    const checks = runSelfChecks()
    expect(checks.length).toBeGreaterThanOrEqual(12)
    const failed = checks.filter((c) => !c.passed)
    expect(failed).toEqual([])
  })
})
