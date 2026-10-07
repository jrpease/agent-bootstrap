// node --test reference/sequence-loader.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coarseToFine, pickTier, frameUrl, createScheduler, createSequence } from './sequence-loader.mjs'

const tick = () => new Promise((r) => setTimeout(r, 0))
async function settle(...seqs) { for (let k = 0; k < 2000 && !seqs.every((s) => s.done); k++) await tick() }
const idx = (url) => Number(url.match(/f_(\d+)/)[1])
// A loader that records requests and resolves on the next tick.
function recorder(log = []) {
  return { log, load: async (url) => { log.push(url); await tick(); return { i: idx(url) } } }
}
const noDecode = () => {}

test('coarseToFine visits every index once, every 32nd first', () => {
  const order = coarseToFine(121)
  assert.equal(order.length, 121)
  assert.equal(new Set(order).size, 121)
  assert.deepEqual(order.slice(0, 4), [0, 32, 64, 96])
  assert.ok(order.indexOf(120) < order.indexOf(1), 'every-8th frame 120 arrives before frame 1')
  assert.deepEqual(coarseToFine(0), [])
  assert.deepEqual(coarseToFine(1), [0])
})

test('pickTier: smallest on a phone, largest otherwise, DPR ignored', () => {
  assert.equal(pickTier(['768', '1440'], 390), 768)
  assert.equal(pickTier(['768', '1440'], 820), 768)
  assert.equal(pickTier(['1440', '768'], 2560), 1440)
})

test('frameUrl pads to three digits and appends the revision', () => {
  assert.equal(frameUrl('/films/hero', 768, 7), '/films/hero/768/f_007.webp')
  assert.equal(frameUrl('/films/hero', 1440, 120, 13), '/films/hero/1440/f_120.webp?r=13')
})

test('activated before the scroll aims: coarse-to-fine from the start, not 0,1,2…', async () => {
  const { log, load } = recorder()
  const seq = createSequence({ base: '/s', tier: 768, count: 121, load, decode: noDecode,
                               scheduler: createScheduler({ concurrency: 4 }) })
  seq.setActive(true)
  await tick()
  assert.deepEqual(log.slice(0, 4).map(idx), [0, 32, 64, 96])
})

test('once aimed, the window around the wanted frame jumps the queue', async () => {
  const { log, load } = recorder()
  const seq = createSequence({ base: '/s', tier: 768, count: 200, load, decode: noDecode, window: 2,
                               scheduler: createScheduler({ concurrency: 4 }) })
  seq.want(150)
  seq.setActive(true)
  await settle(seq)
  assert.deepEqual(log.slice(0, 4).map(idx), [150, 149, 151, 148])
  assert.equal(seq.loaded, 200)
})

test('one pool across sequences: capped and round-robin', async () => {
  let live = 0, peak = 0
  const log = []
  const load = async (url) => { log.push(url); live++; peak = Math.max(peak, live); await tick(); live--; return {} }
  const scheduler = createScheduler({ concurrency: 3 })
  const a = createSequence({ base: '/a', tier: 768, count: 40, load, decode: noDecode, scheduler })
  const b = createSequence({ base: '/b', tier: 768, count: 40, load, decode: noDecode, scheduler })
  b.want(10)                       // b is hot
  a.setActive(true); b.setActive(true)
  await settle(a, b)
  assert.ok(peak <= 3, `peak ${peak}`)
  const turns = log.slice(3, 12).map((u) => u[1])
  assert.ok(turns.includes('a') && turns.includes('b'), `both sequences served: ${turns}`)
  assert.equal(a.loaded + b.loaded, 80)
})

test('the aimed sequence takes two per turn when slots are free at once', async () => {
  const log = []
  const load = (url) => { log.push(url[1]); return new Promise(() => {}) }
  const scheduler = createScheduler({ concurrency: 6, now: () => 1000 })
  const a = createSequence({ base: '/a', tier: 768, count: 40, load, decode: noDecode, scheduler })
  const b = createSequence({ base: '/b', tier: 768, count: 40, load, decode: noDecode, scheduler })
  const pump = scheduler.pump
  scheduler.pump = () => {}              // activate both before the first pump
  a.setActive(true); b.setActive(true); b.want(10)
  scheduler.pump = pump
  scheduler.pump()
  await tick()                           // loads start on the next microtask
  // Two turns of six slots; the starting sequence rotates each turn.
  assert.equal(log.filter((s) => s === 'b').length, 4, `aimed b takes two per turn: ${log}`)
  assert.equal(log.filter((s) => s === 'a').length, 2, `a takes one per turn: ${log}`)
})

test('a loader that throws synchronously still frees its slot', async () => {
  const scheduler = createScheduler({ concurrency: 1 })
  const seq = createSequence({ base: '/s', tier: 768, count: 3, decode: noDecode, scheduler, retries: 1,
                               load: () => { throw new Error('boom') } })
  seq.setActive(true)
  await settle(seq)
  assert.ok(seq.done)
  assert.equal(scheduler.inflight, 0)
})

test('nothing loads until active', async () => {
  const { log, load } = recorder()
  const seq = createSequence({ base: '/s', tier: 768, count: 10, load, decode: noDecode, scheduler: createScheduler() })
  seq.want(5)
  await tick()
  assert.equal(log.length, 0)
})

test('only ±decodeAhead frames around the aim are decoded', async () => {
  const decoded = []
  const { load } = recorder()
  const seq = createSequence({ base: '/s', tier: 768, count: 50, load, decode: (f) => decoded.push(f.i),
                               decodeAhead: 3, scheduler: createScheduler() })
  seq.setActive(true)
  await settle(seq)
  seq.want(20)
  assert.deepEqual(decoded.sort((x, y) => x - y), [17, 18, 19, 20, 21, 22, 23])
})

test('frame() is null before anything arrives, and clamps its index', () => {
  const seq = createSequence({ base: '/s', tier: 768, count: 10, load: () => new Promise(() => {}),
                               decode: noDecode, scheduler: createScheduler() })
  assert.equal(seq.frame(5), null)
  assert.equal(seq.frame(-4), null)
  assert.equal(seq.wanted, 0)
})

test('failed frames retry, then give up; a neighbour stands in', async () => {
  const attempts = {}
  const load = async (url) => {
    const i = idx(url)
    attempts[i] = (attempts[i] || 0) + 1
    await tick()
    if (i === 3) throw new Error('404')
    return { i }
  }
  const seq = createSequence({ base: '/s', tier: 768, count: 8, load, decode: noDecode, retries: 3, scheduler: createScheduler() })
  seq.setActive(true)
  await settle(seq)
  assert.equal(attempts[3], 3)
  assert.equal(seq.loaded, 7)
  assert.ok([2, 4].includes(seq.frame(3).i))
})

test('dispose with loads in flight keeps nothing that lands afterwards', async () => {
  const { load } = recorder()
  const seq = createSequence({ base: '/s', tier: 768, count: 20, load, decode: noDecode, scheduler: createScheduler() })
  seq.setActive(true)
  seq.dispose()
  for (let k = 0; k < 20; k++) await tick()
  assert.equal(seq.loaded, 0)
})

test('count 1 loads its only frame; count 0 is done immediately', async () => {
  const { load } = recorder()
  const one = createSequence({ base: '/s', tier: 768, count: 1, load, decode: noDecode, scheduler: createScheduler() })
  one.setActive(true)
  await settle(one)
  assert.equal(one.loaded, 1)
  const none = createSequence({ base: '/s', tier: 768, count: 0, load, decode: noDecode, scheduler: createScheduler() })
  assert.ok(none.done)
})
