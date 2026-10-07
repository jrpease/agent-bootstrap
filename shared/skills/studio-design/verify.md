# Verify

Two moments, not one.

**The first-pixel check** runs at **Comp** (step 4) and again on the signature scene at step 6 —
while changing the design is still cheap. **The terminating loop** runs at step 7, on the page that
ships.

The previous version of this skill ran every check at the end, where the only thing a finding can
buy is rework. Most of the value here is in the first check.

---

## The first-pixel check

Run on the three comps, and again on the signature scene before any other section exists. No
subagent, no report — you, a screenshot, and four numbers.

1. Screenshot at 1440 and 375.
2. **Measure the positive floor off the still** (below). Type contrast is the one that fails most.
3. **Check the tell list** in `SKILL.md` against what you see.
4. **Put the canon targets beside it.** Open the captures for the 2–3 entries named in `DESIGN.md`.
   Ask the only question that matters: *does one of these do this better?*

If the answer is yes, you are not done, and the fix is cheap right now. This is the whole point of
building a hero before a page.

**Once three sections exist, add the light check.** Put their stills side by side and name the
light source in each — direction, hardness, colour. A second light world below the fold is the
drift item 5 catches at step 7, by which point it is a rebuild rather than a grade.

### The positive floor — measured off the render

Never off the token file, never off the spec.

| Floor | Bar | What it kills |
|---|---|---|
| **Type scale contrast** | **≥12×** largest rendered size over smallest | the flat page. Canon runs 6.7–35×, median 14×; template-grade slop measures 6× |
| **Named hero frame** | one frame you would screenshot to represent the page — and it exists in the stills | a page with no moment |
| **Focal hierarchy** | every viewport-height has one subject nameable in three words | evenly-weighted sections where the eye lands nowhere |
| **Ink per screen** | no full-viewport still more than ~70% empty ground | the airy wireframe |
| **Colour count** | 3–6 distinct surface/ink values **per full-viewport screen** — report the least varied screen and which one it is | monotony at one end, confetti at the other. Counted page-wide this passes a page whose every screen is two values |

**Floors are floors.** They are the bar for *not being broken*, not the bar for being good — the
old 4× type floor sat 50% below template-grade work and could not fail anything. Passing all five
is not evidence of quality; it is evidence of absence. The canon comparison is what measures
quality.

Any floor may be overridden **by name, with the reason in `DESIGN.md`** — a held void that breaks
ink-per-screen is a legitimate direction (see `canon.md` #36). Arriving under a floor without
naming it is not.

---

## Two different things, and only one of them is capped

Conflating these is how a four-hour build happens.

- **A glance** — screenshot your own work, look at it, fix what you saw. No browser recording, no
  measurement, no critic. **Unlimited. This is the point of the skill.** Glance constantly.
- **A round** — capture at both widths, run the detector, run the measurement harness, dispatch a
  critic. **Hard cap: 3.** Expensive in wall clock and in spend.

A round costs roughly two orders of magnitude more than a glance. If you are launching a browser
to record, you are in a round; count it. **The cap binds even when the next round would help** —
that is what a cap is. Ending at the cap with findings open is the designed outcome, not a
failure.

**Budget, both kinds.** Declare a wall-clock and spend ceiling before step 6 and report against it.
For calibration: a full marketing site — three comps, eight to ten sections, a 404, both widths,
recordings — has run **~$280 and four hours** when the looking loop was unbounded, against a
comparable single-pass build at ~$5. Budget nearer the low end and treat the high end as the
failure mode, not the price.
A build that has spent more than half its ceiling before the first full round is over-glancing:
stop polishing and ship the round.

## The terminating loop

### 1 · Render

Serve the page at a real `http(s)://` URL — dev server or built output — and hold that one URL for
the round.

### 2 · Detect

```bash
npx impeccable@3.5.0 detect http://127.0.0.1:<port>/ --json > result-url.json
```

**Never run `impeccable install`** — in any form, with any flags, including `--help`. It has no
help handling; non-interactively every prompt falls through to its default and it performs a real
install into global harness directories. `detect` needs none of it.

Point it at the served URL: a static file scan has no layout engine and cannot resolve
viewport-dependent tells. Gate on the exit code — `2` when findings exist, `0` when clean. **A
non-clean run is blocking**: every finding fixed, or suppressed with a reason on the record.

### 3 · Capture

**One desktop and one mobile width every round — never two desktop.** Mobile is a designed
viewport with its own density floor; no desktop artifact can evidence it.

- **Full-page stills** at 1440 and 375. Final pass: all four widths.
- **Scroll recordings at both widths**, three passes each: a *slow scrub* (every scrubbed scene
  plays through), a *fast flick* (exposes catch-up jank and scenes that jump to their end state),
  and a *cold landing* (hard reload deep in the page, then flick — how a returning visitor
  actually arrives, and the only pass exercising lazy-mount and pin timing cold).

```bash
node reference/record.mjs http://127.0.0.1:<port>/ --out captures
node reference/record.mjs http://127.0.0.1:<port>/ --mobile --out captures
```

- **A scripted interaction pass at each width.** A vertical scroll elicits no pointer- or
  touch-driven motion; without this the critic cannot see half the repertoire. Desktop: pointer onto
  the primary CTA, onto any hover-treated media, and one operated control. Mobile: a drag on any
  draggable set, and an open of whatever sheet exists. **Capture what the page actually offers** —
  do not script an interaction it does not have, do not skip one it does.

**Record what was captured** — a short manifest: each interaction considered, its viewport, offered
or not, captured or not. A gap the tool genuinely cannot close goes to the report as a named
**unverified area**, never quietly becoming "looks fine."

**Contact sheets.** Build one labelled grid per recording. The critic receives contact sheets plus
the actual recordings for the signature scene — not the raw capture pile.

*Note: pages using Lenis or Locomotive virtual scroll ignore `window.scrollTo`. Drive them with
real wheel events or the capture will be five identical frames.*

### 4 · Measure

Mechanical, gates like the detector, does not go to the critic. Same URL, same round, both widths.
**Report numbers, never adjectives**, on every verdict including PASS.

| Measure | Bar |
|---|---|
| LCP | ≤ 2500ms |
| CLS | ≤ 0.1 |
| INP | ≤ 200ms |
| Long frames (>16.7ms) during any scripted interaction | ≤ 10% |
| Worst single frame | ≤ 50ms |
| Hero GLB, after `gltf-transform optimize` *(provisional)* | ≤ 2 MB transferred · textures ≤ 2048px · ≤ 100k triangles |

```bash
node reference/perf.mjs http://127.0.0.1:<port>/
node reference/perf.mjs http://127.0.0.1:<port>/ --mobile
node reference/perf.mjs http://127.0.0.1:<port>/verify/jank-control.html --expect-fail
```

Mobile runs at **4× CPU throttle** — an unthrottled laptop is not evidence about a phone. The
`--expect-fail` control blocks the main thread ~20ms/frame; a working harness reports it ~100% long
frames and prints `INSTRUMENT OK`. A harness that reports the control green is broken, whatever it
reports elsewhere.

**A zero is not a pass, it is a missing measurement.** INP is 0 on any scroll-only pass because no
input was driven. Report absent measurements as `not measured — <reason>`.

A missed budget resolves in order: profile → fix the execution → change the delivery family → only
then reduce scope, recording what was cut and what forced it.

**Immersive floors** — only when the page follows `immersive.md`. Pass/fail, both widths:

| Check | Passes when |
|---|---|
| Lite parity | The lite route or mode renders the same headings, copy and CTA, in the same order, as the full tier — diff the two pages' DOM text |
| Scene failed | With the canvas removed or WebGL/WebGPU blocked, the copy, navigation and CTA all render and work |
| Reduced motion | Under `prefers-reduced-motion: reduce`, no scroll-scrubbed camera runs; the poster or lite tier shows |
| Canvas text | Every word drawn in the canvas has a DOM twin; the canvas is `aria-hidden` |
| Keyboard | Every stop of the scroll story is reachable by Tab or a link |

**Sequence floors** — only when the page follows `sequence.md`. Pass/fail, both widths, read from
the network panel and the render:

| Check | Passes when |
|---|---|
| Weight | MB per sequence per tier reported; the phone tier is what a ≤ 820px viewport fetches |
| First scrub | The coarse pass (every 32nd frame) has arrived before the reader reaches the section |
| Poster | Frame 0 is an `<img>` that paints first; the canvas replaces it in place |
| Memory | Frames are held compressed — no tab holding hundreds of MB of decoded bitmaps |
| Scroll | Find-in-page and keyboard scrolling move the page; smoothing is off under reduced motion |
| In-betweens | For a keyframed film (`sequence.md` §2): the contact sheet shows no part appearing, vanishing, or changing shape or count mid-move on a subject that must be exact. Checked on the source film, before the build |

---

## The critic

Fresh context, no implementation history. Fresh context does not mean no reference material.
Where the `design-critic` agent is installed, dispatch it for this role — its contract is this
section.

**Receives:** `DESIGN.md`; the stills at both widths; contact sheets for every recording plus the
actual recordings for the signature scene; the capture manifest; each recurring material asset as a
**bare file** (no caption, no page context) for item 6; **the captures of the 2–3 canon entries
named as targets**; `canon.md`, `craft.md`, `copy.md`, `SKILL.md`, and **`worlds.md`** — item 5
asks whether the craft values held, and those values live in the world the spec names, so a critic
without it cannot check them; and **the motion profile and its two density numbers** from
`moves.md` §C, without which item 7 has no target to count against.

**Must NOT receive:** the implementation conversation, the diff, the code, or any explanation of
intent. A critic told where to look has already been told what to find.

**Judges only what is visible in the supplied media.** A parameter the media cannot show is `not
evidenced` — never a pass, never a failure — attributed off the manifest: **`(page)`** when the
interaction was captured or never offered and the thing is simply absent (an ordinary finding);
**`(capture)`** when the manifest records it offered but not captured (a capture defect, forcing
REVISE-and-recapture, concluding nothing about the page).

### Rubric

**1 · Beaten by the canon?** *This item runs first and carries the most weight.* Put the named
canon captures beside the page. **Name an entry that does this better.** If you can, say what it
does and where — `blocking`. If you cannot, say so explicitly; that is the pass condition. A page
that merely matches its targets has not cleared them.

**2 · Is the spec ambitious?** Judge `DESIGN.md` itself, not just compliance with it. A conservative
spec faithfully delivered is a **`blocking` finding against the spec**, not a pass. Evidence: a
signature scene that is a fade; an authored artifact that is a font choice; chrome lines reading
"default."

**3 · Studio review.** Name the three criticisms a jury of world-class studios would make first,
each anchored to a specific frame and viewport. **`should-fix` by default**, rising where one
independently meets a higher bar. Include any piece that reads as a stock registry component
(Magic UI, React Bits, 21st) — `should-fix`, and **`blocking`** when that piece is the
most memorable thing on the page (`sources.md` §1).

**4 · Positive floor, measured.** Report each as a number, never an adjective: type contrast ratio;
whether a still matches the named hero frame; focal hierarchy as `named / screens`; the emptiest
screen's percentage and which screen; colour count off the stills. A floor missed with no override
in `DESIGN.md` is `should-fix`; **three or more missed is `blocking`**.

**5 · Craft held to the last section?** For each system in `DESIGN.md`'s world block, name where the
render contradicts the value, and separately where it *drifts down the page* — a second light
direction below the fold, the radius family loosening after the hero, the proximity ladder
collapsing late. Compare the first section to the last; drift is invisible in any single frame.

**6 · Do the images argue?** On the bare asset files, blind-first: state what each argues before
opening the spec. *"A nice photograph of X"* is the failing answer — that is a depiction. Then, from
the full-page stills, state what each recurring asset is *doing for each section's argument*.
"Decorating the section end" fails. A binding that lives only in the spec is `blocking`.

**7 · Motion — enough, varied, native at both widths?** From both widths' scroll recordings *and*
interaction passes. Report `counted / target` per width and what carried each moment. A moment is
one technique in one place for one purpose; no technique counts more than twice; component
hover/press/focus and per-element entrances never count. **At least two mobile moments must come
from `moves.md` §C mobile-native.** Name the padded count when you see it — one carousel booked as
rubber-band + fling + full-bleed is one surface, not three.

**8 · Copy and honesty.** Fabricated logos, metrics, testimonials, or customers visible in any
still are `blocking`. Then read the shipped copy against `copy.md`: does the first screen state an
offer a stranger could repeat back, or only a mood? Is any section claim a topic label rather than
an assertion? Does the CTA have an object? A page that is well art-directed and says nothing is a
finding at ordinary severity — art direction does not excuse the words. Read every rendered string
against the tell list **regardless of who wrote them** — client-supplied copy is not an exemption.

**Also:** accessibility to the degree it is visible — focus rings in the recordings, contrast in the
stills, tap targets at 375.

### Output

One block per finding: `severity` · `rubric item` · `what is visible in the media` (artifact,
viewport) · `what the spec said` (quoted, or `not specified`).

`blocking` — beaten by the canon, a conservative spec, three floors missed, a visible tell,
fabricated content, or the render contradicting the spec. `should-fix` — studio-review findings and
real craft defects. `note` — everything else.

**Verdict: PASS, REVISE, or REVISE-and-recapture.** PASS only when nothing is `blocking` or
`should-fix` and no item is `not evidenced (capture)`.

**The critic does not fix.** No patches, no suggested easing values. A critic that proposes the fix
has started negotiating with the work, and its next verdict is on its own suggestion.

---

## Stopping

Loop until the detector is clean, the budget is met, and the critic raises nothing serious.
**Maximum 3 rounds — this is a hard stop, not a target.** At the third round you stop whether or
not findings remain, and report what is outstanding. An honest "three findings unresolved" is the
deliverable; a fourth round is not. Overrunning the cap to chase a finding is the same defect as
skipping the loop, and it costs more.

**Never delete captures.** Comps, round media, manifests, and bare assets all stay. They are the
audit trail, and a run that tidies away its own evidence cannot be checked. Consolidate by moving
into dated folders, never by removing.

**The loop ends on a critic, never on a fix.** N revisions produce N+1 critic rounds. Closing every
finding and shipping is not termination — nobody judged the result. At the cap the final critic
round still runs, as a report, and its findings go to the outstanding list verbatim.

After round 1, a re-critic receives only what changed — the revised scenes' fresh media plus the
prior findings — not the full pile again.
