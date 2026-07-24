# EXP-SIMPLIFICATION-ASSESSMENT-001 — Complexity and Ownership Inventory

> Determine whether SYNTH's current complexity is essential or accumulated, before adding more governance machinery.

**Status:** Proposed  
**Kind:** Discovery / Analysis Expedition  
**Priority:** High  
**Authority:** `ADR-039` Architectural Convergence Review, Constitutional Baseline  
**Touches Protected Assets:** No  
**Depends On:** Diagnostic conclusion that governance execution gaps may be symptoms of accumulated complexity  
**Blocks:** Decision to accept `ADR-046` and implement `EXP-GOVERNANCE-ENFORCEMENT-001`

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Goal

Produce four read-only inventories:

1. **State complexity report** — every field in `CanonicalState`, why it exists, and whether it must remain canonical.
2. **Event inventory** — every event type, what fact it records, and whether it is essential or workflow scaffolding.
3. **Concept inventory** — every named architectural concept, its visibility, ownership, and origin.
4. **Code ownership map** — which component owns authorization, mutation, projection, replay, and UI.

The output will determine whether the next step is:

- Implement `EXP-GOVERNANCE-ENFORCEMENT-001` as written, or
- Simplify the system first so that enforcement has fewer surfaces to protect.

---

## Purpose

Recent incidents showed the same pattern in different places:

| Incident | Local fix |
|---|---|
| Intent drift | Genesis / Alignment concepts |
| Mutation bypass | ExecutionGate wiring |
| Review loops | New revision events |
| Lifecycle proliferation | Governance state machine ADR |

The hypothesis is that these are not independent missing capabilities. They are the same underlying failure — **authority ordering is bypassed** — appearing in different subsystems.

Before adding enforcement, we need to know whether the system has grown more complex than necessary. Adding machinery to protect accumulated complexity would make the problem worse.

---

## Deliverables

### 1. State complexity report

A table covering every field in `src/types/state.ts` `CanonicalState`:

| Field | Created by event | Consumed by | User-visible | Required for replay | Derivable? | Recommendation |
|---|---|---|---|---|---|---|

The report must answer:

- Which fields are constitutional (cannot disappear)?
- Which fields are projections that could be recomputed?
- Which fields encode workflow state instead of facts?
- Which fields were introduced by Proposed ADRs or superseded expeditions?

Pay special attention to:

- `intentModels`
- `refinementSessions`
- `alignmentContracts`
- `divergenceGates`
- `reviewGateExpeditions`
- `acceptanceGateExpeditions`
- `executionGraphs`
- `executionIntents`

### 2. Event inventory

A table covering every event type in `src/types/event.ts`:

| Event | Producer | Reducer | Purpose | Fact or workflow? | Duplicate? |
|---|---|---|---|---|---|

The report must identify:

- Events that record facts.
- Events that encode workflow transitions.
- Events that exist only to support a projection.
- Duplicate or near-duplicate transitions.
- Events introduced by Proposed ADRs.

### 3. Concept inventory

A table of every named architectural concept:

| Concept | Public / Internal | Canonical / Projection | Owner | Introduced by | Notes |
|---|---|---|---|---|---|

The report must produce a hard answer to:

> How many concepts does a new contributor need to understand before making a change?

It must distinguish:

- Public vocabulary (9 terms from `docs/analysis/simplified-interaction-model-decision.md`).
- Internal machinery.
- Projections.
- Concepts introduced but not yet ratified (Proposed ADRs).

### 4. Code ownership map

A structured map:

```text
Component          Owns
ExecutionGate      authorization, mutation commit boundary, event emission trigger
EventStore         append-only storage, hash chaining
Replay Engine      state reconstruction, determinism
Mission Studio     human intent capture, contract visualization
Genesis adapters   intent-to-mission transformation
Capability layer   capability invocation, mutation request production
CLI                command parsing, operator surface
Runtime            orchestration, provider dispatch
```

The report must identify:

- Overlapping ownership.
- Components that both decide and mutate.
- Components that bypass other components.

---

## Special question: runtime ahead of authority

The report must classify every case where runtime state exists for a concept whose governing ADR is still Proposed:

| Concept | Runtime state exists | Governing ADR status | Likely cause | Recommended remedy |
|---|---|---|---|---|

The two possible causes are:

- **A — Implementation happened accidentally:** Governance failed; the concept should not have been represented yet.
- **B — Documentation lagged behind implementation:** The concept was needed, but the ADR was not updated to Accepted.

This expedition does **not** perform the remedy. It only classifies.

---

## Non-deliverables

- No code changes.
- No ADR changes.
- No governance artifact changes.
- No deletions or rollbacks of existing runtime state.
- No new concepts or vocabulary.

---

## Out of Scope

- Refactoring.
- Implementation of `EXP-GOVERNANCE-ENFORCEMENT-001`.
- Acceptance or rejection of `ADR-046`.
- Any modification of `website/`, `examples/`, or product code.

---

## Implementation Order

1. Read `src/types/state.ts` and produce state complexity report.
2. Read `src/types/event.ts` and produce event inventory.
3. Read architecture docs, ADRs, and expedition charters and produce concept inventory.
4. Read `src/` component boundaries and produce code ownership map.
5. Cross-reference runtime state against ADR statuses.
6. Produce final assessment with recommendation.

---

## Success Criteria

- All four inventories are complete and cite specific files, types, and events.
- Every field in `CanonicalState` is classified.
- Every event type is classified.
- The concept inventory matches or updates `docs/reference/term-inventory.md`.
- The code ownership map identifies at least three overlapping or ambiguous boundaries.
- The runtime-ahead-of-authority table distinguishes accidental implementation from documentation lag.
- The final assessment recommends either:
  - Proceed with `EXP-GOVERNANCE-ENFORCEMENT-001`, or
  - Simplify first, then enforce.

---

## Risks

| Risk | Mitigation |
|---|---|
| Assessment becomes architecture redesign | Charter explicitly forbids changes. Deliverables are read-only reports. |
| Classifications are subjective | Cite exact file paths and line numbers; mark judgments as such. |
| Scope expands to entire codebase | Limit to `CanonicalState`, event types, architecture docs, and component entry points. |
| Stale ADR statuses make classification hard | Record the observed status and the date checked. |

---

## Definition of Done

- [ ] State complexity report written.
- [ ] Event inventory written.
- [ ] Concept inventory written.
- [ ] Code ownership map written.
- [ ] Runtime-ahead-of-authority classification table written.
- [ ] Final assessment and recommendation written.
- [ ] No repository mutations performed.
- [ ] Expedition accepted.
