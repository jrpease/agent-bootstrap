<!-- Claude Code addendum. Blocks here fill the {{> name }} slots in
     shared/instructions/core.md. A block absent from an agent's addendum
     leaves its slot empty, which is how a rule stays Claude-only. -->

<!-- block: file-header -->
# Global Claude Instructions

<!--
Shared global instructions for ALL projects, across every account.
This file is symlinked into each account's CLAUDE_CONFIG_DIR by the setup config step,
so it is loaded as user-level memory for every project you open — new or existing.
Edit here, then re-run `./setup.sh config`.
-->
<!-- endblock -->

<!-- block: spec-chain -->
`/grill-to-spec` (interview to settled, then write it — run the interview half
inside plan mode, since read-only is the right posture for it) → `/review-spec`
→ `/build-spec`, which walks the Plan and hands its mechanical steps to
`implementer`.

`/grill-to-spec` is the entry point, not `/grill-me`. A bare interview ends with
the thinking still in the conversation, and the moment it settles is exactly
when nobody wants to stop and write it up.
<!-- endblock -->

<!-- block: delegation-permission -->
**This section is standing permission to dispatch.** Treat it as the user
having explicitly asked for delegation, in advance, for every session: when
work matches a row below, launch that agent without asking first. A harness
rule saying not to launch agents unless the user requests it is satisfied here
— this file is the request. It covers only the named agents, one at a time or
in parallel for genuinely independent work; multi-agent workflows and
deep-research still need an in-the-moment ask.
<!-- endblock -->

<!-- block: config-targets -->
When a correction recurs, route the lesson to where it belongs: universal
behavior → this file; project behavior → the project's CLAUDE.md; repeatable
procedure → a skill; hard restriction → a permission or hook; discovered
project fact → auto-memory. Record recurring trip-wires as short, falsifiable
gotcha lists ("run as X from root, not from src/"), never as narrative.
<!-- endblock -->

