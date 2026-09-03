# Motion

Every measured number here comes from `canon.md` — 55 moments, iOS, 60fps. Where a value is not
measured, it says so and names its source.

## The four moment types

Motion is not one thing with one budget. Medians separate cleanly:

| | duration | travel | parts | groups | coverage |
|---|---|---|---|---|---|
| **feedback** — the app answers a touch | 217ms | 0.01 | 3 | 1 | 0.01 |
| **reveal** — content appears in stages | 433ms | 0.06 | 4 | 1 | 0.11 |
| **transition** — a screen or element changes state | 550ms | 0.06 | 7 | 2 | 0.51 |
| **reward** — the app marks a success | 1184ms | 0.09 | 2 | 1.5 | 0.28 |

**The duration ladder — 217 → 433 → 550 → 1184 — does not overlap at the median.** Classify a
moment before budgeting it. A feedback response given a transition's 550ms feels broken; a
transition given a feedback's 217ms feels like a cut.

Two shape facts worth holding:

- **Feedback touches 1% of the screen. A transition covers half of it.** Coverage separates the
  types more sharply than duration does.
- **Reward is the longest moment with the fewest parts (median 2).** A celebration is one thing
  doing a great deal, not many things doing a little. This is the least intuitive number in the
  canon and the one most often got wrong by adding participants instead of duration.

## Travel is small

Median travel is **0.01–0.09 of screen width** across every type. Product motion mostly does not
traverse the screen — it changes state in place.

A design proposing a 40–60% traverse is making a large claim. The canon's upper quartiles reach
there (transition q3 = 0.30, max 0.39), so it is not forbidden — it is just rare enough that
`SCREENS.md` should say why.

## The signature moment

**Every run ships exactly one signature moment, at declared full amplitude. "None" is not an
allowed answer.**

This exists because the alternative was tested and failed. `studio-design` permitted "one signature
interaction… or none", and combined with two other restraint clauses it gave three licences to do
less and nothing requiring more. Its output was competent and forgettable.

The moment must:

- **Serve the flow's meaning.** It marks the thing the flow is *for* — the record saved, the
  search resolved, the task completed. Not a page transition bolted onto a table.
- **Work on every declared surface**, with touch and pointer both benefiting. Not a hover effect
  with a mobile fallback.
- **Be declared in `SCREENS.md` before it is built**, as five numbers.

### Amplitude, in five parameters

| Parameter | Unit |
|---|---|
| **Duration** | ms, first change to settle |
| **Travel** | fraction of screen width |
| **Participants** | count of elements that change |
| **Choreography depth** | count of sequenced stagger groups (1 = all together) |
| **Coverage** | fraction of viewport area affected |

Travel is a *fraction*, never pixels. A 100px move on a 1728px desktop and on a 390pt phone are
different gestures.

### The two blocking checks

Both are mechanical gates, run before a critic is dispatched. See `verify.md`.

**1 · Shipped below declaration.** Any measured parameter below its declared value. Blocking.

**2 · Declared unremarkable.** The declaration sits **inside its moment type's interquartile range
on four or more of the five parameters — in either direction**. Blocking.

**"Either direction" is the point.** An earlier draft blocked declarations at or below the median,
which quietly rewards *bigger* — longer, further, busier. That would have structurally blocked a
deliberately fast, small, precise signature: exactly the craft the canon's best entries show, and
exactly what "fast and performant" asks for. The rule fails only the **middle of the pack**.
Tighter and faster than the canon is a signature. Larger and more choreographed is a signature. A
300ms fade sitting on the median of everything is not.

**Plus a floor about coordination, not size: `groups ≥ 2` or `participants ≥ 3`.**

The canon says why. **Median `groups` is 1 for feedback and reveal, 2 for transition.** Half of real
product motion is a single undifferentiated group. A one-part, one-group fade is not a signature —
it is the median. Something must actually be sequenced or coordinated.

## Everything else that moves

The signature moment is one moment. The rest of the flow still needs motion that behaves.

- **Budget by type**, using the medians above. Most moments should sit near their type's median;
  that is what makes the signature legible as a signature.
- **Motion carries state, or it is removed.** Every transition should answer "what changed and
  where did it come from". A movement that explains nothing is decoration on a surface someone uses
  forty times a day.
- **Origin matters.** A panel that opens from the control that summoned it explains itself. The
  same panel fading in centre-screen does not.
- **Reduce, don't remove, under `prefers-reduced-motion`.** Keep the state change and the timing;
  drop the travel and the stagger. A user who asked for reduced motion still needs to know what
  changed. *(Source: the CSS Media Queries Level 5 `prefers-reduced-motion` feature; not a canon
  measurement.)*

## Easing — not measured

**The canon carries no easing data.** The iOS recordings are pixel-derived and frame analysis does
not recover a curve. `measure-motion.js` captures easing from `getTiming()` on the web path, but no
web motion has been captured yet — see `canon.md`'s gaps.

So the following is **cited, not measured**, and should be replaced the first time a web motion
capture runs:

- Entering elements ease *out* (fast start, slow settle); exiting elements ease *in*. Standard
  across Material and Human Interface Guidelines.
- Symmetric `ease-in-out` suits movement between two on-screen positions.
- Linear suits only continuous, non-physical change — a progress indicator.

Do not import `studio-design`'s measured easing curves. Those were measured on marketing pages,
where a long glide is the house style; a 1000ms decelerated glide on a button press is a bug.

## Native surfaces

On iOS and Android the run produces design-only output. **There is nothing running to record, so
the signature moment cannot be measured** — the amplitude gate degrades to a specification review,
and `verify.md` says so. Declare the five parameters anyway; they are what a native developer
builds against.

## The measurement caveat that applies to every number above

**All canon motion is iOS.** There is no desktop motion measurement. A desktop run is being graded
against touch-surface data, and the two genuinely differ — pointer surfaces afford hover states and
sub-100ms feedback that touch does not.

State this in `SCREENS.md` when designing for desktop, and treat a desktop signature moment's
amplitude declaration as the weaker claim it is.

## What to record in `SCREENS.md`

- The signature moment: what it marks, and all five parameters.
- Its moment type, so the gate grades it against the right distribution.
- The interaction manifest — every moment `interact.mjs` must drive, with its trigger and surface.
- The reduced-motion behaviour.
- Per-type budgets for the rest of the flow.
