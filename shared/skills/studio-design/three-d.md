# Three-D

Read when a comp reaches for 3D — a rendered object, a scrubbed sequence, a live scene — and when
`Material` names something that has to be modelled. `moves.md` §E picks the delivery family; this
file is how the asset gets made and how it reaches the page without costing the first paint.

---

## 1 · The ladder — render first

Each rung must earn the one above it. Many famous scroll-3D moments are rung 1 or 2.

| Rung | Ships as | Earns it when |
|---|---|---|
| **1 · Render** | Stills, a loop, or a turntable video from Blender | The default. The object must look exact; nothing needs to react |
| **1b · Faked view** | 4–9 renders + an alpha matte, blended by pointer in a shader (`immersive.md` §3) | It must look exact and answer the pointer, but nothing changes shape |
| **2 · Sequence** | 60–120 frames scrubbed on a canvas (`moves.md` §E; the build is `sequence.md`) | The camera move is the story, and it is fixed |
| **3 · Real-time GLB** | A Blender-built GLB in R3F/three.js, or `<model-viewer>` for one product view or AR | It must answer the pointer, the light, or the visitor's choice |
| **4 · Spline embed** | A Spline scene via `@splinetool/react-spline` or `<spline-viewer>` | Spline's interaction states and look *are* the move, and the scene is authored in Spline |

**The 3D canvas is never the LCP element.** A poster still or the first video frame paints first;
the live scene loads after the page is interactive and replaces it in place, same framing, no
shift. A reduced-motion visitor keeps the poster.

---

## 2 · Which tool

| | Blender | Spline |
|---|---|---|
| **Role** | The workshop: modelling, materials, lighting, renders, GLB export | The interactive layer: states, events, hover/scroll response, embeds |
| **Agent access** | MCP — `execute_blender_code` plus scene-summary, screenshot, and render tools | MCP — `3d_run_code` (Spline's editor DSL) plus scene-read, screenshot, analysis, and generation tools |
| **Export** | Scriptable: `bpy.ops.export_scene.gltf`, renders to path | **Manual.** The MCP cannot export — see §5 |
| **Reach for it when** | Fidelity, exact form, renders, or a GLB anything else consumes | The scene lives *as* a Spline scene on the page |

Anything that only needs a GLB goes through Blender, even if it was sketched in Spline. That keeps
the automated path automated.

**At Inspect,** check the tool list, not the app: `execute_blender_code` means Blender's MCP is
wired, `3d_run_code` means Spline's is. Blender's tools also need Blender open with the MCP add-on
running; Spline's need the Spline editor open. A server that lists its tools but cannot reach its
app is an unavailable capability — say so at Intake rather than discovering it at Build.

---

## 3 · Driving Blender

The server's own rules, which hold for every call:

- **Inspect before acting.** `get_objects_summary` and the `get_blendfile_summary_*` tools first;
  never assume a value you have not read. Walk collections progressively — don't dump a large scene.
- **Respect what is there.** Existing names and structure stand. Nothing destructive without the
  client's yes.
- **`execute_blender_code` is the last resort**, used when no dedicated tool does the job. When you
  use it: small steps, each returning structured data (a dict, not prints).
- **Set state explicitly.** Mode, active object, and selection — operators change all three as a
  side effect, so re-set them between calls on different objects.
- **Capture references at creation.** Names auto-suffix `.001` on collision; never look an object up
  by the name you assumed it got.
- **Check units and rotation mode** before writing dimensions or rotations. A write to the wrong
  rotation property is silently ignored.
- **Non-destructive by default** — modifiers over direct mesh edits until the form is final. Apply
  scale before booleans or export.

And for a studio run:

- **Save a copy before the first change** (`bpy.ops.wm.save_as_mainfile(filepath=…, copy=True)`)
  and save as you go. A connected Blender session is the client's file, not a scratch buffer.
- **Judge looks from pixels, facts from data.** `render_viewport_to_path` or
  `get_screenshot_of_area_as_image` to see it; the summaries to know it.
- **Run long renders through `execute_blender_code_for_cli`**, which works on a background Blender
  and a copy of the file, so the open session is not frozen.
- **One client at a time.** Two agents driving one Blender race each other's selection state.

---

## 4 · Driving Spline

- **`3d_load_skill("authoring-guide")` before the first `3d_run_code`** — it is the DSL reference
  and quality bar, and the code will not be right without it.
- **Ground with `3d_get_scene_mcp`** (scene, selection, a free build anchor), then build.
- **Facts come from `3d_get_scene` / `3d_get_objects`, never from a screenshot.** Looks come from
  `3d_set_view` + `3d_take_screenshot`.
- **Run `3d_analyze_scene` before handing off** — it is Spline's own performance report.
- **Ignore the `2d_*` tools.** They author HTML inside Spline's 2D editor; this skill builds the page
  in code. Same for the `3d_*_html_content` overlay tools.

---

## 5 · Spline export is a stop

The MCP cannot export, so a Spline scene reaches the page only through the client. This is a
fourth stop in SKILL.md's "Where the run stops". Name exactly what to export:

- **React / Next code export** — the default for this stack; `@splinetool/react-spline`, with the
  `/next` entry for its server-rendered blur placeholder.
- **Viewer** (`<spline-viewer>`) — for a non-React stack. It lazy-loads by default.
- **GLB** — only when the scene must enter a three.js pipeline. If that is the reason, it should
  probably have been built in Blender (§2).

Then wait. Unattended, record the export as an assumption in `DESIGN.md` and build against a
poster placeholder.

---

## 6 · Generated and sourced models

- **Generate only when `DESIGN.md` says the material is generated** — Intake decides that, not the
  tool list. Spline's `3d_generate_image` and `3d_generate_3d_model` spend Spline credits; check the
  account's plan before relying on them.
- **Text-to-3D is worst at precise mechanical objects** — primitives or a bought model for those
  (`moves.md` §E, the fidelity ladder).
- **Every sourced or generated model carries its origin and licence** next to `Material` in
  `DESIGN.md`. A model with no recorded licence does not ship.

---

## 7 · GLB to the web

Inspect, then optimise with settings you chose — the tool's defaults are not tuned for any one scene:

```bash
npx @gltf-transform/cli inspect hero.glb
npx @gltf-transform/cli optimize hero.glb hero.web.glb \
  --compress meshopt --texture-compress webp --texture-size 2048 --simplify false
npx @gltf-transform/cli inspect hero.web.glb
```

- **`--simplify` is on by default** and changes geometry. Turn it off for a hero whose silhouette is
  the point; leave it on for background props.
- **Meshopt or Draco** both need a decoder on the page — drei's `useGLTF` wires both. Pick one per
  project.
- **WebP/AVIF** minimise download; **KTX2** minimises GPU memory. A texture-heavy scene on phones
  wants KTX2.
- Lazy-load the canvas, cap pixel ratio, `frameloop="demand"` for still scenes, dispose on unmount
  (`moves.md` §F).

The before/after `inspect` numbers go in the verify report against the GLB row in `verify.md` §4.
