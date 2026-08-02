# Convergence Review Record — EXP-MIGRATE-001

**Review ID:** EXP-REVIEW-007  
**Authority:** [ADR-039 — Architectural Convergence Review](../adr/ADR-039-architectural-convergence-review.md)  
**Date:** 2026-08-02  
**Reviewer:** Synth architectural baseline + Program 031 gating function  
**Expedition reviewed:** [EXP-MIGRATE-001 — Legacy Synth State Detection & Archive-or-Import](../expeditions/EXP-MIGRATE-001.md)  
**Owning program:** [EXP-PROGRAM-043 — Agent Onboarding & Operator Experience](../expeditions/EXP-PROGRAM-043.md)  
**Outcome:** **CONVERGED** — import path approved as an append-only, approval-gapped event-log mutation; archive path is the default.

---

## Expedition summary

`EXP-MIGRATE-001` proposes a safe migration path for projects that carry an older or unstable Synth installation. The expedition adds detection, planning, and two execution paths:

- **Archive** — move legacy state to a timestamped archive and bootstrap fresh.
- **Import** — validate legacy events, map them to the current event model, and append them to the event log under two-party approval.

The import path is classified as a destructive operation and routes through `EXP-APPROVAL-001` because it mutates governance history.

---

## ADR-039 questionnaire

### 1. Is the charter still valid?

**Yes.** The TaskPRO brownfield onboarding retrospective identified legacy Synth state as a critical blocker. Operators currently rename `.synth/` by hand and lose the archive-vs-import decision in tribal knowledge. `EXP-ONBOARD-001` already detects legacy state; this expedition turns that detection into a standalone, replayable migration flow.

### 2. Are the acceptance criteria still correct?

**Yes, with one emphasis.** Criterion 6 ("Imported events replay into the same canonical state as before the import") is the gating architectural condition. The review must confirm that appending mapped legacy events preserves replay determinism and does not break non-destructive operations.

### 3. Has newer work superseded any objectives?

**No.** `EXP-APPROVAL-001` is now complete and provides the two-party approval gate required by the import path. `EXP-EVENTLOG-001` provides the query tooling operators will use to inspect imported events. Neither replaces the migration flow.

### 4. Does the proposed implementation still represent the preferred path?

**Yes.** Archive-and-import is the minimum viable migration model: it gives operators a safe default (archive) and an audited, approval-gated path (import) for the minority of cases where legacy events must remain replayable.

### 5. Should the expedition be rewritten?

**TBD by this review.** If the review rejects appending mapped legacy events to the log, the charter should be rewritten to make import a read-only, sidecar-derived view rather than a live event-log mutation.

### 6. Should the expedition move to another program?

**No.** Migration is a Workstream A deliverable of `EXP-PROGRAM-043` (Agent Onboarding & Operator Experience). `EXP-PROGRAM-031` (convergence) reviews it; it does not own it.

### 7. Should the expedition be archived?

**No.** The objective is valid and the approach is sound pending the event-log mutation decision.

---

## Protected Asset analysis

The central question is whether appending mapped legacy events to the event log changes the **Protected Event Model** or redistributes **ExecutionGate mutation authority**.

### Finding: archive path does not touch Protected Assets

The archive path moves files on disk and bootstraps a fresh project. It appends only an `ARCHIVE_CREATED` evidence event. It does not modify existing events, replay semantics, or mutation authority.

### Finding: import path appends events but does not rewrite history

The import path:

1. Reads legacy events from the archive.
2. Validates each event against the current event model.
3. Maps legacy event types to canonical equivalents using the historical-alias registry.
4. Recomputes event hashes to maintain the append-only chain.
5. Appends the mapped events through `ExecutionGate` with capability `MigrateImport`.

Because events are appended rather than rewritten, the append-only invariant is preserved. The `SynthEvent` envelope itself is unchanged; only new payload-level event types (`MIGRATION_IMPORTED`) are introduced.

### Finding: mutation authority remains centralized

`MigrateImport` is registered as a destructive capability. The `ExecutionGate` blocks it unless a valid two-party approval exists. The policy engine, not the migration module, decides whether approval is required. Snapshot failures are recorded as `GOVERNANCE_SNAPSHOT_FAILED` events.

### Replay semantics

Replay folds events in order. Imported events are indistinguishable from native events after import, except for provenance metadata in the `MIGRATION_IMPORTED` event. Non-destructive operations are unaffected because they do not depend on the migration capability.

### Public Vocabulary

No new public vocabulary terms are introduced. "Archive" and "import" are ordinary domain verbs, not new canonical terms. The seven canonical terms (Mission, Expedition, Evidence, Plan, Event, State, Replay) remain unchanged.

---

## Outcomes

| Expedition | Outcome | Rationale | Required actions |
|---|---|---|---|
| `EXP-MIGRATE-001` | **CONVERGED** | The import path preserves append-only semantics, routes through `ExecutionGate`, and requires two-party approval; the archive path is safe and requires no Protected Asset changes. | 1. ✅ Import path and event-mapping strategy approved.<br>2. ✅ `EXP-MIGRATE-001.md` updated with the review outcome.<br>3. ✅ Implementation may begin.<br>4. Run `synth validate` before merging implementation. |

---

## Required decisions before implementation begins

1. **Import path.** Is it acceptable to append mapped legacy events to the current event log, or must legacy state remain a read-only sidecar?
2. **Event mapping.** Is the historical-alias registry the correct boundary for mapping legacy event types to canonical types?
3. **Hash recomputation.** Should imported events recompute `eventHash`/`previousHash` to match the new log, or retain legacy hashes in a sidecar?
4. **Approval requirement.** Is two-party approval sufficient for the `migrate-import` destructive operation?
5. **Scope of supported legacy versions.** Should the v1 implementation support only Synth v2.x manifests, or also pre-v2 event logs?

---

## Recommended outcome

**CONVERGED — archive path as default; import path as an approval-gapped, append-only event-log mutation.**

Rationale:
- The archive path is safe and requires no Protected Asset changes.
- The import path preserves append-only semantics and does not rewrite existing events.
- Two-party approval, already implemented in `EXP-APPROVAL-001`, provides the required human gate.
- Event mapping through the historical-alias registry reuses existing replay-compatibility infrastructure.

If the reviewer disagrees with appending legacy events, the fallback outcome is **REWRITE REQUIRED — import as a read-only sidecar or derived view only**.

---

## Evidence

- `docs/expeditions/EXP-MIGRATE-001.md` — expedition charter.
- `docs/expeditions/EXP-PROGRAM-043.md` — program tracker, Workstream A.
- `docs/adr/ADR-039-architectural-convergence-review.md` — review authority.
- `docs/architecture/09-event-model.md` — event structure and replay semantics.
- `docs/architecture/11-replay.md` — replay engine semantics.
- `docs/governance/convergence-review-approval-001.md` — completed two-party approval review that enables the import gate.

---

## Next steps

1. ✅ Operator approved **CONVERGED**.
2. ✅ `EXP-MIGRATE-001.md` status updated to **Approved — ready for implementation**.
3. Implement detection, planning, archive, and import executors.
4. Run `synth validate` after implementation changes and attach validation output as expedition evidence.
