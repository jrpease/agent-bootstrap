// verify/perf.mjs — committed reference implementation of verification-loop.md §4.
//
// COPY THIS FILE INTO THE PROJECT'S verify/ DIRECTORY. Do not rewrite it from the
// prose: the last hand-rolled harness merged the two frame rows into one >50ms
// threshold and thereby deleted the 60fps check — a page dropping every single
// 60Hz frame passed it at 0.0%. The budget below is the skill's actual rule.
//
// Usage:
//   node verify/perf.mjs <url>                     desktop pass (1440×900, no throttle)
//   node verify/perf.mjs <url> --mobile            mobile pass (375×812, 4× CPU throttle)
//   node verify/perf.mjs <url> --expect-fail       instrument check: run against
//                                                  verify/jank-control.html and exit 0
//                                                  only if the frame rules went red
//
// Run the --expect-fail check ONCE per project against the committed control page
// before trusting any clean result. A harness whose recorder never armed is
// indistinguishable from a genuinely smooth page.
//
// INP is measured only while input is driven: the default run drives a wheel
// scroll, then the interaction drives below. Extend driveInteractions() with the
// page's own affordances (hover the CTA, open the overlay, drag the carousel) —
// the signature interaction is the one that most needs the number.

import { chromium } from 'playwright'

const BUDGET = { lcp: 2500, cls: 0.1, inp: 200, longFramePct: 10, worstFrame: 50 }

export async function measure(url, { width = 1440, height = 900, cpuThrottle = 1 } = {}) {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width, height } })
  if (cpuThrottle > 1) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottle })
  }

  // Observers must exist before first paint, so this runs as an init script.
  await page.addInitScript(() => {
    window.__v = { lcp: 0, cls: 0, inp: 0, inputDriven: false }
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime })
      .observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value })
      .observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.inp = Math.max(window.__v.inp, e.duration) })
      .observe({ type: 'event', durationThreshold: 16, buffered: true })
  })
  await page.goto(url, { waitUntil: 'networkidle' })

  const startFrames = () => page.evaluate(() => {
    window.__f = []; window.__rec = true
    let last = performance.now()
    const tick = (t) => { window.__f.push(t - last); last = t; if (window.__rec) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  const stopFrames = () => page.evaluate(() => { window.__rec = false; return window.__f })

  // Drive the page's own scroll pipeline. With Lenis or any smooth-scroll layer,
  // page.mouse.wheel() is the honest input — scrollTo() bypasses the hijack and
  // measures a scroll the visitor never performs.
  await startFrames()
  for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16) }
  const scrollFrames = await stopFrames()

  // Repeat the frame block around each scripted interaction from step 3's
  // manifest — a drag and an overlay open have their own timing.
  await startFrames()
  await driveInteractions(page)
  const interactionFrames = await stopFrames()
  await page.evaluate(() => { window.__v.inputDriven = true })

  const v = await page.evaluate(() => window.__v)
  await browser.close()

  const f = [...scrollFrames, ...interactionFrames]
  const long = f.filter((d) => d > 16.7)
  return {
    // null, not 0 — an absent measurement must not read as a passing one.
    lcp: v.lcp || null,                       // no LCP candidate on the page
    cls: v.cls,                               // 0 here is a real, good value
    inp: v.inputDriven && v.inp ? v.inp : null, // no input driven, or none slow enough to record
    longFramePct: f.length ? (long.length / f.length) * 100 : null,
    worstFrame: f.length ? Math.max(...f) : null,
    frames: f.length,                         // 0 means the recorder never armed
    budget: BUDGET,
  }
}

// EXTEND PER PROJECT: drive what the page actually offers, per the capture
// manifest. The default is a viewport-center hover + click-safe tab press so
// INP has at least one real input even on a page with no overlays.
async function driveInteractions(page) {
  const { width, height } = page.viewportSize()
  await page.mouse.move(width / 2, height / 2)
  await page.mouse.move(width / 2 + 80, height / 2 + 40, { steps: 10 })
  await page.keyboard.press('Tab')
  await page.waitForTimeout(200)
}

// ---- verdict ----------------------------------------------------------------

function line(name, value, unit, bar, over) {
  if (value === null) return { name, text: `NOT MEASURED ${name} — say why in the report; a zero is not a pass`, fail: null }
  const fail = over(value, bar)
  return { name, text: `${fail ? 'FAIL' : 'PASS'} ${name} ${value.toFixed(name === 'CLS' ? 4 : 1)}${unit} (budget ${bar}${unit})`, fail }
}

export function verdict(m) {
  return [
    line('LCP', m.lcp, 'ms', m.budget.lcp, (v, b) => v > b),
    line('CLS', m.cls, '', m.budget.cls, (v, b) => v > b),
    line('INP', m.inp, 'ms', m.budget.inp, (v, b) => v > b),
    line('long frames >16.7ms', m.longFramePct, '%', m.budget.longFramePct, (v, b) => v > b),
    line('worst frame', m.worstFrame, 'ms', m.budget.worstFrame, (v, b) => v > b),
  ]
}

// ---- CLI --------------------------------------------------------------------

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())
if (invokedDirectly) {
  const args = process.argv.slice(2)
  const url = args.find((a) => !a.startsWith('--'))
  if (!url) { console.error('usage: node verify/perf.mjs <url> [--mobile] [--expect-fail]'); process.exit(1) }
  const mobile = args.includes('--mobile')
  const expectFail = args.includes('--expect-fail')

  const m = await measure(url, mobile ? { width: 375, height: 812, cpuThrottle: 4 } : {})
  const lines = verdict(m)
  console.log(`# ${url} · ${mobile ? '375×812 @4× CPU throttle' : '1440×900 unthrottled'} · ${m.frames} frames recorded`)
  for (const l of lines) console.log(l.text)
  if (m.frames === 0) { console.log('FAIL frame recorder never armed — 0 frames is an instrument defect, not a smooth page'); process.exit(1) }

  const frameRulesRed = lines.some((l) => (l.name.startsWith('long frames') || l.name === 'worst frame') && l.fail === true)
  if (expectFail) {
    // Instrument check: the janky control must go red on the frame rules.
    console.log(frameRulesRed ? 'INSTRUMENT OK — the control went red' : 'INSTRUMENT DEFECT — a deliberately janky page passed; the recorder or the rule is wrong')
    process.exit(frameRulesRed ? 0 : 1)
  }
  const anyFail = lines.some((l) => l.fail === true)
  const anyMissing = lines.some((l) => l.fail === null)
  if (anyMissing) console.log('note: a NOT MEASURED line never satisfies its bar — report it as absent, with the reason')
  process.exit(anyFail ? 2 : 0)
}
