# EXP-EXEC-001 — Execution Intent Model

**Status:** Completed and accepted  
**Accepted:** 2026-07-18
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-PROGRAM-015 (Repository Versioning Capability)  
**Blocks:** EXP-EXEC-002, EXP-EXEC-003, EXP-EXEC-004, EXP-EXEC-005  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (ungoverned repository mutations during TaskPRO; no deterministic path from approved Expedition to executed change)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Define the canonical **Execution Intent Model** that translates an approved Expedition's Objectives and Work Items into an ordered, executable graph of repository mutations.

The model is the bridge between SYNTH's planning layer and its execution layer:

```text
ApprovedMissionModelSnapshot
        │
        ▼
Execution Intent Model
        │
        ▼
ExecutionGate → Runtime → VersioningCapability
        │
        ▼
Repository mutations + immutable Events
```

---

## Scope

### In scope

- Define `ExecutionIntent` and `ExecutionIntentGraph` types.
- Specify the mapping from `GeneratedWorkItem` to one or more `ExecutionIntent`s.
- Define deterministic ordering and dependency rules.
- Specify new StateEvent types for execution lifecycle (intent created, started, completed, failed, committed, projected).
- Document verification and rollback semantics.
- Position the model in the Implementation layer without modifying Protected Assets.

### Out of scope

- Implementing the Intent Synthesizer (EXP-EXEC-002).
- Branch-per-Expedition workflow (EXP-EXEC-003).
- Commit-as-Evidence capture (EXP-EXEC-004).
- Pull request projection (EXP-EXEC-005).
- Any CLI surface changes.
- Any changes to Mission Studio, Genesis, Replay, ExecutionGate, or the Event Model envelope.

---

## Deliverables

1. **`docs/architecture/execution-intent-model.md`** — authoritative specification of the Execution Intent Model.
2. **Type definitions** in `src/types/execution-intent.ts`:
   - `ExecutionIntent`
   - `ExecutionIntentGraph`
   - `Verification`
   - `ExecutionPhase`
3. **Event type extensions** in `src/types/event.ts` (append-only; no semantic changes to existing types).
4. **State shape extensions** in `src/types/state.ts` for `ExecutionIntent` and `ExecutionIntentGraph` projections.
5. **Architecture note** explaining why execution intent remains in the Implementation layer.

---

## Acceptance

- `ExecutionIntent` and `ExecutionIntentGraph` types are defined, typed, and documented.
- Mapping from `GeneratedWorkItem` to intents is deterministic and testable.
- New event types preserve the existing `SynthEvent` envelope.
- Dependency graph is acyclic and deterministically ordered.
- Review by program steward confirms the model is sufficient for EXP-EXEC-002 through EXP-EXEC-005.

---

## Phases

### Phase 1 — Survey existing types

Review:

- `src/types/state.ts` (`GeneratedWorkItem`, `Expedition`, `Objective`, `Execution`)
- `src/types/event.ts` (StateEvent envelope)
- `src/domain/planning.ts` (planning-to-work-item logic)
- `src/environment/versioning-capability.ts` (target operations)

Identify the minimal set of new types and events needed.

### Phase 2 — Draft the model

Write `docs/architecture/execution-intent-model.md` with the full type definitions, mapping rules, event additions, ordering semantics, and rollback behavior.

### Phase 3 — Add type definitions

Create `src/types/execution-intent.ts` and append new event types/state shapes without modifying existing semantics.

### Phase 4 — Validate with downstream expeditions

Confirm that EXP-EXEC-002 (Intent Synthesizer / Work Item Runtime), EXP-EXEC-003 (Branch-per-Expedition), EXP-EXEC-004 (Commit-as-Evidence), and EXP-EXEC-005 (Pull Request Projection) can be built on this model without changes.

### Phase 5 — Document and request acceptance

Open PR, run CI, and request program-steward acceptance.

---

## Risks

| Risk | Mitigation |
|---|---|
| Model leaks execution primitives into planning | Keep `ExecutionIntent` in the Implementation layer; Mission Studio only produces `GeneratedWorkItem`. |
| Model is too abstract to implement | Provide concrete examples for filesystem, versioning, and process intents. |
| Dependency ordering is non-deterministic | Define stable tie-breakers (objective sequence, work-item sequence, intent ID). |
| New events break replay | Append-only event types; existing replay handlers ignore unknown events. |
| Rollback semantics become complex | Make rollback optional and capability-specific; halt Expedition on failure. |

---

## Definition of Done

- [x] `docs/architecture/execution-intent-model.md` drafted.
- [x] `src/types/execution-intent.ts` created.
- [x] New event types appended to `src/types/event.ts`.
- [x] New state shapes appended to `src/types/state.ts`.
- [x] Replay handlers for new event types added.
- [x] Regression tests added (`tests/execution-intent.test.js`).
- [x] CHANGELOG updated.
- [x] Downstream expeditions confirm the model is sufficient.
- [x] PR opened and CI checks pass.
- [x] Expedition accepted.

---

## Implementation Plan

1. Survey existing state, event, and capability types.
2. Draft `docs/architecture/execution-intent-model.md`.
3. Create `src/types/execution-intent.ts`.
4. Append new event types to `src/types/event.ts`.
5. Append new state shapes to `src/types/state.ts`.
6. Update `CHANGELOG.md` under `[Unreleased]`.
7. Open PR and request review.

---

## Completion Notes

Accepted as the architectural foundation for EXP-PROGRAM-016. The Execution Intent Model proved sufficient for all downstream implementation expeditions (EXP-EXEC-002 through EXP-EXEC-005) without requiring changes to the model itself. Merged via PR #124.
