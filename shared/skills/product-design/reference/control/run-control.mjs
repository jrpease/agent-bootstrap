// run-control.mjs — records the control fixture and asserts motion-measure.mjs
// recovers its known-true values on BOTH paths.
//
// This is the module's --expect-fail equivalent. perf.mjs learned the hard way
// that a harness whose recorder never armed is indistinguishable from a clean
// result; a measurement module that was never run against a known input is the
// same failure one layer down.
//
//   node run-control.mjs

import { chromium } from 'playwright'
import { mkdir, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { measureFromTrace, measureFromVideo, segmentFromVideo } from '../motion-measure.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const out = path.join(here, 'out')

const TRUTH = { participants: 3, choreographyDepth: 2, durationMs: 400, travelPx: 120 }
const TOL = { durationMs: 90 }   // ±2 frames at Playwright's ~25fps capture

const results = []
const check = (name, actual, expected, tol = 0) => {
  const ok = Math.abs(actual - expected) <= tol
  results.push({ name, actual, expected, tol, ok })
}

await mkdir(out, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 800, height: 600 },
  recordVideo: { dir: out, size: { width: 800, height: 600 } }
})
const page = await ctx.newPage()
await page.goto('file://' + path.join(here, 'motion-control.html'))

// Lead-in idle. This is the dead air that the first draft of the pixel path
// would have counted as motion — leave it in, it is the regression guard.
await page.waitForTimeout(600)
const trace = await page.evaluate(() => window.__trace())
await page.evaluate(() => window.__start())
await page.waitForTimeout(1200)

await ctx.close()
await browser.close()

const video = (await readdir(out)).find(f => f.endsWith('.webm'))
if (!video) throw new Error('playwright produced no video')
await writeFile(path.join(out, 'trace.json'), JSON.stringify(trace, null, 2))

const t = measureFromTrace(trace, 'transition')
check('trace · participants', t.participants, TRUTH.participants)
check('trace · choreographyDepth', t.choreographyDepth, TRUTH.choreographyDepth)
check('trace · durationMs', t.durationMs, TRUTH.durationMs)
check('trace · travelPx', t.travelPx, TRUTH.travelPx)

const v = await measureFromVideo(path.join(out, video), 'transition')
check('pixel · durationMs', v.durationMs, TRUTH.durationMs, TOL.durationMs)

// Provenance is not cosmetic: it is what stops a guessed participant count from
// entering the canon medians the amplitude gate grades against.
const provOk =
  v.participants === null && v.choreographyDepth === null &&
  v.provenance.participants === 'annotated' &&
  v.provenance.choreographyDepth === 'annotated' &&
  v.provenance.durationMs === 'derived'
results.push({ name: 'pixel · identity params withheld and marked annotated', actual: provOk, expected: true, ok: provOk })

// The automatic analysis: participants, stagger groups and travel derived from
// pixels alone, with no operator input. The control is the only place these can
// be checked against a known truth.
const seg = await segmentFromVideo(path.join(out, video), {})
const auto = seg.moments[0] ?? {}
check('auto  · participants', auto.participants, TRUTH.participants)
check('auto  · choreographyDepth', auto.choreographyDepth, 2)
check('auto  · travelFraction', auto.travelFraction, 0.15, 0.04)   // 120px / 800px, ~10% low by method

for (const r of results) {
  const mark = r.ok ? 'ok  ' : 'FAIL'
  const tol = r.tol ? ` (±${r.tol})` : ''
  console.log(`${mark} ${r.name}: ${r.actual} — expected ${r.expected}${tol}`)
}
const failed = results.filter(r => !r.ok).length
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed')
process.exit(failed ? 1 : 0)
