#!/usr/bin/env python3
"""Compose agent definitions from the shared body plus a per-agent sidecar.

shared/agents/<name>.md holds the body and the harness-agnostic frontmatter
(name, description). The pinning that expresses the tier is per-harness:

  claude/agents/<name>.meta.yml   ->  model:, tools:  merged into frontmatter
  codex/agents/<name>.meta.toml   ->  keys merged into a role .toml

Claude output is generated into claude/agents/<name>.md (gitignored) and
symlinked from each account, the same shape CLAUDE.md uses — the body cannot
simply be symlinked, because Claude reads `model:`/`tools:` from the file it
loads.

  python3 tools/compose-agents.py --agent claude --out claude/agents
  python3 tools/compose-agents.py --agent codex  --out "$CODEX_HOME/agents"
"""
import argparse
import pathlib
import re
import sys

FM = re.compile(r"\A---\n(?P<fm>.*?)\n---\n(?P<body>.*)\Z", re.S)


def toml_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"""', '\\"\\"\\"')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True, choices=["claude", "codex"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--root", default=".")
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    suffix = "meta.yml" if args.agent == "claude" else "meta.toml"

    written = 0
    for src in sorted((root / "shared/agents").glob("*.md")):
        if src.name == "README.md":
            continue
        m = FM.match(src.read_text())
        if not m:
            print(f"{src}: no frontmatter", file=sys.stderr)
            return 1
        fm, body = m["fm"], m["body"]
        sidecar = root / args.agent / "agents" / f"{src.stem}.{suffix}"
        extra = ""
        if sidecar.exists():
            extra = "\n".join(l for l in sidecar.read_text().splitlines()
                              if l.strip() and not l.lstrip().startswith("#"))

        if args.agent == "claude":
            # Emit `description` as ONE single-quoted line. The shared body folds
            # it across lines for strict-YAML validity; a folded scalar is still
            # valid here, but lib/70-verify.sh reads this field with sed and would
            # print the `>` marker. Single-quoting keeps it both valid and
            # single-line — the same shape Codex's own repair pass produces.
            dm = re.search(r"^description: (.+?)(?=\n[a-z_-]+:|\Z)", fm, re.M | re.S)
            desc = " ".join(dm.group(1).split()).lstrip(">|").strip()
            fm = fm[:dm.start()] + "description: '%s'" % desc.replace("'", "''") + fm[dm.end():]
            text = f"---\n{fm}\n{extra}\n---\n{body}" if extra else f"---\n{fm}\n---\n{body}"
            (out / f"{src.stem}.md").write_text(text)
        else:
            name = re.search(r"^name: (.+)$", fm, re.M).group(1).strip()
            dm = re.search(r"^description: (.+?)(?=\n[a-z_-]+:|\Z)", fm, re.M | re.S)
            desc = " ".join(dm.group(1).split())
            lines = [f'name = "{name}"', f'description = "{toml_escape(desc)}"']
            if extra:
                lines.append(extra)
            lines.append(f'developer_instructions = """\n{toml_escape(body.strip())}\n"""')
            (out / f"{src.stem}.toml").write_text("\n".join(lines) + "\n")
        written += 1

    print(f"composed {written} {args.agent} agent definition(s) -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
