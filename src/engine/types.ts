/** One posture sample. Angles in degrees, timestamp in milliseconds. */
export interface Reading {
  pitch: number
  roll: number
  timestamp: number
}

export interface Angles {
  pitch: number
  roll: number
}

export type Baseline = Angles

export interface Settings {
  /** Deviation score (degrees) at or above which posture counts as deviating. */
  thresholdDeg: number
  /** How long a deviation must last before it becomes an alert. */
  persistenceSeconds: number
  /** Number of recent readings averaged by the rolling-mean filter. */
  smoothingWindow: number
}

export type PostureState = 'NOT_CALIBRATED' | 'GOOD_POSTURE' | 'TEMPORARY_DEVIATION' | 'POOR_POSTURE_ALERT'

export type RejectionReason = 'INVALID_VALUE' | 'NON_MONOTONIC_TIMESTAMP'
