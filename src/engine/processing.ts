/**
 * Module 1 — posture data processing.
 * Validates readings, smooths them with a rolling mean, stores the reference
 * baseline and computes the deviation score.
 */
import type { Angles, Baseline, RejectionReason } from './types'
import { validateReading } from './validation'

/** A gap longer than this (e.g. a suspended tab) restarts smoothing and any active episode. */
export const MAX_GAP_MS = 2000

export interface ProcessorState {
  buffer: Angles[]
  baseline: Baseline | null
  lastTimestamp: number | null
}

export interface ProcessedReading {
  raw: Angles
  smoothed: Angles
  baseline: Baseline | null
  /** Software deviation score in degrees; null when not calibrated. Not a clinical spinal angle. */
  deviation: number | null
  calibrated: boolean
  timestamp: number
  /** True when this reading followed a gap longer than MAX_GAP_MS. */
  discontinuity: boolean
}

export type ProcessResult =
  | { state: ProcessorState; output: ProcessedReading; rejected: null }
  | { state: ProcessorState; output: null; rejected: RejectionReason }

export function createProcessor(baseline: Baseline | null = null): ProcessorState {
  return { buffer: [], baseline, lastTimestamp: null }
}

/** Euclidean distance between current pitch/roll and the baseline, in degrees. */
export function calculateDeviation(current: Angles, baseline: Baseline): number {
  return Math.hypot(current.pitch - baseline.pitch, current.roll - baseline.roll)
}

/** Rolling arithmetic mean of the buffered angles, or null when the buffer is empty. */
export function smoothedAngles(buffer: readonly Angles[]): Angles | null {
  if (buffer.length === 0) return null
  let pitch = 0
  let roll = 0
  for (const sample of buffer) {
    pitch += sample.pitch
    roll += sample.roll
  }
  return { pitch: pitch / buffer.length, roll: roll / buffer.length }
}

export function processReading(state: ProcessorState, input: unknown, smoothingWindow: number): ProcessResult {
  const validation = validateReading(input, state.lastTimestamp)
  if (!validation.ok) return { state, output: null, rejected: validation.reason }

  const { reading } = validation
  const discontinuity = state.lastTimestamp !== null && reading.timestamp - state.lastTimestamp > MAX_GAP_MS
  const previous = discontinuity ? [] : state.buffer
  const raw: Angles = { pitch: reading.pitch, roll: reading.roll }
  const buffer = [...previous, raw].slice(-Math.max(1, smoothingWindow))
  const smoothed = smoothedAngles(buffer)!

  const nextState: ProcessorState = { buffer, baseline: state.baseline, lastTimestamp: reading.timestamp }
  return {
    state: nextState,
    rejected: null,
    output: {
      raw,
      smoothed,
      baseline: state.baseline,
      deviation: state.baseline ? calculateDeviation(smoothed, state.baseline) : null,
      calibrated: state.baseline !== null,
      timestamp: reading.timestamp,
      discontinuity,
    },
  }
}

/** Store the current smoothed posture as the baseline and restart smoothing. No-op without readings. */
export function calibrate(state: ProcessorState): ProcessorState {
  const current = smoothedAngles(state.buffer)
  if (!current) return state
  return { ...state, baseline: current, buffer: [] }
}

export function resetCalibration(state: ProcessorState): ProcessorState {
  return { ...state, baseline: null, buffer: [] }
}
