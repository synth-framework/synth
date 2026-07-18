# EXP-ENV-013 — Co-locate Runtime Data Under `.synth/`

**Status:** Completed and accepted  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Environment Independence / Repository Layout  
**Priority:** High  
**Program:** EXP-PROGRAM-017 — Project Runtime Boundary Hardening Program  
**Depends On:** EXP-ENV-012  
**Blocks:** none

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: None
  Requires ADR: No
```

---

## Purpose

Move all SYNTH runtime data from the repository-root `data/` directory into `.synth/data/`, while keeping `.synth/manifest.json` as the project orientation artifact at the root of `.synth/`.

This keeps project identity, runtime state, and derived artifacts in one obvious, version-control-agnostic location instead of scattering them across the repository root.

---

## Important Distinction

This expedition changes the layout of a **SYNTH-governed project**, not the layout of the **SYNTH source repository**.

- A governed project has `.synth/manifest.json` and runtime state.
- The SYNTH source repository has a repo-root `data/` directory but no `.synth/manifest.json`, so it is **not** a governed project in practice.
- The compiler, build scripts, and core test suite do **not** require `.synth/` to exist. Only the CLI and runtime infrastructure use `.synth/` when operating on a governed project.
- The path change is: *when SYNTH is managing a governed project, it stores that project's runtime data under that project's `.synth/data/` directory*.
- If the SYNTH source repository later removes its empty `.synth/` directory, the source code will still build and pass its core tests.

---

## Motivation

The v2 bootstrap currently creates two top-level locations:

```
.synth/
  manifest.json       <- project identity
data/
  event-log.jsonl     <- durable authority
drafts/
canonical-state.json
...
```

There is no architectural reason for the runtime authority to live outside `.synth/`. The split:

- Pollutes the repository root with mutable runtime state.
- Makes the project layout harder to explain (`data/` looks like user data, not system state).
- Complicates environment-independent documentation: `.synth/` is the project boundary, but its most important contents are elsewhere.
- Forces `.gitignore` to ignore a separate `data/` directory in addition to any project-specific `.synth/data/` contents.

Co-locating runtime data under `.synth/data/` makes the project boundary self-contained and reduces the public surface area to:

```
.synth/
  manifest.json       <- project identity
  data/               <- runtime authority + projections
    event-log.jsonl
    canonical-state.json
    checkpoints.json
    drafts/
    snapshots/
    event-stream/
proof/                <- derived artifacts (unchanged)
```

---

## Freeze Respect

This change does **not** touch any Protected Asset.

The following remain unchanged:

- Event Model (`src/types/event.ts`)
- Replay semantics (`src/runtime/replay.ts`)
- ExecutionGate (`src/core/bootstrap.ts`)
- Capability Model
- Mission Studio
- Genesis
- Constitutional Baseline
- Public Vocabulary

Only filesystem paths and the manifest `layout.data` field change. The event log remains the authority, canonical state remains a projection, and replay remains the verification mechanism.

---

## Scope

### Files requiring path updates

| File | Current assumption | Change |
|---|---|---|
| `src/cli/synth.ts` | `cmdInit`, `cmdStatus`, `cmdDoctor`, mission/draft commands use `process.cwd(), "data"` | `.synth/data/` |
| `src/cli/bootstrap-apply.ts` | bootstrap creates repo-root `data/` | create `.synth/data/` |
| `src/infra/event-store.ts` | `data/event-log.jsonl`, `data/event-stream/` | `.synth/data/event-log.jsonl`, `.synth/data/event-stream/` |
| `src/infra/state-store.ts` | `data/canonical-state.json`, `data/snapshots/` | `.synth/data/canonical-state.json`, `.synth/data/snapshots/` |
| `src/infra/checkpoint-store.ts` | `data/checkpoints.json` | `.synth/data/checkpoints.json` |
| `src/environment/evidence.ts` | `data/discovery-evidence.json` | `.synth/data/discovery-evidence.json` |
| `src/cli/status-briefing.ts` | `data/drafts/` | `.synth/data/drafts/` |
| `src/cli/resume-briefing.ts` | default `data/event-log.jsonl`, `data/canonical-state.json`, `data/snapshots/` | `.synth/data/...` |
| `src/cli/repository-identity.ts` | reads `data/canonical-state.json`, `data/event-log.jsonl`, `data/drafts/`, `data/snapshots/` | `.synth/data/...` |
| `src/cli/explain-observability.ts` | default display path `data/event-log.jsonl` | `.synth/data/event-log.jsonl` |
| `src/cli/explain-governance.ts` | default `data/event-log.jsonl` | `.synth/data/event-log.jsonl` |
| `src/verification/context.ts` | `data/` assembled into context | `.synth/data/` |
| `src/verification/checks.ts` | `data/drafts/`, `data/checkpoints.json` | `.synth/data/...` |
| `src/core/bootstrap.ts` | default snapshot store `./data/snapshots` | `.synth/data/snapshots` |
| `.gitignore` | ignores `data/` and `data-test/` | add `.synth/data/`; keep `data/` for ungoverned projects and `data-test/` as test scratch |
| `data/README.md` | documents repo-root `data/` | move or rewrite for `.synth/data/` |

### Out of scope

- `data-test/` — test fixture and scratch directory. It is not runtime state and stays at the repository root.
- `proof/` — derived artifacts remain at the repository root per existing layout.
- Event schema, replay algorithm, or any Core behavior.

---

## Approach

### 1. Path constant consolidation

Introduce a single source of truth for the runtime data directory in `src/infra/paths.ts`:

```ts
export function getRuntimeDataDir(cwd: string): string {
  if (hasManifest(cwd)) {
    return path.join(cwd, ".synth", "data")
  }
  return path.join(cwd, "data")
}
```

All infra and CLI modules derive their file paths from this helper. This prevents the current pattern of repeating `path.join(process.cwd(), "data", ...)` in a dozen files. The helper falls back to repo-root `data/` when no manifest exists, so the SYNTH source repository continues to build and test without `.synth/`.

### 2. Manifest layout update

`layout.data` in `.synth/manifest.json` changes from `"data/"` to `".synth/data/"`.

### 3. Backward compatibility / migration

Existing SYNTH-governed projects already have `data/` at the repository root. To avoid data loss:

- **New projects:** `synth init` and `synth bootstrap --approve` create `.synth/data/` directly.
- **Existing projects:** on the first CLI command that needs runtime state, if `.synth/manifest.json` exists, `.synth/data/` is absent, and a legacy `data/` directory exists, perform an automatic one-time migration:
  1. Create `.synth/data/`.
  2. Move (not copy) the following into it:
     - `event-log.jsonl`
     - `canonical-state.json`
     - `checkpoints.json`
     - `decisions.jsonl`
     - `drafts/`
     - `snapshots/`
     - `event-stream/`
     - `discovery-evidence.json` if present
  3. Write a marker file `.synth/data/.synth-data-migrated-v1`.
  4. Update `layout.data` in `.synth/manifest.json`.

The move is atomic at the file level and preserves byte-level integrity of `event-log.jsonl`. Because the event log is the authority, the migration is safe to perform before replay.

If both `data/` and `.synth/data/` exist, `.synth/data/` is authoritative and `data/` is reported as an orphaned legacy directory that the operator may delete after verification.

### 4. Tests

- Update path constants in tests that assert on default layout.
- Add a migration test: a project with legacy `data/` is opened, the CLI migrates it, and replay produces the same canonical state as before.
- Verify `npm run govern` passes with no changes to Core boundary compliance.

---

## Acceptance Criteria

- `synth init` creates `.synth/data/`, not `data/`.
- `synth bootstrap --approve` creates `.synth/data/`, not `data/`.
- Governed projects read/write all runtime files from `.synth/data/`.
- Ungoverned directories (including the SYNTH source repo) continue to use repo-root `data/`.
- Legacy projects with `data/` migrate automatically without data loss.
- `synth explain replay` and `synth validate` continue to work on migrated projects.
- The SYNTH source repository builds and passes core tests without a `.synth/` directory.
- `npm run govern` passes.

---

## Definition of Done

- [x] Expedition approved.
- [x] Single source of truth for runtime data directory path implemented.
- [x] All listed source files updated to use `.synth/data/`.
- [x] Manifest `layout.data` updated to `".synth/data/"`.
- [x] `.gitignore` updated to include `.synth/data/` while keeping `data/` for ungoverned projects.
- [x] Migration path implemented and tested for existing projects.
- [x] Governance pipeline (`npm run govern`) passes in CI.
- [x] Expedition accepted.
