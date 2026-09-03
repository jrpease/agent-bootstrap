#!/usr/bin/env python3
"""Compose an agent's global instruction file from the shared core.

shared/instructions/core.md is the harness-agnostic body. It carries named
slots, `{{> block-name }}`, filled from <agent>/instructions/addendum.md:

    <!-- block: name -->
    ...content...
    <!-- endblock -->

A block absent from an agent's addendum leaves its slot empty — that is how a
rule stays specific to one harness without a second copy of the whole file.

  python3 tools/compose-instructions.py --agent claude > claude/CLAUDE.md
  python3 tools/compose-instructions.py --agent codex  > "$CODEX_HOME/AGENTS.md"
"""
import argparse
import pathlib
import re
import sys

SLOT = re.compile(r"^\{\{> (?P<name>[a-z0-9-]+) \}\}\n(\n)?", re.M)
BLOCK = re.compile(
    r"^<!-- block: (?P<name>[a-z0-9-]+) -->\n(?P<body>.*?)\n<!-- endblock -->$",
    re.M | re.S)

# Scalars that differ per agent. Skill bodies are symlinked, not composed, so
# these apply to the instruction files only.
SCALARS = {
    "claude": {"SKILL_ROOT": "~/.claude/skills", "SKILL_INVOKE": "/"},
    "codex":  {"SKILL_ROOT": "~/.agents/skills", "SKILL_INVOKE": "$"},
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--agent", required=True, choices=sorted(SCALARS))
    ap.add_argument("--root", default=".")
    ap.add_argument("--list-slots", action="store_true",
                    help="print each slot and whether this agent fills it")
    args = ap.parse_args()

    root = pathlib.Path(args.root)
    core = (root / "shared/instructions/core.md").read_text()
    addendum_path = root / args.agent / "instructions/addendum.md"
    addendum = addendum_path.read_text() if addendum_path.exists() else ""
    blocks = {m["name"]: m["body"] for m in BLOCK.finditer(addendum)}

    if args.list_slots:
        for m in SLOT.finditer(core):
            name = m["name"]
            print(f"  {name:<24} {'filled' if name in blocks else 'EMPTY'}")
        unused = set(blocks) - {m["name"] for m in SLOT.finditer(core)}
        for name in sorted(unused):
            print(f"  {name:<24} UNUSED (no slot in core.md)", file=sys.stderr)
        return 1 if unused else 0

    def fill(m: re.Match) -> str:
        body = blocks.get(m["name"])
        if body is None:
            return ""            # no block: drop the slot and its blank line
        return body + "\n" + (m.group(2) or "")

    out = SLOT.sub(fill, core)
    for key, value in SCALARS[args.agent].items():
        out = out.replace("{{%s}}" % key, value)

    leftover = re.search(r"\{\{[>A-Z]", out)
    if leftover:
        print(f"unsubstituted placeholder near: "
              f"{out[leftover.start():leftover.start()+40]!r}", file=sys.stderr)
        return 1

    sys.stdout.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
