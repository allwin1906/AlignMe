import type { EngineOutput, PostureState, Settings } from '@/engine'
import { POSTURE_META } from '@/lib/posture'
import { cn } from '@/lib/cn'

const MAX_DEG = 45
const START = 150
const SWEEP = 240
const CX = 130
const CY = 128
const R = 96

const angleFor = (value: number) => START + (SWEEP * Math.min(Math.max(value, 0), MAX_DEG)) / MAX_DEG
const point = (angle: number, radius = R) => {
  const rad = (angle * Math.PI) / 180
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)] as const
}
function arc(from: number, to: number, radius = R) {
  const [x0, y0] = point(from, radius)
  const [x1, y1] = point(to, radius)
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

interface HeroGaugeProps {
  posture: PostureState
  output: EngineOutput | null
  settings: Settings
  canCalibrate: boolean
  onCalibrate(): void
}

/** The posture gauge: deviation on a 0–45° dial, with the zone beyond the threshold hatched. */
export function HeroGauge({ posture, output, settings, canCalibrate, onCalibrate }: HeroGaugeProps) {
  const calibrated = posture !== 'NOT_CALIBRATED'
  // Calibrated but no reading since load: show nothing as live until data arrives.
  const waiting = calibrated && output === null
  const baseMeta = POSTURE_META[posture]
  const meta = waiting ? { ...baseMeta, label: 'Ready', description: 'Reference posture saved. Press play to stream readings.' } : baseMeta
  const Icon = meta.icon
  const live = calibrated && !waiting
  const deviation = live ? (output?.deviation ?? 0) : 0
  const valueAngle = angleFor(deviation)
  const thresholdAngle = angleFor(settings.thresholdDeg)
  const deviating = posture === 'TEMPORARY_DEVIATION' || posture === 'POOR_POSTURE_ALERT'
  const progress = deviating ? Math.min(1, (output?.persistenceSeconds ?? 0) / settings.persistenceSeconds) : 0

  const ticks = []
  for (let v = settings.thresholdDeg; v <= MAX_DEG + 0.01; v += 0.9) {
    const a = angleFor(v)
    const [x0, y0] = point(a, R + 7)
    const [x1, y1] = point(a, R + 19)
    ticks.push(<line key={v} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={1.4} />)
  }
  const [mx, my] = point(valueAngle, R - 30)
  const [tx0, ty0] = point(thresholdAngle, R - 14)
  const [tx1, ty1] = point(thresholdAngle, R + 22)

  return (
    <section
      aria-labelledby="posture-state"
      className={cn('relative rounded-[32px] p-6 transition-colors duration-300', meta.surface, meta.onSurface)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="posture-state" className="flex items-center gap-2 text-[26px] font-medium leading-tight" aria-live="polite">
            <Icon aria-hidden className="size-6" strokeWidth={2} />
            {meta.label}
          </h2>
          <p className="mt-1 max-w-[30ch] text-sm opacity-75">{meta.description}</p>
        </div>
        <button
          type="button"
          onClick={onCalibrate}
          disabled={!canCalibrate}
          className={cn(
            'shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition',
            calibrated ? 'bg-black/12 hover:bg-black/20' : 'bg-sun text-ink hover:brightness-95',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          title={canCalibrate ? 'Use your current posture as the reference' : 'Start the simulation first'}
        >
          {calibrated ? 'Recalibrate' : 'Calibrate'}
        </button>
      </div>

      <svg viewBox="0 0 260 214" className="mx-auto mt-2 w-full max-w-[340px]" role="img" aria-label={live ? `Deviation ${deviation.toFixed(1)} degrees, threshold ${settings.thresholdDeg} degrees` : 'Not calibrated'}>
        <path d={arc(START, START + SWEEP)} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={3} strokeLinecap="round" strokeDasharray="0 9" />
        <g stroke="currentColor" strokeOpacity={0.55}>{ticks}</g>
        <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        {live && (
          <>
            <path
              d={arc(START, Math.max(valueAngle, START + 0.5))}
              fill="none"
              stroke="currentColor"
              strokeWidth={18}
              strokeLinecap="round"
              className="transition-[d] duration-150"
            />
            <circle cx={mx} cy={my} r={5} fill="currentColor" />
          </>
        )}
        <text x={CX} y={CY + 14} textAnchor="middle" className="fill-current text-[62px] font-light tracking-tight">
          {live ? `${Math.round(deviation)}°` : '—'}
        </text>
        <text x={CX} y={CY + 52} textAnchor="middle" className="fill-current text-[13px] opacity-75">
          Threshold <tspan fontWeight={600}>{settings.thresholdDeg}°</tspan>
        </text>
      </svg>

      <div className={cn('mt-1 transition-opacity', deviating ? 'opacity-100' : 'opacity-0')} aria-hidden={!deviating}>
        <div className="mb-1.5 flex justify-between text-xs opacity-80">
          <span>{posture === 'POOR_POSTURE_ALERT' ? 'Alert raised' : 'Delay timer'}</span>
          <span className="tabular-nums">
            {posture === 'POOR_POSTURE_ALERT'
              ? `held ${(output?.persistenceSeconds ?? 0).toFixed(1)} s, limit ${settings.persistenceSeconds} s`
              : `${(output?.persistenceSeconds ?? 0).toFixed(1)} of ${settings.persistenceSeconds} s`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-black/15">
          <div className="h-full rounded-full bg-current transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </section>
  )
}
