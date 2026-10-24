import { CircleCheck, CircleX, RotateCcw } from 'lucide-react'
import { useCallback, useState } from 'react'
import { runEvaluation, runSelfChecks, type EvaluationReport, type SelfCheck } from '@/evaluation/evaluation'
import { pct } from '@/lib/format'
import { cn } from '@/lib/cn'

interface Results {
  checks: SelfCheck[]
  report: EvaluationReport
  ranAt: number
}

const run = (): Results => ({ checks: runSelfChecks(), report: runEvaluation({ seedsPerScenario: 20 }), ranAt: Date.now() })

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-ink-2 p-4">
      <dt className="text-sm text-mist">{label}</dt>
      <dd className="mt-1 text-3xl font-light tabular-nums">{value}</dd>
    </div>
  )
}

/** Runs the shared evaluation suite in the browser. Every number is computed live. */
export function TestsView() {
  const [results, setResults] = useState<Results>(run)
  const rerun = useCallback(() => setResults(run()), [])
  const { checks, report } = results
  const passed = checks.filter((c) => c.passed).length
  const allPassed = passed === checks.length
  const { tp, fp, fn, tn } = report.confusion
  const c = report.comparison
  const maxEpisodes = Math.max(1, c.instantFalseAlertEpisodes, c.persistentFalseAlertEpisodes)
  const groups = ['Module 1', 'Module 2', 'Scenarios'] as const

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 lg:items-start">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <section className={cn('rounded-[32px] p-6 text-ink', allPassed ? 'bg-lime' : 'bg-coral')} aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-medium">Software checks</p>
              <p className="mt-2 text-6xl font-light tabular-nums">
                {passed}/{checks.length}
              </p>
              <p className="mt-1 text-sm">{allPassed ? 'All deterministic checks passed.' : `${checks.length - passed} check(s) failed.`}</p>
            </div>
            <button type="button" onClick={rerun} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-black/12 px-4 py-2.5 text-sm font-medium hover:bg-black/20">
              <RotateCcw aria-hidden className="size-4" />
              Run again
            </button>
          </div>
        </section>

        <section aria-labelledby="checks-title" className="rounded-[32px] bg-graphite p-5">
          <h2 id="checks-title" className="text-2xl font-medium">
            Acceptance checks
          </h2>
          {groups.map((group) => (
            <div key={group} className="mt-4">
              <h3 className="text-sm text-mist">{group}</h3>
              <ul className="mt-1 divide-y divide-graphite-2">
                {checks
                  .filter((check) => check.module === group)
                  .map((check) => (
                    <li key={check.id} className="flex items-start gap-3 py-2.5">
                      {check.passed ? (
                        <CircleCheck aria-label="Passed" className="mt-0.5 size-5 shrink-0 text-lime" />
                      ) : (
                        <CircleX aria-label="Failed" className="mt-0.5 size-5 shrink-0 text-coral" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[15px] leading-snug">{check.name}</p>
                        <p className="text-xs text-mist">{check.detail}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <section aria-labelledby="metrics-title" className="rounded-[32px] bg-graphite p-5">
          <h2 id="metrics-title" className="text-2xl font-medium">
            Scenario evaluation
          </h2>
          <p className="mt-1 text-sm text-mist">
            {report.totalRuns} labelled simulated runs: {report.scenarios.length} scenarios × {report.seedsPerScenario} noise seeds, at threshold{' '}
            {report.settings.thresholdDeg}°, delay {report.settings.persistenceSeconds} s, smoothing {report.settings.smoothingWindow}. A run is labelled
            “alert expected” when its noise-free signal stays past the threshold for the full delay.
          </p>

          <table className="mt-4 w-full table-fixed border-separate border-spacing-1.5 text-center">
            <caption className="mb-1 text-left text-sm text-mist">Confusion matrix</caption>
            <thead>
              <tr className="text-xs text-mist">
                <th scope="col" />
                <th scope="col" className="font-normal">
                  Alert raised
                </th>
                <th scope="col" className="font-normal">
                  No alert
                </th>
              </tr>
            </thead>
            <tbody className="text-3xl font-light tabular-nums">
              <tr>
                <th scope="row" className="text-left text-xs font-normal text-mist">
                  Alert expected
                </th>
                <td className="rounded-2xl bg-lime/15 py-3">{tp}</td>
                <td className="rounded-2xl bg-ink-2 py-3">{fn}</td>
              </tr>
              <tr>
                <th scope="row" className="text-left text-xs font-normal text-mist">
                  No alert expected
                </th>
                <td className="rounded-2xl bg-ink-2 py-3">{fp}</td>
                <td className="rounded-2xl bg-lime/15 py-3">{tn}</td>
              </tr>
            </tbody>
          </table>

          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Metric label="Accuracy" value={pct(report.metrics.accuracy)} />
            <Metric label="Precision" value={pct(report.metrics.precision)} />
            <Metric label="Recall" value={pct(report.metrics.recall)} />
            <Metric label="F1 score" value={pct(report.metrics.f1)} />
            <Metric label="False alerts" value={String(report.falseAlerts)} />
            <Metric label="Missed alerts" value={String(report.missedAlerts)} />
          </dl>
          <p className="mt-3 text-sm text-mist">
            Detection delay from the start of a sustained slouch to the alert:{' '}
            <span className="text-paper tabular-nums">
              {report.detectionDelay.meanSeconds?.toFixed(2) ?? 'n/a'} s average ({report.detectionDelay.minSeconds?.toFixed(1)}–
              {report.detectionDelay.maxSeconds?.toFixed(1)} s)
            </span>
            . It includes the {report.settings.persistenceSeconds} s delay by design.
          </p>
        </section>

        <section aria-labelledby="compare-title" className="rounded-[32px] bg-paper p-6 text-ink">
          <h2 id="compare-title" className="text-2xl font-medium">
            Why the alert delay matters
          </h2>
          <p className="mt-1 text-sm text-ink/65">
            False alerts across the {c.noAlertRuns} runs where no alert was expected (good posture, brief lean, everyday movements).
          </p>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Alert on every crossing (per-reading)', value: c.instantFalseAlertEpisodes, color: 'bg-coral' },
              { label: `AlignMe with a ${report.settings.persistenceSeconds} s delay`, value: c.persistentFalseAlertEpisodes, color: 'bg-[#8fd400]' },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-2xl font-light tabular-nums">{row.value}</span>
                </div>
                <div className="mt-1 h-3 rounded-full bg-ink/8">
                  <div className={cn('h-full rounded-full', row.color)} style={{ width: `${Math.max(2, (row.value / maxEpisodes) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink/60">
            Noisy boundary (observational, {report.boundary.runs} runs): the state flipped {report.boundary.meanStateFlips.toFixed(1)} times per run on
            average while hovering at the threshold. Hysteresis is listed as future work.
          </p>
        </section>

        <p className="px-2 text-xs text-mist">
          These results describe the software on designed, simulated scenarios. They do not measure real-world sensor accuracy or clinical effectiveness.
        </p>
      </div>
    </div>
  )
}
