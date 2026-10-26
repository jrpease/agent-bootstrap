"""Unit tests for the Python tools the setup steps run.

Run: python3 -m unittest discover -s tools/tests

Each tool is a script (hyphenated names, not importable), so the tests drive them
the way the steps do: as subprocesses over temporary files. No network, no LastPass,
no real HOME.
"""
import json
import os
import subprocess
import sys
import tempfile
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.join(REPO, "tools")


def run(tool, *args, stdin=None):
    return subprocess.run([sys.executable, os.path.join(TOOLS, tool), *args],
                          input=stdin, capture_output=True, text=True)


class Temp(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = self._tmp.name

    def tearDown(self):
        self._tmp.cleanup()

    def write(self, name, data):
        path = os.path.join(self.dir, name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(data if isinstance(data, str) else json.dumps(data))
        return path


class SettingsMerge(Temp):
    def merge(self, base, runtime=None, overlay=None):
        args = [self.write("base.json", base)]
        if overlay is not None:
            args += ["--overlay", self.write("overlay.json", overlay)]
        if runtime is not None:
            args += ["--runtime", self.write("runtime.json", runtime)]
        r = run("settings-merge.py", *args)
        self.assertEqual(r.returncode, 0, r.stderr)
        return json.loads(r.stdout)

    def test_overlay_wins_and_dicts_merge(self):
        out = self.merge({"a": 1, "p": {"x": 1}}, overlay={"a": 2, "p": {"y": 2}})
        self.assertEqual(out, {"a": 2, "p": {"x": 1, "y": 2}})

    def test_runtime_keeps_automode_but_not_model(self):
        out = self.merge({"model": "opus"}, runtime={"model": "haiku", "autoMode": {"t": 1}, "hook": 1})
        self.assertEqual(out, {"model": "opus", "autoMode": {"t": 1}})

    def test_additive_keys_keep_account_entries_repo_wins(self):
        out = self.merge({"enabledPlugins": {"a": False}},
                         runtime={"enabledPlugins": {"a": True, "b": True}})
        self.assertEqual(out["enabledPlugins"], {"a": False, "b": True})

    def test_env_home_paths_expand(self):
        out = self.merge({"env": {"A": "~/x", "B": "a~/b"}})
        self.assertEqual(out["env"], {"A": os.path.expanduser("~/x"), "B": "a~/b"})


class JsonSame(Temp):
    def test_key_order_and_escaping_dont_matter(self):
        a = self.write("a.json", '{"x": 1, "y": "\\u2014"}')
        b = self.write("b.json", '{"y": "—", "x": 1}')
        self.assertEqual(run("json-same.py", a, b).returncode, 0)

    def test_different_content_differs(self):
        a, b = self.write("a.json", {"x": 1}), self.write("b.json", {"x": 2})
        self.assertNotEqual(run("json-same.py", a, b).returncode, 0)


class Compose(Temp):
    """The committed generated files must match their sources: the live deploy
    refuses a main whose CLAUDE.md or agents are stale."""

    def test_claude_md_matches_sources(self):
        r = run("compose-instructions.py", "--agent", "claude", "--root", REPO)
        self.assertEqual(r.returncode, 0, r.stderr)
        with open(os.path.join(REPO, "claude", "CLAUDE.md")) as f:
            self.assertEqual(r.stdout, f.read(), "claude/CLAUDE.md is stale: run ./setup.sh config")

    def test_agents_match_sources(self):
        r = subprocess.run([sys.executable, os.path.join(TOOLS, "compose-agents.py"),
                            "--agent", "claude", "--out", self.dir, "--root", REPO],
                           capture_output=True, text=True, cwd=REPO)
        self.assertEqual(r.returncode, 0, r.stderr)
        for name in sorted(os.listdir(self.dir)):
            with open(os.path.join(self.dir, name)) as a, \
                 open(os.path.join(REPO, "claude", "agents", name)) as b:
                self.assertEqual(a.read(), b.read(), f"claude/agents/{name} is stale: run ./setup.sh skills")


class McpPlan(Temp):
    SERVERS = {"mcpServers": {
        "web": {"type": "http", "url": "https://a.example/mcp"},
        "tool": {"type": "stdio", "command": "npx", "args": ["-y", "t@1.0.0"]},
        "scoped": {"type": "http", "url": "https://s.example", "accounts": ["work"]},
    }}

    def plan(self, servers=None, registered=None, managed=None, acct="home"):
        acct_dir = os.path.join(self.dir, "acct")
        os.makedirs(acct_dir, exist_ok=True)
        if registered is not None:
            self.write("acct/.claude.json", {"mcpServers": registered})
        if managed is not None:
            self.write("acct/.bootstrap-mcp-servers", "\n".join(managed))
        r = run("mcp-plan.py", self.write("servers.json", servers or self.SERVERS), acct_dir, acct)
        self.assertEqual(r.returncode, 0, r.stderr)
        return {tuple(line.split("\t")[:2]) for line in r.stdout.splitlines()}

    def test_empty_account_adds_everything_in_scope(self):
        p = self.plan()
        self.assertIn(("add", "web"), p)
        self.assertIn(("add", "tool"), p)
        self.assertIn(("skip", "scoped"), p)

    def test_matching_entries_are_ok(self):
        p = self.plan(registered={"web": {"type": "http", "url": "https://a.example/mcp"},
                                  "tool": {"type": "stdio", "command": "npx",
                                           "args": ["-y", "t@1.0.0"], "env": {}}})
        self.assertIn(("ok", "web"), p)
        self.assertIn(("ok", "tool"), p)

    def test_changed_entry_is_replaced(self):
        p = self.plan(registered={"tool": {"type": "stdio", "command": "npx", "args": ["-y", "t@0.9.0"]}})
        self.assertIn(("replace", "tool"), p)

    def test_prunes_only_what_it_managed(self):
        p = self.plan(registered={"old": {"type": "http", "url": "x"}, "mine": {"type": "http", "url": "y"}},
                      managed=["web", "tool", "old"])
        self.assertIn(("prune", "old"), p)
        self.assertNotIn(("prune", "mine"), p)

    def test_first_run_prunes_nothing(self):
        p = self.plan(registered={"old": {"type": "http", "url": "x"}})
        self.assertFalse([a for a in p if a[0] == "prune"])


class PinCheck(Temp):
    def test_unpinned_sources_are_drift(self):
        root = self.dir
        self.write("shared/skill-sources.txt", "https://github.com/o/r skill-a\n")
        self.write("shared/mcp/servers.json", {"mcpServers": {
            "x": {"type": "stdio", "command": "npx", "args": ["-y", "pkg@latest"]}}})
        r = run("pin-check.py", root)
        self.assertEqual(r.returncode, 0, r.stderr)
        kinds = [line.split("\t")[0] for line in r.stdout.splitlines() if line]
        self.assertEqual(kinds, ["drift", "drift"])


class Watch(Temp):
    # Invented names only: the public export rejects real team and domain names.
    NOW = "2026-03-20T12:00:00Z"
    DAY = 86400000

    def site(self, name, status, serving_ms=100 * DAY, deploy=None):
        url = "https://%s.example.com" % name
        p = {"id": "prj_" + name, "name": name,
             "targets": {"production": {"alias": [name + ".example.com"], "createdAt": serving_ms}}}
        f = {"projects": [p], "http": {url: status}, "deploys": {}}
        if deploy:
            f["deploys"]["prj_" + name] = deploy
        return f

    def pr(self, **kw):
        pr = {"repository": {"name": "widget", "nameWithOwner": "someone/widget"}, "number": 7,
              "isDraft": False, "updatedAt": "2026-03-19T00:00:00Z", "mergeable": "MERGEABLE",
              "reviewDecision": "", "statusCheckRollup": []}
        pr.update(kw)
        return pr

    def watch(self, fixture, seen="seen"):
        fixture.setdefault("now", self.NOW)
        r = run("watch.py", "--fixture", self.write("f.json", fixture), "--seen", os.path.join(self.dir, seen))
        self.new = int(r.stderr.split("new: ")[1]) if "new: " in r.stderr else None
        lines = r.stdout.splitlines()
        return r.returncode, lines[1:] if r.returncode else lines   # drop the dated header

    def test_clean(self):
        rc, out = self.watch({**self.site("acme", 200), "prs": [self.pr()]})
        self.assertEqual(rc, 0)
        self.assertTrue(out[0].startswith("watch clean"))

    def test_site_not_serving(self):
        rc, out = self.watch(self.site("acme", {"status": 404, "vercel_error": "NOT_FOUND"}))
        self.assertEqual((rc, out), (1, ["site acme: https://acme.example.com answers 404 (NOT_FOUND)"]))
        _, out = self.watch(self.site("acme", "Could not resolve host"))
        self.assertEqual(out, ["site acme: https://acme.example.com does not answer (Could not resolve host)"])
        _, out = self.watch(self.site("acme", {"status": 200, "login": True}))
        self.assertEqual(out, ["site acme: https://acme.example.com redirects to the Vercel login"])

    def test_site_base_path(self):
        f = self.site("acme", 404)
        f["http"] = {"https://acme.example.com/acme": 200}
        f["base_paths"] = {"acme": "/acme"}
        rc, out = self.watch(f)
        self.assertEqual(rc, 0)
        f["http"] = {"https://acme.example.com/acme": 404}
        _, out = self.watch(f)
        self.assertEqual(out, ["site acme: https://acme.example.com/acme answers 404"])

    def test_failed_deploy_only_when_newer(self):
        newer = {"readyState": "ERROR", "createdAt": 101 * self.DAY}
        _, out = self.watch(self.site("acme", 200, deploy=newer))
        self.assertEqual(len(out), 1)
        self.assertIn("last production deploy ERROR", out[0])
        _, out = self.watch(self.site("acme", 200, deploy={"state": "CANCELED", "createdAt": 101 * self.DAY}))
        self.assertIn("last production deploy CANCELED", out[0])
        older = {"readyState": "ERROR", "createdAt": 99 * self.DAY}
        rc, _ = self.watch(self.site("acme", 200, deploy=older))
        self.assertEqual(rc, 0)

    def test_never_deployed_project_is_skipped(self):
        rc, _ = self.watch({"projects": [{"id": "prj_x", "name": "x", "targets": {}}]})
        self.assertEqual(rc, 0)

    def test_pr_signals(self):
        checks = [{"__typename": "CheckRun", "name": "unit", "conclusion": "FAILURE"},
                  {"__typename": "StatusContext", "context": "deploy", "state": "ERROR"},
                  {"__typename": "CheckRun", "name": "lint", "conclusion": "SUCCESS"}]
        _, out = self.watch({"prs": [self.pr(statusCheckRollup=checks, mergeable="CONFLICTING",
                                             reviewDecision="CHANGES_REQUESTED", updatedAt="2026-03-01T00:00:00Z")]})
        self.assertEqual(out, ["pr widget#7: failing checks (deploy, unit)", "pr widget#7: merge conflict",
                               "pr widget#7: changes requested", "pr widget#7: idle since 2026-03-01"])

    def test_quiet_pr_states(self):
        rc, _ = self.watch({"prs": [self.pr(mergeable="UNKNOWN"),
                                    self.pr(number=8, isDraft=True, updatedAt="2026-01-01T00:00:00Z")]})
        self.assertEqual(rc, 0)

    def test_seen_file_holds_the_run_and_survives_a_failed_gather(self):
        bad = self.site("acme", 500)
        self.watch(bad)
        self.assertEqual(self.new, 1)
        self.watch(bad)
        self.assertEqual(self.new, 0)   # a repeat run notifies nothing
        with open(os.path.join(self.dir, "seen")) as f:
            self.assertEqual(f.read(), "site acme: https://acme.example.com answers 500\n")
        # Vercel unreadable next run: the old site line is kept, not dropped.
        self.watch({"errors": [["site", "watch: could not read Vercel teams (offline)"]]})
        with open(os.path.join(self.dir, "seen")) as f:
            self.assertEqual(f.read().splitlines(), ["watch: could not read Vercel teams (offline)",
                                                     "site acme: https://acme.example.com answers 500"])
        # One project's deployments miss is not a failed site read: nothing is held over.
        self.watch({"errors": [["deploy", "watch: could not read acme deployments (timeout)"]]})
        with open(os.path.join(self.dir, "seen")) as f:
            self.assertEqual(f.read().splitlines(), ["watch: could not read acme deployments (timeout)"])


if __name__ == "__main__":
    unittest.main()
