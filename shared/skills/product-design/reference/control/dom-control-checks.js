/* dom-control-checks.js — the control run for measure-dom.js.
 *
 * Inject measure-dom.js into a page serving control/dom-control.html, then run
 * this. Every expected value below is known-true by construction from the
 * fixture's own markup; see its header comment.
 *
 * Run this before trusting ANY canon measurement, and again after touching
 * measure-dom.js. Five real defects were found by it and by nothing else:
 *   1. UA-default 1px form-control padding entering the spacing scale
 *   2. background-tab timer throttling reporting a 0ms start as 581ms
 *   3. background tabs never dispatching transition events at all
 *   4. an infinite ambient pulse stretching a 400ms moment to 2000ms
 *   5. getKeyframes() reporting transforms at 2x on a Retina display
 * Every one of them would have produced plausible numbers, not errors.
 */
const m = window.__pdMeasure()
window.__pdCapture(() => window.__go())
await new Promise(r => setTimeout(r, 900))
const tr = window.__pdRead()

const starts = tr.events.map(e => Math.round(e.t0)).sort((a, b) => a - b)
let groups = 1
for (let i = 1; i < starts.length; i++) if (starts[i] - starts[i - 1] > 60) groups++
const dur = Math.max(...tr.events.map(e => e.t1)) - Math.min(...tr.events.map(e => e.t0))

// durationMs carries a tolerance: it is assembled from two performance.now()
// readings taken a stagger apart, so sub-millisecond jitter makes exact equality
// the wrong assertion. Everything else here is exact by construction.
const near = (a, b, tol) => Math.abs(a - b) <= tol

const checks = [
  ['typeContrast', m.typeContrast, 4],
  ['spacingSteps', JSON.stringify(m.spacingSteps), '[8,16]'],
  ['interactiveCount', m.interactiveCount, 6],
  ['typeSizes', JSON.stringify(m.typeSizes), '[12,13,16,48]'],
  ['componentReuse', m.componentReuseRatio >= 0.4, true],
  ['participants', tr.events.length, 3],
  ['travelPx', JSON.stringify(tr.events.map(e => Math.round(e.travelPx))), '[120,120,120]'],
  ['travelSource', tr.events.every(e => e.travelSource === 'keyframes'), true],
  ['keyframeScale detected', tr.keyframeScale > 0, true],
  ['choreographyDepth', groups, 2],
  ['durationMs', near(Math.round(dur), 400, 5), true],
  ['noWarning', !tr.warning, true]
]
const failed = checks.filter(([, a, e]) => String(a) !== String(e))
checks.map(([n, a, e]) => `${String(a) === String(e) ? 'ok  ' : 'FAIL'} ${n}: ${a}`).join('\n') +
  `\n\nkeyframeScale: ${tr.keyframeScale} · ambientExcluded: ${tr.ambientExcluded}` +
  `\n${failed.length ? failed.length + ' FAILED' : 'ALL ' + checks.length + ' CHECKS PASSED'}`
