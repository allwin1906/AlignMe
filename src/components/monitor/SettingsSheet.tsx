import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { DEFAULT_SETTINGS, SETTINGS_BOUNDS, type Settings } from '@/engine'
import type { PostureModel } from '@/hooks/usePostureEngine'

const FIELDS: Array<{ key: keyof Settings; label: string; unit: string; step: number; help: string }> = [
  { key: 'thresholdDeg', label: 'Threshold', unit: '°', step: 1, help: 'How far from your baseline counts as leaning.' },
  { key: 'persistenceSeconds', label: 'Alert delay', unit: 's', step: 1, help: 'How long you can lean before an alert.' },
  { key: 'smoothingWindow', label: 'Smoothing', unit: 'readings', step: 1, help: 'More smoothing means steadier values but slower reactions.' },
]

/** Detection settings and calibration reset, in a native dialog. */
export function SettingsSheet({ model, open, onClose }: { model: PostureModel; open: boolean; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { settings } = model.state.engine
  const calibrated = model.state.engine.processor.baseline !== null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="settings-title"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[32px] bg-graphite p-0 text-paper backdrop:bg-black/60"
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="text-2xl font-medium">
            Detection settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close settings" className="grid size-10 place-items-center rounded-full bg-graphite-2">
            <X aria-hidden className="size-5" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {FIELDS.map(({ key, label, unit, step, help }) => {
            const { min, max } = SETTINGS_BOUNDS[key]
            return (
              <label key={key} className="block">
                <span className="flex items-baseline justify-between">
                  <span className="text-base">{label}</span>
                  <span className="text-2xl font-light tabular-nums">
                    {settings[key]} <span className="text-sm text-mist">{unit}</span>
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={settings[key]}
                  onChange={(e) => model.actions.updateSettings({ [key]: Number(e.target.value) })}
                  aria-describedby={`${key}-help`}
                />
                <span id={`${key}-help`} className="flex justify-between text-xs text-mist">
                  <span>{help}</span>
                  <span className="shrink-0 pl-3 tabular-nums">
                    {min}–{max}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="mt-7 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => model.actions.updateSettings({ ...DEFAULT_SETTINGS })}
            className="rounded-full bg-graphite-2 px-4 py-2.5 text-sm hover:bg-ink-2"
          >
            Restore defaults
          </button>
          <button
            type="button"
            onClick={model.actions.resetCalibration}
            disabled={!calibrated}
            className="rounded-full bg-graphite-2 px-4 py-2.5 text-sm hover:bg-ink-2 disabled:opacity-40"
          >
            Reset calibration
          </button>
        </div>
        <p className="mt-4 text-xs text-mist">Defaults are prototype values, not clinical recommendations. Changes apply from the next reading.</p>
      </div>
    </dialog>
  )
}
