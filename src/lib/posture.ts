import { CircleCheck, Crosshair, TriangleAlert, Timer, type LucideIcon } from 'lucide-react'
import type { PostureState } from '@/engine'

export interface PostureMeta {
  label: string
  description: string
  icon: LucideIcon
  /** Hero card background. */
  surface: string
  /** Text colour on that surface. */
  onSurface: string
  /** Accent used for dots and chart marks. */
  accent: string
}

export const POSTURE_META: Record<PostureState, PostureMeta> = {
  NOT_CALIBRATED: {
    label: 'Not calibrated',
    description: 'Sit upright, then tap Calibrate to set your reference posture.',
    icon: Crosshair,
    surface: 'bg-graphite',
    onSurface: 'text-paper',
    accent: 'var(--color-mist)',
  },
  GOOD_POSTURE: {
    label: 'Upright',
    description: 'Within your range. Keep it up.',
    icon: CircleCheck,
    surface: 'bg-sun',
    onSurface: 'text-ink',
    accent: 'var(--color-lime)',
  },
  TEMPORARY_DEVIATION: {
    label: 'Leaning',
    description: 'Outside your range. The delay timer is running.',
    icon: Timer,
    surface: 'bg-iris',
    onSurface: 'text-ink',
    accent: 'var(--color-iris)',
  },
  POOR_POSTURE_ALERT: {
    label: 'Poor posture',
    description: 'You have been outside your range too long. Sit upright.',
    icon: TriangleAlert,
    surface: 'bg-coral',
    onSurface: 'text-ink',
    accent: 'var(--color-coral)',
  },
}
