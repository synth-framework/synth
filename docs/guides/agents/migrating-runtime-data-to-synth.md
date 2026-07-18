---
Title: Migrating Runtime Data to `.synth/data/`
Domain: agents
Audience: agents, operators
Prerequisites: agents/index.md, agents/update-checklist-v2-1-0.md
Knowledge Establishes: How to migrate an existing Synth project from repo-root `data/` to `.synth/data/`
Depends On: agents/index.md
Version: 1.0.0
Status: stable
---

# Migrating Runtime Data to `.synth/data/`

Synth v2.1.0 co-locates runtime data with the project manifest. For governed projects, runtime data moves from the repository root into `.synth/data/`.

This guide explains how the migration works and what operators and agents need to do.

---

## Who this applies to

### Governed projects

A governed project has `.synth/manifest.json`. If your project has this file, migration applies.

After migration, the project layout is:

```
.synth/
  manifest.json       <- project identity
  data/               <- runtime authority and projections
    event-log.jsonl
    canonical-state.json
    checkpoints.json
    decisions.jsonl
    drafts/
    snapshots/
    event-stream/
    discovery-evidence.json (if present)
proof/                <- derived artifacts
```

### Ungoverned directories

If a directory does not have `.synth/manifest.json`, it is not a governed project. The legacy `data/` path continues to be used, and no `.synth/` directory is created.

This includes the Synth source repository itself, which does not require `.synth/` to build or test.

---

## Automatic migration

Synth v2.1.0 migrates legacy data automatically. The migration runs the first time a governed-project CLI command needs runtime state, such as:

- `synth status`
- `synth explain replay`
- `synth validate`
- `synth mission approve`
- `synth mission decisions`
- `synth mission evidence add`

### What is migrated

The following entries are moved from `data/` to `.synth/data/`:

- `event-log.jsonl`
- `canonical-state.json`
- `checkpoints.json`
- `decisions.jsonl`
- `drafts/`
- `snapshots/`
- `event-stream/`
- `discovery-evidence.json` (if present)

### Migration safety

- The event log is verified with SHA-256 before and after the move. If the hash changes, migration fails.
- Migration is a filesystem `rename`, which is atomic within the same filesystem.
- Migration happens before any replay, so canonical state can always be reconstructed from the moved log.
- A marker file `.synth/data/.synth-data-migrated-v1` is written after successful migration.
- The manifest `layout.data` field is updated to `".synth/data/"`.

---

## Manual migration

If you prefer to migrate manually, or if the automatic migration fails:

1. Ensure `.synth/manifest.json` exists. If it does not, run:

   ```bash
   synth init --name "Project Name"
   ```

2. Create `.synth/data/`:

   ```bash
   mkdir -p .synth/data
   ```

3. Move runtime entries from `data/` to `.synth/data/`:

   ```bash
   mv data/event-log.jsonl .synth/data/
   mv data/canonical-state.json .synth/data/
   mv data/checkpoints.json .synth/data/
   mv data/decisions.jsonl .synth/data/
   mv data/drafts .synth/data/
   mv data/snapshots .synth/data/
   mv data/event-stream .synth/data/
   # optional
   mv data/discovery-evidence.json .synth/data/
   ```

4. Update `.synth/manifest.json`:

   ```json
   {
     "layout": {
       "data": ".synth/data/"
     }
   }
   ```

5. Verify replay:

   ```bash
   synth explain replay
   ```

6. Remove the now-empty `data/` directory if desired:

   ```bash
   rmdir data
   ```

---

## After migration

- All future runtime writes go to `.synth/data/`.
- The legacy `data/` directory is no longer used. It can be removed after you verify replay.
- `.gitignore` already ignores `.synth/data/` and `data/` in governed projects.

---

## Troubleshooting

### Migration fails with integrity check error

This means `event-log.jsonl` changed during the move. Do not continue. Restore from backup and retry.

### Both `data/` and `.synth/data/` exist

`.synth/data/` is authoritative. The legacy `data/` directory is orphaned and may be removed after verification.

### `synth` commands still look in `data/`

Confirm that `.synth/manifest.json` exists. If it does not, the directory is treated as ungoverned and commands use the legacy `data/` path.

### Source repository has no `.synth/` directory

That is expected. The Synth source repository is not a governed project and does not need `.synth/` to build or test.

---

## Related documents

- [Agent Update Checklist — v2.1.0 Runtime Data Boundary](update-checklist-v2-1-0.md)
- [Synth v2.1.0 changelog](../../../CHANGELOG.md)
- [EXP-ENV-013 — Co-locate Runtime Data Under `.synth/`](../../../docs/expeditions/EXP-ENV-013.md)
