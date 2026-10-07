// sequence-loader.mjs — load tiered WebP frame sequences for scroll scrubbing.
//
// Copy into the project; no dependencies. Reads the layout sequence-cut.sh writes:
//   <base>/manifest.json            {"tiers":{"768":{"count":N},"1440":{"count":N}}}
//   <base>/<tier>/f_000.webp …      (0-indexed — pear.no's own files start at f_001)
//
//   const hero = await openSequence('/films/hero', { viewportWidth: innerWidth })
//   hero.setActive(true)                // when the section is within ~0.1 of page progress
//   // every frame, while the section is on screen:
//   hero.want(Math.round(progress * (hero.count - 1)))
//   const img = hero.frame(hero.wanted) // nearest loaded frame, or null
//   if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
//
// Order and memory are the point (studio-design sequence.md §3):
// - every 32nd frame first, then finer strides, so a scrub works within a second;
// - once the scroll aims at a frame, ±window frames around it jump the queue;
// - one shared pool of 8 fetches, round-robin across every active sequence; the
//   sequence the scroll is aiming at takes two per turn when slots are free at once;
// - frames stay COMPRESSED in memory (an <img> is ~100 KB; a decoded 1440 frame is
//   4.7 MB, so 121 decoded frames would be ~565 MB). Only ±decodeAhead frames
//   around the aim are decoded ahead of the draw.

export const STRIDES = [32, 16, 8, 4, 2, 1]

// Smallest tier on a phone-width viewport, largest otherwise. Device pixel ratio
// is deliberately ignored: a 2x phone does not need 1440-wide frames.
export function pickTier(tierWidths, viewportWidth, { phoneMax = 820 } = {}) {
  const sorted = [...tierWidths].map(Number).sort((a, b) => a - b)
  return viewportWidth <= phoneMax ? sorted[0] : sorted[sorted.length - 1]
}

// Every index once, coarse to fine: 0, 32, 64 … then 16, 48 … then the rest.
export function coarseToFine(count, strides = STRIDES) {
  const seen = new Set()
  const order = []
  for (const s of strides) {
    for (let i = 0; i < count; i += s) {
      if (!seen.has(i)) { seen.add(i); order.push(i) }
    }
  }
  return order
}

export const frameUrl = (base, tier, i, rev = '') =>
  `${base}/${tier}/f_${String(i).padStart(3, '0')}.webp${rev ? `?r=${rev}` : ''}`

// Browser defaults: keep the compressed <img>; decode on request.
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`failed ${url}`))
    img.src = url
  })
}
const decodeImage = (img) => img.decode?.().catch(() => {})

// One pool shared by every sequence on the page. Round-robin over active
// sequences; the hot one (aimed at within the last 500ms) takes two per turn.
export function createScheduler({ concurrency = 8, hotMs = 500, now = () => Date.now() } = {}) {
  const sequences = []
  let inflight = 0
  let turn = 0
  const sched = {
    now,
    get inflight() { return inflight },
    add(seq) { sequences.push(seq) },
    remove(seq) { const k = sequences.indexOf(seq); if (k >= 0) sequences.splice(k, 1) },
    pump() {
      while (inflight < concurrency) {
        const active = sequences.filter((s) => s._active())
        if (!active.length) return
        let started = 0
        for (let k = 0; k < active.length && inflight < concurrency; k++) {
          const seq = active[(turn + k) % active.length]
          const pulls = seq._hot(now(), hotMs) ? 2 : 1
          for (let p = 0; p < pulls && inflight < concurrency; p++) {
            if (!seq._startOne(() => { inflight--; sched.pump() })) break
            inflight++; started++
          }
        }
        turn++
        if (!started) return
      }
    },
  }
  return sched
}

export const defaultScheduler = createScheduler()

export function createSequence({ base, tier, count, rev = '', load = loadImage,
                                 decode = decodeImage, scheduler = defaultScheduler,
                                 window = 24, decodeAhead = 3, retries = 3 }) {
  const frames = new Array(count).fill(null)
  const failures = new Array(count).fill(0)
  const inflight = new Set()
  const order = coarseToFine(count)
  let cursor = 0          // position in `order` for the background fill
  let wanted = -1         // -1 until the scroll aims: no window, pure coarse-to-fine
  let aimedAt = -Infinity
  let active = false
  let disposed = false

  const open = (i) => !frames[i] && !inflight.has(i) && failures[i] < retries

  function next() {
    if (wanted >= 0) {
      for (let d = 0; d <= window; d++) {
        for (const i of d ? [wanted - d, wanted + d] : [wanted]) {
          if (i >= 0 && i < count && open(i)) return i
        }
      }
    }
    while (cursor < order.length) {
      if (open(order[cursor])) return order[cursor]
      cursor++
    }
    for (let i = 0; i < count; i++) if (failures[i] && open(i)) return i
    return -1
  }

  const seq = {
    count, tier,
    get wanted() { return Math.max(wanted, 0) },
    get loaded() { return frames.reduce((n, f) => n + (f ? 1 : 0), 0) },
    get done() { return frames.every((f, i) => f || failures[i] >= retries) },
    setActive(on) { active = on && !disposed; scheduler.pump() },
    want(i) {
      const w = Math.max(0, Math.min(count - 1, i | 0))
      aimedAt = scheduler.now()
      if (w !== wanted) {            // decode ahead only when the aim moves
        wanted = w
        for (let d = -decodeAhead; d <= decodeAhead; d++) {
          const f = frames[wanted + d]
          if (f) decode(f)
        }
      }
      scheduler.pump()
    },
    // The nearest loaded frame to i, searching outward; null before anything arrives.
    frame(i) {
      i = Math.max(0, Math.min(count - 1, i | 0))
      for (let d = 0; d < count; d++) {
        if (frames[i - d]) return frames[i - d]
        if (frames[i + d]) return frames[i + d]
      }
      return null
    },
    dispose() {
      disposed = true; active = false
      frames.fill(null)
      scheduler.remove(seq)
    },
    // Scheduler hooks.
    _active: () => active && next() >= 0,
    _hot: (t, hotMs) => t - aimedAt < hotMs,
    _startOne(onSettled) {
      const i = next()
      if (i < 0) return false
      inflight.add(i)
      // Promise.resolve().then: a loader that throws synchronously still settles.
      Promise.resolve().then(() => load(frameUrl(base, tier, i, rev)))
        .then((img) => { if (!disposed) frames[i] = img })
        .catch(() => { failures[i]++ })
        .finally(() => { inflight.delete(i); onSettled() })
      return true
    },
  }
  scheduler.add(seq)
  return seq
}

export async function openSequence(base, { viewportWidth, rev = '', ...opts } = {}) {
  const manifest = await (await fetch(`${base}/manifest.json${rev ? `?r=${rev}` : ''}`)).json()
  const tier = pickTier(Object.keys(manifest.tiers), viewportWidth)
  return createSequence({ base, tier, count: manifest.tiers[tier].count, rev, ...opts })
}
