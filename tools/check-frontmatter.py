#!/usr/bin/env python3
"""Strict-parse the YAML frontmatter of every shared skill and agent.

Claude Code's loader tolerates an unquoted `description:` containing a bare
colon-space; PyYAML does not, and Codex only recovers it through a repair pass
its own source labels a third-party workaround. Run this so a frontmatter that
would need that path fails here instead.

  python3 tools/check-frontmatter.py [--root shared] [--max-description N]
"""
import argparse
import pathlib
import re
import sys

import yaml

FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="shared")
    ap.add_argument("--max-description", type=int, default=None,
                    help="fail if any description exceeds N characters "
                         "(Codex hard-truncates the rendered catalog at 1021)")
    args = ap.parse_args()

    failures, checked = [], 0
    for path in sorted(pathlib.Path(args.root).rglob("*.md")):
        text = path.read_text()
        m = FRONTMATTER.match(text)
        if not m:
            continue
        checked += 1
        try:
            data = yaml.safe_load(m.group(1))
        except yaml.YAMLError as exc:
            failures.append(f"{path}: frontmatter is not valid YAML — {exc}")
            continue
        if not isinstance(data, dict):
            failures.append(f"{path}: frontmatter is not a mapping")
            continue
        for key in ("name", "description"):
            if not data.get(key):
                failures.append(f"{path}: missing or empty `{key}`")
        name = data.get("name") or ""
        if len(name) > 64:
            failures.append(f"{path}: name is {len(name)} chars (Codex caps at 64)")
        if args.max_description:
            desc = data.get("description") or ""
            if len(desc) > args.max_description:
                failures.append(
                    f"{path}: description is {len(desc)} chars "
                    f"(limit {args.max_description})")

    for line in failures:
        print(f"  ✗ {line}", file=sys.stderr)
    if failures:
        print(f"{len(failures)} problem(s) in {checked} frontmatter block(s)",
              file=sys.stderr)
        return 1
    print(f"all {checked} frontmatter blocks parse")
    return 0


if __name__ == "__main__":
    sys.exit(main())
