/* surface-check.js — run BEFORE measuring, every time.
 *
 * Navigating to a product's domain lands on its MARKETING SITE, not its app.
 * Caught live: notion.so redirects to notion.com, whose homepage measured
 * typeContrast 6.86 with 96px display type and 14 interactive elements. Folding
 * that into canon.md would have imported marketing numbers into the one file
 * whose entire job is to keep product numbers separate from them — the precise
 * contamination this skill exists to prevent, arriving through the front door.
 *
 * It is cheap on purpose: run this first and only pay for the full craft
 * measurement once the surface is confirmed.
 */
(() => {
  /* MEASURE THE FOLD, NOT THE DOCUMENT. This check used to count every element
   * in the page and divide by ONE viewport's area, which is not a density — a
   * 12,338px marketing page reported 39.4 targets/megapixel against a true fold
   * value of 8.5, and sailed through as an app surface. measure-craft.js has
   * always filtered to visible and in-viewport; this now matches it, so these
   * numbers and canon.md's ranges finally mean the same thing. */
  const vis = el => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    const s = getComputedStyle(el)
    return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05
  }
  const inView = el => {
    const r = el.getBoundingClientRect()
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
  }

  const all = [...document.querySelectorAll('body *')].filter(el => vis(el) && inView(el))
  const sizes = all
    .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1))
    .map(el => parseFloat(getComputedStyle(el).fontSize))
    .filter(Boolean)
  const maxFont = sizes.length ? Math.max(...sizes) : 0
  // Same ratio measure-craft.js records, so it is comparable with canon.md.
  const typeContrast = sizes.length ? Math.max(...sizes) / Math.min(...sizes) : null
  // Selector matches measure-craft.js's, so the two probes count the same things.
  const interactive = all.filter(el =>
    el.matches('a,button,input,select,textarea,[role=button],[role=link],[role=menuitem],[role=tab],[role=checkbox],[tabindex]:not([tabindex="-1"])')).length

  // Font size alone is not the discriminator. The first version of this check
  // used "maxFont >= 40 -> marketing" and promptly rejected a real Notion page
  // over its 78px document title. Acorns shows a balance at 30px for the same
  // reason: product surfaces DO carry display type.
  const sig = {}
  for (const el of all) {
    const k = el.tagName + '.' + [...el.classList].sort().join('.')
    sig[k] = (sig[k] || 0) + 1
  }
  const reused = Object.values(sig).filter(n => n >= 3).reduce((a, b) => a + b, 0)
  const reuseRatio = all.length ? reused / all.length : 0

  // Component reuse is NOT the discriminator either, though it read like one.
  // Caught live: heronaiapp.com, a marketing page, measured reuse 0.76 and was
  // waved through as "APP SURFACE — measure it". Page builders (Webflow, Framer)
  // emit repeated section wrappers, so a bespoke marketing page is every bit as
  // "systematic" as a data table by this measure.
  //
  // NO SINGLE NUMBER SEPARATES THESE. Measured at the fold, 1440x900, 2026-09-04:
  //
  //                            perMp  contrast  reuse
  //   Heron        marketing     8.5      3.20  0.724
  //   GitHub tree  PRODUCT      13.9      1.71  0.411
  //   GitHub PRs   PRODUCT      55.6      2.67  0.744
  //   Stripe       marketing    17.0      3.43  0.673
  //   Linear       marketing    24.7      5.82  0.557
  //
  // Density fails: Stripe and Linear's marketing pages are DENSER than GitHub's
  // repo tree, a real work surface. Reuse fails in the other direction: the real
  // work surface scores 0.411, below the old gate, while the marketing page
  // scores 0.724. Contrast looks clean on this sample (product 1.71-2.67,
  // marketing 3.20-5.82) right up until Notion's editor surface, which canon.md
  // measures at 6.5 and which would land above every marketing page here.
  //
  // So this check no longer returns a confident verdict. It returns the numbers
  // beside the ranges canon.md actually measured, and tells the operator to look.
  // Do not re-tune this into a binary: the last two attempts to do so each shipped
  // a rule that was wrong about a real entry in the file it protects.
  const areaMp = (innerWidth * innerHeight) / 1e6
  const perMegapixel = areaMp ? interactive / areaMp : 0

  // The element count's ONLY job is catching a page that never rendered. It is
  // not a density judgement — that is perMegapixel's job, below. The old >400
  // floor counted the whole document; in-viewport, a real work surface can sit
  // under 100 (GitHub's repo tree measures 95) and is still the hard screen.
  const loaded = all.length > 40
  const inProductDensity = perMegapixel >= 12 && perMegapixel <= 160   // canon: 12.7-151

  // TWO NARROW BANDS, NOT ONE SPAN. canon.md measures two families and nothing
  // between them: dense surfaces at 2.0-2.67, editor surfaces at ~6.5. An
  // earlier draft here bridged them into a single 2.8-7 band and promptly called
  // Stripe (3.43) and Linear (5.82) marketing pages product surfaces. The gap
  // between the families is real evidence — a surface landing in it is exactly
  // what "marketing type on a work surface" measures like. Do not bridge them.
  const inDenseContrast = typeContrast !== null && typeContrast <= 2.8
  const inEditorContrast = typeContrast !== null && typeContrast >= 6 && typeContrast <= 7
  const fits = inProductDensity && (inDenseContrast || inEditorContrast)

  return {
    host: location.hostname,
    path: location.pathname.slice(0, 24),
    elements: all.length,
    interactive,
    interactivePerMegapixel: +perMegapixel.toFixed(1),
    typeContrast: typeContrast && +typeContrast.toFixed(2),
    maxFont,
    reuseRatio: +reuseRatio.toFixed(3),
    canonRanges: { interactivePerMegapixel: '12.7-151', denseContrast: '2.0-2.67', editorContrast: '~6.5' },
    verdict: !loaded ? 'TOO SPARSE — may not have finished loading, or is not the hard screen'
      : !inProductDensity ? `LOOK FIRST — ${perMegapixel.toFixed(1)} targets/megapixel is outside the 12.7-151 every product screen in canon.md measures. Marketing folds land here, but so does a genuinely calm summary screen. Open it and decide.`
      : !fits ? `LOOK FIRST — density fits, but ${typeContrast && typeContrast.toFixed(2)}x contrast matches neither the dense family (2.0-2.67) nor an editor (~6.5). Marketing type on a work surface reads exactly like this. Open it and decide.`
      : 'CONSISTENT WITH A PRODUCT SURFACE — density and contrast both sit in canon range. Confirm by eye that it is the hard screen, then measure.',
    // ADVISORY ONLY. When the operator supplied the URL, their word wins: they
    // know which screen they meant and this heuristic does not.
    authority: 'advisory — an operator-supplied URL overrides this verdict'
  }
})()
