// aggregate.mjs — turns per-entry captures into the tables canon.md needs.
//
// The important output is NOT the craft averages, it is the per-moment-type
// median and interquartile range for the five amplitude parameters. That table
// is what the amplitude gate grades a declaration against; without it,
// Mechanism 3 is an intention rather than a check.
//
// Medians are computed PER MOMENT TYPE and never pooled. Comparing Duolingo's
// lesson-complete to Linear's row-select is meaningless, and a pooled median
// would quietly make that comparison the default for every run.
//
//   node aggregate.mjs entries/           # -> raw.json + medians.md
//
// entries/<name>.json shape:
//   { entry, surface, acquisition, craft: {...}, moments: [ {...measured} ] }

import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const MOMENT_TYPES = ['transition', 'feedback', 'reward', 'reveal']
// travelFraction, not travelPx: see motion-measure.mjs. Pixels are not
// comparable across a phone recording and a desktop DOM.
const PARAMS = ['durationMs', 'travelFraction', 'participants', 'choreographyDepth', 'coverage']

const quantile = (sorted, q) => {
  if (!sorted.length) return null
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos); const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}
const round = n => n === null ? null : Math.round(n * 100) / 100

// Below this many measured moments an interquartile range is not a distribution,
// it is a point or a line, and "inside the IQR" stops meaning anything. The gate
// must not grade against it: a parameter with n=1 would block every declaration
// that happened to match one product and pass everything else. Flagged loudly
// rather than silently trusted.
const MIN_N_FOR_GATE = 4

const dir = process.argv[2] ?? 'entries'
const files = (await readdir(dir)).filter(f => f.endsWith('.json'))
if (!files.length) {
  console.error(`no entry files in ${dir}/ — run the capture pass first`)
  process.exit(1)
}

const entries = []
for (const f of files) entries.push(JSON.parse(await readFile(path.join(dir, f), 'utf8')))

// --- amplitude distribution, per moment type -------------------------------
const byType = {}
for (const t of MOMENT_TYPES) {
  const moments = entries.flatMap(e => (e.moments ?? []).filter(m => m.momentType === t))
  const stats = {}
  for (const p of PARAMS) {
    // A null is missing evidence, not a zero. Averaging `not evidenced` cells as
    // zero would drag every median toward "no motion" and make the amplitude
    // gate trivially easy to clear.
    const vals = moments.map(m => m[p]).filter(v => typeof v === 'number').sort((a, b) => a - b)
    stats[p] = vals.length
      ? {
          n: vals.length, min: round(vals[0]), q1: round(quantile(vals, 0.25)),
          median: round(quantile(vals, 0.5)), q3: round(quantile(vals, 0.75)),
          max: round(vals[vals.length - 1]), gateable: vals.length >= MIN_N_FOR_GATE
        }
      : { n: 0, gateable: false, note: 'not evidenced' }
  }
  byType[t] = { momentCount: moments.length, contributors: [...new Set(moments.map(m => m.entry))], stats }
}

// --- craft ranges ----------------------------------------------------------
const craftKeys = ['typeContrast', 'interactivePerMegapixel', 'spacingStepCount', 'colourCount', 'componentReuseRatio']
const craft = {}
for (const k of craftKeys) {
  const vals = entries.map(e => e.craft?.[k]).filter(v => typeof v === 'number').sort((a, b) => a - b)
  craft[k] = vals.length
    ? { n: vals.length, min: round(vals[0]), median: round(quantile(vals, 0.5)), max: round(vals[vals.length - 1]) }
    : { n: 0, note: 'not evidenced' }
}

const provenance = entries.map(e => ({
  entry: e.entry, surface: e.surface, acquisition: e.acquisition,
  motion: (e.moments ?? []).length ? 'measured' : 'not evidenced',
  annotated: [...new Set((e.moments ?? []).flatMap(m => m.needsAnnotation ?? []))]
}))

await writeFile('raw.json', JSON.stringify({ generatedFrom: files, craft, byType, provenance }, null, 2))

// --- the table canon.md carries -------------------------------------------
let md = '# Amplitude distribution, per moment type\n\n'
md += 'The comparison set for the amplitude gate. A declaration inside the IQR on four or more\n'
md += 'of the five parameters is middle-of-the-pack and blocks — in either direction.\n\n'
for (const t of MOMENT_TYPES) {
  const b = byType[t]
  md += `## ${t} — ${b.momentCount} moment(s) from ${b.contributors.length} product(s)\n\n`
  if (!b.momentCount) { md += '_not evidenced — no captured moment of this type_\n\n'; continue }
  md += '| parameter | n | min | q1 | median | q3 | max |\n|---|---|---|---|---|---|---|\n'
  for (const p of PARAMS) {
    const s = b.stats[p]
    md += s.n
      ? `| ${p} | ${s.n}${s.gateable ? '' : ' [n<' + MIN_N_FOR_GATE + ']'} | ${s.min} | ${s.q1} | **${s.median}** | ${s.q3} | ${s.max} |\n`
      : `| ${p} | 0 | — | — | _not evidenced_ | — | — |\n`
  }
  const thin = PARAMS.filter(p => !b.stats[p].gateable)
  if (thin.length) {
    md += `\n**Not gateable** (fewer than ${MIN_N_FOR_GATE} measured moments): ${thin.join(', ')}. `
    md += 'The amplitude gate must skip these parameters for this moment type and say so in its '
    md += 'output, rather than grading a declaration against a distribution of one.\n'
  }
  md += '\n'
}
md += '# Craft ranges\n\n| measure | n | min | median | max |\n|---|---|---|---|---|\n'
for (const k of craftKeys) {
  const c = craft[k]
  md += c.n ? `| ${k} | ${c.n} | ${c.min} | **${c.median}** | ${c.max} |\n`
            : `| ${k} | 0 | — | _not evidenced_ | — |\n`
}
await writeFile('medians.md', md)

console.log(`aggregated ${entries.length} entries -> raw.json, medians.md`)
for (const t of MOMENT_TYPES) {
  const b = byType[t]
  console.log(`  ${t.padEnd(11)} ${String(b.momentCount).padStart(3)} moment(s)` +
    (b.momentCount ? '' : '   <- not evidenced; the gate cannot grade this type'))
  const thin = PARAMS.filter(p => !b.stats[p].gateable)
  if (b.momentCount && thin.length) console.log(`${' '.repeat(15)}not gateable (n<${MIN_N_FOR_GATE}): ${thin.join(', ')}`)
}
