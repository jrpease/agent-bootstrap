# Sequence

Read when the signature is a **filmed world scrubbed by scroll** — `moves.md` §E's pre-rendered
sequence family, built as a whole page. `immersive.md` is the real-time sibling; this one ships
pictures, not geometry.

Decomposed from **pear.no** (canon #57). Its "3D" is AI-painted stills turned into ten-second
films, cut into WebP frames, and scrubbed through one pinned stage, with print-like shader
transitions over the top. Nothing on it is modelled. Its build notes, as quoted secondhand, name
an image model for the stills, a video model for the motion, and Claude Code for the build.

**Copy the method, never the surface.** Classical statuary and a gilded object is Pear's argument.
A second site that stages statues has shipped Pear's surface — the composition tell in `SKILL.md`
("the tell is the composition, not the contents"), whatever it is built with.

---

## 1 · When it earns its place

Over real-time (`immersive.md`), when:

- the world must look **painted or filmed**, beyond what a phone GPU renders live;
- the camera's path is fixed and the scroll *is* the story;
- the material is generated or shot, not modelled.

The frames cannot answer the pointer, the light, or a choice — only scroll. Anything that must
respond to more is a separate layer drawn over them, on the same timeline (§4). A
**transformation** still needs one continuous film of the change; a cross-fade between two films
is not one (`moves.md` §E, the capability rule).

---

## 2 · The pipeline

| Step | Tool | Notes |
|---|---|---|
| **Stills** | `studio-gen image` | Art-direct from `DESIGN.md` `Material`. **Plan the key now** (§6): a subject on a plain, keyable ground |
| **Film** | `studio-gen video "<the move>" --from <still> --seconds 10` | Animates the still itself, so the approved composition holds; the prompt describes only the motion. Lengths: Seedance 4–15, Kling 3–15, Veo 4, 6 or 8. The still sets the shape: for a phone tier, make a 9:16 still. Or render the move in Blender (`three-d.md`, rung 2); the rest is identical |
| **Cut** | `reference/sequence-cut.sh <video> <out> 12` | 10s at 12fps = 120 frames; WebP tiers 768 and 1440 plus `manifest.json` |
| **Host** | The project's static folder | Long immutable caching; bump the `?r=` revision on every re-cut |

```bash
reference/sequence-cut.sh films/hero.mp4 public/films/hero 12            # tiers 768 1440, q78
reference/sequence-cut.sh films/hero.mp4 public/films/hero 12 "768 1440" 72
```

### Keyframed film — a start frame, an end frame, the model fills the middle

The common way to stage a change now: make the **first** and **last** frame, and let a video model
that accepts both (Seedance, Kling, Veo) generate the move between them. Apple's
dissection scrolls are not made this way — they are 3D renders, delivered as scrubbed video;
render the move yourself and it is the Blender path (`three-d.md`, rung 2).

1. **Start frame** — generate it (`studio-gen image`), art-directed like any still.
2. **End frame** — **edit the start frame into it** (`studio-gen image "<the change>" --edit
   start.webp`), never generate it fresh. Same object, camera, light and ground; only the state changes — assembled
   to separated, closed to open. Two independent generations are two different objects, and the
   model morphs one into the other.
3. **Fill the middle** — `studio-gen video "<the move>" --from start.webp --to end.webp`, 4–10
   seconds (Veo: 8 only). Keep the camera
   locked or on one simple move; a camera move *and* a transformation doubles what it invents.
4. **Cut** with `reference/sequence-cut.sh` — no GIF tools in between; GIF throws away colour and
   saves nothing.
5. **Read the in-betweens** before building anything — 19 evenly spaced moments on one sheet, and
   the final frame beside the end keyframe you made:

```bash
s=$(ffprobe -v error -show_entries format=duration -of csv=p=0 film.mp4)
ffmpeg -i film.mp4 -vf "fps=$(echo "19/$s" | bc -l),scale=480:-2,tile=5x4" -frames:v 1 sheet.png
ffmpeg -sseof -0.1 -i film.mp4 -update 1 -frames:v 1 last.png   # compare with the end keyframe
```

The model **invents** every frame between the two you made. Look for parts that appear, vanish,
or change count or shape mid-move; edges that melt; text or logos that rewrite themselves; a last
frame that drifted from the end keyframe. For a product that must be exact, also sheet it at the
cut rate (`fps=12,tile=8x8` for up to five seconds) — a one-frame pop hides between samples.
On an exact product, any of those means the generated film is the wrong asset: render the move in
Blender instead. On a soft subject — fabric, food, landscape — the same drift reads as motion.

```bash
studio-gen image "brushed titanium watch, closed, on seamless grey" --out public/gen/watch
studio-gen image "the same watch with its case back open, movement visible" \
  --edit public/gen/watch/asset@2x.webp --out public/gen/watch-open
studio-gen video "the case back swings open, camera locked" --seconds 8 \
  --from public/gen/watch/asset@2x.webp --to public/gen/watch-open/asset@2x.webp --out films/watch
```

Keep both keyframes beside the film: they are what step 5 compares against.

**The capability rule still holds** (`moves.md` §E): this qualifies for a transformation because
it is one continuous film of the change, not a cross-fade — but the shared geometry is the model's
guess, which is exactly what step 5 checks. And the dark stage with one product flying apart is
the named cliché for the scrub mechanic (`moves.md` §A); the method is fine, that surface is not.

**Frame count is a budget, not a frame rate.** 120 frames across a long scroll reads as motion;
past about 360 the download outruns the reader. Measured on Pear's own hero film: 120 frames at
1440 ≈ 10 MB, at 768 ≈ 3.6 MB. Report both in verify (`verify.md` §4).

---

## 3 · The loader

`reference/sequence-loader.mjs` — copy it into the project; it has no dependencies and its tests
run with `node --test`. The scheduling and the memory are the engineering here, not the drawing:

- **Coarse to fine.** Every 32nd frame first, then every 16th, down to every frame — a scrub works
  within a second of the section opening, and sharpens as it fills.
- **The aimed window jumps the queue.** Once the scroll aims at a frame, ±24 around it load first,
  nearest outward. Before it aims, the order is pure coarse-to-fine.
- **One pool of 8 fetches for the whole page**, round-robin across every active sequence; the one
  the scroll is aiming at takes two per turn when slots free up together. Neighbouring chapters
  fill in parallel.
- **Frames stay compressed.** Each is kept as an `<img>` (~100 KB); only ±3 around the aim are
  decoded ahead. Decoded, one 1440 frame is 4.7 MB — a 121-frame sequence held that way is
  ~565 MB, which kills a phone tab.
- **Nearest loaded frame stands in** for a missing one; failed frames retry 3 times.
- **Tier by viewport width:** 768 at ≤ 820px, else 1440. Device pixel ratio is ignored on purpose.
- **Start on proximity:** `setActive(true)` when the section comes within about a tenth of the
  page's progress; `dispose()` when it can never return.

Draw with Canvas 2D `drawImage` for a plain scrub. When a shader treats the frame (§5), upload it
as a texture and update it in place (`texSubImage2D`) — same-size frames never reallocate.

**Frame 0 is the poster.** An `<img>` of it paints first and is the LCP element; the canvas
replaces it in place once the first frames arrive (`three-d.md` §1).

---

## 4 · One stage, one timeline

The whole page is **one pinned stage** driven by a single progress value from 0 to 1. Every
chapter — which film, which frame range, which transition, which text — is authored as a range on
that one timeline, in normalised units. Pear used 5350 units; the number is arbitrary, the single
source of truth is not.

**Scroll engine:** ScrollTrigger pin + scrub on Lenis (`SKILL.md` §Stack), not a hand-rolled
smoother. Pear writes its own: it intercepts the wheel *and the keys* and lerps `scrollTo`. Lenis
smooths the wheel the same way, but leaves keyboard, touch and anchor scrolling native and is
maintained. Either way, turn smoothing **off for reduced motion and on coarse pointers** — Pear
does both, and a default Lenis install does neither.

---

## 5 · Transitions in one shader

Pear runs one full-screen quad with one large fragment shader, and every transition is a mode of
it. Modes it ships, as a menu — a world picks two or three, not all:

- **Halftone** — the frame resolves into dots and back.
- **Bayer dither / mosaic** — ordered 4×4 dither, pixel blocks.
- **Static** — row tears, RGB split, cells redrawn as glyphs from a tiny bitmap font in the shader.
- **Ring tear** — a radial tear from a point that means something (Pear's: the pear).
- **Burn / char** — a dissolve with an ember edge, on square, diamond or round cells.
- **Paper** — a procedural sheet: pulp, fibre, tooth, flecks.
- **Breathe, slabs, noise warp** — the quieter ones.

Progress for each comes from the timeline (§4). Uniforms, not separate programs. A `PHONE` define
halves noise octaves. Skip the draw when neither the frame nor any uniform changed.

These are **print and analogue** — they argue that the page was made, not rendered. A world whose
material is glass or light wants different modes; the structure holds.

---

## 6 · Graphics behind the subject

Pear's hairline grid sits *behind* the statue in a flat film. A 2D canvas samples a low-res copy
of the video every ~40ms with `getImageData`, sets alpha from how sky-blue each pixel is, and
composites the rules with `destination-in` — a live chroma key.

It only works if the ground is keyable, so it is decided at **Stills** (§2): a plain sky, a flat
backdrop, a clean colour separation. Sample small and throttle; never every frame at full size.

---

## 7 · Type

- **Split into words and characters**, transforms and blur tied to the timeline. The wrapper keeps
  the real string (`moves.md` §C, technique 39).
- **Ink:** an SVG `feTurbulence` + `feDisplacementMap` filter gives display type a letterpress
  edge. Display sizes only; never running text.

---

## 8 · Cost control

- **Adaptive pixel ratio on phones:** drop 0.25 after ~150 frames slower than 26ms, step back up
  after ~900 good ones. Never oscillate faster than that.
- **Videos start late.** A footer loop starts only when the reader is near it.
- **One canvas per job**, each `aria-hidden`, each paused when off-screen.

---

## 9 · Floors

- **Every word in the DOM:** one `h1`, real headings, canvases `aria-hidden` (`immersive.md` §8).
- **Reduced motion** gets the poster frames and native scroll; timelines jump to their end state.
- **Scroll stays real.** The page's scroll position moves, so keyboard, find-in-page, anchors and
  assistive scrolling work; smoothing is off for reduced motion and on coarse pointers.
- **The page works with no frames loaded**: posters, copy, navigation and CTA all present.
