---
Title: Agent Path Assumptions — Runtime Data Lives Under `.synth/data/`
Domain: agents
Audience: agents
Prerequisites: agents/index.md
Knowledge Establishes: What path assumptions agents must hold when operating a Synth project
Depends On: agents/index.md
Version: 1.1.0
Status: stable
---

# Agent Path Assumptions

Runtime data for every Synth project lives under `.synth/data/`. There is no runtime fallback to a repo-root `data/` directory, and no ungoverned legacy path.

## Core rule

> Never hard-code `data/` as the runtime data directory. Runtime data always lives under `.synth/data/`.

---

## Checklist

### 1. Always use `.synth/data/` as the runtime directory

The correct paths are:

```
.synth/data/event-log.jsonl
.synth/data/canonical-state.json
.synth/data/drafts/
.synth/data/snapshots/
.synth/data/decisions.jsonl
.synth/data/governance/historical-aliases.json
```

- [ ] Replace all hard-coded `path.join(cwd, "data", ...)` path construction with the SDK path helpers (`dataDir`, `eventLogFile`, `stateFile`, `snapshotsDir`, ...).
- [ ] `.synth/data/` is authoritative when it exists. A repo-root `data/` directory is never read or written by the runtime.

### 2. A repo-root `data/` directory is not runtime state

- [ ] Do not treat `data/event-log.jsonl` (or other `data/` entries) as authoritative.
- [ ] `data/tasks/` is a project-owned task store; do not delete or rewrite it.
- [ ] Orphaned `data/` content may be retired after `synth explain replay` reports consistent.

### 3. Command behavior

- [ ] `synth init` creates `.synth/data/`, never `data/`.
- [ ] `synth status`, `synth explain replay`, and all mutating commands resolve runtime paths from `.synth/data/`.
- [ ] `synth validate` uses `.synth/data/`.

### 4. Tests and fixtures

- [ ] Test fixtures embed `layout.data: ".synth/data/"`.
- [ ] Temporary projects must expect `.synth/data/`.
- [ ] No test should write runtime state under a repo-root `data/` directory; use `os.tmpdir()` or `.synth/data/`.

---

## What does not change

- The event log is still the authority.
- Canonical state is still a projection rebuilt by replay.
- The public vocabulary is still Mission, Expedition, Evidence, Plan, Event, State, Replay.
- Protected Assets are still frozen.
- `npm run govern` is still the canonical validation pipeline.

---

## Related documents

- [Runtime Data Location](migrating-runtime-data-to-synth.md)
- [Agent Onboarding](../../../docs/guides/agents/index.md)