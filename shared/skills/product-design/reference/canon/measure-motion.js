/* measure-motion.js — the amplitude probe, as an injectable snippet.
 *
 * Companion to measure-craft.js. Needed only where a moment is driven live in a
 * browser; motion sourced from Mobbin goes through motion-measure.mjs's pixel
 * path instead.
 *
 *   __pdCapture(fn)       trigger expressible in JS. Deterministic, and does not
 *                         depend on the tab rendering. PREFERRED.
 *   __pdArm() / __pdRead()  trigger driven from outside the page. Requires a
 *                         FOREGROUNDED tab and says so loudly when it got nothing.
 */
(() => {
  /* MOTION PROBE — two entry points, because the trigger comes from two places.
   *
   * __pdCapture(fn)  the interaction can be expressed in JS. Deterministic and
   *                  independent of whether the tab is rendering. PREFERRED.
   * __pdArm()/__pdRead()  the interaction is driven from outside the page (an
   *                  agent clicking, a real keypress). Requires a FOREGROUNDED
   *                  tab and says so loudly when it got nothing.
   *
   * Why two: the first draft polled getAnimations() on a 16ms interval and the
   * control reported a transition starting at 581ms that actually began at 0 —
   * Chrome throttles background-tab timers to ~1Hz, so every animation was first
   * seen after it had already finished, and `from` equalled `to`, reporting 0px
   * of travel on a fixture that moves 120px. The second draft used transitionrun
   * events and captured nothing at all: a background tab suspends the rendering
   * loop, and transition events are dispatched from it. The animations existed
   * the whole time — only the notifications did not. Hence the synchronous path
   * below, which forces the style flush itself and reads the animations
   * directly, depending on nothing that a throttled tab can withhold.
   */
  const snapBox = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }

  /* Animations already running before the trigger are NOT part of the moment.
   * The control run captured a fourth "participant" with 0px of travel and a
   * 2000ms duration that stretched the measured moment from 400ms to 2000ms —
   * an ambient animation that predated the trigger. Real products are full of
   * these: spinners, pulsing status dots, marquees, extension-injected chrome.
   * Without this baseline every canon entry's duration would be governed by
   * whatever happened to be looping on screen. */
  const baselineOf = () => new Set(document.getAnimations())

  /* TRAVEL comes from the KEYFRAMES, not from sampling the element's box.
   * The control run proved sampling cannot work: a backgrounded tab does not run
   * the compositor, so a transitioning element's getBoundingClientRect() never
   * advances — the fixture's boxes read x=40 before, during, and after a 120px
   * translate, and travel measured 0 on a moment that plainly moves. Keyframes
   * are declarative: the stylesheet states the distance whether or not a single
   * frame is ever painted. */
  /* Chrome hands back transforms in whichever form the stylesheet used: a
   * transition on a CSS `transform` yields the function string
   * ("translateX(120px)"), while a Web Animation built from a matrix yields
   * "matrix(...)". The control run failed against a parser that only knew
   * matrices — it read the right keyframe and still returned 0. Handle both. */
  const parseTransform = str => {
    if (!str || str === 'none') return { tx: 0, ty: 0, sx: 1, sy: 1 }
    const mat = str.match(/matrix(3d)?\(([^)]+)\)/)
    if (mat) {
      const v = mat[2].split(',').map(Number)
      return mat[1]
        ? { tx: v[12], ty: v[13], sx: v[0], sy: v[5] }
        : { tx: v[4], ty: v[5], sx: v[0], sy: v[3] }
    }
    const out = { tx: 0, ty: 0, sx: 1, sy: 1 }
    const num = t => parseFloat(t) || 0
    for (const [, fn, argstr] of str.matchAll(/(\w+)\(([^)]*)\)/g)) {
      const a = argstr.split(',').map(t => t.trim())
      switch (fn) {
        case 'translateX': out.tx += num(a[0]); break
        case 'translateY': out.ty += num(a[0]); break
        case 'translate':
        case 'translate3d': out.tx += num(a[0]); out.ty += num(a[1]); break
        case 'scale': out.sx *= num(a[0]); out.sy *= a[1] === undefined ? num(a[0]) : num(a[1]); break
        case 'scaleX': out.sx *= num(a[0]); break
        case 'scaleY': out.sy *= num(a[0]); break
      }
    }
    return out
  }

  /* getKeyframes() does NOT report transforms in the same pixel space as
   * getBoundingClientRect(). On this machine a CSS-declared translateX(100px)
   * comes back from the keyframes as translateX(200px) — the device pixel ratio
   * — while getComputedStyle() and getBoundingClientRect() both stay in CSS px.
   * Left uncorrected, every canon travel number measured on a Retina display
   * would be exactly double, and nothing downstream would look wrong enough to
   * notice. Calibrate against a known value rather than hardcoding a cause: the
   * probe holds whether the factor is DPR, page zoom, or something Chrome
   * changes later, and falls back to 1 if it cannot run.
   * @returns keyframe px per CSS px */
  let kfScale = null
  const keyframeScale = () => {
    if (kfScale !== null) return kfScale
    kfScale = 1
    try {
      const el = document.createElement('div')
      el.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;opacity:0;pointer-events:none;transition:transform 1ms linear'
      document.body.appendChild(el)
      void el.offsetHeight
      el.style.transform = 'translateX(100px)'
      void el.offsetHeight
      const a = el.getAnimations()[0]
      const frames = a ? a.effect.getKeyframes() : []
      const tx = frames.length ? parseTransform(frames[frames.length - 1].transform).tx : 100
      el.remove()
      if (tx) kfScale = tx / 100
    } catch { kfScale = 1 }
    return kfScale
  }

  const travelOf = (anim, box) => {
    let frames = []
    try { frames = anim.effect.getKeyframes() } catch { return 0 }
    if (frames.length < 2) return 0
    const a = frames[0]; const b = frames[frames.length - 1]
    const k = keyframeScale()
    const A = parseTransform(a.transform); const B = parseTransform(b.transform)
    // Translate and geometric lengths come from the keyframes and are divided
    // back into CSS px. Scale factors are unitless, so the px they produce are
    // already CSS px via the element's own box — do NOT divide those.
    const translate = Math.hypot(B.tx - A.tx, B.ty - A.ty) / k
    const scalePx = Math.hypot(Math.abs(B.sx - A.sx) * box.w, Math.abs(B.sy - A.sy) * box.h)
    let geometric = 0
    for (const prop of ['left', 'top', 'width', 'height']) {
      const av = parseFloat(a[prop]); const bv = parseFloat(b[prop])
      if (!Number.isNaN(av) && !Number.isNaN(bv)) geometric = Math.max(geometric, Math.abs(bv - av) / k)
    }
    return Math.max(translate, scalePx, geometric)
  }

  const recordFrom = (seen, t0, baseline) => {
    // Forcing layout here is the point, not a smell: it makes the pending style
    // change produce its animations synchronously, so the boxes read below are
    // genuinely pre-animation and t0 is the real start.
    void document.body.offsetHeight
    for (const a of document.getAnimations()) {
      if (baseline.has(a)) continue
      const t = a.effect.getTiming()
      // An endlessly repeating animation is ambient by definition — a spinner, a
      // pulsing status dot, a breathing focus ring. A moment is bounded. The
      // baseline alone cannot catch these: it only knows what was already
      // running when we armed, and an infinite pulse that starts or restarts
      // after that slips through. Excluding by SHAPE rather than by timing is
      // what makes this hold on a real product screen. (Found via the control:
      // a 2000ms infinite opacity loop was stretching a 400ms moment to 2000ms.)
      if (t.iterations === null || !isFinite(t.iterations)) continue
      const el = a.effect && a.effect.target
      if (!el || !(el instanceof Element) || seen.has(el)) continue
      const timing = t
      const from = snapBox(el)
      seen.set(el, {
        el,
        start: performance.now() - t0,
        delay: timing.delay || 0,
        duration: typeof timing.duration === 'number' ? timing.duration : 0,
        easing: timing.easing,
        from,
        travel: travelOf(a, from)
      })
    }
  }

  window.__pdCapture = (trigger) => {
    const seen = new Map()
    const baseline = baselineOf()
    const t0 = performance.now()
    if (typeof trigger === 'function') trigger()
    recordFrom(seen, t0, baseline)
    window.__pdState = { seen, mode: 'sync', ambient: baseline.size }
    return seen.size
  }

  window.__pdArm = () => {
    const seen = new Map()
    const baseline = baselineOf()
    const t0 = performance.now()
    const onStart = () => recordFrom(seen, t0, baseline)
    const types = ['transitionrun', 'animationstart']
    for (const t of types) document.addEventListener(t, onStart, true)
    window.__pdState = {
      seen,
      mode: 'events',
      ambient: baseline.size,
      stop: () => { for (const t of types) document.removeEventListener(t, onStart, true) }
    }
    return true
  }

  window.__pdRead = () => {
    const st = window.__pdState
    if (!st) throw new Error('__pdRead called without __pdArm or __pdCapture')
    if (st.stop) st.stop()
    const events = []
    let i = 0
    for (const [, rec] of st.seen) {
      // The element's own delay is what creates a stagger group, so it belongs
      // in t0 rather than being folded into duration.
      const t0 = rec.start + rec.delay
      // `to` is synthesised from the declared travel rather than sampled, so the
      // trace is identical whether or not the tab ever rendered a frame.
      const live = snapBox(rec.el)
      const sampled = Math.hypot(live.x - rec.from.x, live.y - rec.from.y)
      const travel = Math.max(rec.travel, sampled)
      events.push({
        id: rec.el.tagName + '#' + (rec.el.id || '') + '.' + [...rec.el.classList].slice(0, 2).join('.') + '~' + (i++),
        t0: +t0.toFixed(1),
        t1: +(t0 + rec.duration).toFixed(1),
        easing: rec.easing,
        from: rec.from,
        to: { ...rec.from, x: rec.from.x + travel },
        travelPx: +travel.toFixed(1),
        travelSource: rec.travel >= sampled ? 'keyframes' : 'sampled'
      })
    }
    delete window.__pdState
    const out = { viewport: { w: innerWidth, h: innerHeight }, events, ambientExcluded: st.ambient ?? 0, keyframeScale: keyframeScale() }
    if (!events.length) {
      // A silent zero here would enter the canon as "this product has no motion",
      // which is a claim, not an absence of data. Make it loud.
      out.warning = st.mode === 'events'
        ? 'no animations captured — if the tab was backgrounded the rendering loop was suspended and transition events were never dispatched. Foreground the tab and re-run, or use __pdCapture(fn).'
        : 'no animations captured — the trigger produced no Web Animation. Verify the interaction actually animates before recording this as "no motion".'
    }
    return out
  }

  return 'measure-motion armed'
})()
