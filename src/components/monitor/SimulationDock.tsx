import { Pause, Play, RotateCcw } from 'lucide-react'
import { SPEEDS } from '@/app/controller'
import type { PostureModel } from '@/hooks/usePostureEngine'
import { cn } from '@/lib/cn'
import { signedDeg } from '@/lib/format'
import { NEUTRAL_POSTURE, SCENARIOS, getScenario } from '@/simulation/scenarios'

/** Simulation controls: play/pause, speed, scenarios and the manual pitch/roll sliders. */
export function SimulationDock({ model }: { model: PostureModel }) {
  const { state, actions, pausedByVisibility } = model
  const { mode, running, speed, scenarioFinished } = state
  const activeScenario = mode.kind === 'scenario' ? mode.scenarioId : null
  const scenarioProgress =
    mode.kind === 'scenario' ? Math.min(1, (state.simTime - mode.startedAt) / getScenario(mode.scenarioId).durationMs) : 0

  let status = 'Press play to stream simulated readings.'
  if (pausedByVisibility && !running) status = 'Paused while the tab was hidden. Press play to continue.'
  else if (scenarioFinished) status = `${getScenario(scenarioFinished).name} finished.`
  else if (running && activeScenario) status = getScenario(activeScenario).description
  else if (running) status = 'Move the sliders to tilt the simulated wearer.'

  return (
    <section aria-labelledby="sim-title" className="rounded-[32px] bg-ink-2 p-5 ring-1 ring-graphite">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={running ? actions.stop : actions.start}
          aria-label={running ? 'Pause simulation' : 'Start simulation'}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-sun text-ink transition hover:brightness-95"
        >
          {running ? <Pause aria-hidden className="size-6" fill="currentColor" /> : <Play aria-hidden className="ml-0.5 size-6" fill="currentColor" />}
        </button>
        <div className="min-w-0 flex-1">
          <h2 id="sim-title" className="text-lg font-medium">
            Simulation
          </h2>
          <p className="text-sm text-mist" aria-live="polite">
            {status}
          </p>
        </div>
        <div role="radiogroup" aria-label="Playback speed" className="flex shrink-0 rounded-full bg-graphite p-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => actions.setSpeed(s)}
              className={cn('rounded-full px-2.5 py-1 text-sm tabular-nums', speed === s ? 'bg-paper text-ink' : 'text-mist hover:text-paper')}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={actions.useManual}
          aria-pressed={mode.kind === 'manual'}
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-sm transition',
            mode.kind === 'manual' ? 'bg-paper text-ink' : 'bg-graphite text-paper hover:bg-graphite-2',
          )}
        >
          Manual
        </button>
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => actions.startScenario(scenario.id)}
            aria-pressed={activeScenario === scenario.id}
            className={cn(
              'relative shrink-0 overflow-hidden rounded-full px-4 py-2 text-sm transition',
              activeScenario === scenario.id ? 'bg-paper text-ink' : 'bg-graphite text-paper hover:bg-graphite-2',
            )}
          >
            {activeScenario === scenario.id && (
              <span aria-hidden className="absolute inset-y-0 left-0 bg-sun/60" style={{ width: `${scenarioProgress * 100}%` }} />
            )}
            <span className="relative">{scenario.name}</span>
          </button>
        ))}
      </div>

      {mode.kind === 'manual' && (
        <div className="mt-5 space-y-3">
          {(['pitch', 'roll'] as const).map((axis) => (
            <label key={axis} className="block">
              <span className="flex justify-between text-sm">
                <span>{axis === 'pitch' ? 'Lean forward / back (pitch)' : 'Lean sideways (roll)'}</span>
                <span className="tabular-nums text-mist">{signedDeg(state.manual[axis] - NEUTRAL_POSTURE[axis], 0)}</span>
              </span>
              <input
                type="range"
                min={NEUTRAL_POSTURE[axis] - 40}
                max={NEUTRAL_POSTURE[axis] + 40}
                step={0.5}
                value={state.manual[axis]}
                aria-label={axis === 'pitch' ? 'Pitch, lean forward or back' : 'Roll, lean sideways'}
                aria-valuetext={signedDeg(state.manual[axis] - NEUTRAL_POSTURE[axis], 0)}
                onChange={(e) => actions.setManual({ [axis]: Number(e.target.value) })}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => actions.setManual({ ...NEUTRAL_POSTURE })}
            className="inline-flex items-center gap-2 rounded-full bg-graphite px-4 py-2 text-sm hover:bg-graphite-2"
          >
            <RotateCcw aria-hidden className="size-4" />
            Sit upright
          </button>
        </div>
      )}
    </section>
  )
}
