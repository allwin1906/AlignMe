import { DEFAULT_SETTINGS, SETTINGS_BOUNDS, sanitizeSettings } from './settings'

describe('sanitizeSettings', () => {
  it('returns defaults when given nothing', () => {
    expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('uses the documented prototype defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({ thresholdDeg: 15, persistenceSeconds: 10, smoothingWindow: 3 })
  })

  it('keeps values that are inside the bounds', () => {
    expect(sanitizeSettings({ thresholdDeg: 20, persistenceSeconds: 5, smoothingWindow: 7 })).toEqual({
      thresholdDeg: 20,
      persistenceSeconds: 5,
      smoothingWindow: 7,
    })
  })

  it('clamps values below the minimum and above the maximum', () => {
    const low = sanitizeSettings({ thresholdDeg: 1, persistenceSeconds: 0, smoothingWindow: 0 })
    expect(low).toEqual({
      thresholdDeg: SETTINGS_BOUNDS.thresholdDeg.min,
      persistenceSeconds: SETTINGS_BOUNDS.persistenceSeconds.min,
      smoothingWindow: SETTINGS_BOUNDS.smoothingWindow.min,
    })
    const high = sanitizeSettings({ thresholdDeg: 90, persistenceSeconds: 999, smoothingWindow: 99 })
    expect(high).toEqual({
      thresholdDeg: SETTINGS_BOUNDS.thresholdDeg.max,
      persistenceSeconds: SETTINGS_BOUNDS.persistenceSeconds.max,
      smoothingWindow: SETTINGS_BOUNDS.smoothingWindow.max,
    })
  })

  it('rounds the smoothing window to a whole number of readings', () => {
    expect(sanitizeSettings({ smoothingWindow: 4.6 }).smoothingWindow).toBe(5)
  })

  it('falls back to defaults for non-finite or non-numeric values', () => {
    const result = sanitizeSettings({
      thresholdDeg: Number.NaN,
      persistenceSeconds: Number.POSITIVE_INFINITY,
      smoothingWindow: '3' as unknown as number,
    })
    expect(result).toEqual(DEFAULT_SETTINGS)
  })
})
