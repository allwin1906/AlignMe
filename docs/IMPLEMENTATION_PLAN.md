# AlignMe — Phase I Software Implementation Plan

Scope: front-end software only, covering Module 1 (posture data processing), Module 2 (classification and persistence detection) and Module 3 (dashboard / PWA). All posture data is simulated. No ESP32, MPU6050, BLE or vibration hardware in this phase.

Sources: `AlignMe_Software_Master_Plan.md` (requirements) and `AlignMe_Project_Review.pptx` (module definitions, architecture diagram, empty output slides 20–23).

---

## 1. Technology stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast dev server, static build, first-class PWA plugin |
| UI | **React 18 + TypeScript (strict)** | Component model for the dashboard; types protect the engine contract |
| Styling / components | **Tailwind CSS + shadcn/ui** (Radix primitives, `lucide-react` icons) | Accessible sliders, tabs, dialogs and switches out of the box; keyboard-operable |
| Chart | **Recharts** | Responsive line chart with a threshold reference line and tooltips |
| PWA | **vite-plugin-pwa** (Workbox) | Generates the manifest and a service worker that caches the app shell |
| Tests | **Vitest** (+ `@testing-library/react` for a few UI checks) | Same TypeScript code as the app; injected timestamps, no real waiting |
| Persistence | Browser `localStorage` through a validated wrapper | Required by the plan; no backend |

**Why not Next.js:** AlignMe is a client-only app with no server, no API routes and no SEO needs. Its state lives in `localStorage`. Next.js would add server rendering, and that causes hydration mismatches with `localStorage` reads while offering nothing in return. Vite + React produces a plain static PWA that runs on `localhost` or any HTTPS static host.

Full dependency list (approving this plan approves these):
`react`, `react-dom`, `recharts`, `lucide-react`, Radix packages pulled in by the shadcn components used, `class-variance-authority`, `clsx`, `tailwind-merge` · dev: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `vite-plugin-pwa`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`.

Housekeeping: `git init` in `AlignMe/`, and add an `AlignMe/CLAUDE.md` stating that this project follows the master plan. Otherwise the parent `Downloads/CLAUDE.md` rules (Next.js, Prisma, Clerk, Stripe) would apply here.

---

## 2. Architecture

```
 PostureSource (interface)            ← simulator now; ESP32/BLE adapter later
   ├─ ScenarioSimulator  (scripted scenarios, seeded noise, simulated clock)
   └─ ManualSource       (pitch/roll sliders for live demos)
          │  Reading { pitch, roll, timestamp }
          ▼
 Engine (pure TypeScript — no React, no DOM, no Date.now())
   ├─ validation.ts   finite-number + monotonic-timestamp checks
   ├─ processing.ts   Module 1: calibration, rolling-mean smoothing, deviation
   ├─ detector.ts     Module 2: state machine + persistence timer
   └─ engine.ts       step(state, input) → { state, output, events }
          │  EngineOutput
          ▼
 usePostureEngine() hook   ← the ONLY place the UI touches the engine
          ▼
 Dashboard (Module 3) ─ storage.ts (settings, baseline, bounded history)
          ▲
 evaluation/ (shared scenario runner + metrics) ─ used by Vitest AND the in-app Test panel
```

Rules:
- The engine is a set of pure functions over a serialisable state object (reducer style). The UI never contains a second copy of the classification logic.
- Every timestamp comes from the source's simulated clock, never from `Date.now()` inside the engine. That makes tests deterministic and lets the UI offer playback speed (1×, 2×, 5×).
- The `PostureSource` interface is the hardware seam. A later phase adds an ESP32 adapter without touching the engine. No Web Bluetooth code in this phase.

### Engine interface (draft)

```ts
type Reading = { pitch: number; roll: number; timestamp: number };   // degrees, ms
type PostureState = 'NOT_CALIBRATED' | 'GOOD_POSTURE' | 'TEMPORARY_DEVIATION' | 'POOR_POSTURE_ALERT';
type Settings = { thresholdDeg: number; persistenceSeconds: number; smoothingWindow: number };

createEngine(settings, baseline?) → EngineState
step(state, reading)              → { state, output: EngineOutput, events: EngineEvent[] }
calibrate(state)                  → EngineState   // baseline = current smoothed reading
resetCalibration(state)           → EngineState
updateSettings(state, settings)   → EngineState   // validated and clamped
```

`EngineOutput` = smoothed pitch/roll, baseline, deviation, posture state, `persistenceSeconds`, calibration status, timestamp, and a rejected-reading reason if any.

---

## 3. Algorithms (from the master plan)

- **Calibration:** baseline = current smoothed pitch/roll. Clears the smoothing buffer and any active episode. Reset returns the engine to `NOT_CALIBRATED`.
- **Smoothing:** rolling arithmetic mean over the last N valid readings, applied to pitch and roll separately. A larger N gives smoother values but slower transitions; this trade-off is documented, and smoothing is not described as removing all noise.
- **Deviation:** `sqrt((pitch − baselinePitch)² + (roll − baselineRoll)²)`, in one function. Labelled as a software deviation score, not a clinical spinal angle.
- **Detection:** below threshold → `GOOD_POSTURE` and timer cleared. At or above threshold → `TEMPORARY_DEVIATION` with `deviationSince` recorded. Held for at least `persistenceSeconds` → `POOR_POSTURE_ALERT`. Returning below threshold ends the episode; the next deviation starts a fresh timer.

### Default settings (prototype values, not clinically derived)

| Setting | Default | Allowed range |
|---|---|---|
| `thresholdDeg` | 15° | 5°–45° |
| `persistenceSeconds` | 10 s | 2–120 s |
| `smoothingWindow` | 3 readings | 1–20 |
| Simulated sample rate | 10 Hz (100 ms) | fixed |
| Event history | 100 entries | fixed cap |

### Edge-case policies (one rule each, all unit-tested)

| Case | Policy |
|---|---|
| Invalid reading (NaN, Infinity, missing field) | Rejected. State unchanged, no alert. Surfaced as a "rejected reading" counter and status note |
| Duplicate or out-of-order timestamp | Rejected the same way. Timestamps must strictly increase |
| Large timestamp gap (> 2 s, e.g. tab suspended) | Treated as a discontinuity: smoothing buffer and active episode reset. A gap never counts as persisted bad posture. The simulator also pauses on `visibilitychange` |
| Threshold changed mid-episode | Applied from the next reading. If the deviation is still at or above the new threshold, the episode keeps its original start time; if not, the episode ends |
| Persistence time changed mid-episode | Applied from the next reading against the existing `deviationSince` |
| Smoothing window changed | Buffer trimmed to the new size; no other reset |
| Calibrate during an alert | New baseline; buffer and episode cleared; state re-evaluated from the next reading |
| Flicker around the threshold | No hysteresis in v1. The noisy-boundary scenario measures how often the state flips, and the result is reported. Hysteresis is listed as future work |

---

## 4. Module 3 — dashboard

Layout: one responsive dashboard (grid on desktop, stacked on phones), with tabs for **Monitor · History · Tests · About**. A persistent **"Simulated data — not measured by hardware"** banner shows on every view.

| Area | Contents |
|---|---|
| Status card | State name, icon and text description (never colour alone), deviation score, persistence progress bar toward the alert |
| Reading cards | Raw and smoothed pitch and roll |
| Calibration panel | Baseline values, Calibrate and Reset buttons, `NOT_CALIBRATED` empty state |
| Settings panel | Threshold, persistence and smoothing sliders with numeric inputs, validated against the bounds above |
| Simulation controls | Scenarios: Good posture, Brief deviation, Sustained slouch, Recovery, Noisy boundary. Start, Stop, speed, and a Manual mode with pitch/roll sliders |
| Trend chart | Deviation over the last ~60 s of simulated time, with a dashed threshold line and alert periods shaded |
| Event history | State transitions, calibration and settings changes: time, scenario, from→to state, deviation, persistence duration. Clear-history action |
| Software alert | On-screen alert banner (plus optional browser notification and sound). The text never says the vibration motor fired |
| Tests tab | Runs the shared evaluation suite in the browser: pass/fail per scenario check, confusion matrix, false and missed alerts, detection delay |
| About tab | Scope, limitations, local-only data note, install instructions per browser |

**Mapping to the empty PPT output slides:**

| Slide | Screenshot from |
|---|---|
| 20 — Posture Sensor Output | Reading cards + trend chart while a scenario runs |
| 21 — Reference Calibration Output | Calibration panel before and after Calibrate |
| 22 — Posture Deviation Detection | Status card in `TEMPORARY_DEVIATION` with the chart crossing the threshold |
| 23 — Persistence Condition Result | Status card in `POOR_POSTURE_ALERT` + history row showing the persistence duration |

**Storage:** settings, baseline and the last 100 history entries in `localStorage` under a versioned key. Every read is schema-checked; corrupt or unavailable storage falls back to defaults with a visible notice. The About tab explains that data stays on this browser and device.

**PWA:** manifest (name, theme colour, 192/512/maskable icons generated from an SVG logo), service worker registered only on HTTPS or localhost, and app-shell precaching for offline load. Installability is verified on the production build (`vite build && vite preview`), not on the dev server.

---

## 5. Testing and evaluation

**Unit tests (Vitest), written before the code they test:** calibration, zero deviation at baseline, pitch-only and roll-only deviation, rolling mean for N = 1/3/5, not-calibrated state, temporary deviation before the persistence time, alert at the persistence time, recovery resets the timer, new episode starts a fresh timer, invalid input, duplicate timestamps, the gap policy, settings bounds, mid-episode settings changes, calibrating during an alert, and storage corruption fallback.

**Scenario suite (`src/evaluation/`), shared by Vitest and the Tests tab:**
1. Good posture: no alert expected
2. Brief deviation (shorter than the persistence time): no alert expected
3. Sustained slouch: alert expected after the persistence time
4. Recovery: alert, then return to `GOOD_POSTURE` with the timer reset
5. Noisy boundary: observational; reports state-flip count
6. Calibration change: deviation recalculated against the new baseline

Each labelled scenario (1–4) runs with 20 noise seeds. That defines the test set as 80 labelled runs, from which the suite reports a **confusion matrix** (alert expected vs alert raised), accuracy, precision, recall, F1, false alerts, missed alerts, and **detection delay** (from sustained-deviation start to alert). All numbers are computed live. Nothing is hard-coded, and every result is labelled as software behaviour on designed scenarios, not real-world accuracy.

**UI verification:** desktop (1280 px) and phone (375 px) viewports in a browser, keyboard-only walkthrough, reload persistence check, and offline reload after install.

---

## 6. Phases (one commit each; tests pass before moving on)

| Phase | Work | Done when |
|---|---|---|
| **A — Scaffold** | git init, Vite + React + TS strict, Tailwind + shadcn, Vitest, folder structure, `CLAUDE.md`, README with run steps | `npm run dev`, `npm test` and `npm run build` all succeed from a clean clone |
| **B — Module 1** | Types, validation, calibration, smoothing, deviation | Module 1 acceptance criteria and tests pass |
| **C — Module 2** | Detector state machine, settings validation, edge-case policies | Module 2 acceptance criteria and tests pass |
| **D1 — Simulation + evaluation** | `PostureSource`, seeded scenarios, manual source, shared evaluation suite and metrics | Scenario suite passes in Vitest |
| **D2 — Dashboard** | Hook, all dashboard areas, history, storage, alert banner, responsive layout | All six scenarios behave correctly in the browser; reload keeps settings and history |
| **D3 — PWA** | Manifest, icons, service worker, offline shell, install instructions | Installable and loads offline on the `vite preview` build |
| **E — Validation and evidence** | Full test run, screenshots for slides 20–23, `docs/TEST_REPORT.md` (algorithms, policies, results, limitations), hardware-integration notes | Definition of Done in master plan section 10 is met |

Each phase ends with a short report: files changed, decisions, tests run and their results, known issues, next step.

## 7. Out of scope (needs explicit approval to add)

ESP32/MPU6050/BLE/vibration hardware, Web Bluetooth, cloud sync or accounts, machine-learning classification, hysteresis (future work), production deployment.
