# EXP-MIGRATE-001 — Legacy Synth State Detection & Archive-or-Import

> Detect an existing Synth installation from an older or unstable governance version, assess whether it can be safely imported, and offer the operator a clear choice: archive the old state and bootstrap fresh, or import validated legacy events under two-party approval.

**Status:** Draft — pending ADR-039 Convergence Review  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** TaskPRO brownfield onboarding retrospective, EXP-GOV-024 brownfield migration findings, EXP-ONBOARD-001 legacy-state detection  
**Depends On:** EXP-ONBOARD-001, EXP-GUARD-001, EXP-APPROVAL-001, EXP-EVENTLOG-001  
**Blocks:** EXP-BOOTSTRAP-001

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Purpose

Real-world brownfield onboarding (TaskPRO under Synth v2.4.1) showed that projects often carry an old `.synth/` directory created while governance was still unstable. Today the agent or operator must discover this manually, rename the directory by hand, and decide whether to start over. This expedition makes that decision explicit, safe, and replayable:

1. Detect legacy Synth state (old `.synth/`, `data/event-log.jsonl`, `.synth_bk`, replay files, etc.).
2. Assess version compatibility and structural integrity without mutating anything.
3. Present a read-only migration plan.
4. Offer two vetted paths:
   - **Archive** — move legacy state to a timestamped archive and bootstrap a fresh project.
   - **Import** — validate and replay legacy events into the current event model, requiring two-party approval because it mutates governance history.

Because importing rewrites the event log boundary, it is classified as a destructive operation and routes through `EXP-APPROVAL-001`.

---

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| M1 | Legacy `.synth/` is only detected by `synth first-contact` and not as a standalone migration concern | High | Proposed |
| M2 | No safe archive-vs-import decision is exposed in the CLI | High | Proposed |
| M3 | Importing legacy expeditions requires hand-editing `canonical-state.json` | Critical | Proposed |
| M4 | Operators cannot preview what an import would change before it runs | Medium | Proposed |

---

## Scope

### In scope

1. Detection of legacy Synth artifacts:
   - `.synth/` directory with an older manifest schema or unknown governance version.
   - `.synth_bk/` or other operator-created backups.
   - `data/event-log.jsonl` from ungoverned directories.
   - Legacy replay files and `canonical-state.json`.
2. Compatibility and integrity assessment:
   - Manifest schema version check.
   - Event-type compatibility check against the current event model.
   - Replay integrity check (can the legacy log rebuild a state?).
3. Read-only migration plan (`synth migrate plan`):
   - Detected artifacts.
   - Recommended path (archive vs. import) with rationale.
   - List of events that would be imported, if applicable.
   - Warnings for incompatible or unreadable events.
4. Archive path (`synth migrate archive --approve`):
   - Move `.synth/` to `.synth_archive_<timestamp>/`.
   - Preserve `data/event-log.jsonl` if present.
   - Bootstrap a fresh project.
   - Emit an `ARCHIVE_CREATED` evidence event.
5. Import path (`synth migrate import --approval-request-id <id> --approve`):
   - Validate each legacy event against current schemas and aliases.
   - Map legacy event types to canonical equivalents (e.g., old ticket events → work-item events).
   - Require a valid two-party approval before writing imported events.
   - Emit `MIGRATION_IMPORTED` event with evidence reference and audit trail.
6. CLI surface and help text.
7. Tests covering detection, plan, archive, import approval, and replay after import.

### Out of scope

- Supporting pre-v1.0 event formats outside a documented compatibility window.
- Automatic import without explicit human approval.
- Editing or deleting events after import (see `EXP-EVENTLOG-001`).
- Migrating source code or project files — only governance state.
- General brownfield project onboarding (already covered by `EXP-ONBOARD-001`).

---

## Required Changes

### 1. Migration detector (`src/migration/detect.ts`)

Returns a `MigrationDetectionResult`:

```text
legacyStateDetected : boolean
artifacts[]         : { path, kind, schemaVersion?, readable }
recommendedPath     : "archive" | "import" | "none"
reason              : string
warnings[]          : string
```

Detection rules:
- If `.synth/manifest.json` exists and its schema/version is unknown or older than the current minimum → legacy detected.
- If `.synth_bk/` or `.synth_archive_*/` exists → legacy detected.
- If `data/event-log.jsonl` exists and the project is ungoverned → legacy detected.
- If replay files reference event types no longer in the canonical set → import may require event mapping.

### 2. Migration planner (`src/migration/plan.ts`)

Produces a `MigrationPlan`:

```text
path                : "archive" | "import"
artifacts[]         : { path, action }
importEventCount    : number  (if path === "import")
mappedEventTypes    : { legacy: string, canonical: string }[]  (if path === "import")
requiredApprovals   : ["migrate-import"]  (if path === "import")
archiveTarget       : string  (if path === "archive")
```

### 3. Archive executor (`src/migration/archive.ts`)

- Compute a stable archive directory name (`.synth_archive_<iso-timestamp>/`).
- Move `.synth/` and any ungoverned `data/` event log into the archive.
- Run `synth bootstrap --approve` to create a fresh project.
- Emit `ARCHIVE_CREATED` event referencing the archive path.

### 4. Import executor (`src/migration/import.ts`)

- Read legacy events in order.
- Validate each event's payload shape and required fields.
- Map legacy types to canonical types using the existing historical-alias registry.
- Recompute event hashes so the imported chain is consistent with the new genesis/previousHash.
- Append imported events through `ExecutionGate` with capability `MigrateImport`.
- Emit `MIGRATION_IMPORTED` event with `sourceArchive`, `eventCount`, and `evidenceReference`.

### 5. CLI commands (`src/cli/migrate.ts` and `src/cli/synth.ts`)

```text
synth migrate detect          # report legacy state without mutations
synth migrate plan            # produce archive or import plan
synth migrate archive --approve
synth migrate import --approval-request-id <id> --approve
```

The `import` command is a destructive operation; it requires two-party approval via `synth approval request --operation migrate-import`.

### 6. Approval policy registration

Add `migrate-import` to the two-party approval policy so `ExecutionGate` blocks `MigrateImport` without a valid approval.

---

## Deliverables

1. `src/migration/detect.ts` — legacy-state detector.
2. `src/migration/plan.ts` — migration planner.
3. `src/migration/archive.ts` — archive executor.
4. `src/migration/import.ts` — import executor.
5. `src/cli/migrate.ts` — `synth migrate` subcommands.
6. `src/cli/synth.ts` — command routing and help text.
7. `src/approval/types.ts` — ensure `migrate-import` is in `DESTRUCTIVE_OPERATIONS`.
8. `tests/migration.test.js` — detection, planning, archive, import approval, and replay tests.
9. Updated expedition docs and convergence review record.

---

## Acceptance Criteria

1. `synth migrate detect` returns a JSON report with `legacyStateDetected`, `artifacts`, and `recommendedPath`.
2. `synth migrate plan` returns a read-only plan and does not mutate the filesystem or event log.
3. `synth migrate archive --approve` moves old state to a timestamped archive and bootstraps a fresh project.
4. `synth migrate import --approve` without an approval request ID is blocked by `ExecutionGate`.
5. `synth migrate import --approval-request-id <id> --approve` succeeds after a valid two-party approval and emits `MIGRATION_IMPORTED`.
6. Imported events replay into the same canonical state as before the import.
7. Incompatible legacy events are rejected with a clear error and do not partially import.
8. `npm run govern` passes.

---

## Governance

### Protected

- Event model and replay semantics.
- ExecutionGate mutation authority.
- Append-only event log (imports append mapped events; they do not rewrite existing ones).
- Public vocabulary.

### Not included

- Changes to the `SynthEvent` envelope.
- Removing or editing existing events.

---

## Risks

| Risk | Mitigation |
|---|---|
| Import corrupts the event log | Validate every legacy event before appending; reject incompatible formats. |
| Operator archives state they later need | Archive is a move, not a delete; timestamped path preserves history. |
| Legacy event mapping is lossy | Document mappings; emit warnings for dropped fields. |
| Import bypasses two-party approval | Register `migrate-import` in the two-party approval policy. |
| Replay divergence after import | Acceptance criterion requires imported events replay deterministically. |

---

## Convergence Review

Per ADR-039, this charter **must** pass a Convergence Review before implementation begins because importing legacy events affects the event log and replay semantics. The review must decide:

1. Whether the archive-vs-import decision boundary is correct.
2. Whether the import path preserves append-only semantics.
3. Whether the two-party approval requirement is sufficient for `migrate-import`.
4. Whether the legacy event mapping strategy is aligned with the historical-alias registry.

**Review outcome is a prerequisite.** If the review returns **REWRITE REQUIRED** or **SUPERSEDED**, this charter is updated before any code is written.

### Review record

- **Review ID:** EXP-REVIEW-007
- **Record:** [convergence-review-migrate-001.md](../governance/convergence-review-migrate-001.md)
- **Status:** **PENDING REVIEW**
- **Date:** 2026-08-02

---

## Evidence

- TaskPRO brownfield migration retrospective.
- `docs/expeditions/EXP-PROGRAM-043.md` — program tracker, Workstream A.
- `docs/expeditions/EXP-ONBOARD-001.md` — first-contact legacy-state detection.
- `docs/expeditions/EXP-APPROVAL-001.md` — two-party approval policy.
- `docs/adr/ADR-039-architectural-convergence-review.md` — review authority.

---

## Related Documents

- [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](EXP-PROGRAM-043.md)
- [EXP-ONBOARD-001 — Guided First-Contact Command](EXP-ONBOARD-001.md)
- [EXP-GUARD-001 — Derived-State Protection](EXP-GUARD-001.md)
- [EXP-APPROVAL-001 — Two-Party Approval for Destructive Operations](EXP-APPROVAL-001.md)
- [EXP-EVENTLOG-001 — Event-Log Query CLI](EXP-EVENTLOG-001.md)
- [docs/adr/ADR-039-architectural-convergence-review.md](../adr/ADR-039-architectural-convergence-review.md)
