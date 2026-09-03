<!-- Codex addendum. Blocks here fill the {{> name }} slots in
     shared/instructions/core.md. `delegation-permission` is deliberately
     absent: that paragraph exists to override one specific Claude Code
     system-prompt rule, and writing a Codex counterpart would assert a
     harness rule nobody has observed. Add one when friction proves it
     needed, not before. -->

<!-- block: file-header -->
# Global Codex Instructions

<!--
Shared global instructions for ALL projects. GENERATED — do not edit here.
Written into $CODEX_HOME/AGENTS.md by the setup config step, from
shared/instructions/core.md plus codex/instructions/addendum.md.
Edit those, then re-run `./setup.sh config`.
-->
<!-- endblock -->

<!-- block: spec-chain -->
`$grill-to-spec` (interview to settled, then write it) → `$review-spec`
→ `$build-spec`, which walks the Plan and hands its mechanical steps to
`implementer`.

`$grill-to-spec` is the entry point, not `$grill-me`. A bare interview ends with
the thinking still in the conversation, and the moment it settles is exactly
when nobody wants to stop and write it up.
<!-- endblock -->

<!-- block: config-targets -->
When a correction recurs, route the lesson to where it belongs: universal
behavior → this file; project behavior → the project's AGENTS.md; repeatable
procedure → a skill; hard restriction → a permission profile or an execpolicy
rule; discovered project fact → a note in the repo. Record recurring trip-wires
as short, falsifiable gotcha lists ("run as X from root, not from src/"), never
as narrative.
<!-- endblock -->
