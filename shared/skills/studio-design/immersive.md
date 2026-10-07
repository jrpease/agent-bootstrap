# Immersive

Read when the signature scene is a **staged world** — a real-time scene the visitor travels
through, not an object on a section. `three-d.md` makes the assets; `moves.md` §E has already
chosen real-time as the delivery family. This file is how the page around the scene is built.
When the world is filmed rather than rendered live, read `sequence.md` instead.

Decomposed from two builds seven years apart that share one method. Technique references, not
canon entries — `canon.md` holds measured sites.

- **aengel.io** (2026, solo; FWA of the Day): three.js WebGPU + TSL in R3F on Next.js, scroll
  camera on authored curves, GPU fluid, custom sound engine, a `/lite` route.
- **Corn Revolution** (Resn for Pioneer, 2019; Awwwards Site of the Year 2020): three.js + GSAP,
  baked light, a "3D" hero made of four renders, LUT grade, every word drawn in WebGL — and no
  reduced motion and no readable text, which is what §8 exists to prevent.

**The method:** Blender authors everything spatial, the browser plays it back, and each device
gets the version it can carry.

---

## 1 · Blender authors, the browser plays back

Nothing spatial is placed by hand in code. If a value is a position, a path or a light, it was
made in Blender (`three-d.md` §3) and exported as data.

| What | Authored as | Shipped as | Played back by |
|---|---|---|---|
| **Camera path** | Two curves — one the camera rides, one it looks at | JSON control points | `CatmullRomCurve3` per curve; `getPointAt(t)` for position and target, then `lookAt`; `t` from a ScrollTrigger `scrub` range |
| **Instance layouts** | Empties or a particle system scattering one mesh | JSON transforms (position, rotation, scale) | One `InstancedMesh` per source mesh |
| **Paths for things that fly** | Curves | JSON control points | The same curve sampler, on time instead of scroll |
| **Light** | Baked into textures (Cycles bake) | The model's base or lightmap texture | Unlit or matcap materials — no live lights to pay for |
| **Grade** | A LUT made from a graded render | A LUT PNG | One lookup in the final pass (§5) |

Export with `execute_blender_code`, one structured result per call:

```python
import bpy, json
def curve_points(name):              # the evaluated curve, handles and all; Z-up → Y-up
    ob = bpy.data.objects[name]
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = ev.to_mesh()              # samples the spline at the curve's resolution
    pts = [ev.matrix_world @ v.co for v in mesh.vertices]
    ev.to_mesh_clear()
    return [[p.x, p.z, -p.y] for p in pts]
data = {"position": curve_points("CamPath"), "target": curve_points("CamTarget")}
path = bpy.path.abspath("//camera.json")
json.dump(data, open(path, "w"))
result = {"path": path, "points": {k: len(v) for k, v in data.items()}}
```

**Export the evaluated curve, not its control points.** A Bezier's shape lives in its handles; a
Catmull-Rom through the anchors alone is a different path from the one that was drawn. Sampling
the evaluated curve keeps the drawn path — raise the curve's resolution if the camera visibly
cuts corners. **Blender is Z-up, three.js is Y-up:** convert in the exporter, as above, once —
never at playback. A camera path that arrives sideways has skipped this line.

**Ease the scroll, not the curve.** The curve stays geometrically even; pacing comes from a
`CustomEase` on the scrub, so the camera can dwell on a moment without re-authoring the path.

---

## 2 · The renderer

**Default: three.js r18x `WebGPURenderer` with TSL** (three's node shading language). TSL compiles
to WGSL on WebGPU and to GLSL on the WebGL2 backend the same renderer falls back to, so one shader
source covers both. In R3F, pass the renderer through the `gl` factory and `await renderer.init()`
before the first frame.

- **Hand GLSL only when the project already ships `WebGLRenderer`.** Preserve the stack.
- **A full-screen 2D effect with no scene** — a shader background, a material field — is a vgpu or
  Paper Shaders job, not a three.js one (`sources.md`).
- **Compile before reveal:** `await renderer.compileAsync(scene, camera)` behind the loader, so the
  first scrolled frame does not hitch on a shader compile.

---

## 3 · The faked-3D rung

Between a still render and a live GLB (`three-d.md` §1). Reads as 3D at a fraction of the cost —
Corn Revolution's hero corn cob is four images.

- **Multi-view blend.** Render the object from four (or nine) camera positions on a small grid,
  plus one alpha matte. A shader blends the views by pointer position, eased per frame. Touch gets
  a drag; **never gyro** (`moves.md`, deliberately excluded).
- **Matcap shading.** One sphere render stands in for all lighting. Stack two (multiply, then
  screen) for a highlight the light rig never had to compute.
- **Baked light on simple geometry.** Low-poly forms with Cycles-baked textures look rendered and
  run on any phone.

Earns its place when the object must look exact and answer the pointer, but nothing about it
changes shape. A **transformation** still needs shared geometry (`moves.md` §E, the capability
rule).

---

## 4 · Capability tiers

The page is staged by device, not designed for the median one. Decide at **Spec**; the tiers go on
`DESIGN.md`'s `Tiers:` line.

| Tier | Gets | Decided by |
|---|---|---|
| **Full** | The whole scene, post stack, sound available | Desktop, WebGPU present, benchmark high |
| **Reduced** | Same scene: lower DPR, fewer instances, post passes dropped | Benchmark medium, or the runtime latch tripped |
| **Lite** | A separate route or mode with **the same content** in a 2D treatment | No WebGPU and no WebGL2, mobile when the scene can't hold 60fps there, reduced motion, or the visitor chose it |

- **Decide early, measure once.** Cheap checks first (device class, `navigator.gpu`), then a short
  frame-time benchmark on a full-screen shader, bucketed into tiers. `detect-gpu` is the shortcut
  when a benchmark isn't worth building.
- **Latch at runtime.** Sustained long frames drop the page one tier and it stays dropped for the
  session. Never oscillate.
- **The lite route is a design, not an error page.** A visible way to switch, both ways. Same
  copy, same order, same CTA — a visitor on lite has not been given less to read.
- **Always on:** DPR capped at 2, the render loop paused on `visibilitychange`, scenes off-screen
  doing no work.

---

## 5 · Grade and post

The post stack is part of the world's material, so it is declared in `DESIGN.md` under
`Material` → treatment, one pass per entry with the moment it serves.

- **One LUT grade** in the final pass ties render, photography and UI to one colour world. Make it
  from a graded render, not by guessing curves.
- **Grain is a baked tile** (`moves.md` §C, technique 36), sampled in the final pass — never
  regenerated per frame.
- **Each pass is a cost line.** Bloom, depth of field, chromatic aberration, ambient occlusion —
  every one names the moment it serves. A pass on every frame for no moment is the "cinematic"
  tell.
- **Crossfades between scenes** render both to targets and mix them; no hard cut mid-scroll.

---

## 6 · The loader

- **The page's copy is in the DOM before the scene loads.** The loader covers the scene, not the
  page; the canvas is never the LCP element (`three-d.md` §1).
- **Report real progress:** bytes fetched *and* shaders compiled (§2). A bar that sits at 99% while
  shaders compile is a lie the visitor can see.
- **Draco or meshopt, and KTX2.** Ship UASTC or ETC1S KTX2 (`gltf-transform uastc` / `etc1s`) —
  they transcode to whatever the GPU supports. A BC7-only texture set is desktop-only.

---

## 7 · Sound

Opt-in, never autoplay — the browser blocks it anyway. A visible control, remembered for the
session.

- **Three channels:** ambience bed, scene effects, UI. Duck the bed during transitions.
- **Opus with an MP3 fallback.** Web Audio, one context, created on the first gesture.
- **Sound never carries meaning alone.** Everything it signals is also visible.

---

## 8 · Floors

These hold on every tier. Both reference builds broke at least one.

- **Every word is in the DOM.** Text drawn in WebGL (MSDF, troika) has a DOM twin that screen
  readers and search engines read; the canvas is `aria-hidden`.
- **Reduced motion gets the poster or lite tier**, never the scroll-scrubbed camera.
- **The page works with the scene failed.** Kill the canvas: the copy, navigation and CTA are all
  still there.
- **Keyboard reaches every stop** of a scroll story — section jumps are links, not only wheel
  handlers.

The verify bar for these is in `verify.md` §4.
