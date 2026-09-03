# Craft

How a product screen is built once the direction is chosen. Every number here comes from
`canon.md`. Where a value is not measured, it says so and names its source.

## The governing correction

**Product UI is a compression problem, not an expression problem.**

Marketing pages run type contrast at a median of **14×**. Dense product screens run **2.0×–2.67×,
median 2.5×**. If you arrive carrying a marketing instinct — a 48px headline, a hero statement, a
generous vertical rhythm — you will build a screen that looks designed in a screenshot and fails
the moment it holds four hundred rows.

The hierarchy still has to work. It is carried by **weight, colour and position**, not by size.
Stripe's payments table holds a full hierarchy at 2.33× contrast over a 14px body. That is the
craft: making rank legible without spending vertical space on it.

## Two type families

**Dense surfaces** — tables, feeds, dashboards, message lists, summaries.

- Contrast **2.0×–2.67×**. Above ~3× on a dense screen, something is wrong.
- Body **14px**. Five of seven measured screens; 12px and 15px are the observed edges. Nothing
  measured runs 16px body.
- A **small size set**: four to six sizes on a whole screen, typically 12 / 14 / 16 plus one or two
  larger. A seventh size needs a reason.
- Weights are narrower still: **400 and 600 carry nearly everything**, with 500 and 700 available
  where the system offers them.

**Editor surfaces** — documents, canvases, composers.

- Contrast **~6.5×**, and the large end is *the page title only*. Notion measures 6.5× with a 78px
  title over the same 14px body.
- This is a second mode, not permission to inflate a dashboard. The display size belongs to
  authored content, never to chrome.

Establish which family the hard screen belongs to at step 4, and record it in `SCREENS.md`. A flow
can contain both — a document editor inside an app shell — in which case the shell follows dense
rules and the canvas follows editor rules.

## Hierarchy without size

On a dense screen you have roughly 2.5× of size range to spend across the whole hierarchy. Spend it
once, at the top. Everything below is separated by other means:

- **Weight.** 600 against 400 is a full rank step and costs no space.
- **Colour value.** A muted secondary against a full-strength primary is a rank step. The measured
  palettes are small enough that two or three text values is the whole system.
- **Position and alignment.** A left-aligned column edge is a stronger grouping signal than a size
  bump.
- **Space.** Grouping by proximity, using the spacing scale below.

The test: read the hard screen cold and name its subject in under a second. If the only thing
making the subject findable is that it is bigger, the hierarchy is thin.

## Density is a property of the task

Measured density ranges over an order of magnitude — Acorns' portfolio summary at **12.7**
interactive targets per megapixel, Stripe's payments table at **151**.

**Neither is better.** Density is set by what the user came to do. A summary earns its calm by
removing controls, not by adding whitespace to a dense layout. A table earns its usefulness by
fitting more rows, not by breathing.

Decide the density the task wants, then hold it. The failure is a screen that is dense in one
region and airy in another for no reason a user could name.

**Do not use whitespace to signal quality.** On a marketing page, air reads as confidence. On a
work surface, it reads as a screen that will need scrolling forty times a day.

## Spacing

Measured screens use **5–10 distinct steps, median 8** — counting values that appear at least three
times, at 4px or above.

- Start from a base step and multiply. Most measured scales resolve to a 4px base.
- **Five steps is enough.** Slack holds a complete product on five. If you are reaching for a tenth,
  check whether it is a real step or an unrounded one-off.
- A second, larger rhythm is legitimate for card grids. Airbnb runs a small base scale plus large
  steps (44 / 48 / 144) for its grid — two scales, each internally consistent, not ten arbitrary
  values.

## Colour

Measured screens use **7–14 distinct colours, median 11**, counting values used three or more
times, across text, background and border.

That is a whole screen, not a whole design system. It typically resolves to: two or three text
values, two or three surface values, a border, a brand accent, and two or three status colours.

**Measure the dense state, and read a low count against the states it excludes.** Status colours
only appear in the states that use them, so a screen measured in its resting state can report five
colours while genuinely carrying eleven. The number is evidence about one state, not about the
screen.

- **Status colour is functional and comes first.** Error, warning, success and info are not
  decoration; they are the only colour a user is required to interpret correctly.
- **The accent is for the primary action and current state.** If the accent appears more than a few
  times on a screen, it has stopped meaning anything.
- Acorns runs the smallest palette measured at **7** — a financial surface that stays calm by not
  colouring what does not need it.

## Cohesion is measurable

**Component reuse ratio** — the share of on-screen elements belonging to a repeated signature — is
the instrument behind "feels like one family."

| | measured |
|---|---|
| Median across the canon | **0.78** |
| Highest (Airbnb browse) | **0.95** |
| Lowest (Stripe dashboard) | **0.51** |

Airbnb is the instructive one: a marketplace, the surface most tempted toward bespoke sections,
built almost entirely from repeated parts.

**Treat ~0.5 as a floor.** Below it, a screen is being assembled one element at a time, and the
tenth screen in the flow will cost what the first did. This is why every run leaves a spine
behind — see `systems.md`.

## Layout templates

A flow is not a set of screens; it is a small set of templates with different content in them.
Name them at step 4 and reuse them.

The recurring product templates:

- **List / table** — a toolbar, a filter row, a scrolling body, a selection state, a row action.
- **Detail** — a header identifying the object, primary actions, grouped attributes, related items.
- **List + detail** — the two above, side by side on wide viewports, stacked with navigation on
  narrow ones.
- **Form** — a title, grouped fields, inline validation, a persistent primary action, a dirty state.
- **Dashboard** — a grid of summary tiles over one or two detail regions.
- **Empty / first-run** — the same template with its content region replaced, never a different
  page.

**The last one matters more than it looks.** An empty state built as a separate centred page is the
most common way a product loses cohesion: the user is moved to a different-feeling screen at the
moment they are least oriented. Build empty states *inside* the template.

## Chrome is designed

Header, sidebar, toolbar, tab bar, breadcrumbs and footer are the parts a user sees on every screen
of the flow. They are also the parts most likely to be left at the component library's default.

Decide, and record in `SCREENS.md`: the chrome's density relative to content, whether it scrolls or
pins, how the current location is expressed, and what it does at the narrow viewport. Chrome
inherited unexamined is the clearest tell that a screen was assembled rather than designed.

## What to record in `SCREENS.md`

Values, not reasons:

- Type family (dense or editor), the size set, the weight set, the contrast ratio.
- Density target for the hard screen, in targets per megapixel.
- The spacing scale, as a list of steps.
- The palette, as a list of values with roles.
- The template list, and which screens use which.
- The chrome decisions above.
