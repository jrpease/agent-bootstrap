# Verify

Two layers, and the order matters. **Deterministic gates run first and block cheaply. The critic
then judges what arithmetic cannot.**

A critic round is the most expensive thing in this loop. Spending one on a run that fails a
document check or an axe rule is waste, and a run that cannot afford its closing critic will trade
it away and close anyway.

## The five instruments

Instruments *produce evidence*. The gates and rubric below are the *rules over that evidence*.

**1 · The state contact sheet.** Every state in the inventory, screenshotted into one labelled
grid, per surface. Built by `reference/states-force.mjs` and `reference/canon/sheets.mjs`. A
missing state is a visibly empty cell. Contract in `states.md`.

**2 · The motion capture.** `reference/interact.mjs` reads the interaction manifest from
`SCREENS.md`, drives each trigger with real input events at each web surface, records video per
moment, and emits the five amplitude parameters plus a **capture manifest** — every moment
considered, offered or not, captured or not. A moment the tool cannot drive is a named `(capture)`
defect, never a silent pass.

**3 · The performance budget.** `studio-design`'s `reference/perf.mjs` and `jank-control.html`.
The symlinks here are the **source to copy from, not the thing to run**: Node resolves bare imports
from a symlink's *target* directory, so running the link directly cannot find Playwright. `perf.mjs`
says so in its own header — copy it next to the project's dependencies and run the copy. Extend
`driveInteractions()` with this flow's affordances; the signature moment is the one that most needs
the number.

> **Run `--expect-fail` against the control page once per project before trusting any clean
> result.** A harness whose recorder never armed is indistinguishable from a smooth page.

**4 · Accessibility.** `reference/a11y.mjs`, run over the **state manifest** rather than the happy
path — accessibility defects concentrate in the states nobody screenshots. It runs three checks:
axe-core over WCAG 2.x A/AA; a **focus-visibility** pass, because `:focus { outline: none }` with
nothing in its place passes every axe rule and makes the keyboard path unusable; and a
**keyboard-reachability** pass that finds elements styled as controls, carrying real click
listeners, that tab can never reach. The last two are read through CDP, not an `onclick` scan —
Angular, React and Vue all bind through `addEventListener`, so an attribute scan finds nothing on
exactly the frameworks this skill is used on.

`critical` and `serious` block; `moderate` and `minor` are reported. A floor that blocks on every
advisory gets switched off, and a floor that is switched off is not a floor.

> **Run `--expect-fail` against `control/a11y-control.json` once per project.** The control fixture
> carries six deliberate defects. A harness that reports it clean will report anything clean.

**Two known blind spots**, both verified against the control: axe does not flag a text input whose
only name is its placeholder, and neither instrument sees a non-focusable element that has no click
listener but is still presented as a control. An `unforceable` state is an **unaudited** state and
is reported as such — never as a pass.

**5 · `design-critic`, product round.** Fresh context, media only. Rubric below.

## The gates

Mechanical, cheap, one line of output each. **A failed gate blocks and the run does not proceed to
the critic.**

| Gate | Passes when | Source |
|---|---|---|
| **Kill line** | `SCREENS.md` records what the killed comp lost on | `kill-gate.mjs` |
| **Capture manifest** | no declared moment un-driven without a named reason | `interact.mjs` |
| **Amplitude** | measured ≥ declared on all five parameters, **and** the declaration is not middle-of-the-pack for its moment type | `amplitude-gate.mjs` (over `interact.mjs` + `canon/raw.json`) |
| **Performance** | budget met, with `--expect-fail` having passed first | `perf.mjs` |
| **Accessibility** | zero blocking violations, zero invisible focus rings, zero keyboard-unreachable controls, across every forced state | `a11y.mjs` |

**The kill gate is a script, not a claim.** It was once reported PASS against a `SCREENS.md` that
still read *"Awaiting Stop 2"* — the stop had executed and the kill line had been spoken, but the
run's output document never recorded it and a human assertion stood in for the check. The critic
caught it; the gate did not. `kill-gate.mjs` now tests four things: a kill line exists, the document
does not still say the stop is pending, the loss named is measurable (a number near it), and the
killed comp was kept. Its control fixture is the exact document that passed by assertion.

**A gate that reports on a fact it did not check is worse than no gate**, because it converts a
missing step into a green line. If a gate cannot be run, report it *not run* — never passed.

**The amplitude gate in full** (rules and reasoning in `motion.md`):

- *Shipped below declaration* — any measured parameter below its declared value.
- *Declared unremarkable* — the declaration sits inside its moment type's interquartile range on
  four or more of five parameters, **in either direction**; or fails the coordination floor
  (`groups ≥ 2` or `participants ≥ 3`).
- **Skip any parameter `canon.md` marks not gateable** (fewer than four measured moments for that
  type) and **say so in the gate's output**. Grading a declaration against a distribution of one is
  worse than not grading it.
- On a native-only run there is nothing running to record. The gate degrades to a specification
  review and must report that it did.

**The kill line is a gate, not a rubric item.** A document check is the right instrument for a
document artifact. A stop you can skip silently is not a stop.

## The product-round rubric

Eight items. **Items 1–3 are the ceiling items and every one of them blocks.** The failure this
corrects is a rubric whose blocking items were all floors, which passes competent, complete,
forgettable work.

| # | Item | Severity | Fails when | Judged from |
|---|---|---|---|---|
| 1 | **Canon rank** | blocking | The flow places below a named canon target on any axis the media shows. The critic's first act is to name a product that does this better; "none" must be earned. | canon captures, `canon.md`, contact sheets |
| 2 | **Signature moment** | blocking | Absent from the recordings, or present but not readable as a signature — a viewer not told where to look cannot name it. *The measured half is the amplitude gate's; report its verdict, do not recompute it.* | recordings, gate result |
| 3 | **Ceiling reach** | blocking | Judged against bar item 7 — motion, micro-animation, considered transitions, authored imagery. **"Competent and complete" is an explicit failure verdict**, named here so the critic has permission to use it. | recordings, contact sheets |
| 4 | Hierarchy | blocking | The hard screen has no nameable subject; priority is not readable cold. | contact sheets, `craft.md` |
| 5 | State completeness | blocking | Any empty cell in the contact sheet, or any `unforceable` state without a recorded override. | contact sheets, `SCREENS.md` |
| 6 | Cohesion | blocking | Screens do not read as one family; components or templates diverge without reason. | contact sheets, `SCREENS.md` |
| 7 | Tells / slop | blocking | Any convergent pattern from the tell list is visible. | contact sheets, `SKILL.md` |
| 8 | Craft numbers | note, blocking below a canon floor | Type contrast, spacing rhythm, colour count, density, measured off the render. | contact sheets, `canon.md`, `craft.md` |

**The incentive flip.** Under-*dreaming* is a finding, not only under-shipping. Item 2's second
clause and item 3 exist so a modest declaration faithfully executed cannot pass — the exact hole
that let the previous skill ship a competent page through every check.

**Every item names the artifact it is judged from.** An item whose source is not on the
receives-list below is a bug in this file, not a judgment call for the critic.

## What the critic receives

**Must receive** — the list must carry everything the eight items reference:

- `SCREENS.md` — declaration, state manifest, interaction manifest, kill line.
- The contact sheets, per surface.
- The recordings for the signature moment and every declared moment.
- The capture manifest.
- The canon captures for the 2–3 named targets.
- **`canon.md`** — the craft floors item 8 escalates against, and the per-type medians.
- **`SKILL.md`** — the tell list item 7 checks against.
- **`craft.md`** — the measurement definitions behind item 8.
- **The gate result lines**, including the amplitude gate's verdict.

**Must not receive**, absolutely: the implementation conversation, the diff, the code. Not knowing
how the work was made is the qualification, not a gap. If any of it arrives, the critic says so in
its first line — its independence is already compromised and the reader should know.

## Verdict and output

```
VERDICT: PASS | REVISE | REVISE-and-recapture

GATES
- <gate> · pass | FAIL · <one line>

FINDINGS
- <severity> · <what is visible> (artifact, surface) · <what SCREENS.md declares, or "not specified">

NOT EVIDENCED (if any)
- <item> — <why the media cannot show it>
```

- **Numbers, not adjectives**, on every measurable claim — including passes.
- **Anchor every finding** to an artifact and a surface.
- **Never fix.** No patches, no suggested values, no rewritten copy. A critic who proposes the fix
  has started negotiating with the work, and their next verdict is on their own suggestion.
- A parameter the media cannot show is **`not evidenced`** — never a pass, never a failure.
- If the work is sound, say so and keep the list short. Padding trains the reader to skim.

## Round cap

**Two rounds.** A round is: force and shoot every state, run `interact.mjs`, run `perf.mjs`, run
axe, dispatch the critic. Anything less — screenshotting your own work and fixing what you saw — is
a glance and is free.

**Budget the closing critic from the start.** A comparable `studio-design` run cost roughly **$280
and four hours** with an unbounded looking loop. This loop is more expensive per round than that
one: recording and frame analysis are not free.

**The cap binds even when a third round would help.** If two rounds have not cleared it, the honest
move is to reduce scope — ship fewer screens, record what was cut and why — not to keep looping.

## Reporting

State the result as: **what changed · what was verified · remaining risk.** Never claim a check
passed that was not run. A gate that was skipped is reported as skipped, with the reason.
