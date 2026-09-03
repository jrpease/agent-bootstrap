---
name: product-design
description: >
  Use when designing or building the screens people use — dashboards, data
  tables, forms, editors, settings, onboarding, and the flows that connect
  them — on web, mobile web, iOS, or Android. The cut against studio-design is
  intent: does this surface need someone to believe something, or to do
  something? Believe is studio-design; do is this skill. Triggers include
  building or redesigning an app flow, making a product screen that is not a
  default component library with the brand colour swapped in, designing every
  state a screen can be in (empty, loading, error, dense, overflow), adding
  motion or micro-interaction to an app, or bringing an existing product
  surface up to the craft of Linear, Airbnb, Stripe, or Figma. Also triggers
  on mixed surfaces — a marketing page inside the app shell, a guest checkout,
  an SEO-driven app page — where studio-design designs the frame and this
  skill designs the surfaces.
---

# Product Design

Design the whole flow before building any screen. Build two directions for the hardest screen,
state-complete, kill one, then build the flow. Judge the result against real products, not against
your own brief.

## Which skill this is

> **Does this surface need someone to believe something, or to do something?**
> Believe → `studio-design`. Do → `product-design`.

When a surface does both — a marketing page in the app shell, a guest checkout, an SEO-driven app
page — run **`studio-design` on the frame and `product-design` on the surfaces**. The *frame* is
persistent chrome, brand expression, and any section whose job is to convince. The *surfaces* are
the screens carrying the task and its states. Run the frame first; it fixes the spine the surfaces
inherit.

Signed-in versus signed-out is **not** the cut. Guest flows and SEO app pages break it.

## The procedure

**1 · Inspect.** Read the repo: framework, routing, component library, styling, tokens, motion
libraries, test setup, and **how the data layer can be intercepted** — that last one sizes the
state harness, so it is not optional. Detect the system mode (`systems.md`). Check what the
environment can produce: a browser driver, `studio-gen` on `PATH`, axe, the perf and interaction
harnesses. An uninventoried capability is an unavailable one.

**2 · Intake — STOP.** Establish and confirm:
- **The flow** — which screens, start to finish.
- **The surfaces** — desktop web, mobile web, iOS, Android. More than one is normal.
- **The hard screen** — the densest, most state-bearing screen in the flow. Everything downstream
  is judged on it, so getting it wrong wastes the run.
- Any concept, constraint or reference already in the client's head.

**3 · Target.** Open `canon.md`. Name **2–3 entries this flow must stand next to**, at least one
from a different problem type. One line each on what it does that a default would not. These go in
`SCREENS.md` and the critic ranks the shipped flow against them.

**4 · Inventory.** Build the state inventory and the state manifest from `states.md` — every state,
every surface, and how each will be forced. Before any pixels.

**5 · Comp — STOP.** Build **two directions for the hard screen, in real code, both fully
state-complete**. Screenshot at every declared surface; record each one's signature moment. Present
both; the client kills one. **Record one line naming what the killed direction lost on** — the run
may not proceed without it, and its absence blocks at verify. **Never delete the killed comp.**

Two, not three: the framework, the system and the task pin most decisions down, so a third
direction is usually the second with different spacing. State-complete, not pretty: a direction
that survives the dense case makes the easy screens free.

**6 · Spec.** Write one `SCREENS.md` from `craft.md`, `systems.md`, `motion.md` and `states.md`.
Values, not reasons.

**7 · Build.** Signature moment first, at full declared amplitude, and look at it *running* before
anything else is built. Then the hard screen to completion, then the rest of the flow. Leave the
spine behind.

**8 · Verify.** Run the loop in `verify.md`: gates first, then the critic.

## Where the run stops

Exactly two points. These are stops, not notifications — do not proceed on an assumption about what
the answer would have been.

1. **Intake (step 2)** — flow, surfaces, hard screen.
2. **Comp (step 5)** — two state-complete directions; the client kills one.

Plus: **any floor override requires the client's agreement**, recorded in `SCREENS.md`. Pick
unattended only when no human is reachable, and record that you did. Do not infer absence — if the
client has answered anything this session, they are reachable.

## The bar

1. **Fast** · 2. **Legible** — hierarchy, layout, a priority system · 3. **Comprehensive** — every
state, not the happy path · 4. **Cohesive** — one family, shared components and templates ·
5. **Best-practice** for its system and framework · 6. **Not AI slop** · 7. **The ceiling** — smart
motion, micro-animation, considered transitions, authored imagery.

Six are floors and one is a ceiling. Three mechanisms exist to make the seventh enforceable — the
canon (`canon.md`), the two-direction comp gate (step 5), and the mandatory signature moment
(`motion.md`) — and each is wired to an instrument that can see it (`verify.md`).

## The tells

Convergent patterns. Rubric item 7 blocks on any of these being visible.

1. **Marketing type on a work surface.** A 48px headline over a dashboard. The canon measures dense
   product screens at **2.0×–2.67×** contrast; marketing runs **14×**. This is the most common
   import and the most damaging.
2. **The library's defaults with the brand colour swapped in.** Recognisably stock shadcn or
   Material, differing from the documentation only in hue.
3. **The empty state as a separate centred page** — an illustration, a sentence and a button, on a
   layout that matches nothing else. Empty states belong *inside* the template.
4. **One empty state doing three jobs.** First-run, cleared, and no-results are different messages
   with different actions.
5. **Spinner-first loading.** A spinner where the arriving layout is known and a skeleton was
   available.
6. **Uniform whitespace regardless of task.** Density is a property of the task; the canon spans
   **12.7 to 151** targets per megapixel and both ends are correct for their screen.
7. **Everything is a card.** Rounded box, border, shadow, nested twice. Elevation used as decoration
   rather than to say what is above what.
8. **One 300ms fade everywhere, or no motion at all.** Both are the median; neither is a signature.
9. **The accent colour used everywhere**, so it no longer marks the primary action.
10. **Hover-only affordances.** An action reachable only by hovering has no touch equivalent.
11. **Placeholder copy in the render** — "Item 1", "John Doe", lorem. Real content changes layout
    decisions; fake content hides them.
12. **A modal for everything**, including flows that need context from the screen behind them.

## `SCREENS.md`

The run's single output document, written at step 6. Named distinctly from `studio-design`'s
`DESIGN.md` so a repo can hold both.

- Flow, surfaces, hard screen, system mode and the evidence for it.
- Canon targets, and what each is borrowed for.
- The spine — tokens and the component/layout inventory.
- The state inventory **and** the state manifest, per surface.
- The signature moment: what it marks, its type, and all five amplitude parameters.
- The interaction manifest — every moment `interact.mjs` must drive, with trigger and surface.
- The asset list — every generated image with placement, purpose and inherited token colours.
- The performance and accessibility budgets.
- **The killed comp, one line, naming what it lost on.** Required.
- Any floor override, with the client's agreement recorded.

Values, not reasons.

## Files

`canon.md` — measured numbers, and what is not evidenced · `craft.md` — hierarchy, density,
spacing, colour · `states.md` — the inventory, the manifest, the contact sheet · `systems.md` — the
three modes and the spine · `motion.md` — the signature moment and the five parameters ·
`verify.md` — gates, rubric, critic contract.
