import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_WINDOW_MS, type ChartPoint } from '@/app/controller'
import type { PostureState, Settings } from '@/engine'
import { POSTURE_META } from '@/lib/posture'
import { cn } from '@/lib/cn'

interface Span {
  from: number
  to: number
  state: PostureState
}

/** Contiguous runs of deviation or alert, drawn as shaded bands behind the line. */
function spans(series: ChartPoint[]): Span[] {
  const result: Span[] = []
  for (const p of series) {
    if (p.state !== 'TEMPORARY_DEVIATION' && p.state !== 'POOR_POSTURE_ALERT') continue
    const last = result[result.length - 1]
    if (last && last.state === p.state && p.t - last.to <= 100) last.to = p.t
    else result.push({ from: p.t, to: p.t, state: p.state })
  }
  return result
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartPoint }>
}

function ChartTooltip({ active, payload }: TooltipProps) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const meta = POSTURE_META[point.state]
  return (
    <div className="rounded-2xl bg-paper px-3 py-2 text-ink shadow-lg">
      <p className="text-lg font-medium tabular-nums">{point.deviation === null ? '—' : `${point.deviation.toFixed(1)}°`}</p>
      <p className="text-xs">
        {meta.label} at {(point.t / 1000).toFixed(1)} s
      </p>
    </div>
  )
}

interface DeviationChartProps {
  series: ChartPoint[]
  settings: Settings
  simTime: number
  compact?: boolean
}

export function DeviationChart({ series, settings, simTime, compact = false }: DeviationChartProps) {
  const bands = useMemo(() => spans(series), [series])
  const hasDeviation = series.some((p) => p.deviation !== null)
  const yMax = Math.ceil(Math.max(settings.thresholdDeg + 10, ...series.map((p) => p.deviation ?? 0)) / 10) * 10
  const yTicks = Array.from({ length: yMax / 10 + 1 }, (_, i) => i * 10)
  const domain: [number, number] = [Math.max(0, simTime - CHART_WINDOW_MS), Math.max(simTime, CHART_WINDOW_MS / 6)]

  return (
    <section aria-labelledby="chart-title" className="rounded-[32px] bg-ink-2 p-5 ring-1 ring-graphite">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="chart-title" className={cn('font-medium', compact ? 'text-lg' : 'text-2xl')}>
          Deviation over time
        </h2>
        <span className="shrink-0 text-xs text-mist">Last 60 s</span>
      </div>

      <div className={cn('relative mt-3', compact ? 'h-44' : 'h-64')}>
        {!hasDeviation && (
          <p className="absolute inset-0 z-10 grid place-items-center px-6 text-center text-sm text-mist">
            {series.length === 0 ? 'Start the simulation to see your deviation trend.' : 'Calibrate to start measuring deviation.'}
          </p>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--color-graphite)" vertical={false} />
            {bands.map((b) => (
              <ReferenceArea
                key={`${b.state}-${b.from}`}
                x1={b.from}
                x2={b.to}
                y1={0}
                y2={yMax}
                fill={b.state === 'POOR_POSTURE_ALERT' ? 'var(--color-coral)' : 'var(--color-iris)'}
                fillOpacity={b.state === 'POOR_POSTURE_ALERT' ? 0.22 : 0.12}
                stroke="none"
                ifOverflow="hidden"
              />
            ))}
            <XAxis
              dataKey="t"
              type="number"
              domain={domain}
              allowDataOverflow
              tickFormatter={(t: number) => `${Math.round(t / 1000)}s`}
              tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={32}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(v: number) => `${v}°`}
              tick={{ fill: 'var(--color-mist)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <ReferenceLine
              y={settings.thresholdDeg}
              stroke="var(--color-paper)"
              strokeDasharray="4 4"
              strokeOpacity={0.7}
              label={{ value: `Threshold ${settings.thresholdDeg}°`, position: 'insideTopLeft', fill: 'var(--color-paper)', fontSize: 11, dx: 6 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--color-lime)', strokeWidth: 1 }} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="deviation"
              stroke="var(--color-lime)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--color-lime)', stroke: 'var(--color-ink-2)', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mist">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-iris/40" /> Leaning, timer running
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-coral/50" /> Poor posture alert
        </span>
      </p>
    </section>
  )
}
