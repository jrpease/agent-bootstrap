---
name: shakedown
description: Run a QA audit on a web product with a team of AI testers — frontend and API together, across browsers and devices, logged out and logged in — then verify every finding and hand back a CSV, a report, a list of what the run created, and one draft ticket. Invoked as /shakedown [product] [smoke|standard|full] [prod], or /shakedown [product] resume. Claude Code only.
argument-hint: "[product] [smoke|standard|full] [prod] | [product] resume"
disable-model-invocation: true
---

# Shakedown

A team of agents reads the product's code, then tests it like a room of QA testers. Every finding
is reproduced by a separate verifier before it counts. Nothing gets filed or deleted by the run.

**Announce at start:** "Using shakedown to audit <product>."

Arguments: $ARGUMENTS

`SK` below is this skill's folder: `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/shakedown`.

## The rules that never bend

- **Production is logged out and read only.** A run uses the non-production target unless `prod` is
  given. The harness and API client block every data-changing request on production and never load
  saved logins or the API token there. Testers reach the product only through `$SK/harness/`.
- **One approval.** Nothing launches before the user says "go" on the approval screen (step 5), and
  testers may change data only within the kinds listed on it.
- **Findings count only when a verifier reproduced them.** Everything else is "not confirmed".
- **The run never files tickets and never deletes data.**

Severity, the same for every agent:
- **Blocker:** breaks a core flow, loses data or money, or exposes data, with no workaround.
- **Major:** breaks a feature or a key screen size, but a workaround exists.
- **Minor:** wrong or rough, but the feature still works.
- **Cosmetic:** visual only.

## Step 1: Which product

```bash
python3 "$SK/shakedown.py" product find [name]     # prints the QA folder, or "no match" (exit 2)
```

With no name it finds the product whose config lists the repo you're in. No match and no name:
ask which product. A name with no match: run setup.

## Setup (first run only, then stop)

1. Interview the user for the config fields in `$SK/CONFIG.md`: repos and their kind, the
   non-production and production URLs, roles, devices, and what's off limits. Look up what you can
   (repo paths, cookie names, routes) instead of asking. Suggest the QA folder
   `~/Dev/<product>-qa/`; the user may pick another.
2. Write `<qa>/config.json`, run `python3 "$SK/shakedown.py" validate <qa>/config.json` until it
   prints nothing, then `python3 "$SK/shakedown.py" product add <product> <qa>`.
3. Run `bash "$SK/install.sh"` (Playwright, once per machine).
4. Seed cost data when it exists: `python3 "$SK/shakedown.py" usage seed <file>`.
5. Capture each role except `newuser`: `node "$SK/harness/capture-session.cjs" <qa>/config.json <role>`.
   The user signs in in the Chrome window that opens. API-only products skip this: instead make
   sure the env var named in `api.tokenEnv` is exported, and check it with
   `node "$SK/harness/check-session.cjs" <qa>/config.json <qa> --api-token [a signed-in path]`.
6. Stop. Report the QA folder and roles captured. Testing starts on the next `/shakedown`.

## A run

### Step 2: Prefix and plan

```bash
python3 "$SK/shakedown.py" prefix <qa> "$(date +%m%d)"          # e.g. QA1028, then QA1028b
mkdir -p <qa>/runs/<prefix>                                       # the run folder, <run> below
python3 "$SK/shakedown.py" plan <qa>/config.json <size> [--prod] > <run>/plan.json
```

Size defaults to smoke. `plan` may run again below (dropped roles, product lanes); every time,
repeat the same size and `--prod`, and every flag added since, so the plan only ever narrows.

### Step 3: Sessions

Only when the plan has a `logged-in` stage. For each configured role except `newuser`:
`node "$SK/harness/check-session.cjs" <qa>/config.json <run> <role>`. API-only products use
`--api-token` instead of a role. On EXPIRED, ask: sign in again now (capture-session) or drop the
role from this run by rerunning `plan` with `--drop-role <role>` (repeatable). Logged-in lanes are
cut, with the reason, when no role with a valid session is left.

### Step 4: Prep (in this session, main model)

Read every configured repo and write `<run>/test-map.md`: routes, endpoints, roles, what changed
recently (`git log --since='30 days ago'`), suspects worth testing, and a table matching the
endpoints the frontend calls against the ones the API defines, flagging any on one side only. These
are leads, not facts, and the file says so.

For a `full` run, propose product-specific lanes (logged-in stage only) as a JSON list of
`{key, prompt}` in `<run>/product-lanes.json`, using the same `{{placeholders}}` as `$SK/lanes.json`.
Mark a lane that tests signup or onboarding with `"signup": true`; it uses the `newuser` role.
Rerun `plan` with `--product-lanes <run>/product-lanes.json`. For any run with a logged-in stage, propose the kinds of
data-changing action testers may take, from the test map and `offLimits`, one per line in
`<run>/kinds.txt` (for example "create projects named with the prefix", "edit account settings
and change them back").

### Step 5: The approval screen

```bash
python3 "$SK/shakedown.py" estimate <run>/plan.json
```

Show, in one message:
- product, target (and that production means logged out, read only), size
- agents per model and the total; the token estimate, or "no cost data yet"
- the lanes per stage, and anything cut, with the reason
- the name prefix
- the allowed kinds of change (the user may edit them)
- whether a new-user signup will be captured right after "go" (`plan.json` has `"newuser": true`)
- if the size is standard or full: the Workflow agent limit must allow the total (raise it in
  `/config` if needed)

Wait for "go". Anything not on this screen is forbidden during the run.

### Step 6: Launch

If `plan.json` has `"newuser": true`, capture it now:
`node "$SK/harness/capture-session.cjs" <qa>/config.json newuser`. The user starts signup with a
fresh email in the Chrome window and the script saves the session once signup is under way. It is
single use: this run uses it up. Then:

```bash
python3 "$SK/shakedown.py" render <run>/plan.json <qa>/config.json --prefix <prefix> \
  --kinds <run>/kinds.txt --test-map <run>/test-map.md --run-dir <run> > <run>/args.json
```

Launch the Workflow with `scriptPath: "$SK/workflow/shakedown.js"` (expanded to a real path) and
`args`: the contents of `<run>/args.json` as a JSON value, not a string. It runs in the background.

### Step 7: Reports

When it completes, find the run record from the runId in the tool result and copy it:

```bash
cp "$(find "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/projects" -name "wf_<runId>.json" | head -1)" <run>/workflow-run.json
python3 "$SK/report.py" <run>
python3 "$SK/shakedown.py" usage add <run>/workflow-run.json
```

Tell the user the counts by severity, the most serious few findings, what was created (from
`created.md`), anything unconfirmed or untested, and the paths to `findings.csv`, `report.md` and
`ticket.md`. The ticket is a draft; they file it, bundle it, or drop it.

## Resume

`/shakedown [product] resume` picks up the newest run folder.
- **Same session, workflow killed or paused:** relaunch with Workflow's `resumeFromRunId` and the
  same `scriptPath`; finished agents return cached results. Then step 7.
- **New session:** read the old run's `results.json`. Lanes with a `null` result, and every lane
  when there is no `results.json`, rerun. A stage's QA lead reruns with its lanes; if only the lead
  crashed, name it as `gaps-<stage>`. Pick a new prefix and run folder (step 2), and copy
  `test-map.md`, `kinds.txt` and `product-lanes.json` (whichever exist) from the old run folder
  into the new one, since resume skips prep. Plan with the old run's flags plus
  `--only-lanes <a,b,...>`, which cuts everything else and recomputes the counts. List the old run's leftovers from its `created.md`
  without touching them, check sessions (step 3), and show the approval screen again, saying which
  lanes rerun and why. Then step 6, and step 7 with
  `python3 "$SK/report.py" <run> --prior <old-run>/results.json` so the reports cover both runs.

## Red flags

| Thought | Reality |
|---------|---------|
| "It's just one POST on production, to test the form" | Production is read only. The harness blocks it for a reason; don't route around it with curl. |
| "The tester's evidence looks convincing, count it" | Only a verifier's reproduction counts. Unverified goes under "not confirmed". |
| "I'll clean up the test data at the end" | Deletion is never part of a run. List it in `created.md`; the user decides. |
| "The session expired mid-run, I'll sign in as that user" | Agents never sign in. Report SESSION LOST and continue with the other roles. |
| "I'll file the blockers right away, they're obvious" | The run drafts one ticket. Filing is the user's call. |
