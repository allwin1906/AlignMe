/**
 * 1920×1080 stage for the demo video: the illustrated wearer on the left, live
 * sensor readings in the middle and the real app in a phone frame on the right.
 * One engine instance drives the readings panel and the phone together.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DeviationChart } from '@/components/insights/DeviationChart'
import { AppShell, type Tab } from '@/components/shell/AppShell'
import { usePostureEngine } from '@/hooks/usePostureEngine'
import { POSTURE_META } from '@/lib/posture'
import { NEUTRAL_POSTURE } from '@/simulation/scenarios'
import { PhoneFrame } from './PhoneFrame'
import { Scene } from './Scene'
import { CUES, DURATION, captionAt, fade, leanAt } from './timeline'

const TEAM = ['Allwin E', 'Gowthaman A', 'Jayaprakash T', 'Kishore Kannan B', 'Sanjai S']

function useStageClock() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let frame = 0
    const loop = () => {
      const now = (performance.now() - start) / 1000
      setT(Math.min(now, DURATION))
      if (now < DURATION) frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])
  return t
}

function useFitToWindow() {
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <circle cx="24" cy="24" r="24" fill="#ffd21f" />
      <path d="M24 11v26" stroke="#0e0f13" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="11.5" r="3.5" fill="#0e0f13" />
      <path d="M15 27c3 2.5 6 3.5 9 3.5s6-1 9-3.5" stroke="#0e0f13" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function DemoStage() {
  const t = useStageClock()
  const scale = useFitToWindow()
  const model = usePostureEngine({ persist: false })
  const { state, actions } = model
  const lean = leanAt(t)
  const done = useRef({ start: false, calibrate: false })
  const [phoneBody, setPhoneBody] = useState<HTMLElement | null>(null)
  const [tap, setTap] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (t >= CUES.start && !done.current.start) {
      done.current.start = true
      actions.start()
    }
    if (t >= CUES.calibrate && !done.current.calibrate) {
      done.current.calibrate = true
      actions.calibrate()
    }
    actions.setManual({ pitch: NEUTRAL_POSTURE.pitch + lean, roll: NEUTRAL_POSTURE.roll })
  }, [t, lean, actions])

  useEffect(() => {
    if (t < CUES.calibrateTap || t > CUES.calibrate + 0.4) {
      if (tap) setTap(null)
      return
    }
    if (tap || !phoneBody) return
    const button = phoneBody.querySelector<HTMLElement>('section[aria-labelledby="posture-state"] button')
    if (!button) return
    const r = button.getBoundingClientRect()
    setTap({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  }, [t, tap, phoneBody])

  useEffect(() => {
    ;(window as unknown as { __demoReady?: boolean }).__demoReady = true
  }, [])

  const tab: Tab = t >= CUES.insights ? 'insights' : 'monitor'
  const caption = captionAt(t)
  const posture = state.engine.postureState
  const meta = POSTURE_META[posture]
  const Icon = meta.icon
  const latest = state.latest
  const calibrated = state.engine.processor.baseline !== null
  const deviating = posture === 'TEMPORARY_DEVIATION' || posture === 'POOR_POSTURE_ALERT'
  const titleOpacity = 1 - fade(t, 4, 5.2)
  const endOpacity = fade(t, CUES.end, CUES.end + 1.2)
  const tapProgress = tap ? Math.min(1, Math.max(0, (t - CUES.calibrateTap) / (CUES.calibrate + 0.4 - CUES.calibrateTap))) : 0

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink">
      <style>{`.demo-phone *, .demo-phone *::before, .demo-phone *::after { transition: none !important; animation: none !important; } html, body { overflow: hidden; }`}</style>
      <div
        className="absolute left-0 top-0 origin-top-left bg-ink font-sans text-paper"
        style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
      >
        {/* top bar */}
        <div className="absolute left-[48px] top-[30px] flex items-center gap-4">
          <Logo />
          <div>
            <p className="text-[26px] font-medium leading-none">AlignMe</p>
            <p className="mt-1 text-[15px] text-mist">Smart wearable posture monitoring</p>
          </div>
        </div>
        <div className="absolute right-[48px] top-[38px] rounded-full border border-sun/50 px-5 py-2 text-[17px] text-sun">
          Concept demo · simulated sensor data
        </div>

        {/* scene */}
        <section className="absolute left-[40px] top-[104px] h-[936px] w-[980px] overflow-hidden rounded-[44px] bg-ink-2 ring-1 ring-graphite">
          <div className="absolute inset-x-0 bottom-0 top-[40px]">
            <Scene t={t} lean={lean} posture={posture} calibrated={calibrated} thresholdDeg={state.engine.settings.thresholdDeg} />
          </div>
          {caption && (
            <div className="absolute left-[48px] top-[40px] max-w-[620px]">
              <p className="text-[44px] font-medium leading-tight">{caption.title}</p>
              <p className="mt-2 text-[24px] leading-snug text-paper/75">{caption.body}</p>
            </div>
          )}
        </section>

        {/* live readings */}
        <section className="absolute left-[1044px] top-[104px] flex h-[936px] w-[400px] flex-col gap-4">
          <div className="rounded-[36px] bg-graphite p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[22px] font-medium">Live sensor readings</p>
              <p className="text-[14px] text-mist">10 Hz · simulated</p>
            </div>
            <div
              className={`mt-4 flex items-center gap-3 rounded-full px-4 py-2.5 text-[20px] font-medium ${meta.surface} ${meta.onSurface}`}
            >
              <Icon className="size-6" aria-hidden />
              {meta.label}
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3">
              {[
                { label: 'Pitch', value: latest?.smoothed.pitch },
                { label: 'Roll', value: latest?.smoothed.roll },
              ].map((row) => (
                <div key={row.label} className="rounded-3xl bg-ink-2 p-4">
                  <dt className="text-[15px] text-mist">{row.label}</dt>
                  <dd className="text-[40px] font-light tabular-nums">{row.value === undefined ? '—' : `${row.value.toFixed(1)}°`}</dd>
                </div>
              ))}
              <div className="col-span-2 rounded-3xl bg-ink-2 p-4">
                <dt className="text-[15px] text-mist">Deviation from your reference</dt>
                <dd className="flex items-baseline justify-between">
                  <span className="text-[56px] font-light tabular-nums">{latest?.deviation == null ? '—' : `${latest.deviation.toFixed(1)}°`}</span>
                  <span className="text-[16px] text-mist">threshold {state.engine.settings.thresholdDeg}°</span>
                </dd>
                <div className="mt-2 flex justify-between text-[14px] text-mist">
                  <span>Delay timer</span>
                  <span className="tabular-nums">
                    {deviating ? `${(latest?.persistenceSeconds ?? 0).toFixed(1)} of ${state.engine.settings.persistenceSeconds} s` : '—'}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-graphite">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${deviating ? Math.min(1, (latest?.persistenceSeconds ?? 0) / state.engine.settings.persistenceSeconds) * 100 : 0}%`,
                      background: meta.accent,
                    }}
                  />
                </div>
              </div>
            </dl>
          </div>
          <div className="demo-phone">
            <DeviationChart series={state.series} settings={state.engine.settings} simTime={state.simTime} compact />
          </div>
        </section>

        {/* phone */}
        <div className="absolute left-[1474px] top-[118px] rounded-[64px] bg-[#1b1c21] p-[12px] shadow-2xl shadow-black/70 ring-1 ring-graphite-2">
          <div className="relative h-[844px] w-[390px] overflow-hidden rounded-[52px]">
            <PhoneFrame width={390} height={844} onBody={setPhoneBody}>
              <AppShell model={model} tab={tab} />
            </PhoneFrame>
            {tap && (
              <span
                className="pointer-events-none absolute z-[60] rounded-full border-4 border-paper"
                style={{
                  left: tap.x - 26 - tapProgress * 14,
                  top: tap.y - 26 - tapProgress * 14,
                  width: 52 + tapProgress * 28,
                  height: 52 + tapProgress * 28,
                  opacity: 1 - tapProgress * 0.7,
                  background: 'rgba(243,243,238,0.25)',
                }}
              />
            )}
          </div>
        </div>

        {/* title card */}
        {titleOpacity > 0 && (
          <div className="absolute inset-0 z-[80] grid place-items-center bg-ink" style={{ opacity: titleOpacity }}>
            <div className="text-center">
              <div className="mx-auto w-fit">
                <Logo size={120} />
              </div>
              <p className="mt-8 text-[96px] font-medium leading-none">AlignMe</p>
              <p className="mt-5 text-[34px] text-paper/80">Sit right. Stay aligned.</p>
              <p className="mt-8 text-[20px] text-mist">Smart wearable posture monitoring · software prototype demo</p>
            </div>
          </div>
        )}

        {/* end card */}
        {endOpacity > 0 && (
          <div className="absolute inset-0 z-[80] grid place-items-center bg-ink" style={{ opacity: endOpacity }}>
            <div className="text-center">
              <div className="mx-auto w-fit">
                <Logo size={96} />
              </div>
              <p className="mt-6 text-[80px] font-medium leading-none">AlignMe</p>
              <p className="mt-6 text-[26px] text-paper/85">Modules 1–3 software prototype, running on simulated sensor data.</p>
              <p className="mt-2 text-[22px] text-mist">ESP32, MPU6050 and vibration feedback integration follows in Phase II.</p>
              <p className="mt-12 text-[22px] text-paper/85">{TEAM.join('   ·   ')}</p>
              <p className="mt-3 text-[18px] text-mist">
                Guided by Mrs. Jothi, Department of Information Technology, K. Ramakrishnan College of Engineering
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
