// force-lib.mjs — the state-forcing primitives, shared.
//
// Extracted from states-force.mjs so the accessibility instrument can check the
// SAME states the contact sheet shows. Accessibility defects concentrate in the
// states nobody photographs: the error toast with no live region, the empty
// state whose only action is a div, the disabled control with no reason. An a11y
// pass that only ever sees the happy path checks the one state least likely to
// be broken.
//
// Interception is at the BROWSER layer, never in the app: the harness has to work
// the same on Angular as on Next, without editing the app under design.

export const FORCE_KINDS = ['route', 'seed', 'viewport', 'auth', 'input', 'none']

export async function applyRoute (page, force) {
  const body = force.kind === 'seed'
    ? JSON.stringify(Array.from({ length: force.count }, (_, i) =>
        JSON.parse(JSON.stringify(force.item ?? { id: '{{i}}' }).replaceAll('{{i}}', String(i)))))
    : (force.body ?? '')
  await page.route(force.pattern, async route => {
    if (force.delayMs) await new Promise(r => setTimeout(r, force.delayMs))
    await route.fulfill({
      status: force.status ?? 200,
      contentType: force.contentType ?? 'application/json',
      body
    })
  })
}

// One state routinely needs SEVERAL stubs, not one. Verified against a real app:
// reaching any signed-in screen there takes three — the OIDC discovery document,
// the token refresh, and the data endpoint itself. A single `pattern` per state
// cannot express that, and the state is not forceable without it.
//
// `manifest.routes` are applied to every state (the auth preamble, typically);
// `force.routes` are applied per state. Both run before `force.pattern`, so the
// state's own stub wins where they overlap.
export async function applyRoutes (page, list = []) {
  for (const r of list) await applyRoute(page, r)
}

export async function applyInput (page, steps) {
  for (const s of steps) {
    if (s.kind === 'click') await page.click(s.selector, { timeout: 5000 })
    else if (s.kind === 'hover') await page.hover(s.selector, { timeout: 5000 })
    else if (s.kind === 'focus') await page.focus(s.selector, { timeout: 5000 })
    else if (s.kind === 'type') await page.fill(s.selector, s.text, { timeout: 5000 })
    else if (s.kind === 'press') { if (s.selector) await page.focus(s.selector); await page.keyboard.press(s.key) }
    else throw new Error(`unknown input step "${s.kind}"`)
  }
}

// Capture delay for a state defined by being mid-flight. A loading state shot
// after it resolves is a shot of the loaded state.
export const DEFAULT_CAPTURE_AFTER_MS = 400

// Drive one state to the point where it can be photographed or audited.
// Throws on failure — the caller decides whether that is a `force-failed`
// defect (states-force) or a skipped audit (a11y).
export async function forceState (ctx, page, st, manifest) {
  const force = st.force ?? { kind: 'none' }

  // Manifest-level preamble: the things EVERY state needs. A session cookie and
  // a dismissed consent banner are not per-state conditions, and repeating them
  // on every row is how a manifest rots into something nobody updates.
  //
  // Consent defaults to declined — the privacy-preserving choice — unless the
  // manifest says otherwise. A banner left standing also covers the screen in
  // every single contact-sheet cell.
  if (manifest.cookies) await ctx.addCookies(manifest.cookies)
  if (manifest.localStorage) {
    await page.addInitScript(items => {
      for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v)
    }, manifest.localStorage)
  }

  if (force.kind === 'auth') {
    if (force.cookies) await ctx.addCookies(force.cookies)
    if (force.localStorage) {
      await page.addInitScript(items => {
        for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v)
      }, force.localStorage)
    }
  }
  // An `input` state usually needs data on screen before it can be acted on:
  // hovering a row requires rows. Honour a pattern on ANY force block, not just
  // route/seed, so an interaction state can stub its own precondition.
  // Order matters: shared stubs first, then the state's own, then its shorthand
  // pattern. Playwright matches the most recently registered route first, so the
  // narrowest, most state-specific stub must be registered last.
  await applyRoutes(page, manifest.routes)
  await applyRoutes(page, force.routes)
  if (force.pattern) await applyRoute(page, force)
  if (force.kind === 'viewport') await page.setViewportSize({ width: force.width, height: force.height })

  const url = new URL(st.url ?? '/', manifest.baseUrl).href
  // A loading state never reaches networkidle by definition, so waiting for it
  // would time out on exactly the states we most want to look at.
  const isMidFlight = !!force.delayMs
  await page.goto(url, { waitUntil: isMidFlight ? 'commit' : 'networkidle', timeout: 20000 })

  if (force.kind === 'input') await applyInput(page, force.steps)
  await page.waitForTimeout(st.captureAfterMs ?? (isMidFlight ? DEFAULT_CAPTURE_AFTER_MS : 250))
  return { isMidFlight }
}
