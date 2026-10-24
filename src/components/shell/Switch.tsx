import { cn } from '@/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange(checked: boolean): void
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-10 w-[72px] shrink-0 rounded-full transition-colors', checked ? 'bg-[#2fc15b]' : 'bg-ink/20')}
    >
      <span
        className={cn(
          'absolute top-1 size-8 rounded-full bg-white shadow transition-[left] duration-200',
          checked ? 'left-[36px]' : 'left-1',
        )}
      />
    </button>
  )
}
