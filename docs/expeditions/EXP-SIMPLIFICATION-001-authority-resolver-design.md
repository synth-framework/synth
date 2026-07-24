# EXP-SIMPLIFICATION-001 — Authority Resolver Design

> How SYNTH decides what is authoritative, what is derived, what may mutate, and who owns a transition after canonical-state simplification.

**Status:** Draft  
**Expedition:** `EXP-SIMPLIFICATION-001`  
**Date:** 2026-07-21  
**Authority:** `EXP-SIMPLIFICATION-001.md`, `ADR-046`, `ADR-045`, Constitutional Baseline  

---

## Principle

Authority is not a concept. It is a resolved property of a mutation request.

After simplification:

- The **Event Store** is the only source of truth.
- **CanonicalState** is a materialized, replayable projection of irreducible domain truth.
- **Derived state** is computed on demand from events; it is not primary data.
- A **mutation** is valid only when the runtime can resolve a complete authority chain for it.

---

## 1. What is authoritative?

| Authority | Meaning | Resolves from |
|---|---|---|
| Event Store | Immutable record of what happened. | `data/event-log.jsonl` / `.synth/data/event-log.jsonl` |
| CanonicalState | Materialized projection of irreducible truth. | `rebuildState(events)` |
| Constitutional Baseline | Invariants that cannot be changed by an Expedition. | `docs/architecture/constitutional-baseline.md` |
| ADR | Accepted architectural decision. | `docs/adr/ADR-NNN-*.md` with `status: Accepted` |
| Approved Mission/Expedition | Authorized work scope. | Events `MISSION_APPROVED`, `EXPEDITION_AUTHORIZED` |
| ExecutionGate | Single mutation authority. | `src/runtime/execution-gate.ts` |

**Rule:** If two representations disagree, the Event Store wins. If the Event Store is ambiguous, the most recent accepted governance artifact wins. If neither resolves it, the mutation is blocked.

---

## 2. What is derived?

Derived state is anything that can be recomputed from events without loss of information.

| Category | Fields | Builder | Owner |
|---|---|---|---|
| Workflow / gate state | `reviewGateExpeditions` | `buildReviewGateExpeditions(events)` | Governance projections |
| Genesis / alignment | `intentModels`, `refinementSessions`, `refinementReports`, `alignmentContracts`, `divergenceGates` | `buildGenesisState(events)` | Genesis projections |
| Execution planning | `executionIntents`, `executionGraphs` | `buildExecutionState(events)` | Execution projections |
| Planning output | `generatedWorkItems` | `buildGeneratedWorkItems(events)` | Planning projections |
| Audit | `executions` | `buildExecutions(events)` | Audit projections |
| Replay cache | `version`, `stateHash`, `lastEventOffset` | replay internals | Replay subsystem |

**Rule:** Derived state may not be persisted as primary data. It may be cached with a provenance stamp and invalidated when the canonical state hash changes.

---

## 3. What can mutate?

Only mutations that pass `ExecutionGate.execute()` may alter repository state.

A mutation is allowed when all of the following resolve to true:

```text
AuthorityExists
  An approved Mission and/or authorized Expedition governs the mutation.

ScopeAllowed
  The mutation target and capability are within the approved Expedition scope.

LifecycleAllowsMutation
  The Expedition lifecycle state permits execution (not paused, under review, or closed).

ImplementationEligible
  All ADRs the Expedition depends on are Accepted.
  All required Convergence Reviews are CONVERGED.
  No Protected Asset is modified without explicit expedition declaration.

ExecutionGateOpen
  The gate is not sealed or in bypass mode (bypass permitted only for Genesis).
```

Formal:

```text
CanMutate(mutation) =
  AuthorityExists(mutation)
  ∧ ScopeAllowed(mutation)
  ∧ LifecycleAllowsMutation(mutation)
  ∧ ImplementationEligible(mutation)
  ∧ ExecutionGateOpen(mutation)
```

Failure produces:

```text
BLOCK_MUTATION
  reason: "No authorized expedition authorizes <target>"
  evidence: authority-state snapshot
```

---

## 4. Who owns the transition?

| Layer | Owns | Does NOT own |
|---|---|---|
| Governance | Semantics, rules, invariants, authorization, evidence, identifier allocation | Tools, adapters, environment config |
| Implementation | Mechanics, adapters, tool versions, build outputs, deterministic projections | Authorization, event log semantics |
| Expedition | Bounded work, objective, scope, acceptance criteria, evidence | Constitutional provisions, kernel changes |
| Bootstrap | One-time scaffolding, initial governance record, environment detection | Ongoing authorization, mission approval |

**Rule:** A transition is owned by the layer that defines its meaning. Execution is performed by the Implementation layer only after Governance authorizes it.

---

## 5. Authority resolution algorithm

```text
Receive mutation request
        |
        v
Identify affected assets and capabilities
        |
        v
Resolve user intent from conversation / command
        |
        v
Resolve implementation authority from repository:
  - active Mission?
  - authorized Expedition?
  - ADR dependencies Accepted?
  - Convergence Review CONVERGED?
  - scope includes target?
        |
        +-- authority incomplete ----> BLOCK + evidence
        |
        v
Read current implementation as state, not truth
        |
        v
Plan changes against authority
        |
        v
ExecutionGate.execute(mutation)
        |
        +-- rejected ----------------> BLOCK + evidence
        |
        v
Apply mutation
        |
        v
Emit event(s)
        |
        v
Verify replay + invariants
        |
        v
Record evidence
```

Key correction from the EXP-HOME-029 regression:

- **Conversation resolves intent.**
- **Repository resolves authority.**
- They are not the same step.

---

## 6. Integration with existing mechanisms

| Mechanism | Role in authority resolver |
|---|---|
| `ExecutionGate` | Enforces the resolver decision at the mutation boundary. |
| `CanonicalState` | Provides irreducible truth for authority lookups (missions, expeditions, objectives). |
| `DerivedState` | Provides workflow/execution context without polluting canonical truth. |
| Event Store | Provides immutable history and replay evidence. |
| ADR process | Provides architectural authority. |
| Convergence Review | Resolves semantic conflicts before implementation. |
| Protected Assets | Declares what cannot change without extraordinary approval. |

No new mechanism is required. This design composes existing ones.

---

## 7. Failure modes

| Failure | Cause | Resolver action |
|---|---|---|
| No active Mission | User request precedes Mission creation | Block; propose Mission creation |
| Expedition not authorized | Mission exists but Expedition not approved | Block; request expedition authorization |
| ADR dependency Proposed | Architectural decision incomplete | Block until ADR Accepted or scope reduced |
| Convergence Review incomplete | Semantic conflict unresolved | Block until CONVERGED |
| Out-of-scope mutation | Target not in approved Expedition scope | Block; request scope amendment |
| Protected Asset touched | Expedition did not declare impact | Block; require protected-asset review |
| Derived state treated as truth | Consumer writes derived field | Block; route through canonical event mutation |

---

## 8. Evidence requirements

Every resolver decision must be replayable:

```text
Event history at decision time
Canonical state at decision time
Derived state at decision time
Authority artifacts (Mission, Expedition, ADRs, reviews)
Resolver decision + reason
Mutation outcome (allowed / blocked)
```

This evidence enables:

- `synth explain replay` — reconstruct the decision.
- `synth verify` — check that blocked mutations did not alter state.
- Future audits — prove authority preceded mutation.

---

## 9. Relation to EXP-GOVERNANCE-ENFORCEMENT-001

This design is the specification. `EXP-GOVERNANCE-ENFORCEMENT-001` will implement the resolver inside `ExecutionGate` and add regression tests for each failure mode.

The resolver itself does not require new:

- lifecycle states
- public vocabulary terms
- events
- ADRs

It requires wiring existing authority checks into the existing mutation boundary.

---

## 10. Open questions for enforcement expedition

1. How are ADR dependencies declared on an Expedition?
2. How is Convergence Review outcome attached to Expedition state?
3. What is the bypass model for Genesis mutations that create governance substrate?
4. How do cached derived projections invalidate on event append?

These are implementation questions, not design questions. They belong to `EXP-GOVERNANCE-ENFORCEMENT-001`.
