/**
 * Illustrated side view of a seated person wearing the AlignMe belt at the hip.
 * The trunk rotates about the hip by exactly the lean fed to the engine.
 */
import type { PostureState } from '@/engine'
import { armPoseAt, cupInHand, roundingAt } from './timeline'

type V = { x: number; y: number }
const v = (x: number, y: number): V => ({ x, y })
const add = (a: V, b: V) => v(a.x + b.x, a.y + b.y)
const mul = (a: V, k: number) => v(a.x * k, a.y * k)
const lerp = (a: V, b: V, k: number) => v(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)
const ease = (k: number) => k * k * (3 - 2 * k)
const rad = (deg: number) => (deg * Math.PI) / 180

const HIP = v(372, 640)
const TORSO = 236
const UPPER_ARM = 128
const FOREARM = 124
const KEYBOARD = v(706, 572)
const CUP_HOME = v(858, 566)

const STATE_COLOR: Record<PostureState, string> = {
  NOT_CALIBRATED: '#9a9ca6',
  GOOD_POSTURE: '#b6f23c',
  TEMPORARY_DEVIATION: '#8b88ff',
  POOR_POSTURE_ALERT: '#ff5c6c',
}

/** Two-bone arm: elbow hangs below the shoulder-to-hand line. */
function elbowFor(shoulder: V, hand: V): { elbow: V; hand: V } {
  const dx = hand.x - shoulder.x
  const dy = hand.y - shoulder.y
  const reach = Math.min(Math.hypot(dx, dy), UPPER_ARM + FOREARM - 2)
  const toHand = Math.atan2(dy, dx)
  const cos = (UPPER_ARM ** 2 + reach ** 2 - FOREARM ** 2) / (2 * UPPER_ARM * reach)
  const a = toHand + Math.acos(Math.max(-1, Math.min(1, cos)))
  const elbow = add(shoulder, v(Math.cos(a) * UPPER_ARM, Math.sin(a) * UPPER_ARM))
  const end = add(shoulder, v(Math.cos(toHand) * reach, Math.sin(toHand) * reach))
  return { elbow, hand: end }
}

const fmt = (p: V) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`

function arcPath(center: V, r: number, fromDeg: number, toDeg: number) {
  const a = v(center.x + r * Math.cos(rad(fromDeg)), center.y + r * Math.sin(rad(fromDeg)))
  const b = v(center.x + r * Math.cos(rad(toDeg)), center.y + r * Math.sin(rad(toDeg)))
  const sweep = toDeg >= fromDeg ? 1 : 0
  return `M ${fmt(a)} A ${r} ${r} 0 0 ${sweep} ${fmt(b)}`
}

interface SceneProps {
  t: number
  lean: number
  posture: PostureState
  calibrated: boolean
  thresholdDeg: number
}

export function Scene({ t, lean, posture, calibrated, thresholdDeg }: SceneProps) {
  const theta = rad(lean)
  const up = v(Math.sin(theta), -Math.cos(theta))
  const back = v(-Math.cos(theta), -Math.sin(theta))
  const rounding = roundingAt(t)

  const shoulder = add(add(HIP, mul(up, TORSO)), v(10 * rounding, 14 * rounding))
  const spineCtrl = add(lerp(HIP, shoulder, 0.55), mul(back, 34 * rounding + 6))
  const headTilt = theta + rad(14 * rounding)
  const headUp = v(Math.sin(headTilt), -Math.cos(headTilt))
  const neckTop = add(shoulder, mul(headUp, 26))
  const head = add(shoulder, mul(headUp, 66))

  // Hand target for the current arm pose.
  const { pose, blend } = armPoseAt(t)
  const typing = add(KEYBOARD, v(Math.sin(t * 9) * 3, Math.abs(Math.sin(t * 7)) * -3))
  const mouth = add(head, v(30, 30))
  let target = typing
  if (pose === 'reach') target = lerp(typing, add(CUP_HOME, v(-6, -8)), ease(blend))
  if (pose === 'sip') target = lerp(add(CUP_HOME, v(-6, -8)), mouth, ease(blend))
  if (pose === 'return') target = blend < 0.5 ? lerp(mouth, add(CUP_HOME, v(-6, -8)), ease(blend * 2)) : lerp(add(CUP_HOME, v(-6, -8)), typing, ease(blend * 2 - 1))
  const arm = elbowFor(shoulder, target)
  const cup = cupInHand(t) ? add(arm.hand, v(4, -6)) : CUP_HOME

  // Belt and sensor ride on the trunk just above the hip.
  const beltCenter = add(HIP, mul(up, 30))
  const beltA = add(beltCenter, mul(back, 36))
  const beltB = add(beltCenter, mul(back, -34))
  const sensor = add(beltCenter, mul(back, 44))
  const color = STATE_COLOR[posture]
  const alert = posture === 'POOR_POSTURE_ALERT'

  const knee = v(HIP.x + 196, HIP.y + 8)
  const ankle = v(knee.x + 10, 880)
  const ledOn = Math.sin(t * 6) > -0.2

  return (
    <svg viewBox="0 0 960 1000" className="h-full w-full" role="img" aria-label="Person seated at a desk wearing the AlignMe belt at the hip">
      <defs>
        <radialGradient id="sensor-glow">
          <stop offset="0%" stopColor="#ffd21f" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd21f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="screen" x1="0" x2="1">
          <stop offset="0%" stopColor="#ffd21f" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffd21f" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* floor */}
      <line x1="60" y1="900" x2="920" y2="900" stroke="#2a2c33" strokeWidth="3" strokeLinecap="round" />

      {/* chair */}
      <g fill="#2a2c33" stroke="#2a2c33" strokeLinecap="round">
        <rect x="236" y="652" width="250" height="20" rx="10" />
        <rect x="232" y="420" width="34" height="190" rx="17" />
        <line x1="249" y1="600" x2="262" y2="660" strokeWidth="14" />
        <line x1="361" y1="672" x2="361" y2="846" strokeWidth="14" />
        <line x1="270" y1="896" x2="452" y2="896" strokeWidth="12" />
        <line x1="361" y1="846" x2="282" y2="892" strokeWidth="10" />
        <line x1="361" y1="846" x2="440" y2="892" strokeWidth="10" />
      </g>

      {/* desk, laptop, cup */}
      <g>
        <rect x="630" y="578" width="300" height="16" rx="8" fill="#353740" />
        <rect x="892" y="594" width="16" height="306" rx="8" fill="#2a2c33" />
        <rect x="664" y="568" width="150" height="10" rx="4" fill="#4a4d57" />
        <line x1="812" y1="574" x2="848" y2="452" stroke="#4a4d57" strokeWidth="11" strokeLinecap="round" />
        <polygon points="806,572 842,450 760,470 730,572" fill="url(#screen)" opacity="0.8" />
        <g transform={`translate(${cup.x} ${cup.y})`}>
          <rect x="-12" y="-30" width="26" height="30" rx="6" fill="#f3f3ee" />
          <path d="M14 -24 q12 2 0 14" stroke="#f3f3ee" strokeWidth="4" fill="none" />
        </g>
      </g>

      {/* legs */}
      <g stroke="#5b5f6b" strokeLinecap="round" fill="none">
        <path d={`M ${fmt(HIP)} L ${fmt(knee)}`} strokeWidth="46" />
        <path d={`M ${fmt(knee)} L ${fmt(ankle)}`} strokeWidth="38" />
        <path d={`M ${fmt(ankle)} l 54 2`} strokeWidth="22" stroke="#2a2c33" />
      </g>

      {/* reference line and lean angle */}
      {calibrated && (
        <g>
          <line x1={HIP.x} y1={HIP.y} x2={HIP.x} y2={HIP.y - 300} stroke="#9a9ca6" strokeWidth="2" strokeDasharray="6 8" />
          <text x={HIP.x - 62} y={HIP.y - 290} textAnchor="end" fill="#9a9ca6" fontSize="18">
            Calibrated upright
          </text>
          <line x1={HIP.x} y1={HIP.y} x2={HIP.x + Math.sin(theta) * 300} y2={HIP.y - Math.cos(theta) * 300} stroke={color} strokeWidth="2.5" />
          <path d={arcPath(HIP, 150, -90, -90 + Math.max(lean, 0.01))} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path
            d={arcPath(HIP, 150, -90 + thresholdDeg - 0.5, -90 + thresholdDeg + 0.5)}
            stroke="#f3f3ee"
            strokeWidth="14"
            fill="none"
            opacity="0.5"
          />
        </g>
      )}

      {/* back arm hidden behind body: only the near arm is drawn for clarity */}
      {/* torso */}
      <path d={`M ${fmt(HIP)} Q ${fmt(spineCtrl)} ${fmt(shoulder)}`} stroke="#e8e6dd" strokeWidth="64" strokeLinecap="round" fill="none" />

      {/* belt with sensor at the back of the hip */}
      <line x1={beltA.x} y1={beltA.y} x2={beltB.x} y2={beltB.y} stroke="#ffd21f" strokeWidth="18" strokeLinecap="round" />
      <circle cx={sensor.x} cy={sensor.y} r="46" fill="url(#sensor-glow)" />
      <g transform={`translate(${sensor.x} ${sensor.y}) rotate(${lean})`}>
        <rect x="-14" y="-19" width="28" height="38" rx="7" fill="#0e0f13" stroke="#ffd21f" strokeWidth="3" />
        <circle cx="0" cy="-8" r="4" fill={ledOn ? '#b6f23c' : '#2a2c33'} />
      </g>
      {alert &&
        [0, 1, 2].map((k) => {
          const phase = (t * 1.1 + k / 3) % 1
          return (
            <circle
              key={k}
              cx={sensor.x}
              cy={sensor.y}
              r={26 + phase * 90}
              fill="none"
              stroke="#ffd21f"
              strokeWidth={3}
              opacity={(1 - phase) * 0.85}
            />
          )
        })}

      {/* neck and head */}
      <line x1={shoulder.x} y1={shoulder.y} x2={neckTop.x} y2={neckTop.y} stroke="#e2bf9c" strokeWidth="26" strokeLinecap="round" />
      <circle cx={head.x} cy={head.y} r="40" fill="#e2bf9c" />
      <path
        d={`M ${fmt(add(head, v(-40, -6)))} A 40 40 0 0 1 ${fmt(add(head, v(34, -22)))}`}
        stroke="#2a2c33"
        strokeWidth="18"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={head.x + 22} cy={head.y - 2} r="3.5" fill="#0e0f13" />

      {/* near arm */}
      <g stroke="#e8e6dd" strokeLinecap="round" fill="none">
        <line x1={shoulder.x} y1={shoulder.y} x2={arm.elbow.x} y2={arm.elbow.y} strokeWidth="30" />
        <line x1={arm.elbow.x} y1={arm.elbow.y} x2={arm.hand.x} y2={arm.hand.y} strokeWidth="26" />
      </g>
      <circle cx={arm.hand.x} cy={arm.hand.y} r="13" fill="#e2bf9c" />

      {/* labels */}
      <g transform="translate(652 236)">
        <rect width="250" height="104" rx="30" fill={calibrated ? color : '#2a2c33'} />
        <text x="26" y="38" fill={calibrated ? '#0e0f13' : '#9a9ca6'} fontSize="20">
          Trunk lean
        </text>
        <text x="26" y="86" fill={calibrated ? '#0e0f13' : '#f3f3ee'} fontSize={calibrated ? 46 : 28} fontWeight="300">
          {calibrated ? `${Math.max(0, lean).toFixed(0)}°` : 'not calibrated'}
        </text>
      </g>
      <g>
        <line x1={sensor.x - 20} y1={sensor.y + 18} x2="150" y2="790" stroke="#ffd21f" strokeWidth="1.5" />
        <circle cx="150" cy="790" r="4" fill="#ffd21f" />
        <text x="70" y="826" fill="#f3f3ee" fontSize="22" fontWeight="500">
          AlignMe belt
        </text>
        <text x="70" y="854" fill="#9a9ca6" fontSize="17">
          MPU6050 + ESP32 at the hip (illustrative)
        </text>
      </g>
      {alert && (
        <text x={sensor.x - 10} y={sensor.y + 128} textAnchor="middle" fill="#ffd21f" fontSize="18">
          Haptic cue — hardware phase
        </text>
      )}
    </svg>
  )
}
