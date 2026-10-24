import { Activity, ArrowUpRight, Crosshair, Volume2, Timer } from 'lucide-react'
import { getScenario } from '@/simulation/scenarios'
import type { PostureModel } from '@/hooks/usePostureEngine'
import { DeviationChart } from '@/components/insights/DeviationChart'
import { Switch } from '@/components/shell/Switch'
import { Tile } from '@/components/shell/Tile'
import { deg } from '@/lib/format'
import { HeroGauge } from './HeroGauge'
import { ReadingsCard } from './ReadingsCard'
import { SimulationDock } from './SimulationDock'

export function MonitorView({ model, onOpenSettings }: { model: PostureModel; onOpenSettings(): void }) {
  const { state, actions, soundOn } = model
  const { engine, latest, mode } = state
  const baseline = engine.processor.baseline
  const canCalibrate = engine.processor.buffer.length > 0

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Tile
            icon={Activity}
            title="Input source"
            value={<span className="block truncate text-xl">{mode.kind === 'manual' ? 'Manual' : getScenario(mode.scenarioId).name}</span>}
          />
          <Tile
            icon={Crosshair}
            title="Reference posture"
            value={
              baseline ? (
                <span className="text-xl tabular-nums">
                  {deg(baseline.pitch)}, {deg(baseline.roll)}
                </span>
              ) : (
                <span className="text-xl text-mist">Not set</span>
              )
            }
          />
        </div>
        <HeroGauge posture={engine.postureState} output={latest} settings={engine.settings} canCalibrate={canCalibrate} onCalibrate={actions.calibrate} />
        <div className="grid grid-cols-2 gap-3">
          <Tile
            tone="paper"
            icon={Volume2}
            title="Alert sound"
            value={<span className="text-3xl">{soundOn ? 'On' : 'Off'}</span>}
            action={<Switch checked={soundOn} onChange={actions.setSoundOn} label="Alert sound" />}
          />
          <Tile
            icon={Timer}
            title="Alert delay"
            value={
              <span className="text-3xl tabular-nums">
                {engine.settings.persistenceSeconds} <span className="text-lg">sec</span>
              </span>
            }
            action={
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label="Open detection settings"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-graphite-2 hover:bg-ink-2"
              >
                <ArrowUpRight aria-hidden className="size-5" />
              </button>
            }
          />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <SimulationDock model={model} />
        <DeviationChart series={state.series} settings={engine.settings} simTime={state.simTime} compact />
        <ReadingsCard output={latest} />
      </div>
    </div>
  )
}
