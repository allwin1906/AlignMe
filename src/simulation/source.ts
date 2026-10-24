import type { Reading } from '@/engine'

/**
 * The seam between the input layer and the engine. Phase I implements it with
 * simulated sources only; a later phase can add an ESP32/MPU6050 adapter that
 * emits the same Reading shape without changing the engine.
 */
export interface PostureSource {
  /** True for every source in this phase. Drives the "simulated data" label. */
  readonly simulated: boolean
  readonly label: string
  /** Produce the reading for the given source timestamp (ms). */
  readAt(timestamp: number): Reading
}
