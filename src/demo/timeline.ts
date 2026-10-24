/**
 * The demo video's script as functions of time (seconds). The person's lean
 * here is exactly the pitch fed to the engine, so scene and app always agree.
 */
import { keyframes } from '@/simulation/scenarios'

export const DURATION = 86

const reachLean = keyframes([
  [0, 0],
  [30, 0],
  [30.8, 26],
  [33.2, 26],
  [34.2, 0],
])
const slouchLean = keyframes([
  [0, 0],
  [40, 0],
  [42.5, 23],
  [58, 23],
  [59.6, 0],
])

/** Forward lean of the trunk from upright, in degrees. */
export function leanAt(t: number): number {
  const breathing = 0.9 * Math.sin((2 * Math.PI * t) / 4.6)
  return breathing + reachLean(t) + slouchLean(t)
}

/** 0 = straight back, 1 = fully rounded shoulders (only during the slouch). */
export const roundingAt = (t: number) => Math.min(1, Math.max(0, slouchLean(t) / 23))

export type ArmPose = 'type' | 'reach' | 'sip' | 'return'
export function armPoseAt(t: number): { pose: ArmPose; blend: number } {
  if (t >= 30 && t < 31) return { pose: 'reach', blend: t - 30 }
  if (t >= 31 && t < 33.6) return { pose: 'reach', blend: 1 }
  if (t >= 33.6 && t < 34.6) return { pose: 'sip', blend: t - 33.6 }
  if (t >= 34.6 && t < 37) return { pose: 'sip', blend: 1 }
  if (t >= 37 && t < 38.2) return { pose: 'return', blend: (t - 37) / 1.2 }
  return { pose: 'type', blend: 1 }
}

/** The cup is in the hand from the moment it is picked up until it is put back. */
export const cupInHand = (t: number) => t >= 31 && t < 38

export interface Caption {
  title: string
  body: string
}

const CAPTIONS: Array<[number, number, Caption]> = [
  [5, 12, { title: 'A belt at the hip', body: 'The AlignMe belt carries a motion sensor that tracks how far the trunk leans.' }],
  [12, 20, { title: 'Step 1: calibrate', body: 'Sit upright and tap Calibrate. This posture becomes your personal reference.' }],
  [20, 30, { title: 'Small movements stay in range', body: 'Breathing and shifting stay well under the 15° threshold.' }],
  [30, 40, { title: 'A brief lean is ignored', body: 'Reaching for a cup crosses the threshold, but the 10 s delay timer resets. No alert.' }],
  [40, 52, { title: 'A slouch starts the timer', body: 'Leaning past 15° starts the delay. The timer keeps counting while the slouch lasts.' }],
  [52, 58, { title: 'Held for 10 s: alert', body: 'The app raises a poor-posture alert. On the real belt, a vibration cue will follow.' }],
  [58, 68, { title: 'Corrected', body: 'Sitting upright clears the alert and resets the timer. Monitoring continues.' }],
  [68, 79, { title: 'Every episode is logged', body: 'The trend, upright time and alert history stay on the phone.' }],
]

export const captionAt = (t: number) => CAPTIONS.find(([a, b]) => t >= a && t < b)?.[2] ?? null

export const CUES = {
  start: 5,
  calibrateTap: 14.4,
  calibrate: 15,
  insights: 68,
  end: 79,
} as const

/** Opacity for a fade between two times. */
export function fade(t: number, inStart: number, inEnd: number, outStart = Infinity, outEnd = Infinity): number {
  if (t < inStart || t > outEnd) return 0
  if (t < inEnd) return (t - inStart) / (inEnd - inStart)
  if (t > outStart) return 1 - (t - outStart) / (outEnd - outStart)
  return 1
}
