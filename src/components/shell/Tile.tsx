import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TileProps {
  icon: LucideIcon
  title: string
  value: ReactNode
  tone?: 'graphite' | 'paper'
  action?: ReactNode
  className?: string
}

/** Small square card with a round icon badge, a two-line title and a value, as in the reference design. */
export function Tile({ icon: Icon, title, value, tone = 'graphite', action, className }: TileProps) {
  const paper = tone === 'paper'
  return (
    <div
      className={cn(
        'flex min-h-[148px] flex-col justify-between rounded-[28px] p-3.5',
        paper ? 'bg-paper text-ink' : 'bg-graphite text-paper',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('grid size-12 shrink-0 place-items-center rounded-full', paper ? 'bg-ink text-paper' : 'bg-graphite-2')}>
          <Icon aria-hidden className="size-5" strokeWidth={1.8} />
        </span>
        <span className="text-[15px] leading-snug">{title}</span>
      </div>
      <div className="flex items-end justify-between gap-2 px-1.5 pb-1">
        <div className="min-w-0 text-2xl font-light leading-tight">{value}</div>
        {action}
      </div>
    </div>
  )
}
