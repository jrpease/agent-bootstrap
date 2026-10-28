"""Unit tests for the shakedown skill's helper (shared/skills/shakedown/shakedown.py).

Run: python3 -m unittest tools.tests.test_shakedown -v

The helper is importable, so plan/render/estimate are tested directly; the CLI is
driven as a subprocess where the exit code is the contract. State goes to a temporary
SHAKEDOWN_HOME, never ~/.config.
"""
import copy
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import unittest

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKILL = os.path.join(REPO, "shared", "skills", "shakedown")
SCRIPT = os.path.join(SKILL, "shakedown.py")

spec = importlib.util.spec_from_file_location("shakedown", SCRIPT)
sd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sd)

def dump(data, path):
    with open(path, "w") as f:
        json.dump(data, f)


with open(os.path.join(SKILL, "config.example.json")) as _f:
    EXAMPLE = json.load(_f)
PRODUCT_LANES = [{"key": "checkout", "prompt": "Lane: CHECKOUT as {{roles}} on {{appUrl}}"},
                 {"key": "invites", "prompt": "Lane: INVITES with prefix {{prefix}}"}]


def api_only_config():
    cfg = copy.deepcopy(EXAMPLE)
    cfg["repos"] = [{"path": "~/Dev/lanternly-api", "kind": "api"}]
    cfg["api"] = {"tokenEnv": "LANTERNLY_TOKEN"}
    return cfg


class Temp(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.dir = self._tmp.name
        self._env = os.environ.get("SHAKEDOWN_HOME")
        os.environ["SHAKEDOWN_HOME"] = os.path.join(self.dir, "home")

    def tearDown(self):
        if self._env is None:
            os.environ.pop("SHAKEDOWN_HOME", None)
        else:
            os.environ["SHAKEDOWN_HOME"] = self._env
        self._tmp.cleanup()

    def cli(self, *args):
        return subprocess.run([sys.executable, SCRIPT, *args], capture_output=True, text=True,
                              env=dict(os.environ))


class Counts(unittest.TestCase):
    def total(self, cfg, size, prod=False, lanes=()):
        return sd.plan(cfg, size, prod, list(lanes))["agents"]["total"]

    def test_web_sizes(self):
        self.assertEqual(self.total(EXAMPLE, "smoke"), 8)
        self.assertEqual(self.total(EXAMPLE, "standard"), 18)
        self.assertEqual(self.total(EXAMPLE, "full", lanes=PRODUCT_LANES), 18 + 2 * len(PRODUCT_LANES))

    def test_prod_cuts_logged_in_stage(self):
        self.assertEqual(self.total(EXAMPLE, "standard", prod=True), 12)
        self.assertEqual(self.total(EXAMPLE, "full", prod=True, lanes=PRODUCT_LANES), 12)
        pl = sd.plan(EXAMPLE, "full", True, PRODUCT_LANES)
        self.assertEqual({c["key"] for c in pl["cut"]},
                         {"permissions", "a11y-responsive-signed-in", "checkout", "invites"})
        self.assertTrue(all("production" in c["reason"] for c in pl["cut"]))

    def test_smoke_is_logged_out_only(self):
        pl = sd.plan(EXAMPLE, "smoke")
        self.assertEqual([s["name"] for s in pl["stages"]], ["logged-out"])
        self.assertEqual(pl["stages"][0]["lanes"], ["a11y-responsive", "shell-auth-pages", "api-contract"])
        self.assertEqual(pl["agents"], {"tester": 3, "main": 5, "total": 8})

    def test_prod_only_config_defaults_to_prod(self):
        cfg = copy.deepcopy(EXAMPLE)
        del cfg["targets"]["nonprod"]
        pl = sd.plan(cfg, "standard")
        self.assertEqual(pl["target"], "prod")
        self.assertEqual(pl["agents"]["total"], 12)

    def test_api_only(self):
        cfg = api_only_config()
        self.assertEqual(self.total(cfg, "smoke"), 4)
        self.assertEqual(self.total(cfg, "standard"), 10)
        self.assertEqual(self.total(cfg, "standard", prod=True), 6)

    def test_no_roles_cuts_logged_in(self):
        cfg = copy.deepcopy(EXAMPLE)
        cfg["roles"] = []
        pl = sd.plan(cfg, "standard")
        self.assertEqual(pl["agents"]["total"], 12)
        self.assertTrue(all(c["reason"] == "no roles configured" for c in pl["cut"]))


class Render(unittest.TestCase):
    def test_fills_every_placeholder(self):
        pl = sd.plan(EXAMPLE, "full", False, PRODUCT_LANES)
        args = sd.render(pl, EXAMPLE, "QA1028", "- create projects", "/qa/runs/QA1028/test-map.md",
                         "/qa/runs/QA1028", "/qa/config.json")
        text = json.dumps(args)
        self.assertNotIn("{{", text)
        self.assertEqual(args["models"], {"tester": "sonnet"})
        lanes = [l["key"] for s in args["stages"] for l in s["lanes"]]
        self.assertEqual(len(lanes), 7 + len(PRODUCT_LANES))
        checkout = next(l for s in args["stages"] for l in s["lanes"] if l["key"] == "checkout")
        self.assertIn("SHAKEDOWN_LANE=checkout", checkout["prompt"])
        self.assertIn("SHAKEDOWN_TARGET=nonprod", checkout["prompt"])
        self.assertIn("- owner: Owns two workspaces", checkout["prompt"])

    def test_prod_rules(self):
        pl = sd.plan(EXAMPLE, "standard", True)
        args = sd.render(pl, EXAMPLE, "QA1028", "", "/t", "/r", "/c")
        prompt = args["stages"][0]["lanes"][0]["prompt"]
        self.assertIn("PRODUCTION", prompt)
        self.assertIn("SHAKEDOWN_TARGET=prod", prompt)
        self.assertIn("Off limits: Billing", prompt)


class Validate(Temp):
    def test_example_is_valid(self):
        self.assertEqual(sd.validate(EXAMPLE), [])
        r = self.cli("validate", os.path.join(SKILL, "config.example.json"))
        self.assertEqual((r.returncode, r.stdout), (0, ""))

    def test_each_required_field(self):
        breaks = {
            "product": lambda c: c.pop("product"),
            "repos": lambda c: c.pop("repos"),
            "repos[0].kind": lambda c: c["repos"][0].update(kind="mobile"),
            "targets": lambda c: c.pop("targets"),
            "roles[0]": lambda c: c["roles"][0].pop("description"),
            "devices": lambda c: c.pop("devices"),
            "offLimits": lambda c: c.pop("offLimits"),
            "session.cookie": lambda c: c.pop("session"),
        }
        for field, breaker in breaks.items():
            cfg = copy.deepcopy(EXAMPLE)
            breaker(cfg)
            problems = sd.validate(cfg)
            self.assertTrue(any(p.startswith(field) for p in problems), (field, problems))

    def test_cli_exit_code(self):
        path = os.path.join(self.dir, "bad.json")
        dump({"product": "x"}, path)
        self.assertEqual(self.cli("validate", path).returncode, 1)


class Products(Temp):
    def test_find_by_name_and_repo(self):
        qa = os.path.join(self.dir, "lanternly-qa")
        repo = os.path.join(self.dir, "lanternly-web")
        os.makedirs(os.path.join(repo, "src"))
        os.makedirs(qa)
        cfg = copy.deepcopy(EXAMPLE)
        cfg["repos"] = [{"path": repo, "kind": "frontend"}]
        dump(cfg, os.path.join(qa, "config.json"))
        sd.product_add("lanternly", qa)
        self.assertEqual(sd.product_find("lanternly"), os.path.realpath(qa))
        self.assertEqual(sd.product_find(cwd=os.path.join(repo, "src")), os.path.realpath(qa))
        self.assertIsNone(sd.product_find(cwd=self.dir))
        r = self.cli("product", "find", "nope")
        self.assertEqual((r.returncode, r.stdout.strip()), (2, "no match"))

    def test_sibling_repo_does_not_match(self):
        qa = os.path.join(self.dir, "qa")
        os.makedirs(qa)
        os.makedirs(os.path.join(self.dir, "web-v2"))
        cfg = copy.deepcopy(EXAMPLE)
        cfg["repos"] = [{"path": os.path.join(self.dir, "web"), "kind": "frontend"}]
        dump(cfg, os.path.join(qa, "config.json"))
        sd.product_add("p", qa)
        self.assertIsNone(sd.product_find(cwd=os.path.join(self.dir, "web-v2")))


class Prefix(Temp):
    def test_letters(self):
        self.assertEqual(sd.prefix(self.dir, "1028"), "QA1028")
        os.makedirs(os.path.join(self.dir, "runs", "QA1028"))
        self.assertEqual(sd.prefix(self.dir, "1028"), "QA1028b")
        os.makedirs(os.path.join(self.dir, "runs", "QA1028b"))
        self.assertEqual(sd.prefix(self.dir, "1028"), "QA1028c")
        self.assertEqual(sd.prefix(self.dir, "1029"), "QA1029")


class Usage(Temp):
    RUN = {"runId": "wf_test", "workflowProgress": [
        {"type": "workflow_phase", "index": 1, "title": "Spike"},
        {"type": "workflow_agent", "label": "t", "model": "claude-sonnet-5-5", "tokens": 50000},
        {"type": "workflow_agent", "label": "v", "model": "claude-opus-5-5[1m]", "tokens": 90000},
        {"type": "workflow_agent", "label": "x", "model": "claude-opus-5-5[1m]"},
    ]}

    def test_no_data(self):
        out = sd.estimate(sd.plan(EXAMPLE, "smoke"))
        self.assertEqual(out["note"], "no cost data yet")
        self.assertIsNone(out["estimate"])

    def test_add_and_estimate(self):
        self.assertEqual(sd.usage_add(self.RUN), 2)  # the entry with no tokens is skipped
        out = sd.estimate(sd.plan(EXAMPLE, "smoke"))
        self.assertEqual(out["estimate"], 3 * 50000 + 5 * 90000)

    def test_seed_missing_file_is_a_no_op(self):
        r = self.cli("usage", "seed", os.path.join(self.dir, "absent.json"))
        self.assertEqual(r.returncode, 0)
        self.assertIn("nothing seeded", r.stdout)



rspec = importlib.util.spec_from_file_location("shakedown_report", os.path.join(SKILL, "report.py"))
rp = importlib.util.module_from_spec(rspec)
rspec.loader.exec_module(rp)


def finding(title, sev, verdict, lane, vsev=None):
    v = {"verdict": verdict, "notes": f"{verdict} notes"}
    if vsev:
        v["severity"] = vsev
    return {"title": title, "severity": sev, "category": "bug", "area": "a", "steps": "s",
            "expected": "e", "actual": "x", "lane": lane, "verification": v}


class Reports(Temp):
    RESULT = {"product": "lanternly", "target": "nonprod", "prefix": "QA1028", "stages": [
        {"name": "logged-out", "lanes": [
            {"lane": "api-contract", "coverage": ["GET /items"], "created": [], "findings": [
                finding("500 on page=-1", "major", "confirmed", "api-contract"),
                finding("slow list", "minor", "not-reproduced", "api-contract")]},
            {"lane": "shell-auth-pages", "crashed": True}],
         "gaps": {"coverage": ["tested deep links", "UNTESTED: locale switcher"], "created": [],
                  "findings": [finding("404 page unstyled", "minor", "confirmed", "gaps-logged-out", vsev="cosmetic")]}},
        {"name": "logged-in", "lanes": [
            {"lane": "permissions", "coverage": [], "created": ["project | QA1028 permissions Target | https://app/p/1"],
             "findings": [finding("member can delete owner project", "major", "confirmed", "permissions", vsev="blocker")]},
            {"lane": "invites", "coverage": [], "created": [], "findings": []}],
         "gaps": None}]}
    WRITES = [{"lane": "permissions", "role": "member", "method": "POST", "url": "https://api/p", "status": 201},
              {"lane": "invites", "role": "owner", "method": "POST", "url": "https://api/invite", "status": 201}]

    def run_report(self):
        run = os.path.join(self.dir, "run")
        os.makedirs(run)
        dump({"runId": "wf_x", "result": self.RESULT}, os.path.join(run, "workflow-run.json"))
        with open(os.path.join(run, "writes.jsonl"), "w") as f:
            f.write("\n".join(json.dumps(w) for w in self.WRITES) + "\n")
        return run, rp.report(run)

    def read(self, run, name):
        with open(os.path.join(run, name)) as f:
            return f.read()

    def test_csv_is_verified_only_most_severe_first(self):
        run, summary = self.run_report()
        rows = self.read(run, "findings.csv").splitlines()
        self.assertEqual(len(rows), 1 + 3)
        self.assertTrue(rows[1].startswith("blocker,permissions"))
        self.assertTrue(rows[2].startswith("major,api-contract"))
        self.assertTrue(rows[3].startswith("cosmetic,gaps-logged-out"))  # verifier's severity wins
        self.assertEqual(summary["confirmed"], 3)

    def test_report_sections(self):
        run, summary = self.run_report()
        text = self.read(run, "report.md")
        for heading in ("## Blocker (1)", "## Major (1)", "## Cosmetic (1)", "## Not confirmed", "## Untested", "## Crashed"):
            self.assertIn(heading, text)
        self.assertIn("not-reproduced: slow list", text)
        self.assertIn("- locale switcher", text)
        self.assertIn("logged-out / shell-auth-pages", text)
        self.assertIn("logged-in / QA lead", text)

    def test_created_and_unmatched_writes(self):
        run, summary = self.run_report()
        text = self.read(run, "created.md")
        self.assertIn("permissions: project | QA1028 permissions Target", text)
        self.assertIn("invites owner POST https://api/invite", text)
        self.assertNotIn("member POST https://api/p", text)
        self.assertEqual(summary["unmatchedWrites"], 1)

    def test_ticket_and_results(self):
        run, _ = self.run_report()
        self.assertIn("3 confirmed issues (1 blocker, 1 major, 1 cosmetic)", self.read(run, "ticket.md"))
        results = json.loads(self.read(run, "results.json"))
        self.assertIsNone(results["lanes"]["shell-auth-pages"])
        self.assertEqual(results["lanes"]["permissions"]["lane"], "permissions")



class Fixes(Temp):
    def test_drop_role_and_rerun_only(self):
        pl = sd.plan(EXAMPLE, "standard", False, [], drop_roles=["member"])
        self.assertEqual(pl["roles"], ["owner", "newuser"])
        self.assertEqual(pl["agents"]["total"], 18)  # owner still covers the logged-in lanes
        pl = sd.plan(EXAMPLE, "standard", False, [], drop_roles=["owner", "member"])
        self.assertEqual(pl["agents"]["total"], 12)
        self.assertTrue(any(c["reason"] == "no roles left with a valid session" for c in pl["cut"]))
        pl = sd.plan(EXAMPLE, "standard", False, [], only_lanes=["api-contract", "permissions"])
        self.assertEqual(pl["agents"], {"tester": 2, "main": 6, "total": 8})
        args = sd.render(sd.plan(EXAMPLE, "standard", False, [], drop_roles=["member"]), EXAMPLE, "QA1", "", "/t", "/r", "/c")
        logged_in = next(st for st in args["stages"] if st["name"] == "logged-in")
        self.assertNotIn("- member:", logged_in["lanes"][0]["prompt"])

    def test_signup_lane_needs_newuser(self):
        lanes = [{"key": "signup-flow", "prompt": "Lane: SIGNUP", "signup": True}]
        self.assertTrue(sd.plan(EXAMPLE, "full", False, lanes)["newuser"])
        self.assertFalse(sd.plan(EXAMPLE, "standard", False, lanes)["newuser"])
        pl = sd.plan(EXAMPLE, "full", False, lanes, drop_roles=["newuser"])
        self.assertFalse(pl["newuser"])
        self.assertIn({"key": "signup-flow", "reason": "the newuser role was dropped"}, pl["cut"])

    def test_render_devices_prefix_and_lead_lane(self):
        args = sd.render(sd.plan(EXAMPLE, "smoke"), EXAMPLE, "QA1028", "", "/t", "/r", "/c")
        stage = args["stages"][0]
        self.assertIn("desktop-chrome, desktop-safari", stage["lanes"][0]["prompt"])
        self.assertIn('"QA1028 a11y-responsive"', stage["lanes"][0]["prompt"])  # logged-out testers get the prefix
        self.assertIn("(none: read only)", stage["lanes"][0]["prompt"])
        self.assertIn("SHAKEDOWN_LANE=gaps-logged-out", stage["common"])

    def test_verifier_writes_are_accounted_for_and_prior_merges(self):
        run = os.path.join(self.dir, "run")
        os.makedirs(run)
        result = {"product": "p", "target": "nonprod", "prefix": "QA1028b", "stages": [{"name": "logged-in", "lanes": [
            {"lane": "permissions", "coverage": [], "created": [], "verifierCreated": ["project | QA1028b verify-permissions x | u"],
             "findings": [finding("idor", "major", "confirmed", "permissions")]}], "gaps": None}]}
        dump({"result": result}, os.path.join(run, "workflow-run.json"))
        with open(os.path.join(run, "writes.jsonl"), "w") as f:
            f.write(json.dumps({"lane": "verify-permissions", "role": "member", "method": "POST", "url": "u", "status": 201}) + "\n")
        prior = os.path.join(self.dir, "prior.json")
        dump({"prefix": "QA1028", "lanes": {
            "api-contract": {"lane": "api-contract", "created": [], "findings": [finding("old 500", "major", "confirmed", "api-contract")]},
            "permissions": None}}, prior)
        summary = rp.report(run, prior)
        self.assertEqual(summary["unmatchedWrites"], 0)
        self.assertEqual(summary["confirmed"], 2)
        with open(os.path.join(run, "results.json")) as f:
            lanes = json.load(f)["lanes"]
        self.assertEqual(set(lanes), {"permissions", "api-contract"})



class ResumeFixes(Temp):
    def test_lead_only_resume_keeps_the_stage(self):
        pl = sd.plan(EXAMPLE, "standard", False, [], only_lanes=["gaps-logged-in"])
        self.assertEqual(pl["stages"], [{"name": "logged-in", "lanes": []}])
        self.assertEqual(pl["agents"]["total"], 2)

    def test_misspelled_lane_warns(self):
        cfg = os.path.join(SKILL, "config.example.json")
        r = self.cli("plan", cfg, "standard", "--only-lanes", "permisions")
        self.assertIn("matches no lane", r.stderr)

    def test_newuser_only_in_signup_runs(self):
        args = sd.render(sd.plan(EXAMPLE, "standard"), EXAMPLE, "QA1", "", "/t", "/r", "/c")
        prompt = next(st for st in args["stages"] if st["name"] == "logged-in")["lanes"][0]["prompt"]
        self.assertNotIn("- newuser:", prompt)
        lanes = [{"key": "signup-flow", "prompt": "Lane: SIGNUP", "signup": True}]
        args = sd.render(sd.plan(EXAMPLE, "full", False, lanes), EXAMPLE, "QA1", "", "/t", "/r", "/c")
        prompt = next(st for st in args["stages"] if st["name"] == "logged-in")["lanes"][0]["prompt"]
        self.assertIn("- newuser:", prompt)

    def test_prior_keeps_old_lead_findings_and_labels_old_entities(self):
        old = os.path.join(self.dir, "old")
        os.makedirs(old)
        dump({"result": {"product": "p", "target": "nonprod", "prefix": "QA1028", "stages": [
            {"name": "logged-in", "lanes": [
                {"lane": "permissions", "coverage": [], "created": ["team | QA1028 permissions t | u"], "findings": []},
                {"lane": "a11y-responsive-signed-in", "crashed": True}],
             "gaps": {"coverage": [], "created": [], "findings": [finding("lead found it", "major", "confirmed", "gaps-logged-in")]}}]}},
             os.path.join(old, "workflow-run.json"))
        rp.report(old)
        new = os.path.join(self.dir, "new")
        os.makedirs(new)
        dump({"result": {"product": "p", "target": "nonprod", "prefix": "QA1028b", "stages": [
            {"name": "logged-in", "lanes": [{"lane": "a11y-responsive-signed-in", "coverage": [], "created": [], "findings": []}],
             "gaps": {"coverage": [], "created": [], "findings": []}}]}}, os.path.join(new, "workflow-run.json"))
        summary = rp.report(new, os.path.join(old, "results.json"))
        self.assertEqual(summary["confirmed"], 1)
        with open(os.path.join(new, "report.md")) as f:
            self.assertIn("lead found it", f.read())
        with open(os.path.join(new, "created.md")) as f:
            self.assertIn("permissions (QA1028): team | QA1028 permissions t", f.read())


if __name__ == "__main__":
    unittest.main()
