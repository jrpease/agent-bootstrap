# Canon sourcing pipeline

Produces `canon.md`'s numbers. **Sourcing is mechanical; ratification is not** — the operator
calls the keeps, same as `studio-design`.

## Why this is agent-driven and not a script

The acquisition path is the operator's **already-authenticated Chrome**. A standalone Playwright
script cannot use it: everyday Chrome is not launched with a debugging port, and relaunching it to
add one discards the sessions that are the whole point. So the agent drives the browser through
the browser tools and injects `measure-craft.js` and `measure-motion.js`, which are snippets
rather than modules because
nothing on that path can `import`.

## Run the control first — every time

Both probes return plausible numbers when they are broken. Five defects were caught by the
control fixture and by nothing else:

1. Chrome's UA stylesheet gives form controls 1px padding, which entered the spacing scale as a
   phantom step every product would have "had".
2. Background-tab timer throttling reported a 0ms animation start as 581ms, so `from` and `to`
   boxes were both read after the motion finished and travel measured 0.
3. A backgrounded tab suspends the rendering loop entirely, so transition *events* are never
   dispatched — the animations exist, only the notifications do not.
4. An infinitely-looping ambient pulse stretched a 400ms moment to 2000ms.
5. `getKeyframes()` reports transforms scaled by the device pixel ratio while
   `getBoundingClientRect()` stays in CSS px, so every travel number on a Retina display was
   exactly double.

None of those surfaced as an error. All five produced numbers a reader would have believed.

```bash
# serve the fixture (from reference/)
python3 serve.py 8731        # positional port; there is no --port flag
# then, in the browser tab: inject canon/measure-craft.js and canon/measure-motion.js, then run
# control/dom-control-checks.js — expect ALL 11 CHECKS PASSED
```

## Capture

**Web** — for each roster entry, with the operator logged in:

0. **Run `surface-check.js` first.** Navigating to a product's domain lands on its marketing site,
   not its app — `notion.so` redirects to `notion.com`, which measured typeContrast 6.86 with 96px
   display type. Measuring that would import marketing numbers into the one file whose job is to
   keep them out. Only proceed on `APP SURFACE`.
   **Get the URLs from the operator rather than guessing them.** Deep app URLs are
   workspace-specific and unguessable, and every wrong guess costs a page load and a measurement.

1. Navigate to the entry's declared hard screen. Let it fully populate.
2. Inject `measure-craft.js`; run `__pdMeasure()` and keep the result as `craft`.
3. For each moment: `__pdArm()` → drive the interaction → `__pdRead()`.
   Prefer `__pdCapture(fn)` when the trigger can be expressed in JS — it is deterministic and does
   not depend on the tab rendering. `__pdArm()` **requires a foregrounded tab** and says so loudly
   when it captures nothing.
4. Tag every moment with its `momentType` — `transition | feedback | reward | reveal`. It is never
   inferred, because medians are computed per type.

**Desktop-native** (Raycast, Things 3) — `./capture-macos.sh <entry> <seconds>`, then
`node ../motion-measure.mjs --video <clip> --type <type>`, then annotate by watching the clip once.

**Mobbin (all three surfaces)** — the primary sample library. It serves real MP4 recordings, not
just stills: 720x1560 @ 60fps for iOS, 1200x752 for web, 14-18s per clip. 60fps is finer timing
than a Playwright capture gives.

A Mobbin clip is a whole FLOW, so segment it into candidate moments first:

```bash
node ../motion-measure.mjs --segment --video shots/<clip>.mp4 > shots/<clip>.seg.json
```

One 15s clip yielded **12 candidates, 9 of them usable** after dropping full-screen scrolls — which
is why the `n >= 4 per moment type` requirement is reachable at all. Segmenting a handful of clips
beats driving live interactions one at a time.

`segmentFromVideo` derives **participants, stagger groups and travel** from the pixels — connected
regions of change, their separate onset times, and the displacement of each region's change
centroid. An earlier design asked the operator to count these by watching. That was wrong: semantic
identity (which DOM node moved) is not recoverable from a video, but *spatial* identity is, and
spatial regions are what amplitude actually measures.

Validated against `control/` — a fixture with three boxes, two stagger groups and a known 120px
translate. The analysis returns 3, 2, and 0.133 against a true 0.15. The ~10% low reading is
inherent to the centroid method and consistent across entries, so medians and interquartile
comparisons are unaffected. Do not add a correction factor; it would only hide drift.

### Classifying moment type

`momentType` is the one genuinely semantic field. It does not need a person watching video, though
— it needs a person *looking*. Build contact sheets and read them:

```bash
python3 moment-sheets.py shots/*.seg.json     # -> sheets/*.png
```

Each row is one moment: three frames (start, middle, end) beside its measured numbers. The shape of
a moment is nearly always obvious from those three frames plus how long it took and how much moved.
Record the labels in `apply-labels.py` and run it; it writes them back into the segmentation and
emits the canon entry.

**Check what kind of clip you have before labelling it.** Mobbin carries onboarding promo reels
alongside real in-app recordings. One clip here was kinetic typography and flying collage — travel
0.53, six stagger groups — which are marketing values, not product values. It is tagged
`clipKind: onboarding-promo` and excluded from the product medians, for exactly the reason the
Notion marketing page was excluded from the craft numbers: a different discipline wearing the same
app's chrome. The sheets are kept on disk so any classification can be re-checked.

The annotator below remains for spot-fixes and for clips you would rather label by playback:

```bash
python3 ../serve.py                # from reference/ — NOT `python3 -m http.server`
open 'http://127.0.0.1:8731/canon/annotate.html?v=canon/shots/<clip>.mp4'
```

Two things that will otherwise cost an hour each:

- **Use `serve.py`.** `python3 -m http.server` does not implement HTTP Range, so seeking to 8s in a
  15s clip refetches from byte zero every time, and Chrome's media stack may refuse to start at all.
  The failure is silent: the table renders, the URL resolves, no error fires, `loadedmetadata`
  simply never arrives.
- **The tab must be visible.** Chrome does not load media in a backgrounded tab. This is the same
  behaviour that suspends layout and transition events there — see the control-run notes above.

`annotate.html` loops each segment in place so no scrubbing is needed. Pick `momentType` and move
on; the counts are already filled in and shown dashed to mark them as measured. Mark scrolls and
page swaps as `drop` — flagged rows are pre-set to it. Editing a measured number is allowed and
flips that field to `annotated`, so the canon always records which numbers came from pixels and
which from a person.

`momentType` stays human because it is the one genuinely semantic field: a reward and a transition
can be pixel-identical and differ only in what they mean.

**Getting clips.** Mobbin's listing pages mount only two preview videos at a time, so a real spread
means browsing to specific apps and patterns. Choose them deliberately — the pattern index
(Dashboard, Table, Filter & Sort, Dialog, Stepper) maps directly onto hard screens.

## Capture at least four moments per moment type

`aggregate.mjs` refuses to gate a parameter with fewer than four measured moments, and says so in
`medians.md`. An interquartile range built from one moment is a point, not a distribution: it would
block every declaration that happened to match one product and pass everything else.

**This is a requirement on the capture session, not a detail.** One moment per product is not
enough — ten products would still leave most moment types ungateable. Plan two to four moments per
web entry, deliberately spread across the four types, and check the `not gateable` lines in
`aggregate.mjs`'s output before ending the session.

## Aggregate

```bash
node aggregate.mjs entries/     # -> raw.json + medians.md
```

`medians.md` carries the per-moment-type table `canon.md` needs and the amplitude gate grades
against. Nulls are excluded rather than averaged as zero — a `not evidenced` cell counted as 0
would drag every median toward "no motion" and make the gate trivially easy to clear.

## Entry file shape

```json
{ "entry": "Linear", "surface": "desktop web", "acquisition": "chrome",
  "craft": { "typeContrast": 3.2, "interactivePerMegapixel": 180, "...": "..." },
  "moments": [ { "entry": "Linear", "momentType": "feedback", "durationMs": 120,
                 "travelPx": 0, "participants": 2, "choreographyDepth": 1, "coverage": 0.04 } ] }
```
