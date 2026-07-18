---
Title: Agent Update Checklist — v2.1.0 Runtime Data Boundary
Domain: agents
Audience: agents
Prerequisites: agents/index.md
Knowledge Establishes: What agents must change when operating a Synth v2.1.0+ project
Depends On: agents/index.md
Version: 1.0.0
Status: stable
---

# Agent Update Checklist — v2.1.0 Runtime Data Boundary

Synth v2.1.0 moves runtime data for governed projects from the repository-root `data/` directory into `.synth/data/`. This checklist is for agents that operate Synth projects to update their path assumptions and operational behavior.

## Core rule

> Do not hard-code `data/` as the runtime data directory. Use the path resolution logic exposed by the Synth CLI and runtime, or infer the correct directory from the presence of `.synth/manifest.json`.

For governed projects (`.synth/manifest.json` exists), runtime data lives under `.synth/data/`.
For ungoverned directories, the legacy repo-root `data/` path is still used.

---

## Checklist

### 1. Stop assuming `data/` is the runtime directory

Before v2.1.0, agents could assume:

```
data/event-log.jsonl
data/canonical-state.json
data/drafts/
data/snapshots/
```

After v2.1.0, the correct paths for governed projects are:

```
.synth/data/event-log.jsonl
.synth/data/canonical-state.json
.synth/data/drafts/
.synth/data/snapshots/
```

- [ ] Replace all hard-coded `path.join(cwd, "data", ...)` path construction with `src/infra/paths.ts` helpers (`getRuntimeDataDir`, `getRuntimeSnapshotDir`).
- [ ] If you must construct paths manually, check for `.synth/manifest.json` first and use `.synth/data/` when it is present.
- [ ] Do not create a `.synth/` directory in ungoverned repositories.

### 2. Let the CLI handle migration

Synth v2.1.0 automatically migrates legacy `data/` to `.synth/data/` the first time a governed-project CLI command runs.

- [ ] Do not write your own migration logic.
- [ ] Do not move `event-log.jsonl` manually; the CLI verifies byte-level integrity during migration.
- [ ] If you observe both `data/` and `.synth/data/`, treat `.synth/data/` as authoritative and report `data/` as an orphaned legacy directory.

### 3. Update manifest-aware commands

Commands that read or write runtime state now resolve paths through `.synth/manifest.json`:

- [ ] `synth init` now creates `.synth/data/`, not `data/`.
- [ ] `synth status` reads from `.synth/data/` for governed projects.
- [ ] `synth explain replay` reads from `.synth/data/` by default.
- [ ] `synth mission approve`, `synth mission decisions`, and `synth mission evidence add` use `.synth/data/drafts/`.
- [ ] `synth validate` uses `.synth/data/` when a manifest exists.

### 4. Update tests and fixtures

- [ ] Update any test fixtures that embed `layout.data: "data/"` to `layout.data: ".synth/data/"`.
- [ ] Update temporary project creation in tests to expect `.synth/data/`.
- [ ] Keep tests for ungoverned directories on the legacy `data/` path.

### 5. Update agent prompts and contracts

- [ ] If your agent has a prompt or contract that mentions `data/event-log.jsonl` or `data/drafts/`, update it to `.synth/data/...`.
- [ ] Make clear that `.synth/` belongs to the governed project, not to the Synth source repository.
- [ ] Do not instruct the agent to create `.synth/` in repositories that are not Synth projects.

### 6. Verify on a governed project

- [ ] Run `synth init --name "Test Project"` in a fresh directory and confirm `.synth/data/` is created.
- [ ] Run `synth explain replay` and confirm it targets `.synth/data/event-log.jsonl`.
- [ ] Create a mission draft and confirm it lands in `.synth/data/drafts/`.
- [ ] Run `synth validate --dry-run` and confirm no errors.

### 7. Verify on an ungoverned directory

- [ ] Confirm that running Synth commands in a directory without `.synth/manifest.json` does not create `.synth/`.
- [ ] Confirm the source repository itself still builds and tests without `.synth/`.

---

## What does not change

- The event log is still the authority.
- Canonical state is still a projection rebuilt by replay.
- The public vocabulary is still Mission, Expedition, Evidence, Plan, Event, State, Replay.
- Protected Assets are still frozen.
- `npm run govern` is still the canonical validation pipeline.

---

## Related documents

- [Runtime Data Migration Guide](migrating-runtime-data-to-synth.md)
- [Synth v2.1.0 changelog](../../../CHANGELOG.md)
- [EXP-ENV-013 — Co-locate Runtime Data Under `.synth/`](../../../docs/expeditions/EXP-ENV-013.md)
