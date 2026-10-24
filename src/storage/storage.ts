/**
 * Local persistence: settings, calibration baseline and a bounded event
 * history in browser localStorage. Every read is validated; corrupt or
 * unavailable storage falls back to defaults instead of breaking the app.
 * Data is local to this browser and device and is never synchronised.
 */
import { DEFAULT_SETTINGS, sanitizeSettings, type Baseline, type Settings } from '@/engine'
import { isHistoryEntry, type HistoryEntry } from '@/app/history'

export const STORAGE_KEY = 'alignme:v1'
export const MAX_HISTORY = 100

export interface PersistedData {
  settings: Settings
  baseline: Baseline | null
  history: HistoryEntry[]
}

export type StorageStatus = 'ok' | 'empty' | 'corrupt' | 'unavailable'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const defaults = (): PersistedData => ({ settings: { ...DEFAULT_SETTINGS }, baseline: null, history: [] })

/** localStorage, or null when the browser blocks access to it. */
export function browserStore(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function parseBaseline(value: unknown): Baseline | null {
  if (typeof value !== 'object' || value === null) return null
  const { pitch, roll } = value as Record<string, unknown>
  return typeof pitch === 'number' && Number.isFinite(pitch) && typeof roll === 'number' && Number.isFinite(roll)
    ? { pitch, roll }
    : null
}

export function loadPersisted(store: KeyValueStore | null = browserStore()): { status: StorageStatus; data: PersistedData } {
  if (!store) return { status: 'unavailable', data: defaults() }
  let raw: string | null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return { status: 'unavailable', data: defaults() }
  }
  if (raw === null) return { status: 'empty', data: defaults() }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { status: 'corrupt', data: defaults() }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { status: 'corrupt', data: defaults() }

  const record = parsed as Record<string, unknown>
  const settings = typeof record.settings === 'object' && record.settings !== null ? (record.settings as Partial<Settings>) : {}
  const history = Array.isArray(record.history) ? record.history.filter(isHistoryEntry).slice(-MAX_HISTORY) : []
  return {
    status: 'ok',
    data: { settings: sanitizeSettings(settings), baseline: parseBaseline(record.baseline), history },
  }
}

export function savePersisted(data: PersistedData, store: KeyValueStore | null = browserStore()): boolean {
  if (!store) return false
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...data, history: data.history.slice(-MAX_HISTORY) }))
    return true
  } catch {
    return false
  }
}
