# Canon sourcing pipeline

Sources and refreshes `canon.md`'s candidate slate. Sourcing is mechanical; **ratification is
not** — the contact sheets exist so a human calls the keeps.

Run `npm install` here once. It pulls `playwright-core` only — no browser download; the scripts
drive the installed Google Chrome (`channel: 'chrome'`).

```bash
# 1. sweep the category matrix -> raw.tsv   (server-rendered listing pages)
python3 sweep.py \
  'https://www.awwwards.com/websites/sites_of_the_day/' \
  'https://www.awwwards.com/websites/saas/' \
  'https://www.awwwards.com/websites/technology/' \
  'https://www.awwwards.com/websites/startup/' \
  'https://www.awwwards.com/websites/e-commerce/' \
  'https://www.awwwards.com/websites/fashion/' \
  'https://www.awwwards.com/websites/corporate/' \
  'https://www.awwwards.com/websites/portfolio/' > raw.tsv

# 2. rank studios, harvest each profile's portfolio -> studios.json
python3 harvest.py

# 3. build slate.tsv (balanced, host-deduped), liveness-check -> live.tsv
# 4. capture fold + 45%-scroll stills -> shots/ + shots.json
node capture.mjs "$PWD"

# 5. labelled contact sheets -> sheets/
node sheets.mjs "$PWD"
```

**Why the category matrix.** Left unconstrained the sweep returns almost entirely agency and
campaign work — the mode the skill is pointed at least often. The `saas` / `corporate` /
`e-commerce` quotas are what make the canon usable for B2B product pages.

**Why two frames per candidate.** A fold alone rewards heroes and hides whether the page holds
up. The 45% frame is where most pages go slack.

**Capture notes.** `capture.mjs` dismisses common consent walls before shooting (they otherwise
cover the design) and waits out intro loaders. `sheets.mjs` writes its HTML to disk and
navigates to it — `setContent` gives the page an `about:blank` origin and `file://` images are
then refused.

**The mid frame used to fail silently on virtual-scroll sites — fixed 2026-09-04.** `capture.mjs`
seeked with `window.scrollTo(0, document.body.scrollHeight * 0.45)`, which fails twice over on a
page driven by Lenis, Locomotive or transform-based pinning: `scrollTo` is inert because the
document never scrolls, and `document.body.scrollHeight` equals the *viewport* height, so the
target was a few hundred pixels rather than 45% of a 12,000px track. The mid shot came back as a
second copy of the fold, with no error.

`capture.mjs` now computes the **real track height** (the tallest element and any scroll container,
not just the body), tries three seek strategies in order — document scroll, the smooth-scroll
library's own instance, then real wheel events — and **proves the page moved** by measuring how far
content actually travelled. Under half a viewport means it did not go anywhere: no mid file is
written, `shots.json` records `midMoved: false` with the measured `midTravel`, the run logs
`NOMID`, and `sheets.mjs` draws the gap on the contact sheet so ratification cannot miss it.

Measured on the four pages used to build this: the page that refuses every strategy travels 57px;
the least mobile real page (a GitHub PR list) travels 983px. The threshold sits between them with
a wide margin.

**Some pages still cannot be seeked, and that is the point** — `heronaiapp.com` stacks its sections
and scrubs a GSAP timeline, so none of the three strategies moves it. The fix does not pretend to
drive every bespoke scroll system; it makes the failure loud instead of silent. Shoot those by hand
— clicking the page and pressing PageDown moved `detroit.paris`, `e2.vc` and Heron — or read below-fold
composition from the DOM (section heights plus text) and say in the entry that you did.

**The strategies stop at the first one that works — fixed 2026-09-30.** They used to run all three
every time, and the wheel is relative, so a page that `scrollTo` had already moved got a second 45%
on top: `locomotive.ca`'s "45%" frame was its footer at 86%, and a GitHub PR list hit bottom.

**The four entries captured before these fixes were re-shot 2026-09-30** — `locomotive.ca` and
`noth.in` seek normally; `detroit.paris` and `e2.vc` were shot by hand. Each entry in `canon.md`
notes what its below-fold frame showed.

Derived data (`raw.tsv`, `studios.json`, `slate.tsv`, `live.tsv`, `shots/`, `sheets/`) is
regenerable and deliberately not committed.
