# Worlds

Five complete resolutions of every system in `craft.md`. These are **meant to be copied.**

## How to use this file

1. Pick the world nearest your direction.
2. **Change two named parameters** — because the direction demands it, not for variety.
3. Record the change in `DESIGN.md`:

```
World: <n> — <name>
Changed <parameter> to <value> because <reason>
Changed <parameter> to <value> because <reason>
```

Two deltas is the minimum, not the maximum. `craft.md` tells you what each parameter *is* and
what sets its value, so the two you change are chosen rather than stumbled into.

**Why copying is allowed here.** The previous version of this skill printed one worked example and
forbade its reuse. Under load an agent keeps concrete values and drops abstractions, so that
prohibition produced one of two failures: the example copied anyway, or framework defaults —
`shadow-lg`, `rounded-lg`, `ease-in-out`. Five starting points plus a required delta is a larger
space than one example plus a ban. It is not an infinite space, and it is not meant to be: the
canon target and the authored-artifact requirement are what carry distinctiveness. If all five
worlds are wrong for the brief, derive from `craft.md` directly and say so in `DESIGN.md`.

**Order is not preference.** World 5 is the structural/drafted pole that earlier versions of this
skill reached for by reflex. It is last so it is not the default, not because it is worst.

---

## 1 · Broadcast

*Condensed type at poster scale over documentary photography. Loud, physical, editorial-rock.*

| System | Resolution |
|---|---|
| **Light** | Hard, frontal, high-contrast — photographic flash, not ambient. Contact `0 1px 2px hsl(0 0% 6% / 0.28)`, ambient `0 12px 40px hsl(0 0% 6% / 0.18)` |
| **Borders** | Outer `1px solid hsl(0 0% 100% / 0.16)`; no inner highlight — frontal light has no lit edge. Radius **0** everywhere; the family is square |
| **States** | Hover inverts fill and ink instantly, in 90ms, out 140ms. Nothing moves. Active shifts the accent underline 2px. Focus-visible: 2px offset ring, accent, no transition |
| **Easing** | entrance `cubic-bezier(0.16, 1, 0.3, 1)` · exit `cubic-bezier(0.5, 0, 0.9, 0.2)` · settle = entrance · authoritative `cubic-bezier(0.87, 0, 0.13, 1)` @ 700ms |
| **Type** | Display: a condensed grotesk (National 2 Condensed, Thunder) at `clamp(84px, 16vw, 320px)`, weight 900, uppercase, tracking `−0.02em`, **leading 0.7** so lines interlock. Body: Helvetica Now / Söhne 18px, leading 1.55. Scale **~26×** |
| **Space** | Padding `0.6×` / `1.2×` label size. Proximity ladder 6 / 14 / 72px. Section rhythm 128px desktop, 64px mobile |
| **Entrance** | Headings: mask-wipe upward from a clipped frame, 520ms, no travel. Images: scale 1.06→1 under a static clip. Stagger 45ms per line |
| **Palette** | Ground `#131313` · paper `#FEFEFE` · mid `#D8D3D3` · accent electric blue `oklch(0.52 0.28 268)` at ≤6%. Two values carry 90% of the page |
| **Material** | Documentary photography, hard rectangle or full-bleed band, `mix-blend-mode: darken` where type crosses it. Grade: raised blacks, no lifted highlights |

**Reach for it when** the argument is energy, scale, or a physical business. **Refuse it when** the
copy is long — this world cannot hold a paragraph.

---

## 2 · Instrument

*Near-black, real hardware, one signal colour. Technical without being a dashboard.*

| System | Resolution |
|---|---|
| **Light** | Single hard source, upper-right, cool. Elevation carried by border luminosity — shadows barely read. Contact `0 1px 0 hsl(210 20% 92% / 0.06)` (a lit top edge), ambient `0 16px 48px hsl(210 40% 2% / 0.55)` |
| **Borders** | Outer `1px solid hsl(210 18% 60% / 0.14)` plus `inset 0 1px 0 hsl(210 30% 88% / 0.10)` on the top edge only. Radius family 3 / 6 / 9px, concentric |
| **States** | Hover raises border luminosity and nothing else, in 110ms, out 160ms. Active drops it to full for 60ms. Disabled at 3.2:1 boundary contrast. Focus-visible: 2px offset ring in the signal colour |
| **Easing** | entrance `cubic-bezier(0.22, 1, 0.36, 1)` · exit `cubic-bezier(0.4, 0, 1, 1)` · settle `cubic-bezier(0.25, 1, 0.5, 1)` · authoritative `cubic-bezier(0.7, 0, 0.3, 1)` @ 520ms |
| **Type** | Display: a precise grotesk (Suisse Intl, Aeonik) `clamp(48px, 8vw, 148px)`, weight 450, tracking `−0.035em`, leading 1.0. Body: IBM Plex Sans 17px, leading 1.6. Mono (IBM Plex Mono) as a true third voice for state labels and specifications. Scale **~13×** |
| **Space** | Padding `0.75×` / `1.5×`. Proximity ladder 8 / 16 / 64px. Section rhythm 160px / 72px |
| **Entrance** | Headings fade with an 8px rise over 420ms — things that sit barely move. Body follows at +50ms, opacity only. Diagrams draw their rules on. Nothing overshoots |
| **Palette** | Ground `oklch(0.16 0.012 240)` · surface `oklch(0.21 0.014 240)` · ink `oklch(0.93 0.006 240)` · signal crimson `oklch(0.58 0.21 22)` at ≤5% |
| **Material** | Real product and component photography, never renders of software. Alpha cutouts on the ground plane with built `drop-shadow()` obeying the upper-right source |

**Reach for it when** the product is genuinely engineered and there is real hardware or real
mechanism to show. **Refuse it when** you would have to fabricate the mechanism.

---

## 3 · Atelier

*Warm-dark editorial. A masthead at print scale, photography held at distance, slow weighted motion.*

| System | Resolution |
|---|---|
| **Light** | Warm, low, raking from the left — late afternoon. Contact `-1px 2px 4px oklch(0.18 0.04 40 / 0.30)`, ambient `-10px 36px 60px oklch(0.18 0.04 40 / 0.22)` |
| **Borders** | Outer `1px solid oklch(0.82 0.03 40 / 0.18)` plus `inset 1px 1px 0 oklch(0.95 0.03 60 / 0.12)` on top and left. Radius 0 on images, 2px on controls |
| **States** | Hover deepens the ambient shadow and lifts `translateY(-2px)`, in 200ms, out 340ms — it settles rather than snaps. Type, border, and colour stay fixed; only the light changes |
| **Easing** | entrance `cubic-bezier(0.23, 1, 0.32, 1)` · exit `cubic-bezier(0.55, 0, 1, 0.45)` · settle spring `stiffness 180 / damping 24` · authoritative `cubic-bezier(0.65, 0.05, 0.36, 1)` @ 650ms |
| **Type** | Display: an editorial serif with an optical axis (Flecha, Canela, Fraunces) at `clamp(72px, 14vw, 420px)`, weight 300, `opsz` driven to rendered size, tracking 0, leading 0.88. Body: Neue Haas Unica / Source Serif 4 18px, leading 1.62, measure 62ch. Scale **~28×** |
| **Space** | Padding `0.7×` / `1.3×`. Proximity ladder 8 / 20 / 88px. Section rhythm 176px / 80px |
| **Entrance** | Images revealed by a travelling mask boundary, 720ms, scale 1.03→1 beneath it. Headings stagger 60ms per line, never per word. Body opacity only |
| **Palette** | Ground `oklch(0.15 0.012 40)` · clay `oklch(0.29 0.06 32)` · blush `oklch(0.86 0.05 40)` · ink `oklch(0.95 0.01 60)` · no accent hue — the warmth *is* the colour story |
| **Material** | Photography at distance, generous crops, gradient-feathered into the ground so image and page share one surface. Grade: warm shadows, no lifted highlights, fine grain |

**Reach for it when** the brand is a maker, a place, or a collection, and the photography is
genuinely good. **Refuse it when** you have no photography — this world collapses without it.

---

## 4 · Specimen

*Clinical white, halftone imagery, a hard modular grid. Editorial rigour applied to software.*

| System | Resolution |
|---|---|
| **Light** | Diffuse, overhead, neutral. Almost no shadow; elevation is a hairline. Contact `0 1px 2px oklch(0.25 0.01 250 / 0.05)`, ambient `0 8px 24px oklch(0.25 0.01 250 / 0.04)` |
| **Borders** | One hairline `1px solid oklch(0.25 0.01 250 / 0.12)`, even on all four sides — a drawn rule, not a bevel. No inner highlight. Radius **0**; the grid is the shape language |
| **States** | Hover fills the cell with the 100-step neutral, 120ms, out 180ms; the rule stays. Active inverts to ink. Focus-visible: 2px offset ring in the accent, no transition |
| **Easing** | entrance `cubic-bezier(0.16, 1, 0.3, 1)` · exit `cubic-bezier(0.4, 0, 1, 1)` · settle = entrance · authoritative `cubic-bezier(0.87, 0, 0.13, 1)` @ 600ms. One deliberate overshoot `cubic-bezier(0.34, 1.56, 0.64, 1)`, used on the single signature element only |
| **Type** | Display: a neutral grotesk (Suisse Intl, Schibsted Grotesk) at `clamp(56px, 11vw, 184px)`, weight 450, tracking `−0.04em`, leading 1.0. Body: same superfamily 17px, leading 1.55. Mono for specimen tags and figures. Scale **~15×** |
| **Space** | Padding `0.7×` / `1.4×`. Proximity ladder 8 / 16 / 56px. Section rhythm 144px / 64px. Everything lands on a visible 12-column grid with a 24px gutter |
| **Entrance** | Grid cells reveal in reading order, opacity + 10px rise, 380ms, stagger 40ms. Images resolve from halftone coarse→fine rather than fading |
| **Palette** | Ground `#FFFFFF` · rule `oklch(0.88 0.004 250)` · ink `oklch(0.24 0.008 250)` · accent mint `oklch(0.90 0.16 158)` at ≤8%, used as a fill behind a single figure |
| **Material** | Photography reduced to halftone or duotone at a visible dot pitch, masked by grid geometry so the layout draws the frame. Never a soft-focus stock image |

**Reach for it when** the product is serious, the audience is expert, and you want credibility
without a dashboard. **Refuse it when** the brand's register is warm or playful.

---

## 5 · Apparatus

*Drafted, annotated, structural. Paper-white with an engineer's single red mark.*

**Read the caution first.** This is the world earlier versions of this skill reached for by
reflex, and it appeared as the sole worked example in three separate files. It is a good world.
It is also the one most likely to be chosen because it was nearest to hand rather than because it
was right. If you land here, say in `DESIGN.md` what made it right for *this* brief.

| System | Resolution |
|---|---|
| **Light** | Diffuse overhead; the page is a sheet, not a room. Elevation almost entirely border luminosity. Contact `0 1px 2px hsl(220 20% 20% / 0.04)`, ambient `0 8px 24px hsl(220 20% 20% / 0.03)`. Objects sit |
| **Borders** | One hairline `1px solid hsl(220 20% 20% / 0.10)`, even on four sides. No inner highlight. Radius 2–4px — drafted, never a pill |
| **States** | Hover raises border luminosity only, in 120ms, out 180ms. Position never changes: a drawn object on a sheet does not lift. Active drops the border to full for 60ms. Focus-visible is a 2px offset ring in the accent with no transition |
| **Easing** | entrance `cubic-bezier(0.2, 0, 0, 1)` — `x2` at 0, the longest glide · exit `cubic-bezier(0.4, 0, 1, 1)` · settle = entrance · authoritative `cubic-bezier(0.65, 0, 0.35, 1)` @ 400ms. Every `y` clamped to 0–1; no overshoot anywhere |
| **Type** | Display: a precise neo-grotesque (Hanken Grotesk, Söhne) at `clamp(44px, 8vw, 132px)`, weight 500, tracking `−0.025em`, leading 1.05. Body: 17px, leading 1.6. Mono for margin annotations and dimension labels — earned, because the register is genuinely technical. Scale **~12×** |
| **Space** | Padding `0.75×` / `1.5×`. Proximity ladder 8 / 16 / 64px ≈ 1:2:8. Section rhythm 160px / 72px |
| **Entrance** | Headings fade with an 8px rise over 400ms — the band's floor, because a drawn object barely moves. Body at +50ms, opacity only. Diagrams draw their rules on, left to right |
| **Palette** | Paper `oklch(0.98 0.006 250)` · ink `oklch(0.28 0.02 260)` · hairline from the 200–300 steps · vermilion `oklch(0.62 0.19 35)`, appearing once or twice per view |
| **Material** | Diagrammatic and authored — dimension lines, annotation leaders, construction rules. Photography is optional and, when present, sits inside drawn frames |

**Reach for it when** the product's argument is structure, precision, or method. **Refuse it when**
you chose it because it was familiar.

---

## What no world resolves for you

Five worlds cover the *physical vocabulary*. They do not cover the concept, the composition
signature, the authored artifact, or the chrome — and two pages built in the same world with
different answers to those should not resemble each other. If yours would, the world is doing work
the design should be doing.
