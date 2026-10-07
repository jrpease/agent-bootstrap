# Precedent

Real screens from real products, pulled on demand from Mobbin. Read at **Target** (step 3) and
**Inventory** (step 4).

**Precedent is not canon.** `canon.md` holds measured numbers; a precedent set holds pictures of
what shipping products did with *this exact screen*. The canon tells you how dense and how quiet;
precedent tells you how others solved the same task. Neither replaces the other, and no number in
`SCREENS.md` may come from a precedent image.

It exists because the canon has two holes it names itself: craft is measured on **desktop web
only**, motion on **iOS only**. Mobbin covers iOS and web screens, flows and states, so a mobile
run is no longer judged against desktop alone.

---

## 1 · Is it available

At **Inspect**, check the tool list: `search_screens`, `search_flows` and `search_sections` mean the
Mobbin MCP is wired. The server needs a one-time sign-in per account (`/mcp` → mobbin →
Authenticate); a server that lists no tools has not been signed in. No tools → no precedent pull,
and `SCREENS.md` records `Precedent: unavailable — <reason>`.

**What it cannot do:** no Android, no tag or pattern filters, no browsing by app, no video. An
Android surface gets its precedent from the iOS set, recorded as such. Motion still comes from
`canon.md` and `motion.md`.

---

## 2 · The pull

**At Target (step 3)** — the hard screen. For each declared surface (`ios` or `web`), pull **6–10
examples of the hard screen** with `search_screens`, and the flow it sits in with `search_flows`.
Look at every image. Keep the ones that solve the same task, and write one line per keeper on what
it does that a default would not — the same discipline as a canon target.

**At Inventory (step 4)** — the states. Search for the hard screen's **empty, loading, error, dense
and no-results** versions. This is where Mobbin earns most: real products ship these states, and
most generated screens skip them. Each found state goes beside its row in the state inventory.

**Stop at enough.** A set that already shows the solution space is finished. Ten more images of
the same pattern are noise, and every call costs context.

---

## 3 · Query craft

From Mobbin's own tool descriptions — a query written any other way returns worse results.

- **One screen or one flow per query.** Name the concrete elements and how they relate:
  `transaction list with date section headers and a running balance`, not `finance app`.
- **No style words** (`modern`, `clean`, `minimal`), **no negations** (`without ads`), **no keyword
  lists**, **no two intents** in one query.
- **The platform goes in the `platform` parameter, never in the query.**
- **Name an app to narrow:** `Linear issue detail with activity sidebar`.

**Mode.** `search_screens` defaults to `mode: "standard"` for this skill. Use `"deep"` only when
standard returned nothing usable for a nuanced query — a deep search costs 5 AI credits, and a Pro
plan carries 60 a month. `search_flows` and `search_sections` are free.

**Pagination.** `search_screens` has no `page`: pass the IDs already seen in
`exclude_screen_ids`. `search_flows` and `search_sections` take `page`.

**The three shared fields stay identical for the whole run:** `output_destination: "code"`,
`task_intent` (one short English sentence about the task, no verbatim client text or personal
data), and `output_tool` omitted unless the result goes into a named tool next.

---

## 4 · Keep it

**Download every keeper the moment it is pulled.** `image_url` is the hi-res image and **expires
after 30 days**; a precedent set of dead links is no set. Save to `design/precedent/<surface>/`
in the project, named `<app>-<screen>.<ext>`, and list each file in `SCREENS.md` with its
`mobbin_url`.

**Cite every screen you mention** as a link to its `mobbin_url`. Describe what the image shows,
never what the metadata says. If a result carries an `ai_usage_notice`, show it to the client
verbatim.

The saved set goes to the critic (`verify.md`): rubric item 1 ranks the flow against the canon
targets **and** the precedent set.
