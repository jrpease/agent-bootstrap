// state-sheet.mjs — the contact sheet rubric item 5 blocks on.
//
// NOT canon/sheets.mjs. That one is shaped for the canon's shots.json (`fold`,
// `cat`) and cannot read the state harness's output — a borrow that was claimed
// in states.md before anyone tried it.
//
// The contract, from states.md:
//   - one cell per row DECLARED in the manifest, not per screenshot taken
//   - a missing state is a visibly empty cell, labelled with the state's name
//   - `unforceable` and `force-failed` are labelled and visually distinct
//
// A hole in a grid cannot be argued with. A missing paragraph in a spec can.
//
// Usage:
//   node state-sheet.mjs <state-manifest.json> <shots-dir> [--out sheets]

import { chromium } from 'playwright'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const arg = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1] }
const [manifestPath, shotsDir] = process.argv.slice(2)
if (!manifestPath || !shotsDir) {
  console.error('usage: node state-sheet.mjs <state-manifest.json> <shots-dir> [--out dir]')
  process.exit(1)
}
const outDir = path.resolve(arg('--out', path.join(shotsDir, 'sheets')))
await mkdir(outDir, { recursive: true })

// Inlined as data URIs rather than file:// srcs: a setContent page has an
// about:blank origin and Chromium blocks file:// subresources from it, so every
// cell renders black while the sheet cheerfully reports zero holes.
const asDataUri = async file => 'data:image/png;base64,' + (await readFile(file)).toString('base64')

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const shots = JSON.parse(await readFile(path.join(shotsDir, 'shots.json'), 'utf8'))
const byKey = new Map(shots.results.map(r => [`${r.state}::${r.surface}`, r]))

const COLS = 4
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0e0e12;color:#e9e9ee;font:13px/1.45 ui-sans-serif,system-ui;padding:26px}
h1{font-size:19px;font-weight:650;margin-bottom:3px}
.sub{color:#8b8b99;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(${COLS},1fr);gap:14px}
.cell{background:#16161c;border:1px solid #26262e;border-radius:7px;overflow:hidden;display:flex;flex-direction:column}
.hd{padding:6px 9px;font-weight:650;font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center}
.hd .sc{font-weight:400;opacity:.6;font-size:11px}
.forced .hd{background:#1d3324;color:#8ff0b5}
.unforceable .hd{background:#3a2f14;color:#e8c25a}
.force-failed .hd{background:#3d1c1c;color:#ff9b93}
.missing .hd{background:#3d1c1c;color:#ff9b93}
img{width:100%;height:210px;object-fit:cover;object-position:top;display:block;background:#000}
.hole{height:210px;display:flex;align-items:center;justify-content:center;text-align:center;
      color:#ff7b72;font-weight:650;padding:16px;
      background:repeating-linear-gradient(45deg,#1a1216,#1a1216 9px,#241419 9px,#241419 18px)}
.note{padding:6px 9px;color:#8b8b99;font-size:11px;border-top:1px solid #22222a}
`

const browser = await chromium.launch()
const summary = []

for (const surface of manifest.surfaces) {
  // One cell per DECLARED row for this surface — the manifest is the source of
  // truth, never the directory listing.
  const declared = manifest.states.filter(st => !st.surface || st.surface.includes(surface.name))
  const cells = await Promise.all(declared.map(async st => {
    const r = byKey.get(`${st.state}::${surface.name}`)
    const status = !r ? 'missing' : r.status
    const file = r?.file && existsSync(path.join(shotsDir, r.file)) ? r.file : null
    const body = file
      ? `<img src="${await asDataUri(path.join(shotsDir, file))}">`
      : `<div class="hole">${status === 'missing' ? 'NOT CAPTURED' : 'NO IMAGE'}<br>${st.state}</div>`
    const note = r?.note ?? (status === 'unforceable' ? (st.reason ?? 'declared unforceable') : status === 'missing' ? 'declared in the manifest, absent from shots.json' : '')
    return `<div class="cell ${status}">
      <div class="hd"><span>${st.state}</span><span class="sc">${st.screen ?? ''}</span></div>
      ${body}${note ? `<div class="note">${note}</div>` : ''}
    </div>`
  }))

  const counts = declared.reduce((a, st) => {
    const s = byKey.get(`${st.state}::${surface.name}`)?.status ?? 'missing'
    a[s] = (a[s] ?? 0) + 1; return a
  }, {})
  const holes = (counts.missing ?? 0) + (counts['force-failed'] ?? 0)

  const page = await browser.newPage({ viewport: { width: COLS * 300 + 60, height: 900 } })
  await page.setContent(`<style>${CSS}</style>
    <h1>${surface.name} — ${declared.length} declared states</h1>
    <div class="sub">${counts.forced ?? 0} forced · ${counts.unforceable ?? 0} unforceable · ${counts['force-failed'] ?? 0} force-failed · ${counts.missing ?? 0} not captured</div>
    <div class="grid">${cells.join('')}</div>`)
  await page.waitForTimeout(600)

  // A sheet of black rectangles that reports "0 holes" is worse than no sheet:
  // it converts a broken instrument into a pass. Every <img> must have actually
  // decoded, and that is checked rather than assumed.
  const broken = await page.evaluate(() =>
    [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length)
  if (broken) throw new Error(`${broken} of ${declared.length} cell images failed to load — the sheet is not readable and its counts cannot be trusted`)
  const out = path.join(outDir, `states-${surface.name}.png`)
  await page.screenshot({ path: out, fullPage: true })
  await page.close()

  summary.push({ surface: surface.name, declared: declared.length, ...counts, holes, sheet: out })
  console.log(`${holes ? 'FAIL' : 'ok  '} ${surface.name}: ${declared.length} declared · ${counts.forced ?? 0} forced · ${counts.unforceable ?? 0} unforceable · ${holes} hole(s) -> ${out}`)
}
await browser.close()
await writeFile(path.join(outDir, 'sheet-summary.json'), JSON.stringify(summary, null, 2))

const totalHoles = summary.reduce((n, s) => n + s.holes, 0)
const totalUnf = summary.reduce((n, s) => n + (s.unforceable ?? 0), 0)
console.log(`\n${totalHoles} hole(s) across ${summary.length} surface(s).`)
if (totalUnf) console.log(`${totalUnf} unforceable cell(s) — each needs the operator's recorded override in SCREENS.md, or rubric item 5 fails.`)
process.exit(totalHoles ? 1 : 0)
