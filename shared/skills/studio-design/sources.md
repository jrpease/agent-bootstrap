# Sources

When to take a component or effect off the shelf instead of writing it. Read at **Build** (step 6),
before writing any piece that is not the signature scene or the authored artifact.

**Source the plumbing and the materials. Author the signature.**

Registries are where the median landing page comes from, so this skill does not shop for its look.
But a marquee, a carousel, a dot field or a grain shader is not where a page is won, and
hand-writing one from nothing costs the hours the signature needed. The rule `moves.md` already
states settles it: a technique on borrowed parameters is an effect. A sourced piece is acceptable
only once it runs on **the world's** easing, durations, travel and palette.

---

## 1 · What may be sourced

| Sourced | Never sourced |
|---|---|
| Commodity mechanics — marquee, carousel, accordion, tabs, dialog, toast | **The signature scene** |
| Material — grain, noise fields, mesh gradients, dithering, shader backgrounds | **The authored artifact** (`SKILL.md`) |
| Motion primitives — text split, number roll, magnetic target, FLIP helpers | The hero composition |
| Structural foundation — shadcn/ui (`SKILL.md` §Stack) | A whole section layout, used as the layout |

A sourced piece that becomes the most memorable thing on the page has been promoted to signature
by accident. Replace it with something authored, or demote it.

---

## 2 · Where to look, in order

Stop at the first source that has it.

1. **The project's own components and tokens.** Always first; a second marquee in the same repo is
   a cohesion defect.
2. **Material:**
   - **vgpu** (Vercel Labs, MIT, WebGPU) — MCP tools `docs` and `examples` find a verified effect;
     `npx vgpu examples pull <id>` brings it in; `npx vgpu check` validates the WGSL. **WebGPU
     only:** ship a static or CSS fallback for browsers without `navigator.gpu`. Pre-1.0 — pin the
     version.
   - **Paper Shaders** (`@paper-design/shaders-react`, Apache-2.0) — polished zero-dependency
     backgrounds: mesh gradient, grain, dithering. No MCP; install from npm.
   - Inside a three.js scene, write TSL instead (`immersive.md` §2).
3. **Motion primitives:**
   - **Magic UI** (MIT) — MCP tools `searchRegistryItems`, `listRegistryItems`,
     `getRegistryItem`; install with `npx shadcn@latest add` from the item's registry URL.
   - **React Bits** — strongest text and background effects. **Licence is MIT + Commons Clause:
     confirm the client's use is allowed before shipping it.**
4. **21st.dev** — the widest search (12k+ community components) and the most uneven quality.
   MCP tools: `search` and `search_logo` are free; `get_inspiration` re-ranks against the
   project; **`get_component` counts against a daily download limit (2 a day on the free
   plan)** — search widely, retrieve only the one you will use. Skip `generate`. Its MCP needs
   an API key; where the tools are missing, browse `21st.dev` for ideas instead.

Everything in 3 and 4 is React + Tailwind. A different stack takes the idea, not the file.

---

## 3 · Bringing it in

1. **Read the code before installing it.** Strip what the page will not use.
2. **Rewire it to the world.** Every duration, easing, distance, radius and colour now comes from
   the world block in `DESIGN.md`. A literal value surviving from the library is a defect.
3. **Make it pass the floors** — reduced motion, keyboard, contrast, touch. Registry demos often
   skip all four.
4. **Record it** on the `Sourced:` line in `DESIGN.md`: piece · source · licence · what was changed.
   No recorded licence, no ship.

**The test:** put the shipped piece beside its library demo. If a reader could tell which library it
came from, it has not been brought in yet. The critic runs this test (`verify.md`, rubric item 3).

---

## 4 · Mobbin, for the sections that only need to work

The Mobbin MCP's `search_sections` returns real website sections — pricing, footer, signup,
FAQ. Use it for **functional sections only**, and read the results as **the median to beat**, not
a target: they show what typical sites do, and this skill exists to do better than typical. Never
for the hero, the signature, or any section whose job is to convince. Query craft and image rules
are in `product-design/precedent.md` §3–4.
