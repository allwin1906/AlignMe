import { ArrowUpRight } from 'lucide-react'
import type { SessionStats } from '@/app/controller'
import { duration } from '@/lib/format'

/** Session split between upright and off-posture time, styled as the tilted paper card. */
export function UprightSlouchCard({ stats, onOpenHistory }: { stats: SessionStats; onOpenHistory?(): void }) {
  const off = stats.deviationMs + stats.alertMs
  const total = stats.goodMs + off
  const uprightShare = total === 0 ? 0.5 : stats.goodMs / total

  return (
    <section aria-labelledby="split-title" className="rounded-[30px] bg-paper p-6 text-ink shadow-2xl shadow-black/40 sm:-rotate-[1.5deg]">
      <div className="flex items-start justify-between">
        <h2 id="split-title" className="text-2xl font-medium">
          Upright &amp; slouch
        </h2>
        {onOpenHistory && (
          <button type="button" onClick={onOpenHistory} aria-label="Jump to event history" className="grid size-12 place-items-center rounded-full bg-ink/10 hover:bg-ink/15">
            <ArrowUpRight aria-hidden className="size-5" />
          </button>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-ink/60">Upright</dt>
          <dd className="text-4xl font-light tabular-nums">{duration(stats.goodMs)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink/60">Off posture</dt>
          <dd className="text-4xl font-light tabular-nums">{duration(off)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex h-3 gap-1" role="img" aria-label={`${Math.round(uprightShare * 100)} percent upright`}>
        <span className="rounded-full bg-[#8fd400]" style={{ flexGrow: total === 0 ? 1 : stats.goodMs }} />
        <span className="rounded-full bg-coral" style={{ flexGrow: total === 0 ? 1 : off }} />
      </div>
      <p className="mt-3 text-sm text-ink/60">
        {total === 0 ? 'No calibrated readings yet this session.' : `${stats.alerts} ${stats.alerts === 1 ? 'alert' : 'alerts'} this session, measured in simulated time.`}
      </p>
    </section>
  )
}
