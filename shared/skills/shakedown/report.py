#!/usr/bin/env python3
"""Turn a shakedown run into its reports.

  report.py <run-dir> [--prior <old-run>/results.json]

Reads <run-dir>/workflow-run.json (a copy of the Workflow run record; its .result is the
shakedown script's return value) and <run-dir>/writes.jsonl (the harness's write log), and writes:
  findings.csv  verified findings only, most severe first
  report.md     confirmed by severity, then Not confirmed, Untested, and crashed lanes
  created.md    what the run created, per lane, plus writes no lane accounted for
  ticket.md     one draft summary ticket, never filed by the run
  results.json  per-lane results, read by `resume` to rerun only lanes without one

With --prior (a resumed run), lanes that already had a result in the earlier run and weren't
rerun are merged in, so the reports cover both runs.
"""
import csv
import json
import os
import sys
from collections import Counter

ORDER = {"blocker": 0, "major": 1, "minor": 2, "cosmetic": 3}
COLUMNS = ["severity", "lane", "category", "title", "area", "url", "roles", "profiles",
           "steps", "expected", "actual", "evidence", "cause", "verifier_notes"]


def severity(f):
    return (f.get("verification") or {}).get("severity") or f.get("severity") or "minor"


def verdict(f):
    return (f.get("verification") or {}).get("verdict", "unverified")


def add_lane(lane, findings, created):
    key = lane.get("lane")
    findings += lane.get("findings", [])
    created += [(key, c) for c in lane.get("created", [])]
    created += [(f"verify-{key}", c) for c in lane.get("verifierCreated", [])]


def collect(result, prior=None):
    findings, untested, crashed, created, lanes = [], [], [], [], {}
    for stage in result.get("stages", []):
        for lane in stage.get("lanes", []):
            key = lane.get("lane")
            if lane.get("crashed"):
                crashed.append(f"{stage['name']} / {key}")
                lanes[key] = None
                continue
            lanes[key] = lane
            add_lane(lane, findings, created)
        gaps = stage.get("gaps")
        if gaps:
            findings += gaps.get("findings", [])
            created += [(f"gaps-{stage['name']}", c) for c in gaps.get("created", [])]
            created += [(f"verify-gaps-{stage['name']}", c) for c in gaps.get("verifierCreated", [])]
            untested += [c[len("UNTESTED:"):].strip() for c in gaps.get("coverage", []) if c.startswith("UNTESTED:")]
        else:
            crashed.append(f"{stage['name']} / QA lead")
    old = (prior or {}).get("prefix") or "earlier run"
    for key, lane in ((prior or {}).get("lanes") or {}).items():
        if lane and key not in lanes:
            lanes[key] = lane
            before = len(created)
            add_lane(lane, findings, created)
            created[before:] = [(f"{who} ({old})", c) for who, c in created[before:]]
    # The QA lead reruns on resume; the earlier lead's verified findings still count.
    for stage, gaps in ((prior or {}).get("gaps") or {}).items():
        if gaps:
            findings += [dict(f, lane=f"{f.get('lane', 'gaps-' + stage)} ({old})") for f in gaps.get("findings", [])]
            created += [(f"gaps-{stage} ({old})", c) for c in gaps.get("created", [])]
    return findings, untested, crashed, created, lanes


def read_writes(run_dir):
    path = os.path.join(run_dir, "writes.jsonl")
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def write_csv(path, confirmed):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(COLUMNS)
        for x in confirmed:
            w.writerow([severity(x), x.get("lane", ""), x.get("category", ""), x.get("title", ""),
                        x.get("area", ""), x.get("url", ""), ", ".join(x.get("roles") or []),
                        ", ".join(x.get("profiles") or []), x.get("steps", ""), x.get("expected", ""),
                        x.get("actual", ""), ", ".join(x.get("evidence") or []),
                        x.get("suspectedCause", ""), (x.get("verification") or {}).get("notes", "")])


def report(run_dir, prior_path=None):
    with open(os.path.join(run_dir, "workflow-run.json")) as f:
        result = json.load(f).get("result") or {}
    prior = None
    if prior_path:
        with open(prior_path) as f:
            prior = json.load(f)
    findings, untested, crashed, created, lanes = collect(result, prior)
    confirmed = sorted((f for f in findings if verdict(f) == "confirmed"), key=lambda f: ORDER.get(severity(f), 9))
    others = [f for f in findings if verdict(f) != "confirmed"]
    counts = Counter(severity(f) for f in confirmed)
    tally = ", ".join(f"{counts[s]} {s}" for s in ORDER if counts[s]) or "none"
    name = f"{result.get('product', '?')} {result.get('prefix', '')}".strip()

    write_csv(os.path.join(run_dir, "findings.csv"), confirmed)

    lines = [f"# Shakedown: {name}", "",
             f"Target: {result.get('target', '?')}. Confirmed findings: {len(confirmed)} ({tally}). "
             f"Not confirmed: {len(others)}. Untested gaps: {len(untested)}. Crashed: {len(crashed)}.", ""]
    for sev in ORDER:
        group = [f for f in confirmed if severity(f) == sev]
        if group:
            lines += [f"## {sev.capitalize()} ({len(group)})", ""]
            lines += [f"- **{f.get('title')}** ({f.get('lane')}, {f.get('category')}) {f.get('url', '')}".rstrip() for f in group]
            lines.append("")
    lines += ["## Not confirmed", ""]
    lines += [f"- {verdict(f)}: {f.get('title')} ({f.get('lane')}). {(f.get('verification') or {}).get('notes', '')}".rstrip()
              for f in others] or ["- none"]
    lines += ["", "## Untested", ""] + ([f"- {u}" for u in untested] or ["- none listed"])
    lines += ["", "## Crashed", ""] + ([f"- {c}: returned nothing; `resume` reruns it" for c in crashed] or ["- none"])
    with open(os.path.join(run_dir, "report.md"), "w") as f:
        f.write("\n".join(lines) + "\n")

    # A write is accounted for when its lane reported at least one created entity.
    writes = read_writes(run_dir)
    reporting = {lane for lane, _ in created}
    unmatched = [w for w in writes if w.get("lane") not in reporting]
    out = [f"# Created by {name}", "", "Entities each lane reported creating (type | name | URL). Delete by hand; the run never deletes.", ""]
    out += [f"- {lane}: {c}" for lane, c in created] or ["- nothing reported"]
    out += ["", "## Writes no lane accounted for", "",
            "Data-changing requests from lanes that reported creating nothing. Check these by hand.", ""]
    out += [f"- {w.get('lane')} {w.get('role')} {w.get('method')} {w.get('url')} -> {w.get('status')}" for w in unmatched] or ["- none"]
    out += ["", f"Raw log: `writes.jsonl` ({len(writes)} write(s))."]
    with open(os.path.join(run_dir, "created.md"), "w") as f:
        f.write("\n".join(out) + "\n")

    top = [f for f in confirmed if severity(f) in ("blocker", "major")][:10]
    ticket = [f"# QA shakedown {name}: {len(confirmed)} confirmed issues ({tally})", "",
              f"A shakedown run against {result.get('target', '?')} confirmed {len(confirmed)} issues. "
              "Each was reproduced by a separate verifier.", ""]
    if top:
        ticket += ["Most serious:", ""] + [f"- [{severity(f)}] {f.get('title')}" for f in top] + [""]
    ticket += ["Full list: `findings.csv`. Write-up, unconfirmed findings and untested areas: `report.md`."]
    with open(os.path.join(run_dir, "ticket.md"), "w") as f:
        f.write("\n".join(ticket) + "\n")

    with open(os.path.join(run_dir, "results.json"), "w") as f:
        json.dump({"prefix": result.get("prefix"), "lanes": lanes,
                   "gaps": {s["name"]: s.get("gaps") for s in result.get("stages", [])}}, f, indent=1)
    return {"confirmed": len(confirmed), "notConfirmed": len(others), "untested": len(untested),
            "crashed": crashed, "unmatchedWrites": len(unmatched)}


if __name__ == "__main__":
    argv = sys.argv[1:]
    if len(argv) == 3 and argv[1] == "--prior":
        print(json.dumps(report(argv[0], argv[2])))
    elif len(argv) == 1:
        print(json.dumps(report(argv[0])))
    else:
        sys.exit(__doc__)
