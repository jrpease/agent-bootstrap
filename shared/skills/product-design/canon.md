# Canon

The positive definition. This is what real product screens measure, so a run has something to
stand next to instead of standing next to its own brief.

Read at **Target** (step 3): name 2–3 entries this flow must stand next to, and one line each on
what that entry does that a default would not. Those names go in `SCREENS.md`, and the critic ranks
the shipped flow against them.

Every number below was measured, not recalled. Captured 2026-08-30 by
`reference/canon/measure-craft.js` (live DOM, in a logged-in browser) and
`reference/motion-measure.mjs` (frame analysis of Mobbin recordings). Entries record **moves and
numbers, not URLs** — a redesign does not void the knowledge.

---

## What is evidenced, and what is not

State this before using any number here.

| | measured from | covers |
|---|---|---|
| **Craft** — type, density, spacing, colour, reuse | live DOM, 7 screens, 6 companies | **desktop web only** |
| **Motion** — the five amplitude parameters, 55 moments | Mobbin recordings at 60fps, 5 clips | **iOS only** |

**These do not cross.** There is no desktop motion number and no mobile craft number in this file.
A run on desktop is being graded against touch motion; a run on mobile is being graded against
desktop craft. Say so in `SCREENS.md` when it applies, and treat the gap as a real limit rather
than an approximation — the two disciplines genuinely differ, and pretending otherwise is how a
skill built on measurement starts guessing again.

Also excluded, deliberately: one captured clip was an **onboarding promo reel** — kinetic
typography and flying collage, travel 0.53, six stagger groups. Those are marketing values wearing
an app's chrome. It is tagged `onboarding-promo` in `reference/canon/entries/` and kept out of every
median. The same rule caught a Notion **marketing page** during the craft pass, which measured
6.86× contrast with 96px display type. Neither belongs here.

---

## 1 · The number that reorients everything

**Type contrast in dense product UI runs 2.0×–2.67×. The median is 2.5×.**

`studio-design`'s canon measures marketing pages at **6.7×–35×, median 14×**. Product UI runs
roughly **six times less**.

| screen | kind | contrast |
|---|---|---|
| Spotify web player | media feed | **2.0×** |
| Stripe payments | data table | 2.33× |
| Stripe dashboard | dashboard | 2.33× |
| Acorns present | financial summary | 2.5× |
| Airbnb browse | marketplace | 2.55× |
| Slack channel | message list | **2.67×** |
| Notion page | document editor | **6.5×** |

Notion is not an outlier to discard — it is the second mode. A **document or editor** surface
carries a real display title and runs far higher contrast than a data-dense one. Two families:

- **Dense surfaces** (tables, feeds, dashboards, message lists): **2.0×–2.67×**.
- **Editor surfaces** (documents, canvases, composers): **~6.5×**, and only for the page title.

Bringing marketing's instinct into a dense screen is the single most likely way to get this skill
backwards. A dashboard does not want a 48px headline. It wants 14px body and a 28px heading.

## 2 · Body text is 14px

Five of seven screens: **14px**. Airbnb runs 12px, Slack 15px. Nothing runs 16px.

Type sizes on a single screen are a **small set** — most products use four to six: 12 / 14 / 16 and
one or two larger. Weights are equally narrow: 400 and 600 carry nearly everything, with 500 and
700 appearing where a system offers them.

## 3 · What one screen actually uses

These are per-screen numbers, not the size of a design system. They are the useful ones, because a
screen is what gets designed.

| measure | min | median | max |
|---|---|---|---|
| Distinct spacing steps | 5 | **8** | 10 |
| Distinct colours (used 3+ times) | 7 | **11** | 14 |
| Component reuse ratio | 0.51 | **0.78** | 0.95 |
| Interactive targets per megapixel | 12.7 | **39** | 151 |

**Component reuse is the instrument for "cohesive."** It is the share of on-screen elements
belonging to a repeated signature. Airbnb — the marketplace, the surface most tempted toward
bespoke sections — measures **0.95**, the highest in the set. Stripe's payments table measures
0.91. A screen below ~0.5 is being built one element at a time.

**Density varies by an order of magnitude and that is correct.** Stripe's payments table runs
**151** interactive targets per megapixel; Acorns' portfolio summary runs **12.7**. Density is a
property of the *task*, not a quality bar. Do not push a summary screen toward a table's density,
or the reverse.

---

## 4 · The measured motion signature

55 moments, iOS, 60fps. This is the comparison set the **amplitude gate** grades a declaration
against — a declaration sitting inside the interquartile range on four or more of the five
parameters is middle-of-the-pack and blocks, in either direction.

Medians first, because the shape is the finding:

| | duration | travel | parts | groups | coverage | n |
|---|---|---|---|---|---|---|
| **feedback** | 217ms | 0.01 | 3 | 1 | 0.01 | 13 |
| **reveal** | 433ms | 0.06 | 4 | 1 | 0.11 | 17 |
| **transition** | 550ms | 0.06 | 7 | 2 | 0.51 | 21 |
| **reward** | 1184ms | 0.09 | 2 | 1.5 | 0.28 | 4 |

**The duration ladder is clean: 217 → 433 → 550 → 1184.** Each kind of moment has its own budget,
and they do not overlap at the median.

**Each type separates on shape, not just length.** Feedback touches **1%** of the screen;
transition covers **half** of it. Reveal spreads across many parts at low coverage — content
arriving. And **reward is the longest moment with the fewest parts (2)**: a celebration is one
thing doing a great deal, not many things doing a little. That is the least obvious number in this
file and the one most likely to be got wrong from instinct.

### Full distributions

**transition** — a screen or element changes state. n=21, 6 clips.

| parameter | min | q1 | median | q3 | max |
|---|---|---|---|---|---|
| duration (ms) | 217 | 433 | **550** | 750 | 1650 |
| travel (of width) | 0.01 | 0.04 | **0.06** | 0.30 | 0.39 |
| participants | 1 | 3 | **7** | 14 | 35 |
| groups | 1 | 1 | **2** | 2 | 5 |
| coverage | 0.15 | 0.42 | **0.51** | 0.77 | 0.89 |

**feedback** — the app answers a touch. n=13, 5 clips.

| parameter | min | q1 | median | q3 | max |
|---|---|---|---|---|---|
| duration (ms) | 83 | 150 | **217** | 300 | 967 |
| travel | 0 | 0 | **0.01** | 0.06 | 0.19 |
| participants | 1 | 2 | **3** | 4 | 25 |
| groups | 1 | 1 | **1** | 2 | 3 |
| coverage | 0 | 0.01 | **0.01** | 0.04 | 0.42 |

**reveal** — content appears in stages. n=17, 5 clips.

| parameter | min | q1 | median | q3 | max |
|---|---|---|---|---|---|
| duration (ms) | 150 | 350 | **433** | 650 | 983 |
| travel | 0 | 0 | **0.06** | 0.07 | 0.48 |
| participants | 1 | 3 | **4** | 10 | 54 |
| groups | 1 | 1 | **1** | 2 | 5 |
| coverage | 0.01 | 0.03 | **0.11** | 0.18 | 0.53 |

**reward** — the app marks a success. n=4, 2 clips. **At the gating minimum; treat with care.**

| parameter | min | q1 | median | q3 | max |
|---|---|---|---|---|---|
| duration (ms) | 550 | 850 | **1184** | 1430 | 1467 |
| travel | 0.01 | 0.03 | **0.09** | 0.21 | 0.42 |
| participants | 1 | 1 | **2** | 5.5 | 13 |
| groups | 1 | 1 | **1.5** | 2 | 2 |
| coverage | 0.25 | 0.26 | **0.28** | 0.34 | 0.49 |

### What the distribution says about ambition

**Half of real product motion is one undifferentiated group.** Median `groups` is 1 for feedback
and reveal, 2 for transition. A single-group, single-part fade is not a signature — it is the
median. This is why `motion.md` requires **groups ≥ 2 or participants ≥ 3** for a declared
signature moment: below that, the moment is indistinguishable from what every product already
ships.

**Travel is small.** Median travel is 0.01–0.09 of screen width across every type. Product motion
mostly does not traverse the screen; it changes state in place. A design proposing a 60% traverse
is making a large claim and should be able to say why.

---

## 5 · The entries

What each does that a default would not. Name 2–3 of these at Target.

**Stripe — payments table.** The densest screen measured: 151 interactive targets per megapixel at
0.91 component reuse. Proves density and systematisation are the same move, not opposed ones. Type
contrast 2.33× with a 14px body — the whole hierarchy is carried by weight and colour, almost none
of it by size.

**Airbnb — signed-in browse.** Component reuse **0.95**, the highest in the set, on the surface
most tempted toward bespoke marketing sections. Also the only entry at 12px body text, and the only
one using large spacing steps (44 / 48 / 144) — a card-grid rhythm layered over a small base scale.

**Slack — channel view.** The narrowest spacing scale measured: **5 steps**. Proves a system does
not need ten. Runs the highest colour count (14) because message content brings its own colour, and
holds hierarchy at 2.67× with 15px body.

**Spotify — web player.** The lowest contrast in the set at **2.0×**, at 94 targets per megapixel.
A media surface where imagery carries the hierarchy and type deliberately steps back.

**Acorns — portfolio summary.** The sparsest screen at 12.7 targets per megapixel, with the
smallest palette (7 colours). Shows that a financial summary earns its calm by removing controls,
not by adding whitespace to a dense layout.

**Notion — document page.** The second mode: **6.5×** contrast, 78px display title, 0.87 reuse.
Proof that editor surfaces are a different family, not a violation of the dense-surface numbers.

**Corner iOS — map, create-post, place detail.** Where the transition/reveal distinction is
clearest: full-screen swaps at 0.48–0.89 coverage against detail cards arriving at 0.13–0.25 with
many parts. A single place-detail reveal ran **36 participants across 5 groups** — staged content
arrival done properly.

**Duolingo iOS — onboarding and widget tutorial.** The richest source of feedback moments: 83–300ms,
near-zero travel, coverage under 0.04. Shows how small a touch response should be.

**Duolingo ABC — a lesson.** The reward reference: a book cover turning gold (550ms), a sparkle
burst (950ms), a badge arriving (1417ms). All long, all low-participant.

---

## 6 · Provenance and gaps

- **Craft**: live DOM in a logged-in browser. All values `derived`.
- **Motion**: frame analysis at 60fps, so **durations resolve to ±17ms** — one frame. Values here
  are rounded to whole milliseconds; a median reported to half a millisecond would be false
  precision. Duration, coverage, participants, groups and travel all `derived` —
  connected regions of change, their onset times, and change-centroid displacement. Validated
  against a control with a known 120px translate: reports 3 parts, 2 groups, 0.133 against a true
  0.15. The **~10% low travel reading is inherent to the method**, consistent across entries, and
  deliberately uncorrected — a fudge factor would hide drift.
- **momentType** is the one operator field, assigned by reading contact sheets in
  `reference/canon/sheets/`. Every classification is re-checkable against the frames it was made
  from.

**Known gaps, to close before trusting the affected numbers:**

1. **No desktop motion, no mobile craft.** See the top of this file.
2. **`reward` sits at n=4**, the gating minimum, from 2 clips. The next capture should target
   completion and streak flows.
3. **Pinterest is missing** — it served an unlaid-out stub to the automation browser. See
   `entries/_pinterest-blocked.md`.
4. **60 moments in the Duolingo onboarding clip are unlabelled** and excluded. An unread moment is
   not data; do not label them from their numbers.
