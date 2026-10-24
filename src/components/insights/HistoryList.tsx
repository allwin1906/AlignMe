import { Trash2 } from 'lucide-react'
import type { HistoryEntry } from '@/app/history'
import { POSTURE_META } from '@/lib/posture'
import { clockTime } from '@/lib/format'

function describe(entry: HistoryEntry): { title: string; dot: string } {
  switch (entry.kind) {
    case 'STATE': {
      const to = entry.to ?? 'NOT_CALIBRATED'
      return { title: POSTURE_META[to].label, dot: POSTURE_META[to].accent }
    }
    case 'CALIBRATED':
      return { title: 'Calibrated', dot: 'var(--color-sun)' }
    case 'CALIBRATION_RESET':
      return { title: 'Calibration reset', dot: 'var(--color-mist)' }
    case 'SETTINGS':
      return { title: 'Settings changed', dot: 'var(--color-mist)' }
    case 'SCENARIO_STARTED':
      return { title: 'Scenario started', dot: 'var(--color-paper)' }
    case 'SCENARIO_FINISHED':
      return { title: 'Scenario finished', dot: 'var(--color-paper)' }
  }
}

export function HistoryList({ history, onClear }: { history: HistoryEntry[]; onClear(): void }) {
  const rows = [...history].reverse()
  return (
    <section id="history" aria-labelledby="history-title" className="rounded-[32px] bg-graphite p-5">
      <div className="flex items-center justify-between">
        <h2 id="history-title" className="text-2xl font-medium">
          Event history
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={history.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-graphite-2 px-3.5 py-2 text-sm hover:bg-ink-2 disabled:opacity-40"
        >
          <Trash2 aria-hidden className="size-4" />
          Clear
        </button>
      </div>
      <p className="mt-1 text-xs text-mist">Newest first. Keeps the latest 100 events, stored only in this browser.</p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-3xl bg-ink-2 p-6 text-center text-sm text-mist">
          Nothing logged yet. Run a scenario from the Monitor tab and every state change will appear here.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-graphite-2">
          {rows.map((entry) => {
            const { title, dot } = describe(entry)
            return (
              <li key={entry.id} className="flex gap-3 py-3">
                <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: dot }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{title}</p>
                    <time className="shrink-0 text-xs tabular-nums text-mist" dateTime={new Date(entry.at).toISOString()}>
                      {clockTime(entry.at)}
                    </time>
                  </div>
                  <p className="text-sm text-mist">
                    {entry.source}
                    {entry.kind === 'STATE' && entry.deviation !== null && <> · deviation {entry.deviation.toFixed(1)}°</>}
                    {entry.kind === 'STATE' && entry.persistenceSeconds !== null && entry.persistenceSeconds > 0 && (
                      <> · held {entry.persistenceSeconds.toFixed(1)} s</>
                    )}
                  </p>
                  {entry.detail && <p className="text-xs text-mist">{entry.detail}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
