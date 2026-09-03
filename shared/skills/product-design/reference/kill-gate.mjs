// kill-gate.mjs — the kill-line gate, as a check rather than a claim.
//
// This exists because the gate was reported PASS against a SCREENS.md that still
// read "Awaiting Stop 2". The stop had executed and the kill line had been
// spoken aloud, but the run's output document never recorded it — and a human
// assertion stood in for the document check. The critic caught it; the gate did
// not. A gate that reports on a fact it never checked is worse than no gate.
//
// Usage:
//   node kill-gate.mjs <SCREENS.md>

import { readFile } from 'node:fs/promises'

const path = process.argv[2]
if (!path) { console.error('usage: node kill-gate.mjs <SCREENS.md>'); process.exit(1) }
const doc = await readFile(path, 'utf8')

const fail = []

// The template's own prompt — "the operator kills one and names, in one line,
// what it lost on" — contains every phrase this gate looks for. Strip the
// instruction before testing for the answer, or the gate passes the blank form.
const answered = doc.split('\n')
  .filter(l => !/awaiting stop 2/i.test(l))
  .join('\n')

// 1 · A kill line must exist and be attributed to a killed direction.
const killed = /killed|kill line|lost on/i.test(answered)
if (!killed) fail.push('no kill line found — SCREENS.md records no direction as killed')

// 2 · The most common failure is a document frozen at the comp stage.
const awaiting = doc.match(/^.*awaiting stop 2.*$/im)
if (awaiting) fail.push(`document still says the stop has not been taken: "${awaiting[0].trim().slice(0, 80)}"`)

// 3 · A kill line that could have been written before the comps existed is not a
//     kill line. Require at least one number in its vicinity — the thing it lost
//     on should be measurable.
const idx = answered.search(/kill line|killed/i)
if (idx !== -1) {
  const near = answered.slice(idx, idx + 600)
  if (!/\d/.test(near)) fail.push('kill line names nothing measurable — no number within 600 chars of it')
}

// 4 · The killed comp must be kept.
if (killed && !/not deleted|is kept|kept at|retained/i.test(answered)) {
  fail.push('no statement that the killed comp was kept — SKILL.md step 5 requires it')
}

for (const f of fail) console.log(`FAIL  ${f}`)
console.log(fail.length ? `\nkill gate: ${fail.length} failure(s) — the run does not proceed to the critic`
                        : 'PASS  kill line recorded, stop taken, loss is measurable, comp kept')
process.exit(fail.length ? 1 : 0)
