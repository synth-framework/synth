---
Title: Observability
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md, 09-replay.md
Knowledge Establishes: How to inspect lineage, snapshots, graph health, and replay diagnostics for any project with one command
Depends On: 09-replay.md, 10-recovery.md
Builds Toward: 10-recovery.md
Version: 1.0.0
Status: stable
---

# Observability

## What Is Observability?

Observability is the ability to explain how a Synth project reached its current State without reading source code or hand-inspecting raw files. Every defect can be explained by Replay: the `synth explain` commands render the aggregate graph, snapshot lineage, and replay diagnostics directly from the Event history.

All of these commands are **read-only**. They never modify the Event history, the State, snapshots, or any file they inspect.

## The Commands

| Command | Shows |
|---|---|
| `synth explain replay` | Replay consistency: does the State match the Event history? |
| `synth explain lineage` | The tree from Project to Mission, Expedition, Objective, and Work Item, with broken or missing parents marked inline |
| `synth explain proposals` | How each proposal traces back to observations and Evidence (from persisted snapshots) |
| `synth explain snapshots` | Snapshot version history and parent relationships, with certification status |
| `synth explain graph` | The aggregate graph with per-node status and violation markers |
| `synth explain diagnostics` | Broken or missing parent references (with a per-kind rollup) plus replay attribution: which Events wrote which State fields |
| `synth explain status` | Validation dashboard: Replay, graph integrity, and snapshot certification in one verdict |
| `synth explain all` | Umbrella command: every section above in one run |

## Inspecting Any Example or Project

Every command accepts `--log <path>` to inspect a different Event history than the current project's:

```bash
synth explain all --log examples/first-contact/recorded-journey/evidence-archive-b/events.jsonl
```

State, checkpoint, and snapshot locations are derived from the directory that contains the given log, so any example or project directory works the same way as the current one.

When no snapshots have been persisted next to the inspected log, the snapshot and proposal sections say so explicitly instead of failing.

## Reading the Verdict

`synth explain status` summarizes all hardening validations:

- **Replay** — whether the State is a pure fold of the Event history, and whether the hash chain is intact.
- **Graph integrity** — whether every parent reference in the aggregate graph resolves, reported per invariant.
- **Snapshots** — whether persisted snapshots pass certification, when a snapshot store is present.

The overall verdict is:

| Verdict | Meaning |
|---|---|
| `PASS` | Replay is consistent, the aggregate graph is valid, and snapshots (if any) are certified |
| `WARN` | Replay is consistent but the aggregate graph has violations (reported as warnings) |
| `FAIL` | Replay is inconsistent, the hash chain is broken, or snapshot certification failed |

## Output Modes

Human-readable output is the default. Add `--json` for machine-readable output; every report carries a stable `kind` and `version` field so tooling can depend on it. Add `--summary` to `diagnostics`, `status`, or `all` for compact output.

## When to Use Which Command

- "Is this project healthy?" → `synth explain status`
- "Which Expedition does this Objective belong to?" → `synth explain lineage`
- "Why is this node flagged?" → `synth explain diagnostics`
- "Which Events created or last changed this aggregate?" → `synth explain diagnostics --json`
- "Where did this proposal come from?" → `synth explain proposals`
- "Everything, for a foreign log" → `synth explain all --log <path>`

## Related Documents

- [Replay](09-replay.md) — Understanding State through history
- [Recovery](10-recovery.md) — Using Replay for recovery
- [Graph Integrity](../reference/graph-integrity.md) — The invariant set the graph commands report on
- [Replay Specification](../reference/replay-specification.md) — The formal replay contract

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-16 | Initial stable release (EXP-HARDEN-007) |
