import { DEFAULT_SETTINGS } from '@/engine'
import type { HistoryEntry } from '@/app/history'
import { MAX_HISTORY, STORAGE_KEY, loadPersisted, savePersisted, type KeyValueStore } from './storage'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

const entry = (i: number): HistoryEntry => ({
  id: `e${i}`,
  at: 1_700_000_000_000 + i,
  kind: 'STATE',
  source: 'Manual',
  from: 'GOOD_POSTURE',
  to: 'TEMPORARY_DEVIATION',
  deviation: 16,
  persistenceSeconds: 0,
  detail: null,
})

describe('loadPersisted', () => {
  it('returns defaults with status "empty" when nothing is stored', () => {
    expect(loadPersisted(memoryStore())).toEqual({
      status: 'empty',
      data: { settings: DEFAULT_SETTINGS, baseline: null, history: [] },
    })
  })

  it('round-trips saved data', () => {
    const store = memoryStore()
    const data = { settings: { thresholdDeg: 20, persistenceSeconds: 5, smoothingWindow: 4 }, baseline: { pitch: 3, roll: -1 }, history: [entry(1)] }
    expect(savePersisted(data, store)).toBe(true)
    expect(loadPersisted(store)).toEqual({ status: 'ok', data })
  })

  it('falls back to defaults with status "corrupt" for invalid JSON', () => {
    const result = loadPersisted(memoryStore({ [STORAGE_KEY]: '{not json' }))
    expect(result.status).toBe('corrupt')
    expect(result.data.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults with status "corrupt" for the wrong shape', () => {
    expect(loadPersisted(memoryStore({ [STORAGE_KEY]: '[1,2,3]' })).status).toBe('corrupt')
  })

  it('clamps stored settings and drops an invalid baseline', () => {
    const raw = JSON.stringify({ settings: { thresholdDeg: 900 }, baseline: { pitch: 'x', roll: 2 }, history: [] })
    const { data } = loadPersisted(memoryStore({ [STORAGE_KEY]: raw }))
    expect(data.settings.thresholdDeg).toBe(45)
    expect(data.baseline).toBeNull()
  })

  it('drops malformed history entries and keeps at most the newest entries', () => {
    const history = [{ bogus: true }, ...Array.from({ length: MAX_HISTORY + 20 }, (_, i) => entry(i))]
    const raw = JSON.stringify({ settings: DEFAULT_SETTINGS, baseline: null, history })
    const { data } = loadPersisted(memoryStore({ [STORAGE_KEY]: raw }))
    expect(data.history).toHaveLength(MAX_HISTORY)
    expect(data.history[0]!.id).toBe('e20')
  })

  it('reports "unavailable" when storage throws', () => {
    expect(loadPersisted(throwingStore).status).toBe('unavailable')
    expect(savePersisted({ settings: DEFAULT_SETTINGS, baseline: null, history: [] }, throwingStore)).toBe(false)
  })

  it('reports "unavailable" when there is no storage at all', () => {
    expect(loadPersisted(null).status).toBe('unavailable')
  })
})
