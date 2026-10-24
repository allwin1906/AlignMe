/**
 * Lays the raw app screenshots out as 1920×1080 images for PPT slides 20–23.
 * Run after scripts/capture-screenshots.mjs: `node scripts/compose-slides.mjs`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const root = new URL('../', import.meta.url).pathname
const raw = (name) => `file://${root}docs/screenshots/raw/${name}.png`
const font = `file://${root}node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2`
const OUT = `${root}docs/screenshots/`

const phone = (name, caption) => `
  <figure class="phone"><div class="bezel"><img src="${raw(name)}" alt=""></div><figcaption>${caption}</figcaption></figure>`
const desktop = (name, caption, width = 1000) => `
  <figure class="desktop" style="width:${width}px"><div class="window"><div class="bar"><i></i><i></i><i></i></div><div class="crop"><img src="${raw(name)}" alt=""></div></div><figcaption>${caption}</figcaption></figure>`

const SLIDES = [
  {
    file: 'slide-20-posture-sensor-output',
    title: 'Posture sensor output',
    lead: 'Simulated pitch and roll readings arrive at 10 Hz, are smoothed with a rolling mean, and are plotted as deviation from the reference posture.',
    body: desktop('20a-desktop-sensor-output', 'Dashboard during the “Everyday movements” scenario: two brief leans cross the 15° threshold') +
      phone('20b-phone-readings-and-chart', 'Live raw and smoothed readings on a phone'),
  },
  {
    file: 'slide-21-reference-calibration-output',
    title: 'Reference calibration output',
    lead: 'The user sits upright and taps Calibrate. The current smoothed pitch and roll are stored as the personal baseline, and classification begins.',
    body: phone('21a-phone-before-calibration', 'Before: Not calibrated, no classification') +
      `<div class="arrow"><span>Tap Calibrate</span><svg viewBox="0 0 120 24"><path d="M2 12h108m-12-10 12 10-12 10" stroke="#ffd21f" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` +
      phone('21b-phone-after-calibration', 'After: baseline 3.8°, −1.1° saved, state Upright at 0°') +
      `<ul class="facts"><li><b>Baseline</b> = current smoothed pitch and roll</li><li><b>Smoothing buffer</b> and timer are reset</li><li><b>Reset calibration</b> returns to Not calibrated</li><li>Baseline is kept in local storage across reloads</li></ul>`,
  },
  {
    file: 'slide-22-posture-deviation-detection',
    title: 'Posture deviation detection',
    lead: 'Deviation = √(Δpitch² + Δroll²) from the baseline. At 15° or more the state becomes Leaning and the delay timer starts.',
    body: desktop('22b-desktop-deviation-detection', 'Deviation jumps to 25°, above the dashed 15° threshold; the shaded band marks the running timer') +
      phone('22a-phone-leaning-delay-timer', 'Leaning: delay timer at 4.0 of 10 s, no alert yet'),
  },
  {
    file: 'slide-23-persistence-condition-result',
    title: 'Persistence condition result',
    lead: 'An alert is raised only when the deviation lasts the full 10 s delay. Brief movements reset the timer; recovery clears the alert.',
    body: desktop('23c-desktop-persistence-alert', 'Held past 10 s: state turns to Poor posture and the chart band turns red', 800) +
      phone('23a-phone-poor-posture-alert', 'Software alert banner after 11 s') +
      phone('23b-phone-history-persistence', 'History logs the alert: deviation 25.2°, held 10.0 s'),
  },
]

const css = `
@font-face { font-family: Outfit; src: url(${font}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; background: #0e0f13; color: #f3f3ee; font-family: Outfit, sans-serif; padding: 64px 80px; display: flex; flex-direction: column; }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; }
h1 { font-size: 60px; font-weight: 500; letter-spacing: -0.01em; }
.lead { margin-top: 10px; font-size: 24px; line-height: 1.4; color: rgba(243,243,238,.75); max-width: 1180px; }
.chip { flex-shrink: 0; border: 1px solid rgba(255,210,31,.5); color: #ffd21f; border-radius: 999px; padding: 10px 20px; font-size: 18px; }
main { flex: 1; display: flex; align-items: center; justify-content: center; gap: 48px; margin-top: 28px; }
figure { display: flex; flex-direction: column; align-items: center; gap: 16px; }
figcaption { font-size: 18px; color: #9a9ca6; text-align: center; max-width: 100%; line-height: 1.35; }
.phone .bezel { height: 660px; aspect-ratio: 1170 / 2532; border-radius: 52px; padding: 10px; background: #1b1c21; box-shadow: 0 30px 60px rgba(0,0,0,.6), inset 0 0 0 1px #353740; }
.phone img { width: 100%; height: 100%; border-radius: 44px; display: block; }
.phone figcaption { width: 300px; }
.window { width: 100%; border-radius: 22px; overflow: hidden; background: #17181d; box-shadow: 0 30px 60px rgba(0,0,0,.6), inset 0 0 0 1px #353740; }
.bar { height: 34px; display: flex; gap: 8px; align-items: center; padding: 0 16px; background: #1b1c21; }
.bar i { width: 11px; height: 11px; border-radius: 50%; background: #353740; }
.crop { aspect-ratio: 2880 / 1840; overflow: hidden; }
.crop img { width: 100%; display: block; }
.arrow { display: flex; flex-direction: column; align-items: center; gap: 10px; color: #ffd21f; font-size: 20px; }
.arrow svg { width: 120px; }
.facts { list-style: none; padding: 0; width: 360px; display: flex; flex-direction: column; gap: 18px; font-size: 21px; line-height: 1.35; color: rgba(243,243,238,.8); }
.facts li { padding: 18px 22px; border-radius: 22px; background: #2a2c33; }
.facts b { color: #f3f3ee; font-weight: 500; }
footer { font-size: 16px; color: #9a9ca6; }
`

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
for (const slide of SLIDES) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
    <header><div><h1>${slide.title}</h1><p class="lead">${slide.lead}</p></div><span class="chip">AlignMe app · simulated data</span></header>
    <main>${slide.body}</main>
    <footer>Screens from the AlignMe Phase I software prototype. Readings are simulated, not measured by hardware.</footer>
  </body></html>`
  const file = `${OUT}.${slide.file}.html`
  await writeFile(file, html)
  await page.goto(`file://${file}`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: `${OUT}${slide.file}.png` })
  console.log('saved', slide.file)
}
await browser.close()
