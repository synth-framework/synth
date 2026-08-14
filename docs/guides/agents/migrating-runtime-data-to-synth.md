---
Title: Runtime Data Location — `.synth/data/` Is the Only Runtime Location
Domain: agents
Audience: agents, operators
Prerequisites: agents/index.md
Knowledge Establishes: Where SYNTH runtime data lives and what to do when a legacy repo-root `data/` directory is present
Depends On: agents/index.md
Version: 1.1.0
Status: stable
---

# Runtime Data Location

All SYNTH runtime data lives under `.synth/data/`. There is no runtime fallback to a repo-root `data/` directory.

- `.synth/data/event-log.jsonl` — canonical event log
- `.synth/data/canonical-state.json` — cached replay projection
- `.synth/data/checkpoints.json` — consumer checkpoints
- `.synth/data/decisions.jsonl` — decision records
- `.synth/data/drafts/` — mission drafts
- `.synth/data/snapshots/` — approved mission model snapshots
- `.synth/data/governance/historical-aliases.json` — canonical identity alias registry
- `.synth/data/cli-errors.jsonl` — best-effort CLI error log

This applies to every project, including the Synth source repository itself. The path helper `dataDir(root)` unconditionally returns `<root>/.synth/data`.

---

## If a repo-root `data/` directory exists

A repo-root `data/` directory may still exist in repositories that predate this convention. It is **not** a runtime location and is **not** read or written by the runtime.

- `data/tasks/` is a project-owned task store and is unrelated to runtime state; leave it alone.
- Any other content under `data/` (event logs, decisions, drafts, snapshots, event-stream, test checkpoints/partitions) is orphaned and may be retired after verifying replay.

To verify nothing depends on it:

```bash
synth explain replay
```

If replay is consistent, the orphaned content can be removed.

---

## Related documents

- [Agent Onboarding](../../../docs/guides/agents/index.md)