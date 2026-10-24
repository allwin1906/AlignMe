import type { EngineOutput } from '@/engine'
import { deg } from '@/lib/format'

/** Raw and smoothed simulated angles next to the stored baseline. */
export function ReadingsCard({ output }: { output: EngineOutput | null }) {
  const rows = [
    { label: 'Pitch', raw: output?.raw.pitch, smoothed: output?.smoothed.pitch, base: output?.baseline?.pitch },
    { label: 'Roll', raw: output?.raw.roll, smoothed: output?.smoothed.roll, base: output?.baseline?.roll },
  ]
  return (
    <section aria-labelledby="readings-title" className="rounded-[32px] bg-graphite p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="readings-title" className="text-lg font-medium">
          Simulated readings
        </h2>
        <span className="text-xs text-mist">10 Hz · not from hardware</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-3xl bg-ink-2 p-4">
            <p className="text-sm text-mist">{row.label}</p>
            <p className="mt-1 text-4xl font-light tabular-nums">{deg(row.smoothed)}</p>
            <dl className="mt-3 space-y-1 text-xs text-mist">
              <div className="flex justify-between">
                <dt>Raw</dt>
                <dd className="tabular-nums text-paper">{deg(row.raw)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Baseline</dt>
                <dd className="tabular-nums text-paper">{deg(row.base)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-mist">
        Large figures are smoothed (rolling mean). Deviation is the straight-line distance from the baseline in pitch and roll: a software score, not a clinical spine angle.
      </p>
    </section>
  )
}
