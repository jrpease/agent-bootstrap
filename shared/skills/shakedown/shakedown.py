#!/usr/bin/env python3
"""Shakedown helper: products, run plans, Workflow args, cost estimates, run prefixes.

  shakedown.py product find [name]
  shakedown.py product add <name> <qa-folder>
  shakedown.py validate <config.json>
  shakedown.py plan <config.json> <smoke|standard|full> [--prod] [--product-lanes lanes.json]
                   [--drop-role R]... [--only-lanes a,b]
  shakedown.py render <plan.json> <config.json> --prefix P --kinds kinds.txt --test-map PATH --run-dir DIR
  shakedown.py estimate <plan.json>
  shakedown.py usage add <wf-run.json>
  shakedown.py usage seed <file>
  shakedown.py prefix <qa-folder> <MMDD>

State lives in $SHAKEDOWN_HOME (default ~/.config/shakedown): products.json and usage.json.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SIZES = ("smoke", "standard", "full")
STAGES = ("logged-out", "logged-in")
KINDS = ("frontend", "api")


def home():
    return os.path.expanduser(os.environ.get("SHAKEDOWN_HOME", "~/.config/shakedown"))


def load(path, default=None):
    if default is not None and not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)


def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path + ".tmp", "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    os.replace(path + ".tmp", path)


def expand(p):
    return os.path.realpath(os.path.expanduser(p))


# --- products -------------------------------------------------------------

def product_find(name=None, cwd=None):
    index = load(os.path.join(home(), "products.json"), {})
    if name:
        return index.get(name)
    cwd = expand(cwd or os.getcwd())
    for folder in index.values():
        cfg_path = os.path.join(folder, "config.json")
        if not os.path.exists(cfg_path):
            continue
        for repo in load(cfg_path).get("repos", []):
            root = expand(repo["path"])
            if cwd == root or cwd.startswith(root + os.sep):
                return folder
    return None


def product_add(name, folder):
    path = os.path.join(home(), "products.json")
    index = load(path, {})
    index[name] = expand(folder)
    save(path, index)


# --- config ---------------------------------------------------------------

def validate(cfg):
    problems = []
    if not re.fullmatch(r"[a-z0-9-]+", str(cfg.get("product", ""))):
        problems.append("product: required, lowercase letters, digits and '-'")
    repos = cfg.get("repos")
    if not repos:
        problems.append("repos: at least one {path, kind}")
    for i, r in enumerate(repos or []):
        if not r.get("path"):
            problems.append(f"repos[{i}].path: required")
        if r.get("kind") not in KINDS:
            problems.append(f"repos[{i}].kind: one of {', '.join(KINDS)}")
    targets = cfg.get("targets") or {}
    if not (targets.get("nonprod") or targets.get("prod")):
        problems.append("targets: need nonprod, prod, or both")
    for t, v in targets.items():
        if t not in ("nonprod", "prod"):
            problems.append(f"targets.{t}: unknown target")
        elif v and not v.get("app") and not v.get("api"):
            problems.append(f"targets.{t}: needs app and/or api URL")
    for i, r in enumerate(cfg.get("roles") or []):
        if not r.get("name") or not r.get("description"):
            problems.append(f"roles[{i}]: needs name and description")
    if not isinstance(cfg.get("devices"), list) or not cfg.get("devices"):
        problems.append("devices: at least one profile name")
    if not isinstance(cfg.get("offLimits"), list):
        problems.append("offLimits: required list (may be empty)")
    if cfg.get("roles") and not (cfg.get("session") or {}).get("cookie") and not api_only(cfg):
        problems.append("session.cookie: required when roles are configured")
    return problems


def api_only(cfg):
    return not any(r.get("kind") == "frontend" for r in cfg.get("repos", []))


# --- plan -----------------------------------------------------------------

def standard_lanes():
    return load(os.path.join(HERE, "lanes.json"))


def plan(cfg, size, prod=False, product_lanes=(), drop_roles=(), only_lanes=None):
    """drop_roles: roles whose sessions expired (they leave the run). only_lanes: rerun just these (resume)."""
    if size not in SIZES:
        raise ValueError(f"size must be one of {', '.join(SIZES)}")
    targets = cfg.get("targets") or {}
    target = "prod" if prod or not targets.get("nonprod") else "nonprod"
    only_api = api_only(cfg)
    lanes, cut = [], []
    for lane in standard_lanes()["lanes"]:
        if only_api and not lane["apiOnly"]:
            continue
        if size == "smoke" and not lane["smoke"]:
            continue
        lanes.append({"key": lane["key"], "stage": lane["stage"], "standard": True})
    if size == "full":
        lanes += [{"key": p["key"], "stage": "logged-in", "standard": False, "signup": bool(p.get("signup"))}
                  for p in product_lanes]
    roles = [r["name"] for r in cfg.get("roles") or [] if r["name"] not in drop_roles]
    kept = []
    for lane in lanes:
        reason = None
        if only_lanes is not None and lane["key"] not in only_lanes:
            reason = "not rerun: it already has a result"
        elif lane["stage"] == "logged-in":
            if target == "prod":
                reason = "production allows logged-out testing only"
            elif not cfg.get("roles"):
                reason = "no roles configured"
            elif not [x for x in roles if x != "newuser"]:
                reason = "no roles left with a valid session"
            elif lane.get("signup") and "newuser" not in roles:
                reason = "the newuser role was dropped"
        if reason:
            cut.append({"key": lane["key"], "reason": reason})
        else:
            kept.append(lane)
    stages = [{"name": s, "lanes": [l["key"] for l in kept if l["stage"] == s]} for s in STAGES]
    # A stage stays when it has lanes, or when a resume asks for just its QA lead (gaps-<stage>).
    stages = [s for s in stages if s["lanes"] or (only_lanes and f"gaps-{s['name']}" in only_lanes)]
    testers = sum(len(s["lanes"]) for s in stages)
    main = testers + 2 * len(stages)  # a verifier per lane, a lead + verifier per stage
    if only_lanes is not None:
        known = {l["key"] for l in lanes} | {f"gaps-{s}" for s in STAGES}
        for k in only_lanes:
            if k not in known:
                print(f"warning: --only-lanes {k} matches no lane", file=sys.stderr)
    in_run = {k for s in stages for k in s["lanes"]}
    return {
        "product": cfg["product"], "size": size, "target": target, "apiOnly": only_api,
        "stages": stages, "cut": cut, "roles": roles, "droppedRoles": list(drop_roles),
        "newuser": any(l.get("signup") and l["key"] in in_run for l in lanes),
        "productLanes": [p for p in product_lanes if p["key"] in in_run],
        "agents": {"tester": testers, "main": main, "total": testers + main},
    }


# --- render ---------------------------------------------------------------

def fill(text, values):
    out = re.sub(r"\{\{(\w+)\}\}", lambda m: values[m.group(1)], text)
    if "{{" in out:
        raise ValueError("unfilled placeholder")
    return out


def hard_rules(cfg, target, app):
    if target == "prod":
        rules = [f"- Target is PRODUCTION ({app}): logged out and read only. GET requests only, no form "
                 "submissions that create or change data. The harness and API client block anything else."]
    else:
        rules = [f"- Target is {app} (non-production). Change data only within the allowed kinds, and only "
                 "entities named with this run's prefix."]
    rules += [f"- Off limits: {x}" for x in cfg.get("offLimits", [])]
    return "\n".join(rules)


def render(pl, cfg, prefix, kinds, test_map, run_dir, config_path):
    lib = standard_lanes()
    t = cfg["targets"][pl["target"]]
    repos = lambda kind: ", ".join(r["path"] for r in cfg["repos"] if r["kind"] == kind) or "(none)"
    keep = set(pl.get("roles", [r["name"] for r in cfg.get("roles", [])]))
    if not pl.get("newuser"):
        keep.discard("newuser")  # only a run with a signup lane captures it
    roles = "\n".join(f"- {r['name']}: {r['description']}" for r in cfg.get("roles", []) if r["name"] in keep) or "(none)"
    prompts = {l["key"]: l["prompt"] for l in lib["lanes"]}
    prompts.update({p["key"]: p["prompt"] for p in pl.get("productLanes", [])})
    harness = os.path.join(HERE, "harness")

    def values(lane):
        return {
            "appUrl": t.get("app") or "(no app)", "apiUrl": t.get("api") or "(no API)",
            "frontendRepos": repos("frontend"), "apiRepos": repos("api"), "roles": roles,
            "prefix": prefix, "allowedKinds": kinds or "(none: read only)", "harness": harness,
            "testMap": test_map, "runDir": run_dir, "lane": lane, "devices": ", ".join(cfg.get("devices", [])),
            "hardRules": hard_rules(cfg, pl["target"], t.get("app") or t.get("api")),
        }

    def env(lane):
        return (f"\n\nSet these for every script you run: SHAKEDOWN_CONFIG={config_path} "
                f"SHAKEDOWN_TARGET={pl['target']} SHAKEDOWN_RUN={run_dir} SHAKEDOWN_LANE={lane}")

    stages = []
    for s in pl["stages"]:
        common = lib["common"][s["name"]]
        stages.append({
            "name": s["name"],
            # The QA lead works under this lane name; verifiers are told their own (verify-<lane>).
            "common": fill(common, values(f"gaps-{s['name']}")) + env(f"gaps-{s['name']}"),
            "lanes": [{"key": k, "prompt": fill(common, values(k)) + "\n\n" + fill(prompts[k], values(k)) + env(k)}
                      for k in s["lanes"]],
        })
    return {"product": pl["product"], "target": pl["target"], "prefix": prefix,
            "models": {"tester": "sonnet"}, "stages": stages}


# --- usage and estimate ---------------------------------------------------

def usage_path():
    return os.path.join(home(), "usage.json")


def agents_in(run_record):
    for p in run_record.get("workflowProgress") or []:
        if p.get("type") == "workflow_agent" and isinstance(p.get("tokens"), (int, float)) and p.get("model"):
            yield {"model": p["model"], "tokens": p["tokens"]}


def usage_add(run_record):
    data = load(usage_path(), {"agents": []})
    new = list(agents_in(run_record))
    data["agents"] += [dict(a, run=run_record.get("runId")) for a in new]
    save(usage_path(), data)
    return len(new)


def is_tester(model):
    return "sonnet" in model


def estimate(pl):
    agents = load(usage_path(), {"agents": []})["agents"]
    avg = {}
    for role, pick in (("tester", is_tester), ("main", lambda m: not is_tester(m))):
        xs = [a["tokens"] for a in agents if pick(a["model"])]
        avg[role] = sum(xs) / len(xs) if xs else None
    if avg["tester"] is None or avg["main"] is None:
        return {"estimate": None, "note": "no cost data yet", "agents": pl["agents"]}
    tokens = pl["agents"]["tester"] * avg["tester"] + pl["agents"]["main"] * avg["main"]
    return {"estimate": round(tokens), "unit": "tokens", "note": "estimate from past runs",
            "perAgent": {k: round(v) for k, v in avg.items()}, "agents": pl["agents"]}


# --- prefix ---------------------------------------------------------------

def prefix(qa_folder, mmdd):
    if not re.fullmatch(r"\d{4}", mmdd):
        raise ValueError("date must be MMDD")
    runs = os.path.join(qa_folder, "runs")
    for suffix in [""] + [chr(c) for c in range(ord("b"), ord("z") + 1)]:
        candidate = f"QA{mmdd}{suffix}"
        if not os.path.exists(os.path.join(runs, candidate)):
            return candidate
    raise ValueError("more than 25 runs in one day")


# --- cli ------------------------------------------------------------------

def opt(args, name):
    i = args.index(name)
    return args[i + 1]


def main(argv):
    if not argv:
        sys.exit(__doc__)
    cmd, args = argv[0], argv[1:]
    if cmd == "product" and args[:1] == ["find"]:
        folder = product_find(args[1] if len(args) > 1 else None)
        if not folder:
            print("no match")
            return 2
        print(folder)
    elif cmd == "product" and args[:1] == ["add"]:
        product_add(args[1], args[2])
    elif cmd == "validate":
        problems = validate(load(args[0]))
        for p in problems:
            print(p)
        return 1 if problems else 0
    elif cmd == "plan":
        cfg = load(args[0])
        lanes = load(opt(args, "--product-lanes")) if "--product-lanes" in args else []
        drop = [args[i + 1] for i, a in enumerate(args) if a == "--drop-role"]
        only = opt(args, "--only-lanes").split(",") if "--only-lanes" in args else None
        print(json.dumps(plan(cfg, args[1], "--prod" in args, lanes, drop, only), indent=2))
    elif cmd == "render":
        kinds_file = opt(args, "--kinds")
        kinds = ""
        if os.path.exists(kinds_file):
            with open(kinds_file) as f:
                kinds = f.read().strip()
        print(json.dumps(render(load(args[0]), load(args[1]), opt(args, "--prefix"), kinds,
                                opt(args, "--test-map"), opt(args, "--run-dir"), expand(args[1])), indent=2))
    elif cmd == "estimate":
        print(json.dumps(estimate(load(args[0])), indent=2))
    elif cmd == "usage" and args[:1] == ["add"]:
        print(f"added {usage_add(load(args[1]))} agents")
    elif cmd == "usage" and args[:1] == ["seed"]:
        if not os.path.exists(args[1]):
            print(f"no usage file at {args[1]}; nothing seeded")
            return 0
        print(f"seeded {usage_add(load(args[1]))} agents")
    elif cmd == "prefix":
        print(prefix(args[0], args[1]))
    else:
        sys.exit(__doc__)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
