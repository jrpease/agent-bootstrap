// interact.mjs — the verification-side interaction recorder.
//
// Sibling to studio-design's record.mjs, NOT a copy of it: that one is a
// scroll-scrub recorder built for marketing pages, and product motion is driven
// by interaction rather than scroll position.
//
// For every moment in the interaction manifest it drives the real trigger with
// real input events, records video, reads a DOM trace, and produces the five
// amplitude parameters. It also emits a capture manifest naming every moment it
// could NOT drive — a moment that silently vanishes would let a flow pass the
// amplitude gate by shipping nothing.
//
// Usage:
//   node interact.mjs <manifest.json> [--out captures]
//
// Manifest shape (referenced from SCREENS.md):
//   {
//     "baseUrl": "http://127.0.0.1:3000",
//     "surfaces": [
//       { "name": "desktop", "width": 1440, "height": 900 },
//       { "name": "mobile",  "width": 390,  "height": 844, "cpuThrottle": 4 }
//     ],
//     "moments": [
//       { "id": "save-record", "type": "transition", "signature": true,
//         "url": "/records/1",
//         "force":   { "kind": "seed", "pattern": "**/api/rows*", "count": 12 },
//         "setup":   { "kind": "click", "selector": "[data-test=open]" },
//         "trigger": { "kind": "click", "selector": "[data-test=save]" } }
//     ]
//   }
//
// trigger.kind: click | hover | press | type | js
//   click/hover  { selector }
//   press        { selector?, key }            e.g. "Enter", "Escape"
//   type         { selector, text }
//   js           { expression }                run in page; deterministic path,
//                                              uses __pdCapture

import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { measureFromTrace, MOMENT_TYPES } from './motion-measure.mjs'
import { applyRoute } from './force-lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

const arg = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1] }
const manifestPath = process.argv[2]
if (!manifestPath) { console.error('usage: node interact.mjs <manifest.json> [--out dir]'); process.exit(1) }
const outDir = path.resolve(arg('--out', 'captures'))

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const probeSrc = await readFile(path.join(here, 'canon', 'measure-motion.js'), 'utf8')
await mkdir(outDir, { recursive: true })

// Settle time after the trigger. Longer than the canon's longest measured moment
// (1650ms) so a slow moment is measured rather than truncated.
const SETTLE_MS = 2200

async function drive (page, step) {
  switch (step.kind) {
    case 'click': await page.click(step.selector, { timeout: 5000 }); return
    case 'hover': await page.hover(step.selector, { timeout: 5000 }); return
    case 'press':
      if (step.selector) await page.focus(step.selector, { timeout: 5000 })
      await page.keyboard.press(step.key)
      return
    case 'type': await page.fill(step.selector, step.text, { timeout: 5000 }); return
    // A `js` TRIGGER is handled inside __pdCapture, which must wrap it to
    // capture the animations it creates. A `js` SETUP runs before the probe is
    // armed and so is evaluated here — returning silently made every scripted
    // setup a no-op, which is indistinguishable from one that ran.
    case 'js':
      if (step.asSetup) await page.evaluate(expr => eval(expr), step.expression)
      return
    default: throw new Error(`unknown trigger kind "${step.kind}"`)
  }
}

const results = []

for (const surface of manifest.surfaces) {
  const browser = await chromium.launch()
  for (const moment of manifest.moments) {
    const label = `${moment.id}-${surface.name}`
    const record = {
      id: moment.id, surface: surface.name, momentType: moment.type,
      signature: !!moment.signature, offered: true, captured: false
    }

    if (!MOMENT_TYPES.includes(moment.type)) {
      record.note = `type must be one of ${MOMENT_TYPES.join('|')}; got "${moment.type}"`
      results.push(record); continue
    }

    const ctx = await browser.newContext({
      viewport: { width: surface.width, height: surface.height },
      recordVideo: { dir: outDir, size: { width: surface.width, height: surface.height } }
    })
    const page = await ctx.newPage()
    try {
      const client = surface.cpuThrottle ? await ctx.newCDPSession(page) : null
      if (client) await client.send('Emulation.setCPUThrottlingRate', { rate: surface.cpuThrottle })

      // A signature moment nearly always needs data on screen before it can be
      // triggered: a row cannot land in a list that has no rows. Same `force`
      // block shape as the state manifest.
      if (moment.force?.pattern) await applyRoute(page, moment.force)
      await page.goto(new URL(moment.url ?? '/', manifest.baseUrl).href, { waitUntil: 'networkidle' })
      await page.evaluate(probeSrc)
      if (moment.setup) await drive(page, { ...moment.setup, asSetup: true })
      await page.waitForTimeout(300)

      // The trigger must not run before the probe is armed, or the animations it
      // creates are already in the baseline and the moment measures as empty.
      if (moment.trigger.kind === 'js') {
        await page.evaluate(expr => window.__pdCapture(() => eval(expr)), moment.trigger.expression)
      } else {
        await page.evaluate(() => window.__pdArm())
        await drive(page, moment.trigger)
      }
      await page.waitForTimeout(SETTLE_MS)

      const trace = await page.evaluate(() => window.__pdRead())
      if (trace.warning) record.warning = trace.warning
      if (!trace.events.length) {
        record.note = 'trigger produced no animation — verify the interaction actually animates before recording this as "no motion"'
      } else {
        record.measured = measureFromTrace(trace, moment.type)
        record.ambientExcluded = trace.ambientExcluded
        record.captured = true
      }
    } catch (e) {
      // A moment the tool cannot drive is a NAMED capture defect. Never a silent
      // pass: the amplitude gate must be able to tell "did not move" from
      // "could not be driven".
      record.note = `(capture) ${e.message.split('\n')[0]}`
    } finally {
      await ctx.close()
      const vids = (await import('node:fs')).promises
      try {
        const files = await vids.readdir(outDir)
        const webm = files.filter(f => f.endsWith('.webm') && !f.includes('-'))
        if (webm.length) {
          await vids.rename(path.join(outDir, webm[0]), path.join(outDir, `${label}.webm`))
          record.video = `${label}.webm`
        }
      } catch { /* video naming is best-effort; the measurement is the artifact */ }
    }
    results.push(record)
  }
  await browser.close()
}

const captured = results.filter(r => r.captured).length
const defects = results.filter(r => !r.captured)
const summary = {
  manifest: path.basename(manifestPath),
  moments: results.length,
  captured,
  notCaptured: defects.length,
  signaturePresent: results.some(r => r.signature && r.captured),
  results
}
await writeFile(path.join(outDir, 'capture-manifest.json'), JSON.stringify(summary, null, 2))

for (const r of results) {
  const m = r.measured
  console.log(
    `${r.captured ? 'ok  ' : 'MISS'} ${r.id}/${r.surface}` +
    (m ? `  ${m.durationMs}ms  travel ${m.travelFraction}  parts ${m.participants}  groups ${m.choreographyDepth}` : `  ${r.note ?? ''}`)
  )
}
console.log(`\n${captured}/${results.length} captured -> ${path.join(outDir, 'capture-manifest.json')}`)
if (!summary.signaturePresent) console.log('WARNING: no signature moment was captured — the amplitude gate cannot run')
process.exit(defects.length ? 1 : 0)
