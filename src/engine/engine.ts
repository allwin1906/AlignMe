/**
 * The AlignMe engine: Module 1 processing followed by Module 2 detection.
 * Pure functions over a serialisable state object. The UI calls these through
 * a single hook and never re-implements the classification rules.
 */
import { createDetector, evaluate, type DetectorState } from './detector'
import {
  calibrate as calibrateProcessor,
  createProcessor,
  processReading,
  resetCalibration as resetProcessor,
  type ProcessedReading,
  type ProcessorState,
} from './processing'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings'
import type { Baseline, PostureState, RejectionReason, Settings } from './types'

export interface EngineState {
  settings: Settings
  processor: ProcessorState
  detector: DetectorState
  postureState: PostureState
  rejectedCount: number
}

export interface EngineOutput extends ProcessedReading {
  state: PostureState
  persistenceSeconds: number
  deviationSince: number | null
}

export type EngineEvent =
  | {
      type: 'STATE_CHANGED'
      from: PostureState
      to: PostureState
      timestamp: number
      deviation: number | null
      persistenceSeconds: number
    }
  | { type: 'READING_REJECTED'; reason: RejectionReason; timestamp: number | null }

export interface StepResult {
  engine: EngineState
  output: EngineOutput | null
  events: EngineEvent[]
}

export function createEngine(settings: Partial<Settings> = DEFAULT_SETTINGS, baseline: Baseline | null = null): EngineState {
  const postureState: PostureState = baseline ? 'GOOD_POSTURE' : 'NOT_CALIBRATED'
  return {
    settings: sanitizeSettings(settings),
    processor: createProcessor(baseline),
    detector: createDetector(postureState),
    postureState,
    rejectedCount: 0,
  }
}

export function step(engine: EngineState, reading: unknown): StepResult {
  const processed = processReading(engine.processor, reading, engine.settings.smoothingWindow)
  if (processed.rejected !== null) {
    const raw = reading as { timestamp?: unknown } | null
    const timestamp = typeof raw?.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp : null
    return {
      engine: { ...engine, rejectedCount: engine.rejectedCount + 1 },
      output: null,
      events: [{ type: 'READING_REJECTED', reason: processed.rejected, timestamp }],
    }
  }

  const { output: processedOutput } = processed
  const detection = evaluate(
    engine.detector,
    {
      deviation: processedOutput.deviation,
      timestamp: processedOutput.timestamp,
      discontinuity: processedOutput.discontinuity,
    },
    engine.settings,
  )
  const output: EngineOutput = { ...processedOutput, ...detection.result }
  const events: EngineEvent[] =
    detection.result.state === engine.postureState
      ? []
      : [
          {
            type: 'STATE_CHANGED',
            from: engine.postureState,
            to: detection.result.state,
            timestamp: output.timestamp,
            deviation: output.deviation,
            persistenceSeconds: output.persistenceSeconds,
          },
        ]

  return {
    engine: {
      ...engine,
      processor: processed.state,
      detector: detection.detector,
      postureState: detection.result.state,
    },
    output,
    events,
  }
}

/**
 * Take the current smoothed posture as the new baseline. Smoothing and any
 * active episode restart, so an alert is cleared. No-op until a reading arrives.
 */
export function calibrate(engine: EngineState): EngineState {
  const processor = calibrateProcessor(engine.processor)
  if (processor === engine.processor) return engine
  return { ...engine, processor, detector: createDetector('GOOD_POSTURE'), postureState: 'GOOD_POSTURE' }
}

export function resetCalibration(engine: EngineState): EngineState {
  return {
    ...engine,
    processor: resetProcessor(engine.processor),
    detector: createDetector('NOT_CALIBRATED'),
    postureState: 'NOT_CALIBRATED',
  }
}

/** Merge and validate new settings. They take effect from the next reading. */
export function updateSettings(engine: EngineState, patch: Partial<Settings>): EngineState {
  return { ...engine, settings: sanitizeSettings({ ...engine.settings, ...patch }) }
}
