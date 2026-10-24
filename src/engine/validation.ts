import type { Reading, RejectionReason } from './types'

export type ValidationResult = { ok: true; reading: Reading } | { ok: false; reason: RejectionReason }

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/**
 * A reading is valid when pitch, roll and timestamp are finite numbers and the
 * timestamp is strictly later than the previous accepted reading.
 */
export function validateReading(input: unknown, lastTimestamp: number | null): ValidationResult {
  if (typeof input !== 'object' || input === null) return { ok: false, reason: 'INVALID_VALUE' }
  const { pitch, roll, timestamp } = input as Record<string, unknown>
  if (!isFiniteNumber(pitch) || !isFiniteNumber(roll) || !isFiniteNumber(timestamp)) {
    return { ok: false, reason: 'INVALID_VALUE' }
  }
  if (lastTimestamp !== null && timestamp <= lastTimestamp) {
    return { ok: false, reason: 'NON_MONOTONIC_TIMESTAMP' }
  }
  return { ok: true, reading: { pitch, roll, timestamp } }
}
