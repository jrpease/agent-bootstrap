#!/usr/bin/env python3
"""Daily check of remote state: Vercel sites that aren't serving, PRs that wait.

Scheduled daily by the health step (lib/72-health.sh). Prints one finding per
line; one "watch clean: <time>" line and exit 0 when there are none. A macOS
notification fires only for findings the last run didn't have, so a known-dead
site doesn't notify every morning. See docs/specs/2026-10-13-watch.md.

  python3 tools/watch.py [--seen PATH] [--fixture FILE.json]

--fixture replaces the network: {"projects": [...], "deploys": {projectId:
deployment}, "http": {url: status | "error" | {...}}, "prs": [...], "errors":
[[kind, line], ...], "now": "ISO time"}, raw API objects as returned. With it,
no notification is sent. Runs on /usr/bin/python3 (3.9) under launchd.
"""
import argparse, datetime, json, os, shutil, subprocess, sys, tempfile

IDLE_DAYS = 7
FAILED_CHECK = {"FAILURE", "TIMED_OUT", "ACTION_REQUIRED", "STARTUP_FAILURE"}
FAILED_STATUS = {"FAILURE", "ERROR"}


# --- gather ------------------------------------------------------------------

def cli_json(args):
    """Run a CLI that prints JSON; return (data, None) or (None, first error line)."""
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=60,
                           cwd=tempfile.gettempdir())   # never inside a linked Vercel project
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, str(e)
    if p.returncode:
        # `vercel api` writes a <claude-code-hint .../> line to stderr inside Claude Code.
        lines = [l.strip() for l in p.stderr.splitlines() if l.strip() and not l.lstrip().startswith("<")]
        return None, lines[0] if lines else "exit %d" % p.returncode
    try:
        return json.loads(p.stdout), None
    except ValueError:
        return None, "unreadable output from " + " ".join(args[:2])


def site_url(serving):
    # Vercel lists the custom domain first today; that ordering is undocumented.
    host = (serving.get("alias") or [None])[0] or serving.get("url")
    return "https://" + host if host else None


def fetch(url):
    # System curl, not urllib: it reads the macOS keychain, where a python.org or
    # Homebrew Python may have no CA bundle and would fail every site on TLS.
    try:
        p = subprocess.run(["curl", "-sS", "-o", "/dev/null", "-L", "-m", "20", "-A", "Mozilla/5.0 (watch)",
                            "-w", "%{http_code} %{url_effective} %header{x-vercel-error}", url],
                           capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"error": str(e)}
    if p.returncode:
        return {"error": (p.stderr.strip().splitlines() or ["curl exit %d" % p.returncode])[0]}
    status, final, verr = (p.stdout + "  ").split(" ", 2)
    # Vercel Authentication redirects to its login page, which answers 200.
    login = final.startswith(("https://vercel.com/login", "https://vercel.com/sso-api"))
    return {"status": int(status), "vercel_error": verr.strip() or None, "login": login}


def gather_deploys(data):
    if not shutil.which("vercel"):
        return
    teams, err = cli_json(["vercel", "api", "/v2/teams"])
    if err:
        data["errors"].append(["site", "watch: could not read Vercel teams (%s)" % err])
        return
    for tid in [t["id"] for t in teams.get("teams", [])] or [None]:
        scope = "&teamId=" + tid if tid else ""
        projects, err = cli_json(["vercel", "api", "/v9/projects?limit=100" + scope])
        if err:
            data["errors"].append(["site", "watch: could not read Vercel projects (%s)" % err])
            continue
        for p in projects.get("projects", []):
            serving = (p.get("targets") or {}).get("production")
            if not serving:
                continue
            data["projects"].append(p)
            url = site_url(serving)
            if url:
                data["http"][url] = fetch(url)
            # Not the project's latestDeployments: that mixes in previews and holds two.
            deps, err = cli_json(["vercel", "api", "/v6/deployments?projectId=%s&target=production&limit=1%s" % (p["id"], scope)])
            if err:
                # Kind "deploy", not "site": one project's miss must not hold every site's old lines.
                data["errors"].append(["deploy", "watch: could not read %s deployments (%s)" % (p["name"], err)])
            elif deps.get("deployments"):
                data["deploys"][p["id"]] = deps["deployments"][0]


def gather_prs(data):
    if not shutil.which("gh"):
        return
    user, err = cli_json(["gh", "api", "user"])
    if err:
        data["errors"].append(["pr", "watch: could not read the GitHub user (%s)" % err])
        return
    prs, err = cli_json(["gh", "search", "prs", "--owner", user["login"], "--state", "open", "--limit", "100",
                         "--json", "repository,number,url,isDraft,updatedAt"])
    if err:
        data["errors"].append(["pr", "watch: could not search open PRs (%s)" % err])
        return
    for pr in prs:
        detail, err = cli_json(["gh", "pr", "view", str(pr["number"]), "-R", pr["repository"]["nameWithOwner"],
                                "--json", "mergeable,reviewDecision,statusCheckRollup"])
        if err:
            data["errors"].append(["pr", "watch: could not read %s#%s (%s)" % (pr["repository"]["name"], pr["number"], err)])
            continue
        pr.update(detail)
        data["prs"].append(pr)


# --- evaluate ----------------------------------------------------------------

def day(ms):
    return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime("%Y-%m-%d")


def site_findings(data):
    out = []
    for p in data["projects"]:
        serving = (p.get("targets") or {}).get("production")
        if not serving:
            continue
        name, url = p["name"], site_url(serving)
        r = data["http"].get(url)
        if isinstance(r, int):
            r = {"status": r}
        elif isinstance(r, str):
            r = {"error": r}
        if r and r.get("error"):
            out.append("site %s: %s does not answer (%s)" % (name, url, r["error"]))
        elif r and r.get("login"):
            out.append("site %s: %s redirects to the Vercel login" % (name, url))
        elif r and r.get("status", 0) >= 400:
            why = " (%s)" % r["vercel_error"] if r.get("vercel_error") else ""
            out.append("site %s: %s answers %s%s" % (name, url, r["status"], why))
        d = data["deploys"].get(p["id"])
        state = d and (d.get("readyState") or d.get("state"))
        if state in ("ERROR", "CANCELED") and d["createdAt"] > serving["createdAt"]:
            out.append("site %s: last production deploy %s on %s — still serving the %s build"
                       % (name, state, day(d["createdAt"]), day(serving["createdAt"])))
    return out


def pr_findings(data, now):
    out = []
    for pr in data["prs"]:
        ref = "pr %s#%s" % (pr["repository"]["name"], pr["number"])
        failing = []
        for c in pr.get("statusCheckRollup") or []:
            if c.get("__typename") == "StatusContext":
                if c.get("state") in FAILED_STATUS:
                    failing.append(c.get("context") or "?")
            elif c.get("conclusion") in FAILED_CHECK:
                failing.append(c.get("name") or "?")
        if failing:
            out.append("%s: failing checks (%s)" % (ref, ", ".join(sorted(set(failing)))))
        if pr.get("mergeable") == "CONFLICTING":   # UNKNOWN: GitHub is still computing
            out.append("%s: merge conflict" % ref)
        if pr.get("reviewDecision") == "CHANGES_REQUESTED":
            out.append("%s: changes requested" % ref)
        updated = datetime.datetime.strptime(pr["updatedAt"][:19], "%Y-%m-%dT%H:%M:%S")
        if not pr.get("isDraft") and now - updated > datetime.timedelta(days=IDLE_DAYS):
            # The date, not a day count: the line must read the same tomorrow.
            out.append("%s: idle since %s" % (ref, updated.strftime("%Y-%m-%d")))
    return out


# --- report ------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seen", default=os.path.expanduser("~/Library/Logs/claude-watch.seen"))
    ap.add_argument("--fixture")
    a = ap.parse_args()

    data = {"projects": [], "deploys": {}, "http": {}, "prs": [], "errors": []}
    if a.fixture:
        with open(a.fixture) as f:
            data.update(json.load(f))
    else:
        for kind, gather in (("site", gather_deploys), ("pr", gather_prs)):
            try:
                gather(data)
            except Exception as e:   # an API shape change must not look like a clean run
                data["errors"].append([kind, "watch: %s check crashed (%s: %s)" % (kind, type(e).__name__, e)])
    now = (datetime.datetime.strptime(data["now"][:19], "%Y-%m-%dT%H:%M:%S") if data.get("now")
           else datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))

    findings = [line for _, line in data["errors"]] + site_findings(data) + pr_findings(data, now)
    try:
        with open(a.seen) as f:
            seen = f.read().splitlines()
    except OSError:
        seen = []
    new = [f for f in findings if f not in seen]
    # A gather step that failed keeps its kind's old lines, so a bad morning
    # doesn't re-notify everything known the day after.
    errored = {kind for kind, _ in data["errors"]}
    keep = findings + [l for l in seen if l.split(" ", 1)[0] in errored and l not in findings]
    os.makedirs(os.path.dirname(os.path.abspath(a.seen)), exist_ok=True)
    with open(a.seen, "w") as f:
        f.write("".join(l + "\n" for l in keep))

    if not findings:
        print("watch clean: " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))
        return 0
    print("watch " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M") + ":")
    print("\n".join(findings))
    if a.fixture:
        print("new: %d" % len(new), file=sys.stderr)
    elif new:
        subprocess.run(["osascript", "-e", 'display notification "%d new — see ~/Library/Logs/claude-watch.log" '
                        'with title "Watch"' % len(new)], capture_output=True)
    return 1


if __name__ == "__main__":
    sys.exit(main())
