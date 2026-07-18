# EXP-GOV-009 — Historical Event Normalization & Program Migration

**Status:** Completed  
**Accepted:** 2026-07-18  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Governance / Migration  
**Priority:** Critical  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-GOV-007 — Canonical State Resolution & Status Authority  
**Blocks:** Clean `npm run govern` baseline; future governance-dependent features  

---

## Objective

Normalize the historical event log so every replay from repository genesis conforms to the canonical governance model.

The migration preserves the immutability of historical events while registering canonical identities and historical Program assignments for legacy artifacts. After this expedition, `synth status` and the replay graph validator will no longer report duplicate-creation or orphan-reference warnings for known historical seed events.

> **Constitutional principle:** Historical evidence is immutable; interpretation evolves; canonical state is recomputed.

---

## Problem Statement

The repository event log (`data/event-log.jsonl`) contains repeated genesis snapshots that re-create the same mission, expedition, and objective identities:

| Kind | Canonical ID | Repeated parent references |
| --- | --- | --- |
| mission | `4ef88e92b3f2e635` | — |
| expedition | `def91a622e0832ad` | `367859661e2a7b4f` (unknown mission) |
| objective | `b00d4767499d1bf3` | `7b248458b5e8702c` (unknown expedition) |

The current resolver (EXP-GOV-007) already collapses these deterministically and recovers orphan references via unique-candidate inference. However, it still emits warnings because the duplicate creations and recovered orphans are treated as undiagnosed anomalies rather than known historical artifacts.

This leaves the repository in a mixed state:

- The canonical state is deterministic and correct.
- The event log carries legacy seed-event duplication that predates the current governance model.
- Every replay surfaces warnings that no longer require operator action.

Until this is resolved, the repository is describing two historical models simultaneously: the pre-normalization genesis seed model and the current canonical governance model.

---

## Scope

### Included

1. **Canonical identity registry**
   - Declare the canonical IDs for legacy duplicate seed artifacts.
   - Register the duplicate creation events as aliases of the canonical IDs.

2. **Historical Program assignment**
   - Assign the canonical legacy artifacts to one or more historical Programs.
   - Mark historical Programs as immutable so future expeditions cannot mutate them.

3. **Resolver integration**
   - Extend the resolver to read the canonical identity registry.
   - Suppress duplicate-creation warnings for registered aliases.
   - Suppress recovered-orphan warnings when the recovery target is a registered canonical identity.

4. **Durable migration record**
   - Persist the registry under `.synth/data/` (or as a governance event) so replay remains deterministic across environments.

### Explicitly excluded

- No event in `data/event-log.jsonl` is modified or removed.
- No Protected Asset is changed.
- No new public vocabulary is introduced.
- No runtime behavior changes beyond warning suppression for known aliases.

---

## Architectural Decision

The migration will be recorded as a durable artifact rather than an event mutation:

```text
data/
 └── canonical-state.json          # current canonical projection
 └── evidence/
      └── initialization/          # EXP-INIT-002 evidence
 └── governance/
      └── historical-aliases.json  # canonical identity registry
 ```

The resolver reads `historical-aliases.json` during normalization and treats registered duplicate IDs as aliases. This preserves event immutability while making the normalization decision explicit and auditable.

Alternative considered: emitting a `GOVERNANCE_MIGRATION_APPLIED` event. Rejected because the migration is a reinterpretation of existing events, not a new state transition. Recording it as governance metadata keeps the event log focused on project state changes.

---

## Acceptance Criteria

### AC-001

A canonical identity registry exists and maps the known duplicate IDs to canonical identities.

### AC-002

Historical Programs are created for legacy artifacts and marked immutable.

### AC-003

`synth status` reports zero duplicate-identity and zero recovered-orphan warnings.

### AC-004

`scripts/verify-replay.js` reports zero graph violations for the canonical event log.

### AC-005

Replay remains deterministic: identical historical evidence produces identical canonical state.

### AC-006

No Protected Asset is modified.

### AC-007

`npm run govern` passes with zero warnings.

---

## Success Criteria

This expedition is complete when:

- The historical event log is fully interpreted by the canonical governance model.
- Every replay from genesis produces one authoritative state without warnings.
- Legacy artifacts are assigned to historical Programs and preserved as read-only lineage.
- The repository passes `npm run govern`.

---

## Relationship to Other Expeditions

```text
EXP-GOV-007
    ↓
EXP-GOV-009  ← this expedition
    ↓
EXP-FIRSTCONTACT-010
```

EXP-GOV-007 established the resolver pipeline. EXP-GOV-009 uses that pipeline to register historical aliases and complete the governance foundation. Once the foundation is clean, First Contact can collect agent trajectories against a repository whose replay is warning-free.

---

## Completion Notes

**Completed:** 2026-07-18  
**Merged:** [#155](https://github.com/synth-framework/synth/pull/155)

- Added canonical identity registry (`src/runtime/historical-aliases.ts`) for the legacy genesis seed mission/expedition/objective IDs.
- Resolver integration suppresses duplicate-creation and recovered-orphan warnings for registered aliases.
- Historical events remain immutable; interpretation now evolves through the registry instead of requiring event mutation.
- `npm run govern` passes with no actionable graph violations.

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-GOV-007.md` | Provides the resolver pipeline that this expedition extends. |
| `docs/expeditions/EXP-PROGRAM-016.md` | Program container for governed execution; this migration ensures the event history conforms to the program model. |
| `docs/expeditions/EXP-INIT-002.md` | Established evidence persistence under `.synth/data/`; this migration follows the same physical boundary. |
