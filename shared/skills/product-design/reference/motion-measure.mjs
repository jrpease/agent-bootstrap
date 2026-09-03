// motion-measure.mjs — the five amplitude parameters, from a recorded moment.
//
// Shared by two consumers that must agree:
//   canon/measure.mjs  measures other people's products (Task 2/4)
//   interact.mjs       measures ours (Task 6)
// If they ever measure differently, the amplitude gate compares numbers that
// were never comparable. One module, one definition.
//
// Two paths, per the spec's provenance rule:
//   TRACE PATH (web, DOM available) — all five parameters DERIVED.
//   PIXEL PATH (macOS capture, any DOM-less recording) — durationMs and
//     coverage DERIVED by frame diffing; travel, participants and
//     choreographyDepth are null and marked ANNOTATED, to be filled by the
//     operator watching the clip once. They are never inferred: element
//     identity is not recoverable from pixels, and a guessed participant count
//     would silently corrupt the canon medians the gate grades against.
//
// momentType is a REQUIRED input and is never inferred. Medians are computed
// per moment type (transition | feedback | reward | reveal); a moment measured
// without its type cannot be placed in the right distribution.
//
// Usage:
//   node motion-measure.mjs --trace <trace.json> --type <momentType>
//   node motion-measure.mjs --video <clip.webm> --type <momentType>
//   node motion-measure.mjs --video <clip.webm> --trace <trace.json> --type <t>
//     (trace wins for the three identity-dependent parameters; video still
//      supplies an independent durationMs/coverage cross-check)
//
// Trace format (emitted by interact.mjs; see control/ for a worked fixture):
//   { viewport: {w, h},
//     events: [ { id, t0, t1, from:{x,y,w,h}, to:{x,y,w,h} } ] }
//   t0/t1 in ms relative to the trigger. One event per animated element.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'

const exec = promisify(execFile)

export const MOMENT_TYPES = ['transition', 'feedback', 'reward', 'reveal']

// Pixel-diff thresholds. A pixel counts as changed at >12/255 luma delta —
// below that is codec noise, above it is motion. Tuned against control/.
const LUMA_DELTA = 12
// A frame is "active" while >0.1% of pixels differ from the settled end state.
const ACTIVE_FRACTION = 0.001
const DIFF_WIDTH = 320

// Two starts closer together than this are one stagger group. 60ms is ~4 frames
// at 60Hz: below it a viewer reads simultaneity, above it reads sequence.
const STAGGER_GAP_MS = 60

// ---------------------------------------------------------------- trace path

function clusterStarts (starts) {
  const sorted = [...starts].sort((a, b) => a - b)
  let groups = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > STAGGER_GAP_MS) groups++
  }
  return groups
}

function boxUnionArea (boxes) {
  // Exact union by scanline over x-edges — participant counts are small, so
  // correctness beats cleverness here.
  if (!boxes.length) return 0
  const xs = [...new Set(boxes.flatMap(b => [b.x, b.x + b.w]))].sort((a, b) => a - b)
  let area = 0
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i]; const x1 = xs[i + 1]
    const spans = boxes
      .filter(b => b.x <= x0 && b.x + b.w >= x1)
      .map(b => [b.y, b.y + b.h])
      .sort((a, b) => a[0] - b[0])
    let covered = 0; let cur = null
    for (const [y0, y1] of spans) {
      if (!cur) { cur = [y0, y1]; continue }
      if (y0 <= cur[1]) cur[1] = Math.max(cur[1], y1)
      else { covered += cur[1] - cur[0]; cur = [y0, y1] }
    }
    if (cur) covered += cur[1] - cur[0]
    area += (x1 - x0) * covered
  }
  return area
}

export function measureFromTrace (trace, momentType) {
  const ev = trace.events ?? []
  if (!ev.length) throw new Error('trace has no events — a moment with no animated element is not a moment')

  const durationMs = Math.max(...ev.map(e => e.t1)) - Math.min(...ev.map(e => e.t0))

  // Travel is stored as a fraction of VIEWPORT WIDTH, not as pixels. A 100px
  // move on a 1728px desktop and a 100px move on a 390pt phone are different
  // gestures, and an iOS recording is in device pixels on top of that. Pooling
  // raw pixels across surfaces would produce medians that mean nothing. The
  // fraction is the only unit that survives the crossing.
  let travelPx = 0
  let travelFraction = 0
  for (const e of ev) {
    const dx = (e.to.x - e.from.x)
    const dy = (e.to.y - e.from.y)
    const dist = Math.hypot(dx, dy)
    // scale change reads as travel too — an element growing 40px has moved its edges
    const dScale = Math.hypot(e.to.w - e.from.w, e.to.h - e.from.h)
    const total = Math.max(dist, dScale)
    if (total > travelPx) travelPx = total
  }

  const boxes = ev.flatMap(e => [e.from, e.to])
  const coverage = trace.viewport
    ? boxUnionArea(boxes) / (trace.viewport.w * trace.viewport.h)
    : null

  return {
    momentType,
    durationMs: Math.round(durationMs),
    travelPx: Math.round(travelPx),
    travelFraction: trace.viewport ? round3(travelPx / trace.viewport.w) : null,
    participants: new Set(ev.map(e => e.id)).size,
    choreographyDepth: clusterStarts(ev.map(e => e.t0)),
    coverage: coverage === null ? null : round3(coverage),
    provenance: {
      durationMs: 'derived',
      travel: 'derived',
      participants: 'derived',
      choreographyDepth: 'derived',
      coverage: coverage === null ? 'not evidenced' : 'derived'
    }
  }
}

// ---------------------------------------------------------------- pixel path

async function probe (video) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,avg_frame_rate',
    '-of', 'json', video
  ])
  const s = JSON.parse(stdout).streams[0]
  const [num, den] = s.avg_frame_rate.split('/').map(Number)
  return { width: s.width, height: s.height, fps: den ? num / den : num }
}

async function grayFrames (video, w, h) {
  // Raw gray frames on stdout — no temp files, no PNG decode.
  const { stdout } = await exec('ffmpeg', [
    '-v', 'error', '-i', video,
    '-vf', `scale=${w}:${h},format=gray`,
    '-f', 'rawvideo', '-'
  ], { encoding: 'buffer', maxBuffer: 1 << 30 })
  const size = w * h
  const frames = []
  for (let o = 0; o + size <= stdout.length; o += size) frames.push(stdout.subarray(o, o + size))
  return frames
}

export async function measureFromVideo (video, momentType) {
  const { width, height, fps } = await probe(video)
  const w = DIFF_WIDTH
  const h = Math.max(2, Math.round((height / width) * w / 2) * 2)
  const frames = await grayFrames(video, w, h)
  if (frames.length < 2) throw new Error(`${video}: fewer than two frames decoded`)

  const size = w * h
  const union = new Uint8Array(size)

  // Duration comes from FRAME-TO-FRAME delta — what is moving right now — not
  // from distance to the end state. Measured against the end state instead,
  // every idle lead-in frame counts as active and the duration swallows all the
  // dead air before the trigger. Found by reading this back before the control
  // run, which is why the control run exists.
  const activity = []
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]; const b = frames[i]
    let changed = 0
    for (let p = 0; p < size; p++) {
      if (Math.abs(b[p] - a[p]) > LUMA_DELTA) { changed++; union[p] = 1 }
    }
    activity.push(changed / size)
  }

  let first = -1; let final = -1
  for (let i = 0; i < activity.length; i++) {
    if (activity[i] > ACTIVE_FRACTION) { if (first === -1) first = i; final = i }
  }
  if (first === -1) {
    throw new Error(`${video}: no frame-to-frame change above threshold — nothing moved in this clip`)
  }
  // activity[i] describes the interval between frame i and i+1, so the moving
  // window spans first -> final+1 frame boundaries.
  const frameSpan = (final + 1) - first

  let unionCount = 0
  for (let p = 0; p < size; p++) if (union[p]) unionCount++

  return {
    momentType,
    durationMs: Math.round((frameSpan / fps) * 1000),
    travelPx: null,
    travelFraction: null,
    participants: null,
    choreographyDepth: null,
    coverage: round3(unionCount / size),
    provenance: {
      durationMs: 'derived',
      travel: 'annotated',
      participants: 'annotated',
      choreographyDepth: 'annotated',
      coverage: 'derived'
    },
    needsAnnotation: ['travel', 'participants', 'choreographyDepth']
  }
}


// --------------------------------------------------------------- segmentation
//
// A Mobbin recording is a whole FLOW — 15s at 60fps containing many separate
// moments — while measureFromVideo() reports a single span. Segmentation splits
// one clip into candidate moments: contiguous runs of frame-to-frame activity,
// separated by quiet gaps.
//
// These are CANDIDATES, not measurements. The operator ratifies each one and
// tags its momentType; nothing here infers what kind of moment it is, because
// medians are computed per type and a mislabelled moment lands in the wrong
// distribution. Scrolling and video noise both register as activity, so a run
// is a proposal for a human to accept or drop.

const SEG_WIDTH = 200          // wide enough to see real motion, small enough to hold 900 frames
const SEG_MIN_GAP_MS = 150     // quiet shorter than this is a pause WITHIN a moment, not between two
const SEG_MIN_DUR_MS = 80      // shorter than this is compression noise, not motion

// A designed moment resolves. Anything still moving after this is continuous
// behaviour — a scroll, an autoplaying video, a looping animation — and does not
// belong in an amplitude distribution. Observed in real Mobbin clips: runs of
// 3.6s and 7.7s sitting alongside genuine 150-900ms moments. Flagged rather than
// dropped, because the operator ratifies; the tool proposes.
const SEG_CONTINUOUS_MS = 2000


// ----------------------------------------------------- automatic moment analysis
//
// An earlier design asked the operator to count participants, stagger groups and
// travel by watching each clip. That was wrong, and wrong for a stated reason
// that did not hold up: "element identity is not recoverable from pixels".
// SEMANTIC identity is not (which DOM node moved), but SPATIAL identity is
// (which region of the screen moved) — and spatial regions are exactly what
// amplitude measures. So these are derived, not annotated.
//
//   participants       connected regions of change, above a noise floor
//   choreographyDepth  distinct onset times among those regions
//   travelFraction     how far the change centroid moves, over frame width
//
// The operator now ratifies a measurement instead of producing one.

const MIN_REGION_FRACTION = 0.0004   // smaller than this is codec noise, not an element
const ONSET_TRIGGER = 0.25           // a region "starts" at 25% of its own peak activity

// 8-connected labelling, iterative — a recursive fill overflows the stack on a
// full-screen region.
function labelRegions (mask, w, h, minArea) {
  const labels = new Int32Array(w * h).fill(-1)
  const regions = []
  const stack = []
  for (let p0 = 0; p0 < mask.length; p0++) {
    if (!mask[p0] || labels[p0] !== -1) continue
    const id = regions.length
    let count = 0, minX = w, maxX = -1, minY = h, maxY = -1
    stack.push(p0); labels[p0] = id
    while (stack.length) {
      const p = stack.pop()
      const x = p % w, y = (p / w) | 0
      count++
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const np = ny * w + nx
          if (mask[np] && labels[np] === -1) { labels[np] = id; stack.push(np) }
        }
      }
    }
    regions.push({ id, count, minX, maxX, minY, maxY })
  }
  const kept = regions.filter(r => r.count >= minArea)
  return { labels, regions: kept }
}

function analyseMoment (changed, a, b, w, h, msPerFrame) {
  const size = w * h
  const union = new Uint8Array(size)
  for (let i = a; i <= b; i++) {
    const m = changed[i]
    for (let p = 0; p < size; p++) if (m[p]) union[p] = 1
  }
  const { labels, regions } = labelRegions(union, w, h, Math.max(12, size * MIN_REGION_FRACTION))
  if (!regions.length) return { participants: 0, choreographyDepth: 0, travelFraction: 0 }

  // Per-region activity over time, and the centroid of change per frame.
  const nF = b - a + 1
  const perRegion = regions.map(() => ({ act: new Float64Array(nF), cx: new Float64Array(nF), n: new Float64Array(nF) }))
  const index = new Map(regions.map((r, i) => [r.id, i]))
  for (let i = a; i <= b; i++) {
    const m = changed[i]
    for (let p = 0; p < size; p++) {
      if (!m[p]) continue
      const ri = index.get(labels[p])
      if (ri === undefined) continue
      const rec = perRegion[ri]
      rec.act[i - a]++
      rec.cx[i - a] += p % w
      rec.n[i - a]++
    }
  }

  // Onset per region: the first frame reaching a quarter of its own peak. Using a
  // share of its OWN peak rather than a global threshold keeps a small element
  // from being judged against a large one.
  const onsets = []
  let travel = 0
  perRegion.forEach(rec => {
    const peak = Math.max(...rec.act)
    if (peak <= 0) return
    let onset = -1
    for (let f = 0; f < nF; f++) if (rec.act[f] >= peak * ONSET_TRIGGER) { onset = f; break }
    if (onset >= 0) onsets.push(onset * msPerFrame)

    // Travel: the change centroid sits at the origin early and the destination
    // late, so its displacement approximates the distance covered. A fade does
    // not move its centroid and correctly reports ~0.
    //
    // The window is per-REGION, not per-moment. Measured over the whole moment,
    // a staggered element has no pixels in the half it is not moving in, both
    // ends come back empty, and travel silently reports 0 — which is what the
    // control caught: three regions of plainly moving boxes, travel 0.00.
    let first = -1, last = -1
    for (let f = 0; f < nF; f++) if (rec.n[f] > 0) { if (first < 0) first = f; last = f }
    if (first < 0) return
    const span = last - first + 1
    const q = Math.max(1, Math.floor(span / 4))
    const mean = (from, to) => {
      let sum = 0, n = 0
      for (let f = from; f < to; f++) { sum += rec.cx[f]; n += rec.n[f] }
      return n ? sum / n : null
    }
    const early = mean(first, first + q), late = mean(last - q + 1, last + 1)
    if (early !== null && late !== null) travel = Math.max(travel, Math.abs(late - early))
  })

  onsets.sort((x, y) => x - y)
  let groups = onsets.length ? 1 : 0
  for (let i = 1; i < onsets.length; i++) if (onsets[i] - onsets[i - 1] > STAGGER_GAP_MS) groups++

  return {
    participants: regions.length,
    choreographyDepth: groups,
    // Known bias: the centroid method reads ~10% low against a known control
    // (0.137 measured against 0.15 true). Consistent across entries, so medians
    // and interquartile comparisons are unaffected; do not "correct" it with a
    // fudge factor, which would only hide drift.
    travelFraction: round3(travel / w)
  }
}

export async function segmentFromVideo (video, opts = {}) {
  const minGapMs = opts.minGapMs ?? SEG_MIN_GAP_MS
  const minDurMs = opts.minDurMs ?? SEG_MIN_DUR_MS
  const { width, height, fps } = await probe(video)
  const w = SEG_WIDTH
  const h = Math.max(2, Math.round((height / width) * w / 2) * 2)
  const frames = await grayFrames(video, w, h)
  if (frames.length < 2) throw new Error(`${video}: fewer than two frames decoded`)

  const size = w * h
  const msPerFrame = 1000 / fps

  // activity[i] describes the interval between frame i and i+1
  const activity = []
  const changed = []
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]; const b = frames[i]
    const mask = new Uint8Array(size)
    let n = 0
    for (let p = 0; p < size; p++) {
      if (Math.abs(b[p] - a[p]) > LUMA_DELTA) { n++; mask[p] = 1 }
    }
    activity.push(n / size)
    changed.push(mask)
  }

  const gapFrames = Math.max(1, Math.round(minGapMs / msPerFrame))
  const runs = []
  let start = -1; let quiet = 0
  for (let i = 0; i < activity.length; i++) {
    if (activity[i] > ACTIVE_FRACTION) {
      if (start === -1) start = i
      quiet = 0
    } else if (start !== -1) {
      quiet++
      if (quiet >= gapFrames) { runs.push([start, i - quiet]); start = -1; quiet = 0 }
    }
  }
  if (start !== -1) runs.push([start, activity.length - 1])

  const moments = []
  for (const [a, b] of runs) {
    const durationMs = Math.round((b - a + 1) * msPerFrame)
    if (durationMs < minDurMs) continue
    const union = new Uint8Array(size)
    let peak = 0
    for (let i = a; i <= b; i++) {
      if (activity[i] > peak) peak = activity[i]
      const m = changed[i]
      for (let p = 0; p < size; p++) if (m[p]) union[p] = 1
    }
    let coveredPx = 0
    for (let p = 0; p < size; p++) if (union[p]) coveredPx++
    const derived = analyseMoment(changed, a, b, w, h, msPerFrame)
    const coverage = round3(coveredPx / size)
    const suspect = coverage > 0.9 ? 'full-screen — usually a scroll or page swap'
      : durationMs > SEG_CONTINUOUS_MS ? 'long-running — likely continuous motion, not a moment'
      : null
    moments.push({
      index: moments.length,
      startMs: Math.round(a * msPerFrame),
      endMs: Math.round((b + 1) * msPerFrame),
      durationMs,
      coverage,
      peakActivity: round3(peak),
      suspect,
      participants: derived.participants,
      choreographyDepth: derived.choreographyDepth,
      travelFraction: derived.travelFraction,
      // momentType stays human. It is the one field that is genuinely semantic:
      // a reward and a transition can be pixel-identical and differ only in what
      // they mean. Everything else here is measured.
      momentType: null,
      provenance: {
        durationMs: 'derived', coverage: 'derived', travel: 'derived',
        participants: 'derived', choreographyDepth: 'derived'
      },
      needsAnnotation: ['momentType']
    })
  }
  const clean = moments.filter(m => !m.suspect).length
  return {
    video, fps, frames: frames.length,
    momentCount: moments.length,
    likelyMoments: clean,
    suspectCount: moments.length - clean,
    moments
  }
}

const round3 = n => Math.round(n * 1000) / 1000

// ------------------------------------------------------------------ combined

export async function measure ({ video, trace, momentType }) {
  if (!MOMENT_TYPES.includes(momentType)) {
    throw new Error(`--type must be one of ${MOMENT_TYPES.join(' | ')}; got "${momentType}"`)
  }
  if (!video && !trace) throw new Error('need --video or --trace')

  if (trace) {
    const parsed = JSON.parse(await readFile(trace, 'utf8'))
    const result = measureFromTrace(parsed, momentType)
    if (video) {
      const pixel = await measureFromVideo(video, momentType)
      result.crossCheck = { durationMs: pixel.durationMs, coverage: pixel.coverage }
    }
    return result
  }
  return measureFromVideo(video, momentType)
}

// ---------------------------------------------------------------------- cli

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = f => { const i = process.argv.indexOf(f); return i === -1 ? undefined : process.argv[i + 1] }
  const run = process.argv.includes('--segment')
    ? segmentFromVideo(arg('--video'), {})
    : measure({ video: arg('--video'), trace: arg('--trace'), momentType: arg('--type') })
  run
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(e => { console.error(e.message); process.exit(1) })
}
