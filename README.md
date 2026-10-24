# AlignMe — Posture Monitoring Software Prototype

Phase I software for AlignMe, a smart wearable posture monitoring and correction system (ABD1411 Project Phase I). It covers:

- **Module 1 — posture data processing:** reading validation, reference calibration, rolling-mean smoothing, deviation score.
- **Module 2 — classification and persistence detection:** a deterministic state machine (`NOT_CALIBRATED`, `GOOD_POSTURE`, `TEMPORARY_DEVIATION`, `POOR_POSTURE_ALERT`) that alerts only when a deviation lasts longer than the alert delay.
- **Module 3 — dashboard PWA:** live gauge, simulation controls, trend chart, event history, in-app test results, local storage, installable and offline-capable.

> All posture data in this prototype is **simulated**. No ESP32, MPU6050, Bluetooth or vibration hardware is used in this phase, and the app makes no medical claims.

## Requirements
- Node.js 20.19 or newer, npm 10

## Run
```bash
npm install
npm run dev       # development server at http://localhost:5173
npm test          # unit, scenario and controller tests (Vitest)
npm run build     # type-check and production build into dist/
npm run preview   # serve the production build at http://localhost:4173 (use this to test install and offline)
```

## Using the app
1. Press play to stream simulated readings (Manual mode starts upright).
2. Tap **Calibrate** to save the current posture as your reference.
3. Drag the pitch slider past the threshold. The card turns purple (leaning) and the delay timer runs; after the delay it turns red and an alert banner appears.
4. Or pick a scenario (Good posture, Brief deviation, Everyday movements, Sustained slouch, Slouch and recovery, Noisy boundary). Scenarios calibrate automatically during their upright lead-in. Use 2× or 5× to speed them up.
5. **Insights** shows the trend chart, upright vs off-posture time and the event history. **Tests** runs the evaluation suite in the browser.

Defaults: threshold 15°, alert delay 10 s, smoothing 3 readings, 10 Hz simulated sampling. These are prototype values, not clinical recommendations.

## PPT screenshots and demo video
Both need the dev server running (`npm run dev`) and use Playwright's fake clock, so every run gives the same result.
```bash
npm run screenshots   # raw screens → docs/screenshots/raw/, slide images → docs/screenshots/slide-20…23.png
npm run demo:record   # 86 s explainer video → recordings/AlignMe_Demo.mp4 (needs ffmpeg)
```
Open http://localhost:5173/demo.html to watch the demo live in a browser.

## Project structure
```text
src/
├── engine/        Modules 1 and 2: pure TypeScript, no React, injected timestamps
├── simulation/    Seeded scenarios, manual source, PostureSource interface (hardware seam)
├── evaluation/    Scenario runner, metrics, self-checks (shared by Vitest and the Tests tab)
├── app/           Pure reducer: simulated clock, sources, session stats, history
├── storage/       Validated, bounded localStorage persistence
├── hooks/         usePostureEngine: the only bridge between React and the engine
├── components/    Monitor, Insights, Tests and About views
└── demo/          Demo video stage: illustrated wearer, live readings, phone frame
scripts/           Screenshot, slide and video capture (Playwright)
docs/
├── IMPLEMENTATION_PLAN.md
├── DEMO_VIDEO_SCRIPT.md
└── screenshots/   Slide images for PPT slides 20–23
```

## Design notes
- Deviation = √((pitch − baseline pitch)² + (roll − baseline roll)²). A software score in degrees, not a clinical spine angle.
- Invalid readings and non-increasing timestamps are rejected without changing state.
- A gap of more than 2 s between readings (for example a suspended tab) restarts smoothing and any active episode, so a gap never counts as held posture. The simulation also pauses while the tab is hidden.
- Settings changes apply from the next reading; calibrating during an alert clears it.
- No hysteresis in v1: the Noisy boundary scenario measures how often the state flips at the threshold.
