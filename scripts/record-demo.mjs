/**
 * Renders the demo video frame by frame from demo.html, then encodes an MP4.
 * Playwright's fake clock advances time exactly 1/30 s per frame, so the video
 * is smooth however long each screenshot takes.
 *
 *   npm run dev
 *   node scripts/record-demo.mjs                      # full video → recordings/AlignMe_Demo.mp4
 *   node scripts/record-demo.mjs --preview 3,16,45    # stills at those seconds → recordings/preview/
 */
import { execFileSync } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.env.ALIGNME_URL ?? 'http://localhost:5173/'
const FPS = 30
const DURATION = 86
const OUT = new URL('../recordings/', import.meta.url).pathname
const previewArg = process.argv.indexOf('--preview')
const previews = previewArg > -1 ? process.argv[previewArg + 1].split(',').map(Number) : null

const flush = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let n = 0
        const ch = new MessageChannel()
        ch.port1.onmessage = () => (++n < 4 ? ch.port2.postMessage(0) : resolve())
        ch.port2.postMessage(0)
      }),
  )

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark' })
// Warm-up load with a real clock so the dev server compiles every module and its Tailwind classes first.
const warm = await context.newPage()
await warm.goto(`${BASE}demo.html`)
await warm.waitForTimeout(3000)
await warm.close()

const page = await context.newPage()
await page.clock.install({ time: new Date('2026-10-24T10:30:00') })
// Without pausing, fake time still flows in real time between frames.
await page.clock.pauseAt(new Date('2026-10-24T10:30:01'))
await page.goto(`${BASE}demo.html`)
await page.waitForFunction(() => window.__demoReady === true)
await page.evaluate(() => document.fonts.ready)
await flush(page)

const framesDir = `${OUT}frames/`
if (previews) {
  await mkdir(`${OUT}preview/`, { recursive: true })
  let now = 0
  for (const second of previews.sort((a, b) => a - b)) {
    while (now < second * 1000) {
      await page.clock.runFor(100)
      await flush(page)
      now += 100
    }
    await page.screenshot({ path: `${OUT}preview/t${String(second).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 85 })
    console.log('preview', second)
  }
} else {
  await rm(framesDir, { recursive: true, force: true })
  await mkdir(framesDir, { recursive: true })
  const total = DURATION * FPS
  let elapsed = 0
  for (let i = 0; i < total; i++) {
    const target = Math.round(((i + 1) * 1000) / FPS)
    await page.clock.runFor(target - elapsed)
    elapsed = target
    await flush(page)
    await page.screenshot({ path: `${framesDir}f${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 })
    if (i % 300 === 0) console.log(`frame ${i}/${total}`)
  }
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${framesDir}f%05d.jpg`,
    '-vf', 'scale=out_range=tv,format=yuv420p', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart',
    `${OUT}AlignMe_Demo.mp4`,
  ])
  console.log('encoded', `${OUT}AlignMe_Demo.mp4`)
}
await browser.close()
