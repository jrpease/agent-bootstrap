# Craft

How a page is physically made: light, edges, states, easing, optics, type detail, space, entrance
— plus the two systems everything else reads from, **type** and **colour**.

Read at **Spec** (step 5) when filling `DESIGN.md`, and keep using it while you build.
`worlds.md` carries five complete resolutions of everything here. **Pick the nearest world, change
two named parameters, and record which two.** These systems tell you what each parameter *is* and
what sets its value, so the two you change are chosen rather than stumbled into.

## Calibration

Measured across `canon.md`'s nineteen entries. Use these as the working targets; the old floors
sat below template-grade work.

| Parameter | Canon range | Working target |
|---|---|---|
| Type scale contrast | 6.7×–35×, median 14× | **≥12×**; 20×+ when display type is the signature |
| Distinct type sizes | 1–19 | 8–14 |
| Section-move duration | 0.4–0.8s (to 1.2s) | 0.4–0.8s |
| Micro-interaction duration | 0.2–0.3s | 0.2–0.3s |
| Easing | `x2` between 0.25 and 0.36 | long-glide out; symmetric only for large moves |
| Accent share | one hue, scarce | ≤10% of painted area |

**`ease-in-out` and `transition-all` appear nowhere in the canon.** Both negative references use
them. Treat their presence in your output as a defect.

---

## 1 · Light & elevation

**Rule.** Elevation is never a single shadow. Minimum two layers — a tight contact shadow and a
wide ambient shadow — both tinted toward the surface hue rather than pure black, modelling one
light source used consistently sitewide.

**What sets it.** The direction's material world: how hard the light is, where it comes from, and
whether objects *sit* on the surface or *float* above it.

**Illustrative** — raking light from upper-left: contact `-1px 2px 3px hsl(24 30% 18% / 0.12)`,
ambient `-8px 32px 48px hsl(24 30% 18% / 0.10)`. Objects have weight and cast shade.

**On dark surfaces** shadows barely read. Elevation there comes from border luminosity — a raised
surface has a brighter top edge — not from a darker shadow. Stacking darker shadows on dark
backgrounds is the most common tell.

**The failure.** `shadow-lg` on every card: one layer, pure black, no light source, identical on
every project.

## 2 · Borders

**Rule.** A border is two layers — an outer edge separating the element from what is behind it,
plus an inner highlight where the light actually lands — and both colours derive from the surface
via alpha, never a fixed grey.

**What sets it.** Light direction from §1, and how much contrast the surface already has against
the canvas. Raking light and low surface contrast make the highlight primary; diffuse light and
high contrast let the outer edge carry it alone.

**Illustrative** — light from upper-left, so the lit edges are top and left: outer
`1px solid hsl(24 30% 18% / 0.14)` plus `inset 1px 1px 0 hsl(36 60% 96% / 0.45)`. A highlight on
all four sides is a bevel, not a light model.

**Radius is a family, not a number.** Nested corners are concentric — outer radius = inner radius
+ the gap. 2–4px reads drafted, a pill reads consumer; both are commitments, and `rounded-lg`
everywhere is the absence of one.

**The failure.** `border border-border` — one flat grey hairline, identical on all four sides,
unrelated to any light source, radius chosen by the framework.

## 3 · State choreography

**Rule.** Every interactive state — hover, focus-visible, active, disabled, loading — declares
which property changes, over what duration, on what curve, **and what deliberately does not
move**; in and out timings are asymmetric.

**What sets it.** The motion personality — crisp and instant versus weighted and settling — and
whether an element snaps or relaxes back when the pointer leaves.

**Illustrative** — hover raises border luminosity only, in 120ms, out 180ms; position never
changes, because a drawn object on a sheet does not lift. Active drops the border to full opacity
for 60ms. Focus-visible is a 2px offset ring with no transition at all — focus is a fact, not an
animation.

**What must never move.** Text baselines, icon positions relative to their labels, and the
element's footprint in layout. Disabled is a designed state (reduced contrast still passing 3:1 on
its boundary, plus `cursor-not-allowed`), not `opacity-50`. Loading holds the element's width.

**The failure.** `hover:bg-accent/90 transition-colors`: one property, one duration, symmetric in
and out, no pressed state, no distinct focus ring, disabled done with opacity.

## 4 · Easing

**Rule.** The site has a small named set of curves — entrance, exit, settle, authoritative —
defined once and referenced by name. Directly-manipulated elements get springs; informational
elements get tweens.

**Construct the curve; don't shop for it.** `cubic-bezier(x1, y1, x2, y2)` runs (0,0)→(1,1) past
two control points.

- **Overshoot is a constraint.** A curve can only overshoot if a `y` falls outside 0–1, so "no
  overshoot" is enforced by clamping both.
- **The tail is `x2`.** Pull it toward 0 and the element reaches its end value early and coasts
  out the duration — the long glide that reads calm. Push it toward 1 and it arrives late and
  stops abruptly.
- **Asymmetry is which end is steep.** Entrances decelerate, exits accelerate, which is why
  reversing an entrance curve does not give you its exit.
- **`linear` has no steep end at all.** It belongs to continuous processes — progress, marquee,
  scroll-scrubbed transforms — never to a state change.

**The canon confirms this rule.** Measured `x2` values in production: `0.32` (Locomotive,
Beaucoup., Truck'N Roll), `0.30` (Aspen Search), `0.36` (Pear), `0.68` (detroit.paris), `0.25`
(BotBlox). Large committed moves use symmetric curves — `0.75,0,0.25,1` · `0.87,0,0.13,1` ·
`0.7,0,0.3,1`. Overshoot appears once, deliberately: `0.34,1.56,0.64,1`.

**The failure.** `transition-all duration-300`: one curve, one duration, every property
everywhere — and `ease-in-out`, which is what "no curve was chosen" looks like.

## 5 · Optical correction

**Rule.** Alignment is optical, not mathematical. Where the eye and the number disagree, the eye
wins, and you move the pixel. **This one is constant** — every direction ships all of it.

| Correction | Why | Typical magnitude |
|---|---|---|
| Icon inside a button nudged off box-centre | Glyph bearings are uneven | 0.5–1px |
| Trailing glyph gets less padding than the leading side | An arrow reads as sitting further from the edge than it is | shave 2–4px |
| Circles oversized against squares | An equal-height circle reads smaller | 2–5% larger |
| Play triangles centred on visual mass | A triangle's weight sits toward its base | nudge right |
| Button padding measured from cap height, not the line box | Descender space is invisible | 1–2px up |
| Punctuation hung outside the measure at display sizes | An opening quote inside the margin reads as an indent | full glyph width |
| Icon stroke weight matched to the label's apparent weight | A 1.5px icon beside a 600 label looks broken | match, verify by eye |

**You have no eye — you have a screenshot.** Every "by eye" above is a procedure: render the
component, screenshot it at 2× or larger, and look. Invisible in code, obvious in a picture.

**The failure.** Every icon a pixel low, every arrow glued to the right edge. Individually
invisible; together, exactly why a page reads machine-assembled.

## 6 · Type detail

**Rule.** Tracking and leading are decided per element from the face's own metrics, never by
pasting the page-level scale into a component; and measure is capped inside components, not only
in body prose.

**What sets it.** Two properties of the chosen face. **Does it ship an optical-size axis?** If
yes, drive `opsz` to the rendered size and leave tracking near 0. If not, tracking carries it.
**How large is its x-height?** A large x-height wants the open end of the 1.5–1.7 body band; a
small one wants the tight end.

**Canon calibration.** Display tracking runs negative and hard: `−4%` (Aspen Search, 180px),
`−4px` (Truck'N Roll, 200px), `−2px` (BotBlox), `−1%` (e2.vc, 135px). Two entries set display
leading *below* the font size — Truck'N Roll at 140px on 200px, Serotoninn at 64px on 80px — so
lines interlock. That is a decision almost nobody makes, and it is available to you.

**Never optional.** `text-wrap: balance` on headlines and `pretty` on body; `font-variant-numeric:
tabular-nums` on counters, timers, prices, and animated stats.

**The failure.** `tracking-tight` on every heading regardless of face or size, a stat that shudders
while it animates, and a hero headline with one orphan word on line three.

## 7 · Space as ratio

**Rule.** Internal padding is a ratio of the element's own type size, not a global token pasted
in; and the gap between related items is meaningfully tighter than the gap between groups, so
proximity carries structure before any border does.

**What sets it.** The declared density.

**Illustrative** — button padding `0.75×` the label size vertically, `1.5×` horizontally: a 17px
label gives 13px / 26px. Proximity ladder 8 / 16 / 64px (label→heading, heading→body,
block→block), roughly 1:2:8 — legible grouping with no card borders at all.

**The ratio survives responsive; the absolute number does not.** Scale the base type size at
breakpoints and every derived padding follows. Hard-coded `p-4` at every width is why mobile looks
like a squeezed desktop.

**The failure.** `px-4 py-2` on a 14px button and a 20px button alike, `gap-4` between everything —
so a label, its heading, and the next section sit equally far apart and the page communicates no
grouping at all.

## 8 · Entrance motion

**Rule.** Elements enter from 8–16px of travel, staggered 40–60ms, and different content types
enter differently — a heading, a paragraph, an image, and a data row do not share one reveal.

**What sets it.** Motion personality plus the light model from §1: things that *sit* arrive at the
bottom of the band, things that *float* travel further and settle. Pick a point **inside** the
band; never pick the band.

**Fire once.** Reveals trigger on first intersection at ~20% visibility and never re-fire.
Re-animating on every pass is the clearest tell that motion was applied rather than designed.
Reduced-motion gets the composed final frame, not a removed feature.

**Scope.** These govern *entrances*. A scroll-scrubbed transform is a reversible camera move, not
an arrival, so the band does not apply and its stagger is timeline-relative. Travel sealed inside
a non-moving `overflow: hidden` frame is also exempt.

**The failure.** `animate-in fade-in slide-in-from-bottom-8` on every section wrapper: same
distance, same curve, everything arriving at once, replaying on every scroll-up.

---

## Type — the system

**Derive the voice, not the category.** Place the brand on five axes: **era**
(classical↔contemporary↔futuristic) · **warmth** (humanist↔neutral↔mechanical) · **formality**
(editorial↔plainspoken↔raw) · **energy** (quiet↔confident↔loud) · **authority**
(institutional↔friendly↔rebellious). Two companies in one industry can sit at opposite ends and
should get opposite type.

**Assign roles, not "a pairing."** *Display* carries the coordinate loudly — take the risk here.
*Body* should be near-invisible and effortless; optimise for reading, never personality.
*Functional* for labels, nav, tables. *Accent/mono* only when the register genuinely earns it.

**Pair by one deliberate contrast.** Two faces should share DNA (x-height, proportion, mood) and
differ on exactly one loud axis. Differ on three and they fight; on none and why pair.
*Superfamily or one variable font* — reach for this first; pairing by not pairing is often the
most premium. Then *classification contrast* (serif voice + sans body), or *era/structure contrast
within one class*. Mono as a true third voice only for a genuinely technical register, used
structurally — never sprinkled on timestamps for credibility.

**The bench — raw material, not a menu.** `(O)` open-source, `(C)` licensed.
*Neo-grotesque:* Hanken Grotesk (O), Schibsted Grotesk (O), Söhne (C), Aeonik (C), Suisse Intl (C).
*Humanist sans:* Public Sans (O), Libre Franklin (O), IBM Plex Sans (O), Untitled Sans (C).
*Geometric:* Onest (O), Roobert (C), Degular (C).
*Editorial serif:* Fraunces (O, variable + optical), Newsreader (O), Canela (C), GT Sectra (C), Flecha (C).
*Text serif:* Source Serif 4 (O), Spectral (O), Tiempos Text (C), Lyon Text (C).
*Mono:* JetBrains Mono (O), IBM Plex Mono (O), Commit Mono (O), GT America Mono (C).
*Condensed display:* National 2 Condensed (C), Thunder (C) — the canon's widest-scale entries both use one.

**Avoid as defaults:** Inter, Geist, Helvetica, Poppins, Circular, Gilroy, Playfair Display,
Space Grotesk/Mono, and Fontshare's Clash / Satoshi / General Sans / Cabinet Grotesk. In the canon,
the only two entries reaching for a default display face are the two weakest on every other measure.

**Craft floor.** Modular scale on an intentional ratio, few sizes reused. Measure: body 45–75ch,
display 20–40ch. Line-height inverse to size: ~1.5–1.7 body · 1.3 UI · 1.0–1.15 display (below 1.0
is available and used). Negative tracking on large display; 0 on body; slight positive on all-caps
and small labels; never track lowercase body. `clamp()` with a capped max. 2–3 weights per face,
matched in apparent colour. Self-host and subset; `font-display: swap`; preload the display face;
`size-adjust` on the fallback to kill layout shift. Cap at two families, three with a reason.

## Colour — the system

**Derive the temperature coordinate.** **Temperature** (warm↔neutral↔cool) · **saturation**
(muted↔vivid) · **value key** (light↔mid↔dark) · **chroma personality**
(earthy↔clean-digital↔jewel) · **era** (heritage↔contemporary↔futuristic).

**Build by role. A designed palette is mostly neutral.**
*Neutral ramp* — ~90% of the page, with a deliberate temperature: warm-neutral, cool-neutral, or a
hue-tinted neutral carrying a whisper of the brand hue through every grey. **Near-black and
near-white are tinted, never pure `#000`/`#fff`.**
*Surfaces and elevation* — background, raised, sunken, hairline — all drawn from the ramp.
*Accent* — one hue, maybe two. Rare and meaningful.
*Semantic* — tuned into the palette's temperature, never default browser red/green.

**Construct ramps perceptually.** Author in OKLCH so steps look evenly spaced. Let **hue torque**
drift across the ramp (warmer in shadow, cooler in highlight) rather than one frozen hue at
varying lightness. Peak **chroma in the mid-tones**, dropping at both ends — max chroma at the
extremes looks radioactive. Fixed steps, hand-tuned once, reused everywhere. House of Honey ships
`oklab()` in production.

**Contrast is a hard floor.** 4.5:1 body, 3:1 large text and UI boundaries. Never put text on the
raw accent unless it passes. Derive interaction states as consistent lightness/chroma deltas, not
ad hoc picks. Verify light and dark separately — ratios do not carry over.

**Spend scarcely.** Roughly 60/30/10: most of the page neutral, a secondary tone, the accent at
≤10%. The accent earns its place on the **one** thing that matters. Large fills use
tinted/desaturated colour; reserve full chroma for small areas. Canon accents, measured: mint
`rgb(161,255,203)` on white (Aspen Search) · electric blue `rgb(78,55,255)` (Truck'N Roll) ·
crimson `rgb(213,15,59)` on black (BotBlox) · cobalt `rgb(3,4,156)` (px push).

**Dark mode is not an inversion.** Tinted dark neutrals; reserve pure `#000` for genuine
true-black moments. **Reduce chroma** — saturated colour vibrates on dark. Elevate with
progressively *lighter* surfaces, not drop shadows. Re-check every pair.

**Avoid as defaults:** `#0A0C10` + one neon accent; Tailwind/shadcn slate/zinc + `blue-600` raw;
pure `#000` on `#fff`; the violet→pink→orange "AI gradient"; aurora or glow blobs as identity.

---

## The craft floor — mechanical, pass/fail

Verify as you build. Cheapest defects to catch, most embarrassing to ship.

- Every clickable element has `cursor-pointer` and a visible `:focus-visible`; the full state set
  is present — default, hover, focus, active, disabled, loading.
- `prefers-reduced-motion` honoured by every animation, as a real fallback path.
- Verified at 375 / 768 / 1024 / 1440; no horizontal overflow at any width; tap targets ≥44px.
- No emoji as UI icons — a real SVG icon set.
- Timing bands sane: 60–320ms micro-interactions; 0.4–1.2s section and cinematic transitions,
  never `linear` and never toy bounce.
- Images have explicit dimensions, a modern format, alt text, and lazy-load when offscreen.
