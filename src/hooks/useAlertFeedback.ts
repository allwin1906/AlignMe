import { useEffect, useRef, useState } from 'react'
import type { PostureState } from '@/engine'

/** A short two-tone chime through Web Audio. Software alert only; no hardware is involved. */
function chime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const tones = [660, 880]
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const at = ctx.currentTime + i * 0.18
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.18, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.17)
    })
    window.setTimeout(() => void ctx.close(), 600)
  } catch {
    // Audio blocked or unsupported: the on-screen alert still shows.
  }
}

/** Shows the alert banner when the engine enters POOR_POSTURE_ALERT and hides it on recovery or when monitoring stops. */
export function useAlertFeedback(posture: PostureState, soundOn: boolean, running: boolean) {
  const previous = useRef(posture)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (posture === 'POOR_POSTURE_ALERT' && previous.current !== 'POOR_POSTURE_ALERT') {
      setVisible(true)
      if (soundOn) chime()
    }
    if (posture !== 'POOR_POSTURE_ALERT' || !running) setVisible(false)
    previous.current = posture
  }, [posture, soundOn, running])

  return { visible, dismiss: () => setVisible(false) }
}
