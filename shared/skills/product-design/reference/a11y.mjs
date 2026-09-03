// a11y.mjs — the accessibility floor, run over every forced state.
//
// verify.md names axe as an instrument and the live test's criterion 3 is "zero
// blocking violations". Nothing ran it until this file existed.
//
// Two checks, because axe alone does not cover the floor:
//
//   1. axe-core, over the WCAG 2.x A/AA rule set.
//   2. A focus-visibility pass, driven with real Tab presses. axe cannot tell
//      whether a focus ring is actually VISIBLE — `:focus { outline: none }` with
//      nothing in its place is valid HTML, passes every axe rule, and makes the
//      keyboard path unusable. Real Tab presses matter: `element.focus()` does not
//      satisfy `:focus-visible`, so a probe built on it fails every screen that
//      uses the correct modern pattern.
//
// It audits every state in the manifest, not the happy path: the toast with no
// live region, the empty state whose only action is a div, the disabled control
// with no reason. Those are the states nobody screenshots and the ones that
// break.
//
// axe-core is injected from its own bundle rather than via @axe-core/playwright,
// so no new dependency is needed.
//
// Usage:
//   node a11y.mjs <state-manifest.json> [--out a11y] [--only <state>]
//   node a11y.mjs <manifest> --expect-fail       # control: violations REQUIRED

import { chromium } from 'playwright'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { forceState } from './force-lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const arg = (f, d) => { const i = process.argv.indexOf(f); return i === -1 ? d : process.argv[i + 1] }
const has = f => process.argv.includes(f)
const manifestPath = process.argv[2]
if (!manifestPath) {
  console.error('usage: node a11y.mjs <state-manifest.json> [--out dir] [--only state] [--expect-fail]')
  process.exit(1)
}
const outDir = path.resolve(arg('--out', 'a11y'))
const only = arg('--only', null)
const expectFail = has('--expect-fail')

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
await mkdir(outDir, { recursive: true })

const axeSrc = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8')
const axeVersion = require('axe-core/package.json').version

// serious and critical block; moderate and minor are reported, not gating.
// A floor that blocks on every minor advisory gets switched off, and a floor
// that is switched off is not a floor.
const BLOCKING = new Set(['critical', 'serious'])
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Check each focusable paints a visible focus indicator.
//
// Driven with REAL Tab presses, not element.focus(). Programmatic focus does not
// satisfy the `:focus-visible` heuristic, so a probe built on it reports "no
// focus ring" on every screen that uses `:focus-visible` — which is the correct
// modern pattern. The first version of this probe did exactly that and failed a
// screen for being right.
// Snapshot the element AND its nearest ancestors. A focus ring is routinely drawn
// by a wrapper via :focus-within — a text input inside a styled field container is
// the standard pattern — and a probe that only reads the input's own box calls
// that "no focus indicator". Three levels is enough for every wrapper idiom seen
// so far without reaching far enough to pick up unrelated page changes.
const SNAP_FN = `(n) => { const one = (e) => { const c = getComputedStyle(e); return [c.outlineStyle,c.outlineWidth,c.outlineColor,c.boxShadow,c.borderColor,c.borderWidth,c.backgroundColor,c.color].join('|') }; const parts = []; let e = n; for (let i = 0; i < 3 && e; i++, e = e.parentElement) parts.push(one(e)); return parts.join('||') }`

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),[contenteditable=""]'
const MAX_TABS = 40

async function focusProbe (page) {
  // Resting style for every focusable, recorded before anything is focused.
  const resting = await page.evaluate(([sel, snapSrc]) => {
    const snap = eval(snapSrc)
    // Blur first. A state whose force method ended by focusing something would
    // otherwise have its resting style recorded WITH the focus ring, and the
    // element then reads as having no focus treatment at all.
    document.activeElement?.blur?.()
    const nodes = [...document.querySelectorAll(sel)]
      .filter(n => !n.hasAttribute('disabled') && n.offsetParent !== null)
    nodes.forEach((n, i) => n.setAttribute('data-pd-focus', String(i)))
    return nodes.map((n, i) => ({
      i,
      style: snap(n),
      tag: n.tagName.toLowerCase(),
      label: (n.getAttribute('aria-label') || n.textContent || '').trim().slice(0, 48),
      selector: n.id ? '#' + n.id : `${n.tagName.toLowerCase()}[data-pd-focus="${i}"]`
    }))
  }, [FOCUSABLE, SNAP_FN])

  if (!resting.length) return { focusables: 0, noVisibleFocus: [] }

  await page.evaluate(() => document.body.focus?.())
  const seen = new Set()
  const bad = []
  for (let t = 0; t < Math.min(MAX_TABS, resting.length + 4); t++) {
    await page.keyboard.press('Tab')
    const hit = await page.evaluate(snapSrc => {
      const snap = eval(snapSrc)
      const el = document.activeElement
      if (!el || !el.hasAttribute?.('data-pd-focus')) return null
      return { i: Number(el.getAttribute('data-pd-focus')), style: snap(el) }
    }, SNAP_FN)
    if (!hit || seen.has(hit.i)) continue
    seen.add(hit.i)
    const rest = resting[hit.i]
    if (rest && hit.style === rest.style) {
      bad.push({ tag: rest.tag, label: rest.label, selector: rest.selector })
    }
  }
  await page.evaluate(() => document.querySelectorAll('[data-pd-focus]').forEach(e => e.removeAttribute('data-pd-focus')))
  // Anything Tab never reached is reported by the keyboard probe below, not here.
  return { focusables: resting.length, reached: seen.size, noVisibleFocus: bad }
}

// The keyboard pass verify.md promises, and the defect neither axe nor the focus
// probe can see: an element styled to look clickable, carrying a real click
// listener, that the keyboard can never reach.
//
// Detected through CDP rather than an `onclick` attribute check, because Angular,
// React and Vue all bind through addEventListener — an attribute scan finds
// nothing on exactly the frameworks this skill is used on.
const INTERACTIVE_ROLES = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab', 'switch', 'option']

async function clickableNotFocusable (page, ctx) {
  const marked = await page.evaluate(roles => {
    const NATIVE = 'a[href],button,input,select,textarea,summary,label,[contenteditable=""]'
    let n = 0
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest(NATIVE)) continue
      if (getComputedStyle(el).cursor !== 'pointer') continue
      const role = el.getAttribute('role')
      if (role && roles.includes(role)) continue
      if (el.tabIndex >= 0) continue
      if (!(el.textContent || '').trim()) continue
      el.setAttribute('data-pd-candidate', String(n++))
    }
    return n
  }, INTERACTIVE_ROLES)
  if (!marked) return []

  // A candidate only matters if it actually listens for clicks; plenty of things
  // carry cursor:pointer without being controls.
  const cdp = await ctx.newCDPSession(page)
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 })
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-pd-candidate]' })
  const bad = []
  for (const nodeId of nodeIds) {
    const { object } = await cdp.send('DOM.resolveNode', { nodeId })
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: object.objectId })
    if (!listeners.some(l => l.type === 'click' || l.type === 'mousedown' || l.type === 'keydown')) continue
    const { attributes } = await cdp.send('DOM.getAttributes', { nodeId })
    const id = attributes[attributes.indexOf('data-pd-candidate') + 1]
    const info = await page.evaluate(i => {
      const el = document.querySelector(`[data-pd-candidate="${i}"]`)
      return el ? { tag: el.tagName.toLowerCase(), label: (el.textContent || '').trim().slice(0, 48) } : null
    }, id)
    if (info) bad.push(info)
  }
  await page.evaluate(() => document.querySelectorAll('[data-pd-candidate]').forEach(e => e.removeAttribute('data-pd-candidate')))
  await cdp.detach().catch(() => {})
  return bad
}

const report = []
const browser = await chromium.launch()

for (const surface of manifest.surfaces) {
  for (const st of manifest.states) {
    if (only && st.state !== only) continue
    if (st.surface && !st.surface.includes(surface.name)) continue
    if (st.status === 'unforceable') {
      report.push({ state: st.state, surface: surface.name, status: 'unforceable',
        note: 'not audited — an unforceable state is an unaudited state, and shipping one needs the operator’s recorded agreement' })
      continue
    }

    const ctx = await browser.newContext({ viewport: { width: surface.width, height: surface.height } })
    const page = await ctx.newPage()
    const rec = { state: st.state, screen: st.screen, surface: surface.name }
    try {
      await forceState(ctx, page, st, manifest)
      await page.evaluate(axeSrc)
      const res = await page.evaluate(async tags => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } })
        return r.violations.map(v => ({
          id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.slice(0, 5).map(n => n.target.join(' ')),
          count: v.nodes.length
        }))
      }, TAGS)
      const focus = await focusProbe(page)
      const unreachable = await clickableNotFocusable(page, ctx)

      rec.violations = res
      rec.blocking = res.filter(v => BLOCKING.has(v.impact))
      rec.advisory = res.filter(v => !BLOCKING.has(v.impact))
      rec.focus = focus
      rec.unreachable = unreachable
      rec.status = 'audited'
    } catch (e) {
      // An un-auditable state is a defect, never a pass. The whole point of the
      // instrument is that silence and cleanliness must be distinguishable.
      rec.status = 'audit-failed'
      rec.note = e.message.split('\n')[0]
    } finally {
      await ctx.close()
    }
    report.push(rec)
  }
}
await browser.close()

const audited = report.filter(r => r.status === 'audited')
const failedAudits = report.filter(r => r.status === 'audit-failed')
const blockingTotal = audited.reduce((n, r) => n + r.blocking.length, 0)
const focusTotal = audited.reduce((n, r) => n + r.focus.noVisibleFocus.length, 0)
const unreachableTotal = audited.reduce((n, r) => n + r.unreachable.length, 0)

await writeFile(path.join(outDir, 'a11y.json'), JSON.stringify({
  manifest: path.basename(manifestPath), axeVersion, tags: TAGS,
  states: report.length, audited: audited.length, auditFailed: failedAudits.length,
  blockingTotal, focusTotal, unreachableTotal, report
}, null, 2))

for (const r of report) {
  if (r.status !== 'audited') { console.log(`${r.status === 'unforceable' ? 'UNF ' : 'FAIL'} ${r.state}/${r.surface}  ${r.note ?? ''}`); continue }
  const mark = r.blocking.length || r.focus.noVisibleFocus.length || r.unreachable.length ? 'FAIL' : 'ok  '
  console.log(`${mark} ${r.state}/${r.surface}  ${r.blocking.length} blocking · ${r.advisory.length} advisory · ${r.focus.noVisibleFocus.length}/${r.focus.focusables} no visible focus · ${r.unreachable.length} keyboard-unreachable`)
  for (const v of r.blocking) console.log(`       ${v.impact}: ${v.id} — ${v.help} (${v.count}×, e.g. ${v.nodes[0]})`)
  for (const f of r.focus.noVisibleFocus.slice(0, 3)) console.log(`       focus: ${f.selector} "${f.label}" paints nothing on :focus`)
  for (const u of r.unreachable.slice(0, 3)) console.log(`       keyboard: <${u.tag}> "${u.label}" has a click listener and cannot be reached by tab`)
}

console.log(`\naxe-core ${axeVersion} · ${audited.length}/${report.length} states audited · ${blockingTotal} blocking violations · ${focusTotal} with no visible focus · ${unreachableTotal} keyboard-unreachable -> ${path.join(outDir, 'a11y.json')}`)
if (failedAudits.length) console.log(`${failedAudits.length} state(s) could not be audited — that is a defect, not a pass.`)

const clean = blockingTotal === 0 && focusTotal === 0 && unreachableTotal === 0 && failedAudits.length === 0
if (expectFail) {
  // Control mode. A harness that reports clean on a fixture built to be broken
  // is a harness that will report clean on anything.
  console.log(clean
    ? '\nCONTROL FAILED: the fixture has known violations and the harness found none.'
    : `\nCONTROL PASSED: harness detected ${blockingTotal} blocking + ${focusTotal} focus + ${unreachableTotal} keyboard defects on a fixture built to have them.`)
  process.exit(clean ? 1 : 0)
}
process.exit(clean ? 0 : 1)
