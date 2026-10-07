# Canon

The positive definition. The tell lists say what to avoid; this says what to hit.

Read at **Target** (step 3): name 2–3 entries this page must stand next to, and what each does
that a default would not. The terminating critic ranks the shipped page against those entries.

Sourced by `reference/canon/` from eight Awwwards category archives, decomposed by loading each
page at 1440×900 and measuring it. Captured 2026-08-18. Every number below is measured, not
recalled. Entries record **moves, not URLs** — a redesign does not void the knowledge.

**Entry 58 was hand-picked, not swept** (2026-09-04, from Muzli). Same 1440×900 decomposition, so
its numbers are comparable; it simply did not come through `sweep.py`. Hand-picked additions are
fine — say so in the entry's provenance, and measure at the same viewport or the numbers mean
nothing.

**What these entries are and are not.** Each was read from five scroll-depth frames plus a DOM
measurement pass. Composition, type, colour, and material are observed. Technique is measured.
**Motion choreography was not watched** — where an entry implies scroll behaviour, it is inferred
from sticky counts, library presence, and clip/mask usage, and is marked *inferred*.

**Entry 58 has a fold frame only.** It stacks its sections and scrubs a GSAP timeline, so nothing
seeks it — not `window.scrollTo`, not its scroll library, not real wheel events. (Clicking the
page and then pressing PageDown does advance it — found 2026-09-30, after this entry was written.)
`capture.mjs` now detects exactly this and refuses to write a duplicate fold in place of a
mid frame (see `reference/canon/README.md`). Entry 58's composition below the fold is read from the
DOM — section heights and text — not from pixels. Treat its mid-page observations as weaker
evidence than the others'.

---

## The measured signature

This is the part that changes how you build. Five numbers, taken across all 19 entries.

**1. Type scale contrast runs 6.7×–35×. The median is 14×.**
`SKILL.md`'s positive floor asks for **4×**. Every entry in this canon clears it by three to nine
times over. The floor is not a target and was never near one.

| | ratio | | ratio |
|---|---|---|---|
| Truck'N Roll | **35×** | Serotoninn | 14.8× |
| House of Honey | **34.7×** | Pear | 14.6× |
| detroit.paris | 19.2× | e2.vc | 12.3× |
| px push | 16× | Beaucoup. | 10× |
| Aspen Search | 15.1× | L.I.S.A. / locomotive.ca | 7.7× |

**The floor is below slop.** `rocket-saas.io` — purple gradient, rocket illustration, stock
meeting photo, the template case — measures **6×**. A page can be pure template and still clear
this skill's type floor by 50%. Raise it: **12× is the working number**, 20×+ where display type
is the signature.

**2. The easing signature is a long glide — `x2` pulled toward zero.**
Measured curves in use across the canon:

```
cubic-bezier(0.23, 1, 0.32, 1)     Locomotive, Beaucoup., Truck'N Roll
cubic-bezier(0.215, 0.61, 0.355, 1) Locomotive, L.I.S.A., Louis Paquet
cubic-bezier(0.16, 1, 0.3, 1)      Aspen Search
cubic-bezier(0.22, 1, 0.36, 1)     Pear
cubic-bezier(0.33, 1, 0.68, 1)     detroit.paris
cubic-bezier(0.25, 1, 0.5, 1)      BotBlox
— symmetric, for large committed moves —
cubic-bezier(0.75, 0, 0.25, 1)     Serotoninn
cubic-bezier(0.87, 0, 0.13, 1)     Aspen Search
cubic-bezier(0.7, 0, 0.3, 1)       e2.vc
— overshoot, used once and deliberately —
cubic-bezier(0.34, 1.56, 0.64, 1)  Aspen Search
```

`craft.md`'s rule — *the tail is `x2`; pull it toward 0 and the element coasts out* — is confirmed
by every entry. **Both negative references use `ease-in-out`**, which is what no curve chosen
looks like. So does the weakest keeper.

**3. Durations: 0.4–0.8s for section moves, 0.2–0.3s for micro-interactions.**
Serotoninn runs to 1.2s on its largest move. Nothing in the canon animates a state change at
`0.3s ease-in-out`, which is the framework default and the thing to stop shipping.

**4. Display type is licensed and specific. Almost none of it is a system font.**
Measured display faces: National 2 Condensed, Thunder, PP Neue Montreal, Suisse Intl, Neue Haas
Grotesk, Neue Haas Unica, Flecha, GT Standard, Mangogrotesque, SemiSqueezed, Cirka, Noe Text,
Canora, Articulat CF, Inter Tight.
The two entries that reach for a default — **Inter** (Louis Paquet) and **Space Grotesk**
(BotBlox, a named tell) — are also the two weakest on every other measure. That is not a
coincidence worth arguing with.

**5. Chrome is designed, and often *not* pinned.**
Seven of seventeen keepers use `position: static` or `relative` navigation — the header scrolls
away like content. Nine ship a custom `::-webkit-scrollbar`. `mix-blend-mode: difference` appears
on six. Both negative references use a fixed nav, no custom scrollbar, and no blend mode. The
convergent default is a pinned header; the canon frequently refuses it.

---

## Tier A

### 00 · Locomotive — locomotive.ca — Locomotive — studio
**What it is:** A studio index whose masthead is a distressed variable typeface.
**Moves:** display type as *material* — glyphs eroded and reassembled rather than set; a
bespoke face (`LocomotiveNew`) beside a workhorse (`HelveticaNowDisplay`); `mix-blend-mode:
difference` for type over imagery; 28 grid contexts and a custom scrollbar.
**Measured:** 15–115px (7.7×) · easing `0.23,1,0.32,1` · nav `static` · 2 canvas.
**Why it wins:** the identity is drawn, not chosen.
**Cost to beat:** you must make a typeface behave, not pick one.
*Re-shot 2026-09-30: the 45% frame is a big serif statement over studio video — the page holds.*

### 09 · Beaucoup. — beaucoup.studio — Beaucoup. — studio
**What it is:** Work index held inside a perforated frame that *is* the layout.
**Moves:** a rounded-square perforation grid as page chrome; warm off-white ground
`rgb(255,250,245)` against pure black; PP Neue Montreal paired with Cirka; 13 inline SVG systems.
**Measured:** 12–120px (10×) · easing `0.23,1,0.32,1` at 0.4s · custom scrollbar.
**Why it wins:** the border does the work most pages give to a card.
**Cost to beat:** a structural device that recurs, not a decoration that appears once.

### 11 · Louis Paquet — louispaquet.com — Louis Paquet — studio *(narrow reference)*
**What it is:** A creative director's index at **one single type size**.
**Moves:** 18px Inter, weight 650, for every element on the page — hierarchy carried entirely by
position, rule, and space; 66 inline SVGs; no scroll library.
**Measured:** 18–18px (**1×**, 1 distinct size).
**Why it wins:** proof that size contrast is one lever among several, not the only one.
**Cost to beat:** ruthless spatial discipline, because nothing else is holding it up.
**Use narrowly.** This is the reference for *pure index* and *no material* only. It is not a
craft exemplar and it fails the type-contrast dimension by construction.

### 36 · noth.in — Thomas Carré — editorial
**What it is:** Near-empty black with a single chrome morphing object.
**Moves:** one subject per screen and nothing else; PP Neue Montreal with IBM Plex Mono as a
genuine third voice; `mix-blend-mode: difference`; 10 clip-paths; fixed nav over a held void.
**Measured:** 10.8–72px (6.7×) · 12.9 viewports tall · GSAP + Lenis.
**Why it wins:** it holds emptiness long enough to become a subject.
**Cost to beat:** nerve. The ink-per-screen floor forbids this; the floor is wrong here, which is
what an override with a reason is for.
*Re-shot 2026-09-30: the body is white in the DOM, but what renders is black. Below the fold it
keeps one subject per screen — a full-bleed video, a lone work tile — and closes on an SVG
wordmark, which is why the measured range stops at 72px.*

### 38 · House of Honey — houseofhoney.com — Edoardo Lunardi — editorial
**What it is:** Interiors studio as a magazine masthead over a room grid.
**Moves:** a **536px** display line — the largest measured in the canon; three faces by role
(neueHaasGrotesk / noeText / canora); a warm-dark palette of clay `rgb(51,25,23)` and blush
`rgb(237,204,190)` on near-black `rgb(14,14,14)`; `oklab()` colour in production; sticky nav.
**Measured:** 15.5–536.9px (**34.7×**) · easing `0.65,0.05,0.36,1` at 0.4–0.65s.
**Why it wins:** the masthead is a real masthead, at print scale.
**Cost to beat:** commit a headline to half the viewport and let the photography be quiet.

### 46 · detroit.paris — Thomas Carré — editorial *(Lenis virtual scroll)*
**What it is:** AI production house; condensed black type against a rising image grid.
**Moves:** 207px `Mangogrotesque` uppercase set hard to the left edge; a deliberately empty
top-right quadrant; a staggered image grid entering from the bottom edge at varied heights;
`mix-blend-mode: difference`; 37 inline SVGs; fixed nav.
**Measured:** 10.8–207px (19.2×) · easing `0.33,1,0.68,1` at 0.6s · GSAP + Lenis.
**Why it wins:** the void is composed, not left over.
**Cost to beat:** asymmetry you can defend — one loaded corner, one empty one.
*Note: `capture.mjs` cannot seek it — click the page, then PageDown. Re-shot 2026-09-30: below
the fold the image grid becomes a dense photographic masonry and the page closes on an oversized
serif wordmark. It does not go slack.*

### 42 · Truck'N Roll — trucknroll.com — Locomotive — editorial
**What it is:** Tour logistics, sold as a rock poster.
**Moves:** **420px** National 2 Condensed at weight 900, tracking **−4px**, leading *tighter than
the size* (140px on 200px) so lines interlock; documentary photography beneath; electric blue
`rgb(78,55,255)` as the only accent; `mix-blend-mode: darken`; **36 clip-paths** and 36 grids.
**Measured:** 12–420px (**35×**, the canon's widest) · easing `0.165,0.84,0.44,1`.
**Why it wins:** negative leading on a 400px headline is a decision almost nobody makes.
**Cost to beat:** a display face that survives being set enormous, and copy short enough to earn it.

### 26 · Serotoninn — serotoninn.com — BL/S® — commerce
**What it is:** Fashion commerce split by a torn vertical seam.
**Moves:** `Thunder` at 80px uppercase with leading *below* size (64px); PP Fraktion Mono as the
structural third voice; **18 distinct type sizes** — the most granular scale measured;
`mix-blend-mode: difference` **and** `exclusion`; 9 mask-images; 20 sticky contexts.
**Measured:** 8–118px (14.8×) · easing `0.75,0,0.25,1`, durations to **1.2s**.
**Why it wins:** the seam is a real edge treatment, not a divider.
**Cost to beat:** an image division that means something about the product.

### 27 · Cecilie Bahnsen — ceciliebahnsen.com — Signifly — commerce *(material reference)*
**What it is:** Restrained fashion commerce where photography carries everything.
**Moves:** 20px Neue Haas Unica with +0.6px tracking as the *only* type voice; 26 sticky contexts
driving a quiet product sequence; 34 grids; garments photographed in landscape, at distance.
**Measured:** 8.4–25px (3×) · easing `0.4,0,0.2,1` at 0.3s.
**Why it wins:** it trusts the image and refuses to shout over it.
**Cost to beat:** photography good enough to carry a page alone.
**Use narrowly** — a material and restraint reference, not a type or motion one.

### 34 · meech213 — meech213.com — The Blackpepper Studio — commerce *(material reference)*
**What it is:** Scattered photographic prints on a cream ground.
**Moves:** alpha-cutout prints with per-item rotation jitter, overlapping in believable z-order —
the ground-plane cutout done properly; `rgb(245,244,241)` ground; Articulat CF with Ceraph Roman.
**Measured:** 13.6–32px (2.4×) · GSAP + Lenis · `mix-blend-mode: difference`.
**Why it wins:** objects with weight on a surface, not images in boxes.
**Cost to beat:** shadows that agree with one light source.
**Use narrowly** — composition and material only; its type is thin and its easings are `ease`.

### 18 · Aspen Search — aspensearch.com — Edoardo Lunardi — B2B
**What it is:** Executive search as a Swiss editorial system. **The B2B exemplar.**
**Moves:** 180px suisseIntl at weight 450 with **−4% tracking** and leading equal to size;
halftone imagery inside a hard modular grid; mint `rgb(161,255,203)` as a single scarce accent on
white; **49 grid contexts, 29 sticky, 16 clip-paths, 5 canvas**; suisseIntlMono as the second
voice.
**Measured:** 12–180.7px (15.1×, 13 distinct) · easings `0.16,1,0.3,1`, `0.87,0,0.13,1`, and one
deliberate overshoot `0.34,1.56,0.64,1` · Lenis.
**Why it wins:** B2B with no dashboard, no gradient, no glow — and it still reads as software.
**Cost to beat:** a real grid and the discipline to keep the accent scarce.

### 17 · px push — pxpush.com — Lewis Webber — B2B
**What it is:** Design subscription, sold as a chrome logotype in a sky.
**Moves:** 172.8px `SemiSqueezed` over photographic cloud; deep cobalt `rgb(3,4,156)` as the
dominant painted colour on near-black; **152 3D transforms** and 3 canvas — real dimensional work;
22 sticky contexts; `mix-blend-mode: difference`; fixed nav.
**Measured:** 10.8–172.8px (16×) · GSAP + Lenis.
**Why it wins:** B2B with wit, and a hero object rendered rather than illustrated.
**Cost to beat:** one made object, lit and placed.

### 16 · L.I.S.A. — lisa.locomotive.ca — Locomotive — B2B
**What it is:** A studio's AI assistant rendered as a CRT terminal character.
**Moves:** the product *is* an object with a body, not a screenshot; near-total black ground;
canvas-driven; the house faces carried over from locomotive.ca.
**Measured:** 15–115.2px (7.7×) · easing `0.215,0.61,0.355,1` · GSAP · virtual scroll.
**Why it wins:** it gives software a physical character instead of a UI panel.
**Cost to beat:** decide what your product would be if it were a thing.

### 22 · BotBlox — botblox.com — Junca Studio — B2B *(weakest keeper)*
**What it is:** Networking hardware against satellite and orbital imagery.
**Moves:** real hardware photography, not renders; crimson `rgb(213,15,59)` accent on black;
`mix-blend-mode: difference` and `overlay`; 34 inline SVGs.
**Measured:** 12–65px (5.4×) · easing `0.25,1,0.5,1` · **Space Grotesk** display.
**Why it wins:** technical dark done with real subject matter.
**Cost to beat:** low. Included as the honest bottom of the B2B band — it uses a named tell face
and the narrowest scale of any keeper. Aim above it, not at it.

### 58 · Heron AI — heronaiapp.com — Bearplus — B2B *(art-direction reference)*
**What it is:** A building-code compliance agent for architects, staged as an architect's own
drawing sheet.
**Moves:** **the product's output is the decorative system** — real code citations (`IBC 1015.3
GUARDRAIL REQUIRED`, `IBC 1011.11 HANDRAILS REQUIRED`, `ICC A117.1 §604.3.1`) set in mono as
sheet marginalia, with the single accent `rgb(250,54,0)` reserved for the violation flag and used
for nothing else; drafting chrome of ruled tick margins and corner registration crosses; a bespoke
stippled elevation as the hero, made **draggable so the demo is the illustration** — "click and
drag to see violations", with a live X/Y readout; one 9,023px pinned map sequence carrying **73%
of the page's scroll**; BT Grotesk against GeistMono as a genuine second voice; negative tracking
throughout, leading 1.3.
**Measured:** 8.3–46.7px (**5.6×**, 9 sizes) · easing `0.23,1,0.32,1` at 0.4s · nav `fixed` ·
`multiply` ×33 · 87 clip-paths, 31 masks, 143 SVG, 25 keyframes · 13.7 viewports ·
Webflow + GSAP/ScrollTrigger/SplitText + Lenis + Barba.
**Why it wins:** it argues in the client's own notation, and the hero is the product running
rather than a picture of it.
**Cost to beat:** a domain notation worth borrowing, and the nerve to make the hero interactive
instead of decorative.
**Use narrowly.** Art direction and concept only. At **5.6×** it sits below every keeper except
Louis Paquet and just above BotBlox — hierarchy is carried by material, rule and mono/grotesk
voice, not size. Do not cite it for type. It also ships the two chrome defaults this canon usually
refuses: a fixed nav and no custom scrollbar. Proof that a **Webflow** build reaches Tier A art
direction — the ceiling here is concept, not stack.

### 57 · Pear — pear.no — corporate
**What it is:** A partnership firm arguing its thesis with a gilded pear among classical statuary.
**Moves:** **deadpan absurdity executed straight** — the image is wrong on purpose and exact about
why; Flecha (a serif with optical sizes) at 77px weight 300 against GT Standard; near-black
`rgb(11,10,9)` with a deep navy wash; **13 mask-images, 5 canvas, 10 3D transforms**; the tallest
page measured at **53.5 viewports**.
**Measured:** 8–116.8px (14.6×, 19 distinct sizes) · easing `0.22,1,0.36,1` at 0.42–0.52s.
**Why it wins:** the strangeness *is* the argument, and it never winks.
**Cost to beat:** name the uncomfortable idea first, then stage it with real production values.
**Built:** generated stills → video → WebP frame sequences scrubbed in one pinned stage, under one
print-like transition shader; no 3D library. The method is `sequence.md`.

### 53 · e2.vc — VASA — corporate
**What it is:** A VC firm whose page is annotated by hand.
**Moves:** **annotation as a design system** — a hand-drawn ellipse circling "friends" in the
headline, leader lines pointing at real details; 135px Inter Tight set **lowercase** with −1%
tracking; warm paper `rgb(252,247,240)` with an electric blue `rgb(52,81,245)`;
`mix-blend-mode: screen`; **Matter.js physics** alongside ScrollTrigger and LocomotiveScroll.
**Measured:** 14–172.8px (12.3×) · easing `0.7,0,0.3,1` at 0.5s · 4 canvas.
**Why it wins:** the annotation layer is a third type role with a job, not a flourish.
**Cost to beat:** details actually worth pointing at.
*Note: `capture.mjs` cannot seek it — click the page, then PageDown. Re-shot 2026-09-30: below
the fold the annotation carries on as labelled callouts on founder portraits (company, exit), and
the page ends on a blue footer of loose, playable letters.*

### 39 · Gucci La Famiglia — lafamigliamysteryunfolds.gucci.com — MONOGRID — cinematic
**What it is:** A luxury narrative staged in a lit 3D villa at night.
**Moves:** a built environment rather than a hero image; `mix-blend-mode: multiply`; brand faces
(Gucci Sans Pro / Gucci Serif) held to a 100px ceiling so the *scene* is the subject; virtual
scroll.
**Measured:** 10.5–100px (9.5×) · GSAP.
**Why it wins:** restraint in type because the environment is carrying the argument.
**Cost to beat:** an actual scene, and the sense to set type quietly inside it.

---

## Tier N — negative references

These are on curated award lists. They are here to prove that appearing on one is not the same as
being distinctive, and to calibrate where the floor actually sits.

### 21 · cerebrium.ai — Louis Paquet — B2B
Dark canvas, magenta-to-violet gradient, ambient glow behind the hero, mono labels. **Four named
tells from `SKILL.md` in one fold.** Measured 11–144px (13.1×) with 61 clip-paths and 90 SVGs —
technically accomplished and completely convergent. Uses `cubic-bezier(0.645,0.045,0.355,1)` and
`ease-in-out` side by side.
**The lesson:** craft metrics can all pass while the concept is the field default. This is what
the tell list catches and the positive floor does not.

### 50 · rocket-saas.io — Ryan James — B2B
Purple gradient, 3D rocket illustration, stock meeting photograph in a circle, `sofia-pro`
throughout, `ease-in-out` on everything, fixed nav, no custom scrollbar, no blend modes.
**Measured type ratio: 6×** — one and a half times `SKILL.md`'s positive floor.
**The lesson:** the floor is set below template-grade work. Any bar that this page clears is not
a bar.

---

## How to use this file

1. At **Target**, pick 2–3 entries. Prefer one from your mode and one from outside it — the
   cross-mode pick is what stops a B2B page defaulting to B2B convention.
2. Name, in one line each, what that entry does that a default would not. That line goes in
   `DESIGN.md`.
3. At **Verify**, the critic gets those entries' captures beside your page and answers: *does any
   of them do this better?* If yes, it is not done.

**Do not copy an entry's values.** Copy the *decision* it made — that leading could be negative,
that the nav could scroll away, that the accent could appear four times on the whole page. The
values here exist so those decisions are legible, and so a claim about them is checkable.
