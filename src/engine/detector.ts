/**
 * Module 2 — posture classification and persistence detection.
 * A deterministic state machine: a deviation at or above the threshold starts
 * an episode, and the episode becomes an alert once it has lasted the
 * configured persistence time. Timestamps are injected, never read from a clock.
 */
import type { PostureState, Settings } from './types'

export interface DetectorState {
  state: PostureState
  /** Timestamp at which the current deviation episode began, or null when none is active. */
  deviationSince: number | null
}

export interface DetectorInput {
  /** Deviation score in degrees; null when the system is not calibrated. */
  deviation: number | null
  timestamp: number
  /** True when the reading followed a long gap; any active episode is discarded. */
  discontinuity: boolean
}

export interface DetectorResult {
  state: PostureState
  persistenceSeconds: number
  deviationSince: number | null
}

export function createDetector(state: PostureState = 'NOT_CALIBRATED'): DetectorState {
  return { state, deviationSince: null }
}

export function evaluate(
  detector: DetectorState,
  input: DetectorInput,
  settings: Pick<Settings, 'thresholdDeg' | 'persistenceSeconds'>,
): { detector: DetectorState; result: DetectorResult } {
  const settle = (state: PostureState, deviationSince: number | null, persistenceSeconds: number) => ({
    detector: { state, deviationSince },
    result: { state, persistenceSeconds, deviationSince },
  })

  if (input.deviation === null) return settle('NOT_CALIBRATED', null, 0)
  if (input.deviation < settings.thresholdDeg) return settle('GOOD_POSTURE', null, 0)

  const since = input.discontinuity || detector.deviationSince === null ? input.timestamp : detector.deviationSince
  const persistenceSeconds = (input.timestamp - since) / 1000
  const state = persistenceSeconds >= settings.persistenceSeconds ? 'POOR_POSTURE_ALERT' : 'TEMPORARY_DEVIATION'
  return settle(state, since, persistenceSeconds)
}
