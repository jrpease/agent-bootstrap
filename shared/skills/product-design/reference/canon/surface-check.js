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
  const all = [...document.querySelectorAll('body *')]
  const sizes = all
    .filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1))
    .map(el => parseFloat(getComputedStyle(el).fontSize))
    .filter(Boolean)
  const maxFont = sizes.length ? Math.max(...sizes) : 0
  const interactive = all.filter(el =>
    el.matches('a,button,input,select,textarea,[role=button],[role=row],[tabindex]:not([tabindex="-1"])')).length

  // Component reuse is the honest discriminator, not font size. A marketing page
  // is a sequence of bespoke sections; an app screen is repeated parts. The
  // first version of this check used "maxFont >= 40 -> marketing" and promptly
  // rejected a real Notion page over its 78px document title. Acorns shows a
  // balance at 30px for the same reason: product surfaces DO carry display type.
  const sig = {}
  for (const el of all) {
    const k = el.tagName + '.' + [...el.classList].sort().join('.')
    sig[k] = (sig[k] || 0) + 1
  }
  const reused = Object.values(sig).filter(n => n >= 3).reduce((a, b) => a + b, 0)
  const reuseRatio = all.length ? reused / all.length : 0

  const dense = all.length > 400 && interactive > 20
  const systematic = reuseRatio > 0.5

  return {
    host: location.hostname,
    path: location.pathname.slice(0, 24),
    elements: all.length,
    interactive,
    maxFont,
    reuseRatio: +reuseRatio.toFixed(3),
    verdict: dense && systematic ? 'APP SURFACE — measure it'
      : dense ? 'CHECK — dense but few repeated parts; may be a marketing page or a one-off screen'
      : 'TOO SPARSE — may not have finished loading, or is not the hard screen',
    // ADVISORY ONLY. When the operator supplied the URL, their word wins: they
    // know which screen they meant and this heuristic does not.
    authority: 'advisory — an operator-supplied URL overrides this verdict'
  }
})()
