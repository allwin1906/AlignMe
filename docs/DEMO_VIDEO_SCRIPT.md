# AlignMe — Demo Video Script

**Format:** 1920 × 1080 (16:9), about 85 seconds, no voice-over (on-screen captions), soft ambient music optional.
**Layout:** Left ~60%: minimalist illustrated scene of a man at a desk wearing the AlignMe belt. Right ~40%: a phone frame running the **real AlignMe app**, driven live by the same simulated readings as the scene.
**Visual style:** Matches the app. Near-black background, dark grey cards, yellow hero accent, lime for upright, pink/red for slouch, large thin numerals.

**How it is produced:** A dedicated demo page (`demo.html`) plays a scripted timeline. The timeline moves the illustrated figure and feeds identical pitch/roll readings into the real detection engine. The phone shows the real dashboard reacting. Playwright records the page at 1920 × 1080.

**Honesty labels (always visible):**
- Top-right chip: **"Concept demo · simulated sensor data"**
- Belt label: **"AlignMe belt (illustrative) · MPU6050 + ESP32"**
- Haptic pulse label: **"Haptic cue — hardware phase"**. The video never claims the motor exists yet.

---

## Shot list

| Time | Scene (left) | Phone (right) | Caption |
|---|---|---|---|
| **0:00–0:05** | Black screen, AlignMe wordmark fades in, thin lime line draws under it | Hidden | **AlignMe** — *Sit right. Stay aligned.* |
| **0:05–0:12** | Scene fades in: man seated at desk with laptop. Camera eases toward the belt at his lower back/hip; small sensor module glows; pitch/roll axis arrows appear briefly | Phone slides in. App shows **Not calibrated** — "Sit upright and tap Calibrate" | *A wearable belt tracks trunk orientation* |
| **0:12–0:20** | Man straightens to upright. A soft ring pulses around the sensor | Animated tap on **Calibrate**. Gauge snaps to **0°**, baseline pitch/roll fill in, status turns **Upright** | *Step 1 — Calibrate your own upright posture* |
| **0:20–0:30** | Natural idle motion: breathing, slight head turns | Gauge wobbles 1–4°. Trend chart flat, well below the dashed **15°** threshold line | *Small movements stay within range* |
| **0:30–0:40** | He leans forward to pick up a coffee cup (about 3 s), sips, sits back | Gauge jumps past 15°. Status **Temporary deviation**, delay ring fills to 3 s of 10 s, then returns to **Upright** and the ring resets | *Brief movement — timer resets, no alert* |
| **0:40–0:58** | He drifts into a slouch over the laptop: shoulders round, trunk tips forward ~22° | Status **Temporary deviation**; delay ring counts 1 → 10 s. At 10 s the hero card turns red: **Poor posture**. Notification banner drops in: *"Poor posture for 10 s — sit upright"* | *Sustained slouch → alert after 10 seconds* |
| **0:52–0:58** | Concentric pulse rings radiate from the belt, labelled *Haptic cue — hardware phase* | Alert card holds; the event appears in history | *Discreet haptic feedback (Phase II hardware)* |
| **0:58–1:08** | He notices, straightens up | Gauge falls back under the threshold; status **Upright**; delay ring resets. History row: *Alert · 22.4° · held 10.2 s* | *Corrected — monitoring continues* |
| **1:08–1:18** | Camera eases back to the wide shot; he keeps working upright | Phone switches to the **Insights** tab: upright vs slouch time bar, deviation trend, event list | *Every episode logged locally on the device* |
| **1:18–1:25** | Fade to black | Phone fades | **AlignMe** · Modules 1–3 software prototype · simulated data · ESP32 / MPU6050 integration in Phase II · team names |

## Settings used in the demo

Threshold **15°**, persistence (delay) **10 s**, smoothing **3 readings**, 10 Hz simulated sample rate. These are the app's defaults, so what the video shows is reproducible in the app.

## Production checklist (run when asked to create the video)

1. App build passes all tests.
2. `demo.html` timeline matches the shot list above.
3. Record with Playwright at 1920 × 1080 → `.webm`.
4. Convert to `.mp4` (H.264) for PowerPoint. This needs `ffmpeg`, which is not installed yet (`brew install ffmpeg`).
5. Check every caption and honesty label is legible at full screen.
