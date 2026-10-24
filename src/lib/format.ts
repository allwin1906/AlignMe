export const deg = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined ? '—' : `${value.toFixed(digits)}°`

export const signedDeg = (value: number, digits = 1) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}°`

export const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Simulated duration: "42s", "3m 05s". */
export function duration(ms: number): string {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export const pct = (value: number | null) => (value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`)
