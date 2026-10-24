import type { PostureModel } from '@/hooks/usePostureEngine'
import { DeviationChart } from './DeviationChart'
import { HistoryList } from './HistoryList'
import { UprightSlouchCard } from './UprightSlouchCard'

export function InsightsView({ model }: { model: PostureModel }) {
  const { state, actions } = model
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <DeviationChart series={state.series} settings={state.engine.settings} simTime={state.simTime} />
        <div className="px-1 sm:px-3">
          <UprightSlouchCard stats={state.stats} onOpenHistory={() => document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' })} />
        </div>
      </div>
      <HistoryList history={state.history} onClear={actions.clearHistory} />
    </div>
  )
}
