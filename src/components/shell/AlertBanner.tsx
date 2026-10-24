import { TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Notification-style software alert that drops in from the top when posture stays poor. */
export function AlertBanner({ visible, seconds, onDismiss }: { visible: boolean; seconds: number; onDismiss(): void }) {
  return (
    <div
      role="alert"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-[max(12px,env(safe-area-inset-top))] transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0',
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[24px] bg-paper p-3 pr-2 text-ink shadow-2xl shadow-black/50">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-coral">
          <TriangleAlert aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Poor posture for {Math.floor(seconds)} s</p>
          <p className="text-sm text-ink/65">Sit upright to clear the alert.</p>
        </div>
        <button type="button" onClick={onDismiss} tabIndex={visible ? 0 : -1} aria-label="Dismiss alert" className="grid size-10 place-items-center rounded-full hover:bg-ink/8">
          <X aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  )
}
