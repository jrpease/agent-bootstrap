// verify/record.mjs — scroll-scrub video recorder, sibling to verify/perf.mjs.
//
// perf.mjs's numbers can look clean while a scroll-scrubbed/pinned animation
// still reads as janky to a human — stills and GIFs both missed that failure
// mode in review. This script records the actual scroll pass as video so the
// motion is watchable, not just measured.
//
// Usage:
//   node verify/record.mjs <url>                    desktop pass (1440×900)
//   node verify/record.mjs <url> --mobile            mobile pass (375×812, 4× CPU throttle)
//   node verify/record.mjs <url> --out <dir>         output dir (default ./captures)
//   node verify/record.mjs <url> --scene <fraction>  cold-landing scroll depth, 0..1 (default 0.5)
//
// Produces three videos per invocation:
//   scroll-slow-{desktop,mobile}.webm  — top-to-bottom in small steps, slow
//                                        enough for a pinned/scrubbed scene
//                                        to play through visibly
//   scroll-fast-{desktop,mobile}.webm  — top-to-bottom in large, fast jumps,
//                                        to expose catch-up jank and scenes
//                                        that skip straight to their end state
//   scroll-cold-{desktop,mobile}.webm  — lands cold: instant-jumps to --scene
//                                        depth (defeats gradual mounting),
//                                        hard-reloads at that scroll position,
//                                        then flicks through the target region
//                                        at fast-pass speed — reproducing a
//                                        visitor who reloads near/at a scene
//                                        and flicks straight into it, which can
//                                        catch content that only mounts when
//                                        approached slowly from above
//
// Absolute paths of the produced files are printed to stdout, one per line.
// Everything else (progress, notices) goes to stderr.

import { chromium } from 'playwright'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const SLOW = { step: 150, waitMs: 90, holdTopMs: 500, holdBottomMs: 700 }
const FAST = { step: 900, waitMs: 15, holdTopMs: 200, holdBottomMs: 400 }
const COLD = { settleMs: 400, holdEndMs: 400, flickViewports: 3 }
const DEFAULT_SCENE = 0.5
const MAX_STEPS = 3000

export async function record(url, { width = 1440, height = 900, cpuThrottle = 1, outDir = './captures', label = 'desktop', scene = DEFAULT_SCENE } = {}) {
  mkdirSync(outDir, { recursive: true })
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'studio-design-record-'))

  const browser = await chromium.launch()
  try {
    const slow = await runPass(browser, url, { width, height, cpuThrottle, tmpDir, outDir, name: `scroll-slow-${label}.webm`, cfg: SLOW })
    const fast = await runPass(browser, url, { width, height, cpuThrottle, tmpDir, outDir, name: `scroll-fast-${label}.webm`, cfg: FAST })
    const cold = await runColdLandingPass(browser, url, { width, height, cpuThrottle, tmpDir, outDir, name: `scroll-cold-${label}.webm`, scene })
    return { slow, fast, cold }
  } finally {
    await browser.close()
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

async function runPass(browser, url, { width, height, cpuThrottle, tmpDir, outDir, name, cfg }) {
  process.stderr.write(`recording ${name} ...\n`)
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: tmpDir, size: { width, height } },
  })
  const page = await context.newPage()
  if (cpuThrottle > 1) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle })
  }
  await page.goto(url, { waitUntil: 'networkidle' })

  const video = page.video()
  await scrollFullPage(page, cfg)

  await context.close()
  const finalPath = path.resolve(outDir, name)
  await video.saveAs(finalPath)
  process.stderr.write(`  -> ${finalPath}\n`)
  return finalPath
}

// Drives the page's own scroll pipeline via real wheel events (not
// scrollTo()) so Lenis/ScrollTrigger and other smooth-scroll hijacks respond
// the way a visitor's scroll would. Holds at top and bottom so the recording
// covers settle time on either end of the pass, and handles pages shorter
// than the viewport (maxScroll <= 0) by just holding, no scrolling.
async function scrollFullPage(page, { step, waitMs, holdTopMs, holdBottomMs }) {
  await page.waitForTimeout(holdTopMs)

  let steps = 0
  while (steps < MAX_STEPS) {
    const { scrollY, maxScroll } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    }))
    if (scrollY >= maxScroll - 1) break
    await page.mouse.wheel(0, step)
    await page.waitForTimeout(waitMs)
    steps++
  }

  await page.waitForTimeout(holdBottomMs)
}

// Simulates a cold-landing visitor: instant-jumps to the target scene depth
// (window.scrollTo, not wheel events — the point is to arrive without
// anything gently mounting along the way), hard-reloads at that scroll
// position, then flicks through the target region at fast-pass speed.
//
// Playwright records video for the lifetime of a page/context and can't be
// started only "just before" the reload, so instead we minimize what
// precedes it: the initial goto + instant jump happen back-to-back with no
// scrolling animation, so the recording is dominated by the reload and the
// flick that follows it — what a cold-landing visitor actually sees.
async function runColdLandingPass(browser, url, { width, height, cpuThrottle, tmpDir, outDir, name, scene }) {
  process.stderr.write(`recording ${name} ...\n`)
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: tmpDir, size: { width, height } },
  })
  const page = await context.newPage()
  if (cpuThrottle > 1) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle })
  }
  await page.goto(url, { waitUntil: 'networkidle' })

  const targetY = await page.evaluate((scene) => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const y = Math.round(maxScroll * scene)
    window.scrollTo({ top: y, left: 0, behavior: 'instant' })
    return y
  }, scene)

  const video = page.video()
  await page.reload({ waitUntil: 'networkidle' })

  // Browsers restore the pre-reload scroll position by default
  // (history.scrollRestoration === 'auto'). Pages that opt out, or reset
  // scroll on their own boot logic, get re-jumped here so the reload still
  // lands cold at the intended depth instead of at the top.
  const restoredY = await page.evaluate(() => window.scrollY)
  if (Math.abs(restoredY - targetY) > 2) {
    await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), targetY)
  }

  await page.waitForTimeout(COLD.settleMs)
  await flickFromHere(page, { step: FAST.step, waitMs: FAST.waitMs, viewports: COLD.flickViewports })
  await page.waitForTimeout(COLD.holdEndMs)

  await context.close()
  const finalPath = path.resolve(outDir, name)
  await video.saveAs(finalPath)
  process.stderr.write(`  -> ${finalPath}\n`)
  return finalPath
}

// Flicks down from the current scroll position — through the target region
// and a few viewports past it — using real wheel events at fast-pass speed.
async function flickFromHere(page, { step, waitMs, viewports }) {
  const startY = await page.evaluate(() => window.scrollY)

  let steps = 0
  while (steps < MAX_STEPS) {
    const { scrollY, maxScroll, innerHeight } = await page.evaluate(() => ({
      scrollY: window.scrollY,
      maxScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      innerHeight: window.innerHeight,
    }))
    const targetEnd = Math.min(maxScroll, startY + viewports * innerHeight)
    if (scrollY >= targetEnd - 1) break
    await page.mouse.wheel(0, step)
    await page.waitForTimeout(waitMs)
    steps++
  }
}

// ---- CLI --------------------------------------------------------------------

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly) {
  const args = process.argv.slice(2)
  const url = args.find((a) => !a.startsWith('--'))
  if (!url) { console.error('usage: node verify/record.mjs <url> [--mobile] [--out <dir>] [--scene <fraction>]'); process.exit(1) }
  const mobile = args.includes('--mobile')
  const outIdx = args.indexOf('--out')
  const outDir = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : './captures'
  const sceneIdx = args.indexOf('--scene')
  const scene = sceneIdx !== -1 && args[sceneIdx + 1] ? parseFloat(args[sceneIdx + 1]) : DEFAULT_SCENE

  const opts = mobile
    ? { width: 375, height: 812, cpuThrottle: 4, outDir, label: 'mobile', scene }
    : { width: 1440, height: 900, outDir, label: 'desktop', scene }

  process.stderr.write(`# ${url} · ${mobile ? '375×812 @4× CPU throttle' : '1440×900 unthrottled'} · scene@${scene}\n`)
  try {
    const { slow, fast, cold } = await record(url, opts)
    console.log(slow)
    console.log(fast)
    console.log(cold)
    process.exit(0)
  } catch (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
