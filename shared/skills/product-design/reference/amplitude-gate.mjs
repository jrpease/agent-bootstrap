// amplitude-gate.mjs — the amplitude gate, as arithmetic.
//
// It was specified as prose and evaluated by hand, which is exactly how a gate
// becomes a formality. This runs it.
//
// Two independent tests, both of which must pass:
//
//   1. SHIPPED AT LEAST WHAT WAS DECLARED. Any measured parameter below its
//      declared value fails. This catches a signature that was specified
//      ambitiously and built cheaply.
//
//   2. THE DECLARATION IS NOT MIDDLE-OF-THE-PACK. It must sit OUTSIDE its moment
//      type's interquartile range on at least two of five parameters — in EITHER
//      direction. Bigger is not the goal; the canon's best moments include fast,
//      small, precise ones. A rule that only rewarded "more" would block them.
//      Plus a coordination floor: groups >= 2 or participants >= 3, because a
//      single element moving alone is not choreography however far it travels.
//
// A parameter with fewer than MIN_N measured moments for its type is NOT gateable
// and is skipped loudly. Grading against a distribution of one is worse than not
// grading at all.
//
// Usage:
//   node amplitude-gate.mjs <capture-manifest.json> <SCREENS-declaration.json> [--canon path/to/raw.json]
//
// Declaration shape:
//   { "key-lands": { "type": "transition", "durationMs": 400, "travelFraction": 0.02,
//                    "participants": 6, "choreographyDepth": 1, "coverage": 0.2 } }

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const arg = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1] }
const [capturePath, declPath] = process.argv.slice(2)
if (!capturePath || !declPath) {
  console.error('usage: node amplitude-gate.mjs <capture-manifest.json> <declaration.json> [--canon raw.json]')
  process.exit(1)
}

const MIN_N = 4
const PARAMS = ['durationMs', 'travelFraction', 'participants', 'choreographyDepth', 'coverage']
const OUTSIDE_REQUIRED = 2

const canon = JSON.parse(await readFile(arg('--canon', path.join(here, 'canon', 'raw.json')), 'utf8'))
const capture = JSON.parse(await readFile(capturePath, 'utf8'))
const declared = JSON.parse(await readFile(declPath, 'utf8'))

const lines = []
let failed = 0

const signatures = capture.results.filter(r => r.signature)
if (!signatures.length) {
  console.log('FAIL  no signature moment in the capture manifest — the gate cannot run, and that is a failure, not a skip')
  process.exit(1)
}

for (const r of signatures) {
  const decl = declared[r.id]
  if (!decl) { console.log(`FAIL  ${r.id}: declared nowhere. A signature moment with no declaration cannot be graded.`); failed++; continue }
  if (!r.captured) { console.log(`FAIL  ${r.id}: not captured — ${r.note ?? 'no reason given'}`); failed++; continue }

  const dist = canon.byType?.[decl.type]
  const m = r.measured

  // Test 1 — shipped at least what was declared.
  const short = PARAMS.filter(p => decl[p] != null && m[p] != null && m[p] < decl[p])
  // Test 2 — the declaration is not middle-of-the-pack.
  const outside = [], inside = [], skipped = []
  for (const p of PARAMS) {
    const s = dist?.stats?.[p]
    // `gateable` is set by aggregate.mjs; MIN_N is re-checked here so the gate
    // does not depend on the aggregator having been run with the same threshold.
    if (!s || s.gateable === false || (s.n ?? 0) < MIN_N) { skipped.push(p); continue }
    if (decl[p] == null) { skipped.push(p); continue }
    if (decl[p] < s.q1 || decl[p] > s.q3) outside.push(`${p} ${decl[p]} vs IQR ${s.q1}–${s.q3}`)
    else inside.push(p)
  }
  const coordination = (decl.choreographyDepth ?? 0) >= 2 || (decl.participants ?? 0) >= 3

  const ok = !short.length && outside.length >= OUTSIDE_REQUIRED && coordination
  if (!ok) failed++

  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${r.id} (${decl.type}, canon n=${dist?.momentCount ?? 0})`)
  lines.push(`      measured ${PARAMS.map(p => `${p}=${m[p] ?? '—'}`).join(' ')}`)
  lines.push(`      declared ${PARAMS.map(p => `${p}=${decl[p] ?? '—'}`).join(' ')}`)
  if (short.length) lines.push(`      SHORT: shipped below declaration on ${short.join(', ')}`)
  lines.push(`      outside IQR on ${outside.length}/${PARAMS.length - skipped.length} (need ${OUTSIDE_REQUIRED}): ${outside.join(' · ') || 'none'}`)
  if (inside.length) lines.push(`      middle-of-the-pack on ${inside.join(', ')}`)
  if (skipped.length) lines.push(`      NOT GATEABLE, skipped: ${skipped.join(', ')} (fewer than ${MIN_N} measured moments for this type)`)
  lines.push(`      coordination floor (groups>=2 or participants>=3): ${coordination ? 'met' : 'NOT MET'}`)
}

console.log(lines.join('\n'))
console.log(`\n${signatures.length - failed}/${signatures.length} signature moment(s) pass the amplitude gate`)
process.exit(failed ? 1 : 0)
