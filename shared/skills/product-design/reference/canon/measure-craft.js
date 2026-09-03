/* measure-craft.js — the canon's CRAFT measurement, as an injectable snippet.
 *
 * Injected into the operator's already-authenticated Chrome through the browser
 * JS tool. A snippet rather than a module because nothing on that path can
 * import.
 *
 * Split from the motion probe deliberately: the live pass measures the four
 * numbers that REQUIRE a DOM — type contrast, density, spacing steps, component
 * reuse — while motion now comes from Mobbin's recordings. Injecting the probe
 * into seven origins that will never use it is waste, and a smaller snippet is
 * a smaller thing to get wrong.
 *
 * Returns AGGREGATES ONLY: font sizes, colour values, element counts, ratios.
 * It never reads or returns page text. That property is load-bearing — this
 * runs against real, logged-in, sometimes financial accounts.
 *
 *   __pdMeasure()   craft numbers for the screen as it currently stands
 *
 * Every number here has to mean the same thing across every entry or the
 * medians are noise, so each rule is stated where it is applied.
 */
(() => {
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
  const median = a => {
    if (!a.length) return null
    const s = [...a].sort((x, y) => x - y)
    const m = s.length >> 1
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  }

  window.__pdMeasure = () => {
    const all = [...document.querySelectorAll('body *')].filter(el => vis(el) && inView(el))

    /* TYPE CONTRAST — largest rendered font-size over smallest, counting only
     * elements whose OWN text node is non-empty. Counting containers would
     * inherit a parent's size onto a wrapper and flatten the ratio; counting
     * off-screen text would import a footer into a dashboard measurement. */
    const textEls = all.filter(el =>
      [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1))
    const sizes = textEls.map(el => parseFloat(getComputedStyle(el).fontSize)).filter(Boolean)
    const typeContrast = sizes.length ? Math.max(...sizes) / Math.min(...sizes) : null

    /* DENSITY — interactive targets per megapixel of viewport. Per-area rather
     * than per-screen so a 1440 desktop and a 375 phone are comparable. */
    const interactive = all.filter(el =>
      el.matches('a,button,input,select,textarea,[role=button],[role=link],[role=menuitem],[role=tab],[role=checkbox],[tabindex]:not([tabindex="-1"])'))
    const areaMp = (innerWidth * innerHeight) / 1e6

    /* SPACING — distinct step values in actual use. Two filters, both learned
     * from the control run: a value must appear at least three times (once is a
     * one-off, not a step), and it must be >= 4px. Chrome's UA stylesheet gives
     * buttons and inputs 1-2px padding, so without the floor every product with
     * three form controls reports a phantom 1px "step" it never designed. */
    const spacingHits = {}
    for (const el of all) {
      const s = getComputedStyle(el)
      for (const prop of ['paddingTop','paddingLeft','marginTop','marginLeft','rowGap','columnGap']) {
        const v = Math.round(parseFloat(s[prop]) || 0)
        if (v >= 4) spacingHits[v] = (spacingHits[v] || 0) + 1
      }
    }
    const spacingSteps = Object.entries(spacingHits).filter(([, n]) => n >= 3).map(([v]) => +v).sort((a,b)=>a-b)

    /* COLOUR — distinct colours appearing at least three times, so a single
     * stray inline style does not inflate a product's palette count. */
    const colourHits = {}
    for (const el of all) {
      const s = getComputedStyle(el)
      for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
        const v = s[prop]
        if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue
        colourHits[v] = (colourHits[v] || 0) + 1
      }
    }
    const colours = Object.entries(colourHits).filter(([, n]) => n >= 3)

    /* COMPONENT REUSE — the instrument behind "cohesive". Signature is tag plus
     * sorted class list; the share of elements belonging to a signature that
     * appears three or more times is how much of the screen is built from
     * repeated parts rather than one-offs. */
    const sig = {}
    for (const el of all) {
      const k = el.tagName + '.' + [...el.classList].sort().join('.')
      sig[k] = (sig[k] || 0) + 1
    }
    const reusedEls = Object.values(sig).filter(n => n >= 3).reduce((a, b) => a + b, 0)

    return {
      url: location.href,
      viewport: { w: innerWidth, h: innerHeight },
      typeContrast: typeContrast && +typeContrast.toFixed(2),
      typeSizes: [...new Set(sizes.map(n => Math.round(n)))].sort((a,b)=>a-b),
      typeWeights: [...new Set(textEls.map(el => getComputedStyle(el).fontWeight))].sort(),
      fontSizeMedian: median(sizes),
      interactiveCount: interactive.length,
      interactivePerMegapixel: +(interactive.length / areaMp).toFixed(1),
      elementsInView: all.length,
      spacingSteps,
      spacingStepCount: spacingSteps.length,
      colourCount: colours.length,
      colours: colours.sort((a,b) => b[1]-a[1]).slice(0, 24),
      componentReuseRatio: all.length ? +(reusedEls / all.length).toFixed(3) : null
    }
  }

  return 'measure-craft ready'
})()
