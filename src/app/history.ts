import type { PostureState } from '@/engine'

export type HistoryKind = 'STATE' | 'CALIBRATED' | 'CALIBRATION_RESET' | 'SETTINGS' | 'SCENARIO_STARTED' | 'SCENARIO_FINISHED'

/** One row in the event history. `at` is wall-clock time, for display only. */
export interface HistoryEntry {
  id: string
  at: number
  kind: HistoryKind
  /** "Manual" or the scenario name that was running. */
  source: string
  from: PostureState | null
  to: PostureState | null
  deviation: number | null
  persistenceSeconds: number | null
  detail: string | null
}

const KINDS: readonly HistoryKind[] = ['STATE', 'CALIBRATED', 'CALIBRATION_RESET', 'SETTINGS', 'SCENARIO_STARTED', 'SCENARIO_FINISHED']
const STATES: readonly PostureState[] = ['NOT_CALIBRATED', 'GOOD_POSTURE', 'TEMPORARY_DEVIATION', 'POOR_POSTURE_ALERT']

const isNullableNumber = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
const isNullableState = (v: unknown) => v === null || STATES.includes(v as PostureState)

export function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.at === 'number' &&
    Number.isFinite(e.at) &&
    KINDS.includes(e.kind as HistoryKind) &&
    typeof e.source === 'string' &&
    isNullableState(e.from) &&
    isNullableState(e.to) &&
    isNullableNumber(e.deviation) &&
    isNullableNumber(e.persistenceSeconds) &&
    (e.detail === null || typeof e.detail === 'string')
  )
}
