# Systems

What to do about the design system — whether one exists, belongs to someone else, or has to be
invented on the way past.

Detected at **step 1**. The mode changes what you may decide, not how good the result has to be.

## The three modes

### Mode 1 — no system

Nothing to inherit: a greenfield app, a prototype, a codebase with ad-hoc styles.

**Author a minimal spine as part of the run.** Not optional, and not deferred to a later
"systemisation" pass that never happens. See *The spine* below.

*Unvalidated at v1.* This path has not been exercised by a full run; treat its guidance as
untested. See `canon.md`'s gaps.

### Mode 2 — someone else's system

The repo already has Material, Angular Material, shadcn/ui, Tailwind with a token layer, or a
house library. **This is the common case and the one the live test exercises.**

**Work inside it.** Learn its rules and honour them. The system encodes decisions that have already
survived contact with real screens; overriding them from outside produces a screen that is neither
the system nor a coherent alternative.

- **Extend rather than fight.** A component the system lacks is composed from its primitives, using
  its tokens, matching its API conventions.
- **Departing from the system is a floor override** and needs the operator's agreement, recorded in
  `SCREENS.md`. "The default button is ugly" is not a reason. "This flow's primary action must be
  distinguishable from the system's default at a glance, and here is why" might be.
- **Never fork a component to change one value.** Either the value is a token — change the token —
  or the difference is a variant the system should own.
- **Match the system's density before its colour.** Products look off-system because their spacing
  and type scale drift, far more often than because their hue is wrong.

### Mode 3 — a throughline-managed system

A `design-system.json` manifest is present.

**Read-only. Never write the manifest.** throughline ships to other people; every schema change
there is a release with a migration. Reading is free, writing is a commitment.

**Mode 3 layers on top of a mode-2 system; it does not replace one.** The manifest names the UI
framework it manages (`project.uiFramework`), and that framework's rules still apply in full. A run
that detects mode 3 and stops has thrown away the guidance that actually governs the screens.
Record both: the token authority *and* the framework.

**The manifest carries state, not values.** This is the trap. It tells you what has been built,
what has been synced, when, and whether the sync is trustworthy — not what the tokens are. On a
real repo, `tokens.collections` was `[]` and `semanticBuilt` was `false` while the project had 112
colour tokens and a verified zero-drift crosswalk against 225 Figma variables. A run that reads
token names out of the manifest gets nothing and concludes there is no system.

Read from the manifest, in this order:

1. **`sync.customAdapters` / `sync.platforms`** — where the emitted tokens actually live. That
   artifact is the source of names and values.
2. **`tokenCrosswalk.validatorPassing` and `statusCounts`** — whether code and Figma agree. Drift
   here means a token you bind to may not be the one the designer sees.
3. **`components.built` and `components.meta`** — what already exists, so the run extends rather
   than reinvents. Expect it to be short; `audit.docSurface` is the honest count.
4. **`project.uiFramework`** — the mode-2 system underneath.

Reference tokens by name in `SCREENS.md` — `color.surface.raised`, not `#1c1c22` — so the spec
survives a token change.

*Detection and manifest-reading validated against a real repo; the full run is unvalidated at v1.*

## Rules worth inheriting

Whichever mode you are in, the mature systems have already settled things it is wasteful to
re-derive. Borrow the rules; do not copy the look.

**Material** — the density concept, and its dp-based spacing baseline. Its guidance on elevation as
a *meaning* (what is above what, and why) rather than a decorative shadow ramp. Its state-layer
model, which gives hover/focus/pressed a consistent treatment across every component instead of
per-component invention.

**shadcn/ui and the Radix layer under it** — the accessibility primitives: focus management, escape
and dismissal behaviour, roving tabindex, portal and layering rules. These are the parts that are
genuinely hard to get right and genuinely costly to get wrong. Take them wholesale.

**Human Interface Guidelines** — for iOS output: navigation model, safe areas, gesture conventions,
the standard type ramp. A native screen that ignores platform navigation reads as a web page in a
wrapper.

**Material 3 for Android** — the equivalent, and genuinely different from HIG in navigation and
back behaviour. Do not design one native screen and relabel it for the other platform.

**What not to inherit:** the reference *aesthetic*. Material's own palette and shape language are
one expression of the system, not the system. A screen that looks like the Material documentation
has adopted the example rather than the rules.

## The spine

**Every mode leaves a spine behind.** Even mode 1, especially mode 1.

The spine is two things:

**1 · Tokens.** The values, named, at minimum:

- Colour: text values, surface values, border, accent, and the status set (error, warning, success,
  info).
- Spacing: the step scale, from a 4px base.
- Type: the size set and the weight set, body around **14px**, weights concentrated on **400 and
  600**.
- Radius, border width, and elevation, if the design uses them.

**The canon's counts describe one screen, not the token set.** `canon.md` measures 7–14 colours and
5–10 spacing steps *in use on a single screen*; a healthy spine carries more than any one screen
spends. A real managed repo shipped 112 colour tokens and 12 spacing steps and was not thereby
wrong. Use the canon's counts to judge a **screen** — a screen spending 30 colours has no hierarchy
— and never to trim a token set down to them.

**2 · A component and layout inventory.** What was built, and which template each screen uses. Not
a component library — a list, with the props each component actually varies on.

Where a manifest exists (mode 3), the spine is a *reference* to it, not a copy. Where none exists
(mode 1), the spine is a file in the repo, and `SCREENS.md` points at it.

### Why the spine is not optional

**Cohesion is not achievable one screen at a time.** The canon measures component reuse at a median
of **0.78**, and Airbnb — a marketplace, the surface most tempted toward bespoke sections — at
**0.95**. Those numbers are the result of a spine existing, not of care applied per screen.

Without one, the tenth screen in the flow costs what the first did, and none of them match. The
run's own comp gate will not catch it, because the comp is one screen. It surfaces at rubric item
6, when the flow is built and the cost of fixing it is highest.

## Detecting the mode

At step 1, in order:

1. **`design-system.json` present?** → mode 3. Read it; do not write it. **Then keep going** —
   mode 3 is a token authority, not a substitute for the framework underneath.
2. **A component library in `package.json` and actually imported?** → mode 2. Check imports, not
   just dependencies; a library present but unused is not a system.
3. **A token layer without a library** — a Tailwind theme extension, CSS custom properties, an SCSS
   variables file? → mode 2, with the token layer as the system.
4. **None of the above** → mode 1.

Record the detected mode and the evidence in `SCREENS.md`. A mode assumed rather than detected is
how a run ends up half-inside a system.

## What to record in `SCREENS.md`

- The mode, and the evidence that determined it.
- In mode 2: the system's name, and every point of departure with the operator's agreement.
- In mode 3: the manifest path, and the token names bound to.
- In mode 1: the spine's location.
- The component and layout inventory, in every mode.
