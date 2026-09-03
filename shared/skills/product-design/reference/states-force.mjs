// states-force.mjs — force every state in the inventory, and shoot it.
//
// The instrument behind "comprehensive". Interception happens at the BROWSER
// layer, not in the app: the harness has to work the same on Angular as on Next,
// and it must not require editing the app under design.
//
// An `unforceable` state is a first-class outcome. It gets a labelled
// placeholder cell rather than being dropped, because quietly omitting the
// states that are hard to reach is precisely how "comprehensive" becomes a claim
// instead of a fact — and the hard-to-reach ones are usually the failure states.
//
// Usage:
//   node states-force.mjs <state-manifest.json> [--out shots]
//
// Manifest shape (the table in SCREENS.md, as JSON):
//   {
//     "baseUrl": "http://127.0.0.1:3000",
//     "surfaces": [{ "name": "desktop", "width": 1440, "height": 900 }],
//     "states": [
//       { "state": "empty-no-results", "screen": "list", "url": "/list",
//         "status": "forceable",
//         "force": { "kind": "route", "pattern": "**/api/items*",
//                    "status": 200, "body": "[]" } }
//     ]
//   }
//
// force.kind:
//   route     { pattern, status?, body?, delayMs? }   stubbed response
//   seed      { pattern, count, item? }               data volume; body is an array
//   viewport  { width, height }                        overrides the surface
//   auth      { localStorage?, cookies? }              session or role
//   input     { steps: [{kind, selector, key?, text?}] }
//   none      {}                                       naturally reachable

import { chromium } from 'playwright'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { forceState } from './force-lib.mjs'

const arg = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1] }
const manifestPath = process.argv[2]
if (!manifestPath) { console.error('usage: node states-force.mjs <state-manifest.json> [--out dir]'); process.exit(1) }
const outDir = path.resolve(arg('--out', 'shots'))

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
await mkdir(outDir, { recursive: true })

// Placeholder cells are rendered in the browser rather than drawn, so an
// unforceable state occupies the same footprint as a real shot and the hole in
// the contact sheet is visible at a glance.
async function placeholder (page, w, h, label, reason) {
  await page.setViewportSize({ width: w, height: h })
  // about:blank first: a force that failed mid-navigation leaves the page still
  // committing, and setContent races it for the execution context. Without this
  // an app that is simply not running kills the whole run with a stack trace
  // instead of reporting a defect per state.
  await page.goto('about:blank').catch(() => {})
  await page.setContent(`<div style="width:100vw;height:100vh;background:#1a1a20;color:#d9a441;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
    font:600 20px ui-sans-serif,system-ui;text-align:center;padding:24px;box-sizing:border-box">
    <div>UNFORCEABLE</div>
    <div style="font:400 15px ui-sans-serif;color:#e9e9ee">${label}</div>
    <div style="font:400 13px ui-sans-serif;color:#8b8b99;max-width:70%">${reason ?? 'no force method assigned'}</div>
  </div>`)
}

const results = []
const browser = await chromium.launch()

for (const surface of manifest.surfaces) {
  for (const st of manifest.states) {
    if (st.surface && !st.surface.includes(surface.name)) continue
    const label = `${st.screen ?? 'screen'}--${st.state}--${surface.name}`
    const file = path.join(outDir, `${label}.png`)
    const rec = { state: st.state, screen: st.screen, surface: surface.name, file: `${label}.png` }

    const ctx = await browser.newContext({ viewport: { width: surface.width, height: surface.height } })
    const page = await ctx.newPage()
    try {
      if (st.status === 'unforceable') {
        await placeholder(page, surface.width, surface.height, st.state, st.reason)
        await page.screenshot({ path: file })
        rec.status = 'unforceable'
        results.push(rec); await ctx.close(); continue
      }

      await forceState(ctx, page, st, manifest)
      await page.screenshot({ path: file, fullPage: !!st.fullPage })
      rec.status = 'forced'
    } catch (e) {
      // Could not be forced despite being declared forceable. This is a defect
      // in the manifest or the app, and it must be visible — so it still gets a
      // labelled cell, marked differently from a declared unforceable.
      rec.status = 'force-failed'
      rec.note = e.message.split('\n')[0]
      try {
        await placeholder(page, surface.width, surface.height, st.state, `force failed: ${rec.note}`)
        await page.screenshot({ path: file })
      } catch {
        // Even the placeholder failed. Record the defect without a cell rather
        // than taking the run down; the summary below names the likely cause.
        delete rec.file
      }
    } finally {
      await ctx.close()
    }
    results.push(rec)
  }
}
await browser.close()

const forced = results.filter(r => r.status === 'forced').length
const unforceable = results.filter(r => r.status === 'unforceable').length
const failed = results.filter(r => r.status === 'force-failed')

// Source fingerprint. A critic pack was once assembled from shots taken 14
// minutes before the defect in them was fixed, and nothing in the pack could
// say so — the critic judged a stale capture as current. The fingerprint makes
// a stale pack detectable instead of plausible.
const sources = manifest.fingerprintPaths ?? []
const fingerprint = { capturedAt: new Date().toISOString(), files: {} }
for (const f of sources) {
  try {
    const abs = path.resolve(path.dirname(manifestPath), f)
    const buf = await readFile(abs)
    const st = await stat(abs)
    fingerprint.files[f] = {
      sha: createHash('sha256').update(buf).digest('hex').slice(0, 12),
      mtime: st.mtime.toISOString()
    }
  } catch (e) { fingerprint.files[f] = { error: e.code ?? 'unreadable' } }
}
if (!sources.length) fingerprint.warning = 'no fingerprintPaths in the manifest — staleness cannot be detected'

await writeFile(path.join(outDir, 'shots.json'), JSON.stringify({
  manifest: path.basename(manifestPath),
  fingerprint,
  total: results.length, forced, unforceable, failed: failed.length, results
}, null, 2))

for (const r of results) {
  const mark = r.status === 'forced' ? 'ok  ' : r.status === 'unforceable' ? 'UNF ' : 'FAIL'
  console.log(`${mark} ${r.state} / ${r.surface}${r.note ? '  ' + r.note : ''}`)
}
console.log(`\n${forced} forced · ${unforceable} unforceable · ${failed.length} force-failed -> ${path.join(outDir, 'shots.json')}`)
if (fingerprint.warning) console.log('WARNING: ' + fingerprint.warning)
if (failed.length) console.log('force-failed states are a manifest or app defect, NOT an unforceable state — fix or reclassify them before sheeting.')
if (failed.length && failed.length === results.length - unforceable) {
  console.log('EVERY forceable state failed — check the app is actually running at ' + manifest.baseUrl + ' before reading these as design defects.')
}
process.exit(failed.length ? 1 : 0)
