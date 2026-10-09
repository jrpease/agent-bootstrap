---
name: studio-design
description: >
  Use when building or redesigning a marketing site, landing page, product
  page, or campaign site that must feel intentionally designed rather than
  AI-generated. Triggers include turning a README, brand guide, or product
  notes into a website; requests to make a page look premium or "not like AI
  slop"; redesigning a generic or templated page; or any B2B, B2C, or
  agency/campaign homepage where craft, distinctiveness, and conversion
  matter. The cut against product-design is intent: a surface that needs
  someone to *believe* something is this skill; a surface where they *do*
  something — dashboards, tables, forms, app flows — is product-design. When a
  surface does both, studio-design designs the frame and product-design
  designs the surfaces. Also triggers on art direction for a site that already
  exists: choosing imagery, illustration, texture, or a visual material
  system, or fixing a built page that reads as a wireframe rather than a
  finished design.
---

# Studio Design

Design the whole experience before implementing any section. Build three heroes, kill two, then
build the page. Judge the result against real work, not against your own brief.

## The procedure

**1 · Inspect.** Read the repo: routing, styling, animation libs, existing tokens, committed
typefaces, brand assets, **existing photography** (the highest-value find), a reachable live site.
Then check what this environment can produce: `studio-gen` on `PATH`, a browser driver, the
Blender and Spline MCP tools (`three-d.md` §2), and the vgpu, Magic UI and Mobbin MCP tools
(`sources.md`).
An uninventoried capability is an unavailable one.

**2 · Intake.** Ask three questions and nothing else. *What should this feel like — is there a
concept or reference already in your head?* *If a design system exists — work inside it, extend it,
or depart?* *Will you supply visual assets, or should we generate them?* Skip any the request
already answered.

Separate the client's **adjectives** (binding — the feeling they are owed) from their **nouns**. A
noun they *direct* ("make it a field guide") is the concept and is binding. A noun they *mention*
while reaching for a feeling is a first draft. Record: `Concept: <one sentence> — directed by
<client | this run>`.

With no concept given, propose three, anchor each to something real, mark the line `this run`, and
ask which is theirs. A proposed concept is not an approved one.

**3 · Target.** Open `canon.md`. Name **2–3 entries this page must stand next to**, at least one
from outside your mode. Write one line per entry: what it does that a default would not. These go
in `DESIGN.md` and the critic ranks the shipped page against them.

**4 · Comp.** Read `moves.md`. Build **three heroes in real code** and screenshot each at 1440
and 375. Then **stop. Present all three to the client and wait for their pick.** They choose; you
kill the two they reject. Judge against the canon targets, not against each other. Run the
first-pixel check in `verify.md` on the survivor. Record one line per killed comp naming what it
lost on. **Never delete the comps** — they are the audit trail for this decision.

Pick yourself **only when no human is reachable**, and record in `DESIGN.md` that you did. Do not
infer absence: if the client has answered anything at all this session, they are reachable.

**5 · Spec.** Write one `DESIGN.md` (format below) from `craft.md`, `worlds.md`, and `copy.md`.
Values, not reasons.

**6 · Build.** Signature scene first, at full declared amplitude, with its real asset — then look
at it running before anything else is built. Then sections — source the plumbing and the
materials, author the rest (`sources.md`). Chrome is designed, not defaulted (`moves.md` §D). Ship
one **authored artifact**.

**7 · Verify.** Run the loop in `verify.md`.

## Where the run stops

The run halts and waits for the client at exactly four points. These are stops, not
notifications — do not proceed on an assumption about what the answer would have been.

1. **Intake (step 2)** — the three questions.
2. **Comp (step 4)** — three heroes presented, client picks one.
3. **Any floor override** — a floor may only be overridden with the client's agreement, or, when
   nobody is reachable, with the override recorded as an assumption.
4. **A client-made asset the tools cannot make** — a Spline export (the Spline MCP cannot export;
   `three-d.md` §5). Name exactly what the client should make.

Unattended runs proceed through all four and record each as an assumption in `DESIGN.md`. A run
that had a client and did not stop has skipped a step, not saved one.

## DESIGN.md

Every field is a value. A field satisfiable by a rationale instead of a value does not belong.

```
Concept: <one sentence> — directed by <client | this run>
Canon targets: <entry> — <what it does a default would not>
                <entry> — <…>
World: <n> — <name>
  Changed <parameter> to <value> because <reason>
  Changed <parameter> to <value> because <reason>
Palette: <hexes/oklch, with role and share>
Faces: <names, weights, sizes, tracking>
Easing: <four named beziers>
Shadows: <contact tuple, ambient tuple>
Proximity ladder: <a / b / c>
Hero line: <the promise, or the offer named>
Offer line: <what the reader gets, checkable>
Section claims: <one assertion per section, in order>
CTA: <verb + object>
Motion profile: <Minimal | Premium Product | Storytelling | Cinematic | Experimental>
Signature: <mechanic from moves.md §A> — <what it means for this product>
Signature scene: <5-line storyboard — what the visitor sees, in order>
Authored artifact: <what is being made — not selected, not generated>
Chrome: nav · menu · footer · cursor · selection · focus · scrollbar · entrance · 404
Material: subject · framing · light · treatment · integration · placements
Sourced: <piece · source · licence · what changed, or none>
Tiers: <full / reduced / lite — what each gets and what triggers it, or n/a> (immersive.md §4)
Floors overridden: <name + reason, or none>
```

**The authored artifact is required — and it has to be finished.** One thing on the page was
*made*: a modified letterform, a drawn mark, a custom icon set, an authored texture or shader. Not
picked from a bench, not routed to a generator. Name it here; the critic looks for it in the stills
**and as a bare file at 2×**. Unexplained marks, stroke weight or scale that varies across a set,
and structure a reader cannot follow are defects. Authoring something is the bar to enter, not the
bar to pass.

## Kill these — 2026 convergent tells

- near-black canvas + a single neon accent used as the whole identity
- an ambient radial "glow" blob blurred behind the hero
- eyebrow pill with a little status dot above every H1
- split hero: copy left, a floating faux-product or "terminal" card right
- mono font sprinkled on labels and timestamps as instant technical credibility
- default typefaces as identity: Inter/Geist for everything, Playfair as instant "editorial",
  Space Grotesk/Mono as "technical", Fontshare's Clash/Satoshi/General Sans as "free premium"
- default palette as identity: Tailwind/shadcn slate/zinc + `blue-600`/`indigo-500` raw, pure
  `#000`/`#fff` text, one neon accent as the whole colour story
- the "40 X. One Y." antithesis headline formula
- a stats trio (`40+ / 3 / 0`) as the first content section
- three identical rounded-border cards on `#0A0C10`

**Legacy tells:** purple/blue gradients, aurora blobs, glassmorphism · four-card feature grids
repeated section after section · centre-aligned everything with identical fade-up on every section ·
feature cards with meaningless icons, fake dashboards, fake charts · hero/features/pricing/FAQ with
no narrative arc.

**Three second-order traps.** The *inverse* of a default is also a default — warm-paper canvas plus
editorial serif is the predictable anti-move. The *literal reading* of the client's own concept is a
trap: a client who says "newspaper" wants what a newspaper *does*, not a newspaper. And **the tell
is the composition, not the contents** — filling a convergent layout with original material does not
make the layout original. An evenly-weighted four-up is the tell whether its cells hold stock icons
or drawings you made yourself.

**Tells are concepts, layouts, copy, and surfaces — never technique tiers.** WebGL, pinned scenes,
scrubbed sequences, and smooth scroll are the shared professional toolkit. "This technique serves no
argument here" is a reason to decline it; "this technique is common" is not.

## Copy

**Read `copy.md`.** The words are a designed system and they fail by defaulting, exactly like type
or colour. The hero must make a promise or name the offer — a mood line is legitimate only when
paired with an offer line a reader can check.

**Never fabricate** customers, metrics, integrations, certifications, awards, testimonials,
pricing, or logos. Absolute, and it outranks everything else. Mark placeholders visibly.

## Under a methodology skill

Steps 1–5 are decisions and run **once**, in the design conversation, with the human present. Only
step 6 fans out — and not all of it: **the signature scene is built and cleared serially, before
the fan-out.** A wrong signature parallelises into every section at once.

Write `DESIGN.md` to a file before the plan. Copy its world block and craft values into the plan's
global constraints verbatim. Hand each section agent the `DESIGN.md` path plus `craft.md`,
`worlds.md`, and `moves.md` — implementers read the spec, they do not re-enter at step 1. Verify
once, at the end, as its own task: motion density is a page-level property.

## Stack

Unless the repo says otherwise: Next.js App Router, TypeScript, Tailwind, Framer Motion (component
animation), GSAP + ScrollTrigger (scrubbed scroll), Lenis (smooth-scroll substrate), SVG/CSS/Canvas
for custom graphics, R3F only when real 3D earns it — on three's `WebGPURenderer` with TSL
(`immersive.md` §2) — shadcn/ui as structural foundation and never as the visible aesthetic.
Different stack in the repo: preserve it, translate the principles.

**Source of truth, in order:** existing brand/design system → product docs → methodology outputs →
user preference → inferred mode → this skill's defaults. Extend a weak brand rather than replacing
it.

## Files

- `canon.md` — 17 decomposed reference sites + 2 negative references. Read at step 3.
- `moves.md` — signature mechanics, composition, motion, chrome, delivery families. Read at step 4.
- `craft.md` — the eight systems, type, colour, the craft floor. Read at step 5, keep using.
- `worlds.md` — five complete copyable resolutions. Read at step 5.
- `copy.md` — the jobs, the measured reference lines, the craft floor. Read at step 5, keep using.
- `verify.md` — first-pixel check and the terminating loop. Read at steps 4 and 7.
- `three-d.md` — the 3D ladder, driving Blender and Spline, GLB to the web. Read when a comp
  reaches for 3D.
- `immersive.md` — the staged-world build: Blender-authored paths, capability tiers, grade, loader,
  sound, floors. Read when the signature scene is a world the visitor travels through.
- `sequence.md` — the filmed-world build: generated stills to films to tiered WebP frames, the
  frame loader, one timeline, shader transitions. Read when the signature is scrubbed footage.
- `sources.md` — what may be sourced, where from, and how it is brought in. Read at step 6.
