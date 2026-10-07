# Moves

The menu. Signature mechanics, composition, motion, and chrome — everything a page can *do*.

Read at **Comp** (step 4), before the spec is written. These are what the three comps differ on;
choosing them after the spec is locked means choosing them from what is left.

**Parameters come from your world.** `worlds.md` sets the easing family, duration scale, travel
distance, and clamp for everything here. A technique plus your world's parameters is a designed
system; a technique plus borrowed parameters is an effect. Clip-frame parallax in **Apparatus**
travels a short distance on a curve with no overshoot and is almost subliminal; the same technique
in **Atelier** travels further and settles visibly.

**Coherence is the constraint, not scarcity.** Six techniques on one curve read as a system. Two
techniques on two borrowed curves read as effects. A page whose one signature moment is surrounded
by static sections does not read restrained — it reads unfinished.

**Reading the tables.** `Cliché to avoid` names the borrowed *surface*, not the mechanic. The
mechanic is always fine. If your execution is recognisably the site you saw it on, you shipped the
surface.

---

## A · Signature mechanics

**One** signature, justified by meaning, or none. Everything in sections B–D is subordinate to it.

**The core move: decouple mechanic from surface.** Every admired interaction has three layers.
**Mechanic** — the behaviour (pointer proximity, scroll-as-scrubber, a held viewport). *Portable.*
**Surface** — what it looked like there: palette, shape language, easing personality, material.
*Never port this.* **Meaning** — why it fit that product. Convergence is copying the surface.

**Method.** (1) Choose the mechanic that dramatizes this product's real idea — if you cannot name
what it *means* here, it is decoration. (2) Name the site you are borrowing from, then delete every
incidental of it. (3) Re-skin entirely in your world's geometry, type, colour, and motion
personality — same mechanic, unrecognisable surface. (4) Justify against the concept, or cut it.
(5) Degrade honestly: reduced-motion, touch, and low-power each need a *designed* expression that
preserves the meaning.

| Mechanic | The behaviour | Can dramatize | Cliché to avoid |
|---|---|---|---|
| **Pointer field** | Elements react to cursor distance/velocity — attract, repel, distort, spotlight | precision, responsiveness | magnetic buttons + a trailing blob cursor |
| **Scroll-as-scrubber** | Scroll position *is* the timeline dial for one continuous transform | mechanism, cause→effect, construction | a product exploding into parts on a dark stage |
| **Held viewport** | The frame holds while content advances through states | traversal, sequence, before/after | a sticky horizontal gallery used as a default layout |
| **Persistent morph** | An element survives a route change and transforms instead of cutting | continuity, "same thing, new state" | a page-transition curtain that only adds latency |
| **Moving boundary reveal** | Content disclosed by a travelling edge or mask, not a fade | disclosure, focus | giant text with an image clipped inside it, meaning nothing |
| **Weighted input** | Response carries inertia and settles — the UI has mass | tactility, physicality | momentum scroll so heavy the page feels broken |
| **State-driven type** | Typography itself is the interaction surface | voice, editorial confidence | an oversized headline wobbling for no reason |
| **Ambient generative field** | A living background responds to input or time, subordinate to content | intelligence, "alive" | a WebGL blob field behind an otherwise static hero |
| **First-impression choreography** | The first frame withholds, then orchestrates a staged reveal | arrival, confidence | a loader that only delays content that was ready |

**One mechanic, two brands.** *Held viewport.* A watchmaker: the frame holds on one watch, scroll
floats its components apart into calm negative space, each labelled in a thin serif; slow and
weighted. *Meaning: every part considered.* A logistics API: the frame holds on a network map,
scroll advances one package through hops as mono state labels tick over; crisp and instant.
*Meaning: you can see every step.* Same mechanic, opposite surface, neither recognisable as the
other.

**Red flags.** A custom cursor carrying no meaning · magnetic hover on every button · horizontal
scroll because it is expected · a loader in front of ready content · kinetic type unrelated to the
words · more than one "signature" · the result is recognisably the site you borrowed from.

---

## B · Composition

### Edge — how an asset meets the page

Defaulting to the rectangle is the wireframe tell. Choose one per asset family, with a reason.

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **1 · Canvas-dissolve** — the edge feathered into the ground so image and page share one surface | The section has one stable ground colour and the imagery shares its palette; never photo-on-photo | The soft blur vignette that fades toward black regardless of the actual ground | `mask-image` gradient for box edges; for irregular silhouettes feather the alpha in the source, baked against the matched ground hex |
| **2 · Ground-plane cutout** — an object cut to silhouette, set on the page as if it were a tabletop | The subject has a clean silhouette and the light model has an angle for the shadow to obey | The e-commerce white-background PNG with a stock oval blur under it | Alpha PNG/WebP on the page ground; shadow *built* via `filter: drop-shadow()` tuned to the sitewide light angle |
| **3 · Geometry mask** — the layout's own shapes crop the image | The direction already has a shape vocabulary for the mask to quote | The amorphous generator blob, interchangeable across any site | `clip-path: path()` or `mask-image` from a hand-authored SVG; `object-fit: cover` inside |
| **4 · Morphing mask** — the boundary reshapes in reply to pointer or scroll | There is a genuine interaction to attach it to and the personality is organic | The ownerless lava-lamp blob driven by nothing | SVG path variants of matching point count interpolated from pointer or scroll progress |
| **5 · Aperture reveal** — a hidden image uncovered through animated mask geometry | The image is large enough that a cut or fade would be abrupt | The circular vignette wipe as a generic loader | SVG `<mask>` (not `clip-path` — mask supports soft edges) scrubbed; overlap adjacent shapes ~0.05 units against seams |
| **6 · Type-occluded imagery** — type and image interleaved in real depth order | The image has genuine negative space and the moment recurs as a system | The one-off `background-clip: text` flourish that echoes nowhere | `background-clip: text`; or a foreground alpha cutout z-stacked over the text layer |

*Craft:* **2** — one light source sitewide. A page of cutouts whose shadows disagree reads as a
sticker sheet; the shadow, not the cutout, sells the object as present. **6** — the wrapper keeps
the real string for assistive technology.

### Surface — the image as the page's material

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **7 · Pattern-as-texture blend** — imagery desaturated into the ground so it reads as fabric | A section needs ambient depth with no image worth looking at directly | The grainy-noise-plus-soft-gradient SaaS wallpaper | `background-blend-mode` against a solid; desaturate and flatten the source pre-blend |
| **8 · Palette-derived ground** — each section's ground sampled from the asset it carries | Discrete image objects cycle through sections, each with a real dominant colour | The hero with a blurred oversaturated copy of itself glowing behind it | Build-time dominant-colour extraction per asset, bound to the section ground |
| **9 · Tonal grade matched to the page** — one grading pass across all photography | The palette is controlled and there is enough photography for a grade to read as intent | The uniform Instagram duotone slapped over stock to fake cohesion | A pipeline-level grade spec applied at the asset stage — art direction, not a live CSS filter |

### Scene — what the composition argues

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **10 · Scene, not specimen** — the subject staged in an environment that argues the point | The differentiation is experiential and there is a real thesis for the set to embody | The beige-travertine tablescape — product centred, one sprig of eucalyptus | Write the *thesis sentence* before any prop list; compose a real foreground/mid/ground read |
| **11 · Diegetic canvas** — the page treated as a physical surface holding real objects | The content is collected or process-based and the page can hold the conceit consistently | One corkboard texture behind an ordinary flex grid — the surface without the physics | One light model for every object; per-item rotation jitter; believable z-order; cutouts (2) populate it |
| **12 · Mixed-fidelity collage** — photo, drawn marks, 3D, and scans at visibly different fidelities | The clash maps to something true about how the thing is made | The washi-tape-and-Polaroid sticker kit at uniform digital fidelity | No unifying filter pass — the clash is the point; each element gets its own shadow and rotation |
| **13 · Meaningful disorder** — one deliberate violation of scale, gravity, or arrangement | There is a thesis that benefits from being shown, and the voice tolerates theatricality | The generic surreal-3D hero — chrome sphere, melting object, gradient sky | Compose the *correct* scene first, then invert exactly one relationship; keep light physically consistent |
| **14 · Deadpan absurdity** — an absurd premise executed straight, zero wink | The thesis survives literal rendering and the audience reads deadpan as intent | "Quirky startup" whimsy — a mascot, a pun, playfulness instead of an argument | Name the uncomfortable idea in the spec first; stage it with real production values, no cartoon logic |

*See `canon.md` #57 (pear.no) for **14** executed properly.*

### Type and structure

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **15 · Type as scene object** — display type placed and lit as a physical thing | A staged or diegetic composition already exists for it to inhabit | Inflated chrome "3D text" floating in an unrelated gradient void | The type's shadow angle and occlusion obey the scene's light and depth order exactly |
| **16 · Annotation as design object** — captions and labels as their own graphic system | The content has details genuinely worth pointing at | Faux-handwritten script in a corner annotating nothing | Each annotation anchored to a coordinate (SVG leader line); a third type role distinct from display and body |
| **17 · Grid-break with intent** — one or two elements escape a grid the rest of the page keeps | The grid is disciplined enough elsewhere for the break to register | The "chaotic" layout where nothing aligns, so there is no rule to break | Build the full grid first; displace only the chosen element in multiples of the gutter |

*Craft:* **17** is the cheapest route to a composition signature visible in a still, and the first
to decay into noise when the count creeps. It must survive 375px or be re-decided there.

---

## C · Motion

### Scroll-linked

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **18 · Clip-frame parallax** — an image is a window, not a rectangle | Almost any image large enough that a static crop reads flat. The highest-value technique here | Full-bleed stock sliding at half speed behind centred white text | Transform the inner image inside an `overflow: hidden` frame, scrubbed on the Lenis substrate. Overscale the inner image by at least the travel |
| **19 · Scroll-velocity skew** — the page has weight and resists being thrown | The personality is weighted, and there is a column of cards or images to carry it | The whole viewport shearing so body text is unreadable mid-scroll | Lenis velocity → clamped `skewY`. **Tune against a real touch fling first** — a fling exceeds any wheel velocity |
| **20 · Sticky scrub sequence** — a process that genuinely has steps | The content is sequential and would otherwise ship as a numbered list | Dark stage, one product exploding into parts | ScrollTrigger pin + scrubbed timeline. Mobile gets the unpinned vertical stack |
| **21 · Layered depth parallax** — spatial depth inside one composition | The section is a composed scene with real foreground, subject, and ground | Three blurred blobs drifting at three speeds behind a hero | Per-layer transform with differing scalars |
| **22 · Progressive line-mask text reveal** — the words arrive as the reader reaches them | *One* manifesto passage the page wants read slowly | Every paragraph fading up line by line, turning the site into a slideshow | Line-split + per-line clip, scrubbed. The accessible text must survive the split |
| **23 · Scroll-driven SVG path draw** — a route being traced | A diagram whose drawing *order* is the explanation | A squiggly connector drawing itself between three unconnected cards | `stroke-dasharray` / `stroke-dashoffset` scrubbed |
| **24 · Horizontal pinned traversal** — traversal through an ordered set | The content is truly a sequence — a timeline, an archive, a route | A sticky horizontal gallery as the default layout for peer features | ScrollTrigger pin + x-translate. Mobile: native scroll-snap row |
| **25 · Sticky stacked cards** — each item stays present while the next arrives | The items build on one another as steps of an argument | Four unrelated cards stacking because the template stacked them | `position: sticky` with incremented offsets, plus scale or dim behind |
| **26 · Counter roll on enter** — quantity as an event | The number is real, load-bearing proof, and there are few enough that each lands | The `40+ / 3 / 0` stat trio as the first content section | In-view trigger driving a value, with `tabular-nums` |
| **27 · Section-boundary theme inversion** — a change of register | The story arc actually turns at that boundary | Alternating light and dark bands with nothing changing in the argument | Custom-property swap on intersection, or a fixed header in `mix-blend-mode: difference` |

### Pointer-linked

Pointer proximity does not exist on touch — each needs a *designed* touch expression. If the
signature is already a pointer mechanic, do not run three of these underneath it.

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **28 · Constrained magnetic attraction** | Exactly one target deserves it, and displacement is capped inside the element's own padding so the hit area never lies | Magnetic hover on every button plus a trailing blob cursor | Pointer delta → clamped spring transform |
| **29 · Cursor-proximity spotlight** | A dense or dark surface where revealing detail on approach adds real information | The template border-glow on a grid of three identical cards | Pointer coords → CSS custom properties, rAF-throttled, driving a radial mask |
| **30 · Perspective tilt on hover** | The object is genuinely card-like and the world has a real light source | The glassy 3D tile tilting 15° with a diagonal shine sweeping across | `perspective` + rotateX/Y from pointer offset, spring-damped. Keep rotation small enough that type never fringes |
| **31 · Image hover: scale-inside-clip with tonal shift** | Any index or grid of images. The cheapest large upgrade here | Grayscale-to-colour on every logo and team photo | Transform + filter on the inner image inside a fixed clip; in/out asymmetric. The frame's footprint never changes |

### Transition

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **32 · Shared-element morph (FLIP)** | A card-to-detail relationship where the element genuinely persists | A hero morph between routes that share nothing | Framer `layoutId`, GSAP Flip, or View Transitions |
| **33 · Mask-expand from origin** | An overlay launched from one specific control | The circular-reveal fullscreen menu on a site with four links | `clip-path` circle expanding from the trigger's coordinates |
| **34 · Curtain/wipe route transition** | The incoming route needs a beat to load anyway and the wipe conceals real work | The curtain that only adds latency to ready content | Exit/enter via AnimatePresence. **Budget = what the route genuinely costs, not a millisecond more** |

### Ambient

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **35 · Inertial marquee answering scroll direction** | There is a genuine set worth reading in passing | The endless logo cloud, especially of customers who do not exist | Ticker loop offset by Lenis velocity and direction |
| **36 · Static grain overlay** | Large flat colour fields that would otherwise band, in a world with a physical material | Heavy film grain over a dark neon hero as instant "cinematic" | **One pre-baked tiled texture**, fixed, `pointer-events: none`. Never regenerate per frame. Re-check contrast composited |
| **37 · Continuous subtle drift** | An otherwise static hero must hold a long first look | Every element bobbing on the same sine wave | Long-period keyframes on transform, different period per element. If a visitor can track it, it is too fast |

### Typographic

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **38 · Variable-font axis mapped to scroll or pointer** | The face actually ships the axis and one display moment carries it alone | The weight-morphing headline wobbling with no relation to the words | `font-variation-settings` — **not composited**; scope to few glyphs and lock the line box |
| **39 · Per-character stagger on display type** | One short display line — a title, never a paragraph | Every heading letter-bouncing into place | Character split + stagger. The wrapper keeps the real string; lines, not words, for running text |

### How much motion — the density target

Pick the profile in `DESIGN.md`; the critic reports `counted / target` against it. **Floors to
reach, not ceilings to justify.** Being under target is the common failure; being over it with one
technique repeated is the other.

| Motion profile | Desktop | Mobile |
|---|---|---|
| Minimal | 4–7 | 3–5 |
| Premium Product | 10–16 | 7–11 |
| Storytelling | 14–20 | 9–13 |
| Cinematic | 18–25 | 11–16 |
| Experimental | 20+ | 12+ |

**Counting.** A moment is one technique, in one place, for one purpose. No technique counts more
than twice. A component's own hover/press/focus styling and per-element entrance reveals are craft
floor, never moments. At least two of the mobile total must come from the mobile-native group below
— not whichever desktop moments happened to survive the breakpoint.

### Mobile-native

A phone is not a narrow desktop. Everything above degrades *downward*; this is what mobile has
*instead*. **At least two moments must come from this group.**

| Technique | Earns its place when | Cliché to avoid | Build |
|---|---|---|---|
| **40 · Touch-drag with rubber-band** | Any horizontally draggable set — resistance past the end is how a native surface answers a finger | A heavyweight JS carousel worse than the CSS scroll-snap row it replaced | Native `overscroll-behavior` first; authored drag with elasticity only when needed |
| **41 · Fling-to-snap** | The items are discrete with a natural resting position | A slider that ignores velocity, so a hard flick and a nudge do the same thing | `scroll-snap-type` first; velocity projection only when detents exceed CSS |
| **42 · Sheet physics** | Any mobile overlay — filters, detail, navigation | The centred desktop modal with a close X, shown unchanged on a phone | Drag on y with a spring, detents, backdrop coupled to position. **Still owes dialog semantics**: focus management, Escape, hardware back |
| **43 · Edge-to-edge full-bleed reveal** | A hero or chapter break where the media *is* the argument | The desktop hero letterboxed in side gutters with type merely shrunk | Full-bleed media respecting `env(safe-area-inset-*)`. Expect fewer, larger moments — not the same ones narrower |

---

## D · Chrome

The parts every page has and most pages default. On the sites in `canon.md` these are frequently
the best moments — the menu especially. **Each gets a line in `DESIGN.md`.**

| Element | The decision | Canon evidence | Cliché to avoid |
|---|---|---|---|
| **Nav** | Pinned, or does it scroll away like content? | **7 of 17 keepers use `position: static`** — the header leaves. Both negative references pin it | The fixed translucent bar with a backdrop blur, on every page ever |
| **Menu** | A full-screen composition with its own type scale, or a dropdown? | Full-takeover is standard at this tier; treat it as a designed frame, not a list | The circular-reveal overlay on a site with four links |
| **Footer** | A set piece — oversized wordmark, the real contact, the colophon | Where studios show off; often the largest type on the page | Four columns of links and a copyright line |
| **Cursor** | Custom **only** with meaning; otherwise leave it | Used sparingly; most keepers do not | A trailing blob that follows the pointer and says nothing |
| **Selection** | `::selection` in the accent or its inverse | Free, and its absence is felt | Default browser blue against a designed palette |
| **Focus ring** | A designed object — offset, colour, and whether it transitions | `craft.md` §3: focus is a fact, not an animation | `outline: none`, or the default ring on a dark ground |
| **Scrollbar** | Styled to the palette, or deliberately native | **9 of 17 ship a custom `::-webkit-scrollbar`** | A skinny grey bar on a warm-paper page |
| **Entrance** | What the first frame withholds and how it resolves — **and that it plays once per session**. On a repeat visit it is shortened or skipped and the page opens composed; a returning visitor is not a new one | The first-impression mechanic in §A | A loader in front of content that was ready · a withholding entrance replayed on every reload |
| **404 / empty** | Designed, in-world | Cheap to do, always noticed | The framework default |

---

## E · Delivery families — capability before cost

Chosen at **Comp** (step 4), while the direction is still negotiable. Decided later, the family
gets fitted to a locked direction and the only remaining moves are to ship a fake or quietly
rescope the scene.

**The capability rule runs before any cost comparison.** If the signature is a **transformation**
— an assembly, a morph, one thing becoming another — only a family where **the pieces and the
whole share geometry** qualifies. A cutout translation plus a cross-fade to a different final
image is not an assembly; it is a cross-dissolve in an assembly costume. Cost chooses among
qualifying families only, and never declines the only qualifying family — scale fidelity *within*
it instead: fewer fragments, lower resolution, shorter sequence.

| Family | How | Best when | Cannot deliver | Cost |
|---|---|---|---|---|
| **Pre-rendered sequence** | Render the move in Blender → 60–120 WebP/AVIF frames → scrub the frame index onto a `<canvas>` | The camera path is fixed and cinematic fidelity matters more than interactivity | Response to anything but scroll — no pointer, no dynamic light | Heaviest download; but the visual is *exactly* your render |
| **Real-time WebGL** | Ship a glTF, animate live | It must react to more than scroll, or you want lighter bytes | Film-grade fidelity on a phone GPU | Most engineering; a convincing morph is the hard part |
| **CSS / Canvas 2D** | DOM transforms, clip-paths, SVG masks, or a 2D draw loop | The move is 2.5D — planes, masks, parallax, line work | **Any transformation.** Flat pieces can translate, but never *become* a whole they don't already tile | Cheapest by far; the ceiling is flatness |

Many famous "scroll-3D" moments are the *sequence* family, not real-time. Don't assume WebGL. Among
qualifying families this is a cost decision, not a prestige ladder — the cheap-but-right row is on
the menu so choosing it is a decision rather than a retreat.

**The fidelity ladder — where AI stops and a designer starts.** The interaction code is doable at
every rung; the threshold is entirely the *asset*.
**Rung 1** — stylized/geometric from primitives: no asset, no designer, premium if art-directed.
**Rung 2** — realistic from a marketplace or CAD model: mostly scriptable, splitting fused meshes
is fiddly. **Rung 3** — photoreal, brand-accurate hero: bring a 3D designer.
*Threshold: photorealism plus brand-specific material accuracy.* The line sits higher for
transform-only effects (explode, orbit) than for morphs. Text-to-3D is worst at precise mechanical
objects — use primitives or a bought model, never generative, for those.

**Prototype the interaction on a placeholder, confirm it earns its place, then commission the hero
asset.** The code does not change.

**Making the asset:** `three-d.md` — which rung, Blender or Spline, how an agent drives each, and the
GLB pipeline. **A scene the visitor travels through:** `immersive.md` — authored camera paths,
capability tiers, the lite route. **A filmed world scrubbed by scroll:** `sequence.md` — the
pre-rendered sequence family built as a whole page, from generated stills to the frame loader.

---

## F · Performance budget

- Animate **composited properties only** — `transform` and `opacity`. Anything triggering layout will jank.
- `prefers-reduced-motion` is not optional. A real fallback path, never a removed feature.
- One RAF loop across Lenis and GSAP. Never run both tickers independently — that is jitter and drift.
- Lazy-load 3D, video, and heavy canvas. Never block first paint on motion machinery.
- Cap pixel ratio, blur radius, shadow layers, particle counts. `frameloop="demand"` for static scenes.
- Kill triggers and contexts, dispose GPU resources, on unmount.
- **A missed budget is a defect in the execution, not a verdict on the ambition.** Order: profile
  it → fix the execution → change the delivery family → *only then* reduce scope, recording what
  was cut and what forced it. Ambition loses last, and never silently.

## Deliberately excluded

- **Gyro / device-orientation parallax** — follows an input without meaning anything, and carries vestibular risk.
- **Haptics** — the Vibration API is unsupported on iOS Safari, so the moment exists for part of the audience only.
- **The decorative gradient blob** — a generator shape doing wallpaper duty; the most mass-produced surface of the decade.
- **The isometric "SaaS room" illustration** — signals "tech company" generically and argues nothing.
- **The legibility scrim** — functional necessity, near universal, differentiates nothing. It lives inside technique 9.
- **Duotone as its own entry** — the 2016 filter surface. Its honest intent is technique 9, achieved as lighting.
