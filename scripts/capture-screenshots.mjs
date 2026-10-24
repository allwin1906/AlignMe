/**
 * Captures the app screens used on PPT slides 20–23.
 * Requires the dev server: `npm run dev`, then `node scripts/capture-screenshots.mjs`.
 * Playwright's fake clock drives the simulation, so every run produces the same screens.
 */
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = process.env.ALIGNME_URL ?? 'http://localhost:5173/'
const OUT = new URL('../docs/screenshots/raw/', import.meta.url).pathname
const START = new Date('2026-10-24T10:30:00')

/** Let React commit after fake-clock timers fire (MessageChannel is not faked). */
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

async function advance(page, ms) {
  await page.clock.runFor(ms)
  await flush(page)
}

async function open(browser, viewport, deviceScaleFactor) {
  const context = await browser.newContext({ viewport, deviceScaleFactor, colorScheme: 'dark', reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.clock.install({ time: START })
  // Pause so simulated time only moves when the script advances it.
  await page.clock.pauseAt(new Date(START.getTime() + 1000))
  await page.goto(BASE)
  await page.getByRole('button', { name: 'Start simulation' }).waitFor()
  await flush(page)
  return { context, page }
}

const shot = async (page, name, options = {}) => {
  await flush(page)
  await page.screenshot({ path: `${OUT}${name}.png`, ...options })
  console.log('saved', name)
}

const calibrateButton = (page) => page.getByRole('button', { name: /^(Re)?calibrate$/i })
const pitch = (page) => page.getByRole('slider', { name: /Pitch/ })

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

// Phone: calibration, deviation, alert, history (slides 21, 22, 23).
{
  const { context, page } = await open(browser, { width: 390, height: 844 }, 3)
  await page.getByRole('button', { name: 'Start simulation' }).click()
  await advance(page, 2000)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '21a-phone-before-calibration')

  await calibrateButton(page).click()
  await advance(page, 1500)
  await shot(page, '21b-phone-after-calibration')

  await pitch(page).fill('29')
  await advance(page, 4200)
  await page.evaluate(() => window.scrollTo(0, 0))
  await shot(page, '22a-phone-leaning-delay-timer')

  await advance(page, 7000)
  await shot(page, '23a-phone-poor-posture-alert')

  await page.getByRole('button', { name: 'Dismiss alert' }).click()
  await page.getByRole('button', { name: 'Insights', exact: true }).click()
  await advance(page, 300)
  await page.locator('#history').scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -12))
  await shot(page, '23b-phone-history-persistence')
  await context.close()
}

// Phone: live readings and chart during a scenario (slide 20).
{
  const { context, page } = await open(browser, { width: 390, height: 844 }, 3)
  await page.getByRole('button', { name: 'Everyday movements' }).click()
  await advance(page, 9800)
  await page.locator('#readings-title').evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 330))
  await shot(page, '20b-phone-readings-and-chart')
  await context.close()
}

// Desktop: sensor output over time (slide 20).
{
  const { context, page } = await open(browser, { width: 1440, height: 900 }, 2)
  await page.getByRole('button', { name: 'Everyday movements' }).click()
  for (let i = 0; i < 30; i++) await advance(page, 1000)
  await shot(page, '20a-desktop-sensor-output', { fullPage: true })
  await context.close()
}

// Desktop: deviation crossing the threshold, then the persistence alert (slides 22, 23).
// A tall viewport fits the whole dashboard, so the fixed bottom bar sits below the content.
{
  const { context, page } = await open(browser, { width: 1440, height: 1240 }, 2)
  await page.getByRole('button', { name: 'Start simulation' }).click()
  await advance(page, 2000)
  await calibrateButton(page).click()
  for (let i = 0; i < 6; i++) await advance(page, 1000)
  await pitch(page).fill('29')
  for (let i = 0; i < 6; i++) await advance(page, 1000)
  await shot(page, '22b-desktop-deviation-detection')
  for (let i = 0; i < 6; i++) await advance(page, 1000)
  await shot(page, '23c-desktop-persistence-alert')
  await context.close()
}

await browser.close()
