import type { Settings } from './types'

/** Prototype defaults. Not clinically derived. */
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  thresholdDeg: 15,
  persistenceSeconds: 10,
  smoothingWindow: 3,
})

export const SETTINGS_BOUNDS = {
  thresholdDeg: { min: 5, max: 45 },
  persistenceSeconds: { min: 2, max: 120 },
  smoothingWindow: { min: 1, max: 20 },
} as const satisfies Record<keyof Settings, { min: number; max: number }>

function clampOrDefault(value: unknown, key: keyof Settings): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_SETTINGS[key]
  const { min, max } = SETTINGS_BOUNDS[key]
  return Math.min(max, Math.max(min, value))
}

/** Clamp each setting into its safe range; missing or non-numeric values fall back to defaults. */
export function sanitizeSettings(input: Partial<Record<keyof Settings, unknown>>): Settings {
  return {
    thresholdDeg: clampOrDefault(input.thresholdDeg, 'thresholdDeg'),
    persistenceSeconds: clampOrDefault(input.persistenceSeconds, 'persistenceSeconds'),
    smoothingWindow: Math.round(clampOrDefault(input.smoothingWindow, 'smoothingWindow')),
  }
}
