# States

A screen is not a layout, it is a set of states. "Comprehensive — nothing missing" is the bar, and
this file is how it becomes falsifiable rather than aspirational.

Authored at **step 4**, before any pixels. It sizes the work, it is what the contact sheet is
checked against, and a state with no way to reach it is a problem to surface now rather than at
verify.

## The inventory

Every screen in the flow gets a row per applicable state. Not every state applies to every
screen — but "does not apply" is a decision to record, not an omission to leave silent.

**Content states**

- **Empty — first run.** The user has done nothing yet. Explains what will appear here and offers
  the action that fills it.
- **Empty — cleared.** They had content and no longer do; a completed queue, a cleared filter.
  Genuinely different from first run and routinely conflated with it.
- **Empty — no results.** A search or filter matched nothing. Must offer a way back; a dead end
  here is the most common state failure in product UI.
- **Single item.** Layouts tuned for many often break at one.
- **Dense.** The realistic upper volume. This is the hard screen's normal condition.
- **Overflow.** Text longer than its container, a name that wraps, a number with more digits than
  budgeted, a column set wider than the viewport.

**Loading states**

- **Initial load.** Nothing on screen yet.
- **Refresh.** Content present, being updated. Must not blank what is already readable.
- **Incremental.** Pagination, infinite scroll, a lazily loaded region.
- **Optimistic.** The action shown as done before it is confirmed — with its failure path defined.

**Failure states**

- **Recoverable error.** Network, timeout, conflict. Needs a retry that actually retries.
- **Validation error.** Inline, attached to the field, surviving the scroll.
- **Permission denied.** The user is authenticated but not entitled. Distinct from empty and from
  error, and the state most often skipped.
- **Not found.** The object is gone or was never there.
- **Degraded.** Part of the screen failed while the rest works. A whole-screen error for a failed
  sidebar is a design decision, usually the wrong one.

**Interaction states** — per interactive element, not per screen

- Rest, hover *(pointer only)*, focus-visible, active/pressed, disabled with a reason available,
  selected, and loading-in-place.

**Render the reason, do not delegate it to `title`.** A native tooltip does not appear in a
screenshot, so a disabled control whose reason lives in a `title` attribute produces a contact-sheet
cell identical to the plain disabled state — the state is declared, shot, and still unevidenced.

**Native additions** — iOS and Android only

- Gesture states: swipe-in-progress, past-threshold, released, cancelled.
- Safe-area behaviour: notch, home indicator, rotation.
- Keyboard-present layout.

## Choosing a loading state

Not measured in the canon. The thresholds below are the established web-performance guidance and
are **cited, not measured** — replace them if a capture ever measures real products' thresholds.

- Under ~100ms: show nothing. A spinner that flashes is worse than no spinner.
- ~100ms–1s: show in-place feedback on the control that was pressed.
- Over ~1s: show a skeleton that matches the layout that will arrive.
- Over ~10s: show progress and a way to cancel.

**Prefer a skeleton over a spinner** wherever the arriving layout is known. A skeleton holds the
page's shape, so arrival is not a jump. A spinner says only "wait".

## The state manifest

The inventory becomes a table in `SCREENS.md`. One row per state, and `states-force.mjs` drives it.

| Field | Meaning |
|---|---|
| `state` | Name, matching the inventory |
| `screen` | Which screen it belongs to |
| `surface` | Which surfaces it applies to |
| `force` | How it is produced (below) |
| `status` | `forceable` or `unforceable` |

**`force` methods**, all applied at the browser layer so the harness stays framework-agnostic:

- `route` — a stubbed response, with status, body and delay. Covers most error, empty and loading
  states.
- `viewport` — a width or height that produces the state.
- `auth` — a session or role that produces it. Covers permission-denied.
- `seed` — a data volume. Covers single-item, dense and overflow.
- `input` — a driven interaction. Covers validation, selection and interaction states.
- `none` — reachable without intervention.

**A `force` method sets one condition; a state may need several.** Verified in the harness: a
state forced only by `viewport` rendered at the right width and then showed an error, because
nothing had stubbed its data. `force` blocks therefore accept a `pattern` alongside any kind — an
interaction state can stub its own precondition. When a state looks wrong in the contact sheet,
check first whether it was under-specified rather than broken.

**A declared-forceable state that fails to force is a `force-failed` defect**, not an unforceable
state. It still gets a labelled cell, marked differently, and it is a bug in the manifest or the
app to fix before sheeting — never something to reclassify as unforceable to make the run pass.

**`unforceable` is a first-class outcome, not a failure to hide.** It appears as a labelled cell in
the contact sheet, is recorded in the capture manifest, and reaches the critic. Shipping with an
`unforceable` state requires the operator's agreement, recorded like any floor override.

The alternative — quietly dropping states that are hard to reach — is precisely how "comprehensive"
becomes a claim rather than a fact. The hard-to-reach states are usually the failure states, which
are the ones users meet on their worst day.

## The contact sheet contract

The instrument behind "comprehensive". Every state in the inventory, screenshotted into one
labelled grid, per surface.

- **One cell per inventory row.** Not per screenshot taken — per row *declared*.
- **A missing state is a visibly empty cell**, labelled with the state's name. This is the whole
  point: a hole in a grid cannot be argued with, whereas a missing paragraph in a spec is invisible.
- **An `unforceable` state gets a labelled placeholder**, not a gap and not a silent omission.
**`shots.json` carries a source fingerprint.** List the design's source files as
`fingerprintPaths` in the manifest and the harness records their hashes and mtimes at capture time.
A critic pack was once assembled from shots taken fourteen minutes before the defect in them was
fixed, and nothing in the pack could say so — the critic judged a stale capture as current and its
finding was unanswerable. Before dispatching, compare the recorded hashes against the sources on
disk; if they differ, re-shoot rather than explain.

- Built by `reference/state-sheet.mjs` from the shots `states-force.mjs` produced. **Not**
  `canon/sheets.mjs` — that one reads the canon's own `shots.json` shape and cannot consume the
  state harness's output. The sheet verifies its own images decoded before reporting a count: a
  grid of black rectangles reporting "0 holes" is worse than no grid, because it turns a broken
  instrument into a pass.

**Rubric item 5 blocks on this**: any empty cell, or any `unforceable` state without a recorded
override, fails the run.

## Sequencing

1. **Author the inventory** (step 4), per screen and per surface. Mark non-applicable rows
   explicitly.
2. **Assign a `force` method to every row.** A row you cannot assign one to is `unforceable` now,
   not later.
3. **Build the two comps state-complete** (step 5). Every state in the *hard screen's* inventory,
   rendered in both directions. This is what makes the comp gate a real test rather than a
   beauty contest.
4. **Build the flow** (step 7), then force and shoot every state.
5. **Sheet and verify** (step 8).

## Why state-completeness sits at the comp gate

Two directions are built state-complete before one is killed, which is more expensive per direction
than two pretty screens. It is deliberate.

A direction that survives the dense case, the error case and the overflow case is a direction that
survives the product. A direction chosen on its happy path is chosen on the one state that never
decides anything — and the rework lands later, when the flow is built and the cost is highest.

## What to record in `SCREENS.md`

- The inventory, per screen and surface, with non-applicable rows marked.
- The state manifest table, with `force` and `status` on every row.
- Any `unforceable` state, with the operator's recorded agreement.
- The loading thresholds chosen for this flow.
