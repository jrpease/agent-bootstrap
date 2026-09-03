# Canon sourcing pipeline

Sources and refreshes `canon.md`'s candidate slate. Sourcing is mechanical; **ratification is
not** — the contact sheets exist so a human calls the keeps.

Run from a directory with `playwright` resolvable (symlink `node_modules` from a project that
has it; ESM resolves bare specifiers from the *script's* directory, not `cwd`).

```bash
# 1. sweep the category matrix -> raw.tsv   (server-rendered listing pages)
python3 sweep.py \
  'https://www.awwwards.com/websites/sites_of_the_day/' \
  'https://www.awwwards.com/websites/saas/' \
  'https://www.awwwards.com/websites/technology/' \
  'https://www.awwwards.com/websites/startup/' \
  'https://www.awwwards.com/websites/e-commerce/' \
  'https://www.awwwards.com/websites/fashion/' \
  'https://www.awwwards.com/websites/corporate/' \
  'https://www.awwwards.com/websites/portfolio/' > raw.tsv

# 2. rank studios, harvest each profile's portfolio -> studios.json
python3 harvest.py

# 3. build slate.tsv (balanced, host-deduped), liveness-check -> live.tsv
# 4. capture fold + 45%-scroll stills -> shots/ + shots.json
node capture.mjs "$PWD"

# 5. labelled contact sheets -> sheets/
node sheets.mjs "$PWD"
```

**Why the category matrix.** Left unconstrained the sweep returns almost entirely agency and
campaign work — the mode the skill is pointed at least often. The `saas` / `corporate` /
`e-commerce` quotas are what make the canon usable for B2B product pages.

**Why two frames per candidate.** A fold alone rewards heroes and hides whether the page holds
up. The 45% frame is where most pages go slack.

**Capture notes.** `capture.mjs` dismisses common consent walls before shooting (they otherwise
cover the design) and waits out intro loaders. `sheets.mjs` writes its HTML to disk and
navigates to it — `setContent` gives the page an `about:blank` origin and `file://` images are
then refused.

Derived data (`raw.tsv`, `studios.json`, `slate.tsv`, `live.tsv`, `shots/`, `sheets/`) is
regenerable and deliberately not committed.
