# EXP-SIMPLIFICATION-ASSESSMENT-001 — Complexity and Ownership Inventory Report

**Status:** Completed  
**Expedition:** `EXP-SIMPLIFICATION-ASSESSMENT-001`  
**Date:** 2026-07-21  
**Authority:** Read-only assessment; no repository mutations performed.

---

## Executive Summary

SYNTH is not over-engineered at its core. The core is small and coherent. The problem is that **implementation concepts have been promoted into canonical state** before their role was clarified, and **workflow state has been allowed to coexist with facts** in the event log and canonical state.

The result is that `CanonicalState` contains many fields that are not irreducible truth. They are projections, workflow state, or cached interpretations. This creates the appearance of complexity and provides multiple surfaces where authority ordering can be bypassed.

**Recommendation:** Simplify the canonical model before enforcing authority ordering. Specifically:

1. Reduce `CanonicalState` to irreducible sources of truth.
2. Make gate and review state derived from events rather than canonical.
3. Resolve the Genesis ambiguity: either a lifecycle layer or an adapter/runtime mechanism, not both.
4. Remove or reclassify projection/workflow fields.
5. Then implement `EXP-GOVERNANCE-ENFORCEMENT-001` on the smaller, clearer model.

---

## 1. State Complexity Report

### Classification key

| Classification | Meaning |
|---|---|
| **Source of truth** | Cannot be reconstructed without loss of information. Must remain canonical. |
| **Projection** | Derivable from events and other state. Should not be canonical. |
| **Workflow state** | Temporary coordination mechanism. Should be derived, not stored. |
| **Evidence / audit** | Record of a decision or observation. Could be event-only. |
| **Cache** | Performance optimization. Can be discarded and rebuilt. |
| **Compatibility** | Exists only for migration or backward compatibility. |

### CanonicalState field analysis

| Field | Created by | Consumed by | User-visible | Replay-required | Classification | Notes |
|---|---|---|---|---|---|---|
| `version` | replay loop | hash computation | No | Yes | **Cache** | Incremented per event; replay recomputes it. |
| `stateHash` | `computeStateHash` | identity, proof | No | Yes | **Cache** | Derived from all other fields. |
| `lifecycle` | `PROJECT_INITIALIZED`, `MISSION_MATERIALIZED`, `SYSTEM_GENESIS` | bootstrap checks | No | Yes | **Source of truth** | One of few true global state flags. |
| `workItems` | `WORK_ITEM_*` | domain, UI, replay | Indirect | Yes | **Source of truth** | Canonical execution entity. |
| `plans` | `PLAN_CREATED`, `PLAN_ACTIVATED`, `PLAN_COMPLETED` | planning, UI | Yes | Yes | **Source of truth** | Public vocabulary term. |
| `milestones` | `MILESTONE_*` | planning, UI | Indirect | Yes | **Source of truth** | Grouping construct. |
| `projects` | `PROJECT_*` | planning | Indirect | Yes | **Source of truth** | Top-level container. |
| `missions` | `MISSION_*` | governance, UI | Yes | Yes | **Source of truth** | Public vocabulary term. |
| `expeditions` | `EXPEDITION_*` | governance, UI | Yes | Yes | **Source of truth** | Public vocabulary term. |
| `reviewGateExpeditions` | `REVIEW_GATE_*`, `ACCEPTANCE_GATE_*`, `REVISION_REQUESTED`, `REFINED_INTENT_APPROVED` | governance engine | No | Yes | **Workflow state / projection** | Gate status can be derived from events. |
| `objectives` | `OBJECTIVE_ADDED` | planning, expeditions | Indirect | Yes | **Source of truth** | Bounded work within expedition. |
| `discoveries` | `DISCOVERY_RECORDED` | expeditions | Indirect | Yes | **Source of truth** | Learned knowledge. |
| `decisions` | `DECISION_ACCEPTED`, `DECISION_REJECTED` | expeditions | Indirect | Yes | **Source of truth** | Chosen direction. |
| `intentModels` | `INTENT_MODEL_*` | genesis, mission studio | No | Yes | **Projection** | Structured interpretation of raw intent. |
| `refinementSessions` | `REFINEMENT_SESSION_*` | genesis | No | Yes | **Workflow state** | Question/answer loop. |
| `refinementReports` | `REFINEMENT_REPORT_*` | genesis | No | Yes | **Evidence / projection** | Outcome of refinement. |
| `alignmentContracts` | `ALIGNMENT_CONTRACT_*` | genesis, mission approval | No | Yes | **Projection / workflow state** | Formal agreement before Mission. |
| `referenceEvidence` | `REFERENCE_EVIDENCE_*` | governance | No | Yes | **Source of truth** | Bound artifacts. |
| `divergenceGates` | `DIVERGENCE_GATE_*` | genesis | No | Yes | **Workflow state** | Pre-Mission alignment checkpoint. |
| `generatedWorkItems` | `WORK_ITEM_GENERATED` | planning | No | Yes | **Projection** | Could be derived from plan/expedition. |
| `executions` | `TRANSACTION_STARTED` | audit | No | Yes | **Audit / cache** | Transaction record. |
| `executionIntents` | `EXECUTION_INTENT_*` | execution runtime | No | Yes | **Workflow state / projection** | Derived from execution graph. |
| `executionGraphs` | `EXECUTION_INTENT_GRAPH_*`, `EXPEDITION_BRANCH_*` | execution runtime | No | Yes | **Workflow state / projection** | Derived from expedition plan. |
| `repository` | `REPOSITORY_*` | repository governance | Indirect | Yes | **Source of truth** | External forge state. |
| `lastEventOffset` | replay loop | state metadata | No | Yes | **Cache** | Derived from events. |

### Findings

- **Source of truth fields:** `lifecycle`, `workItems`, `plans`, `milestones`, `projects`, `missions`, `expeditions`, `objectives`, `discoveries`, `decisions`, `referenceEvidence`, `repository`.
- **Projection / workflow fields that should not be canonical:** `reviewGateExpeditions`, `intentModels`, `refinementSessions`, `refinementReports`, `alignmentContracts`, `divergenceGates`, `generatedWorkItems`, `executions`, `executionIntents`, `executionGraphs`.
- **Pure cache:** `version`, `stateHash`, `lastEventOffset`.

### Key concern

`CanonicalState` has become a catch-all materialization of every event type. The comment at the top of `src/types/state.ts` says:

> State is a derived, materialized projection of the Event Store. It is NOT primary data.

Yet many fields are not projections of irreducible truth; they are cached workflow state. This contradicts the stated design.

---

## 2. Event Inventory

### Classification key

| Classification | Meaning |
|---|---|
| **Fact** | Something happened that changed the meaning of the system. |
| **Workflow transition** | System moved from one coordination state to another. |
| **Audit** | Evidence that something was checked or decided. |
| **Projection input** | Exists only to feed a derived view. |

### Event type analysis

| Event Type | Producer | Reducer | Classification | Notes |
|---|---|---|---|---|
| `WORK_ITEM_CREATED` | capability/domain | `replay.ts` | **Fact** | Canonical entity creation. |
| `WORK_ITEM_STARTED` | capability/domain | `replay.ts` | **Fact** | Status change. |
| `WORK_ITEM_COMPLETED` | capability/domain | `replay.ts` | **Fact** | Status change. |
| `WORK_ITEM_BLOCKED` | capability/domain | `replay.ts` | **Fact** | Status change. |
| `PLAN_CREATED` | capability/domain | `replay.ts` | **Fact** | Public vocabulary. |
| `PLAN_ACTIVATED` | capability/domain | `replay.ts` | **Workflow transition** | Could be a Mission/Expedition event. |
| `PLAN_COMPLETED` | capability/domain | `replay.ts` | **Workflow transition** | Could be derived from work items. |
| `MILESTONE_CREATED` / `STARTED` / `COMPLETED` | capability/domain | `replay.ts` | **Fact / workflow** | Grouping state. |
| `PROJECT_CREATED` / `PROJECT_INITIALIZED` | capability/domain | `replay.ts` | **Fact** | Bootstrap/lifecycle. |
| `MISSION_CREATED` | capability/domain | `replay.ts` | **Fact** | Public vocabulary. |
| `MISSION_APPROVED` | governance | `replay.ts` | **Fact** | Authority transition. |
| `MISSION_COMPLETED` / `MISSION_ARCHIVED` | governance | `replay.ts` | **Fact** | Lifecycle. |
| `MISSION_PROJECTED` | governance | `replay.ts` (no-op) | **Audit / projection input** | No state mutation. |
| `PROJECTION_CERTIFIED` / `FAILED` | governance | `replay.ts` (no-op) | **Audit / projection input** | No state mutation. |
| `EXPEDITION_CREATED` | capability/domain | `replay.ts` | **Fact** | Public vocabulary. |
| `EXPEDITION_APPROVED` | governance | `replay.ts` | **Fact** | Authority transition. |
| `EXPEDITION_AUTHORIZED` | ExecutionGate | `replay.ts` | **Fact / audit** | Marks authorized execution. |
| `EXPEDITION_COMMITTED` / `STARTED` / `COMPLETED` | governance | `replay.ts` | **Workflow transition** | Coordination state. |
| `REVIEW_GATE_OPENED` / `RESOLVED` | governance | `replay.ts` | **Workflow transition** | Gate coordination. |
| `REVISION_REQUESTED` | governance | `replay.ts` | **Workflow transition** | Re-entry into implementation. |
| `ACCEPTANCE_GATE_OPENED` / `RESOLVED` | governance | `replay.ts` | **Workflow transition** | Gate coordination. |
| `EXPEDITION_CLOSED` | governance | `replay.ts` | **Workflow transition** | Final state. |
| `REFINED_INTENT_APPROVED` | governance | `replay.ts` | **Fact** | Per-expedition contract. |
| `INTENT_MODEL_CREATED` / `REVISED` / `SUBMITTED` / `SUPERSEDED` | genesis | `replay.ts` | **Fact / workflow** | Genesis intent representation. |
| `REFINEMENT_SESSION_STARTED` | genesis | `replay.ts` | **Workflow transition** | Question loop. |
| `REFINEMENT_QUESTION_ANSWERED` | genesis | `replay.ts` | **Fact** | Answer recorded. |
| `REFINEMENT_REPORT_CREATED` / `APPROVED` / `REJECTED` | genesis | `replay.ts` | **Fact / audit** | Refinement outcome. |
| `ALIGNMENT_CONTRACT_CREATED` / `SUBMITTED` / `APPROVED` / `REJECTED` / `SUPERSEDED` | genesis | `replay.ts` | **Fact / workflow** | Pre-Mission contract. |
| `REFERENCE_EVIDENCE_CREATED` / `BOUND` | governance | `replay.ts` | **Fact** | Evidence binding. |
| `DIVERGENCE_GATE_OPENED` / `RESOLVED` | genesis | `replay.ts` | **Workflow transition** | Alignment checkpoint. |
| `OBJECTIVE_ADDED` / `OBJECTIVE_COMPLETED` | capability/domain | `replay.ts` | **Fact** | Expedition work. |
| `DISCOVERY_RECORDED` | capability/domain | `replay.ts` | **Fact** | Learned knowledge. |
| `DECISION_ACCEPTED` / `REJECTED` | capability/domain | `replay.ts` | **Fact** | Direction chosen. |
| `REPAIR_ACCEPTED` | runtime | `replay.ts` (no-op) | **Audit** | No state mutation. |
| `FIRST_CONTACT_STARTED` / `DISCOVERY_APPROVED` / `MISSION_MATERIALIZED` / `EXPEDITIONS_PROPOSED` | first-contact | `replay.ts` | **Fact** | Greenfield onboarding. |
| `WORK_ITEM_GENERATED` | planning | `replay.ts` | **Projection input** | Could be derived. |
| `SYSTEM_GENESIS` | bootstrap | `replay.ts` | **Fact** | Initial state version. |
| `TRANSACTION_STARTED` | runtime | `replay.ts` | **Workflow / audit** | Transaction marker. |
| `EXECUTION_INTENT_CREATED` / `GRAPH_CREATED` / `STARTED` / `COMPLETED` / `FAILED` / `ROLLEDBACK` | execution | `replay.ts` | **Workflow transition** | Execution coordination. |
| `EXPEDITION_BRANCH_CREATED` | execution | `replay.ts` | **Fact** | Repository branch. |
| `EXPEDITION_EXECUTION_COMMITTED` / `PROJECTED` | execution | `replay.ts` | **Fact** | Output recorded. |
| `REPOSITORY_INITIALIZED` / `BRANCH_CREATED` / `PULL_REQUEST_*` / `PROMOTION_*` / `RELEASE_CREATED` | repository | `replay.ts` | **Fact** | External forge state. |
| `TRANSACTION_STARTED` / `COMMITTED` / `ROLLEDBACK` | runtime | — | **Workflow / audit** | Transaction lifecycle. |
| `CAPABILITY_EXECUTED` | runtime | — | **Audit** | Capability invocation. |
| `POLICY_EVALUATED` / `POLICY_DENIED` / `INVARIANT_VIOLATION` | policy engine | — | **Audit** | Governance decisions. |

### Findings

- Healthy fact events exist for the core model: `WORK_ITEM_*`, `MISSION_*`, `EXPEDITION_*`, `OBJECTIVE_ADDED`, `DISCOVERY_RECORDED`, `DECISION_*`.
- A large number of events are workflow transitions: `REVIEW_GATE_*`, `ACCEPTANCE_GATE_*`, `DIVERGENCE_GATE_*`, `EXECUTION_INTENT_*`, `EXPEDITION_COMMITTED/STARTED/COMPLETED`.
- Several events are audit-only or projection input and produce no state mutation: `MISSION_PROJECTED`, `PROJECTION_CERTIFIED`, `REPAIR_ACCEPTED`, `WORK_ITEM_GENERATED`.
- The Genesis/Alignment events (`INTENT_MODEL_*`, `REFINEMENT_*`, `ALIGNMENT_CONTRACT_*`, `DIVERGENCE_GATE_*`) encode a pre-Mission lifecycle that is not fully ratified.

### Key concern

The event log is drifting from **what happened** toward **how the system processed it**. Workflow transitions should be derivable from a smaller set of facts.

---

## 3. Concept Inventory

### Public vocabulary (7 terms)

| Concept | Visibility | Role | Owner | Introduced by |
|---|---|---|---|---|
| Mission | Public | Long-term strategic commitment | Governance | ADR-004, Constitution |
| Expedition | Public | Bounded engineering objective | Governance | ADR-004, Constitution |
| Evidence | Public | Proof of what was built | Governance | ADR-004, Constitution |
| Plan | Public | Decomposition of Mission | Planning | ADR-004, Constitution |
| Event | Public | Immutable record of change | Governance | ADR-004, Constitution |
| State | Public | Materialized projection of events | Runtime | ADR-004, Constitution |
| Replay | Public | Deterministic reconstruction | Runtime | ADR-004, Constitution |

### Internal concepts

| Concept | Visibility | Canonical / Projection / Workflow | Owner | Introduced by | Notes |
|---|---|---|---|---|---|
| WorkItem | Internal | Canonical | Domain | Core | Smallest unit of work. |
| Project | Internal | Canonical | Domain | Core | Top-level container. |
| Milestone | Internal | Canonical | Domain | Core | Logical grouping. |
| Objective | Internal | Canonical | Expedition | Core | Expedition outcome. |
| Discovery | Internal | Canonical | Expedition | Core | Learned knowledge. |
| Decision | Internal | Canonical | Expedition | Core | Chosen direction. |
| ReferenceEvidence | Internal | Canonical | Governance | ADR-027 | Bound artifacts. |
| IntentModel | Internal | Projection | Genesis | ADR-048 (Accepted) | Structured intent. |
| RefinementSession | Internal | Workflow | Genesis | ADR-048 (Accepted) | Q/A loop. |
| RefinementReport | Internal | Evidence / projection | Genesis | ADR-048 (Accepted) | Refinement outcome. |
| AlignmentContract | Internal | Projection / workflow | Genesis | ADR-048 (Accepted) | Pre-Mission agreement. |
| DivergenceGate | Internal | Workflow | Genesis | ADR-048 (Accepted) | Alignment checkpoint. |
| ReviewGate | Internal | Workflow | Governance | ADR-045 | Review checkpoint. |
| AcceptanceGate | Internal | Workflow | Governance | ADR-045 | Final sign-off. |
| RefinedIntent | Internal | Projection | Governance | EXP-PROGRAM-035 | Per-expedition contract. |
| ReviewPackage | Internal | Projection | Governance | EXP-PROGRAM-035 | Review bundle. |
| AcceptancePackage | Internal | Projection | Governance | EXP-PROGRAM-035 | Sign-off bundle. |
| ExecutionIntent | Internal | Workflow | Implementation | EXP-EXEC-001 | Governed mutation unit. |
| ExecutionGraph | Internal | Workflow | Implementation | EXP-EXEC-001 | Intent dependency graph. |
| GeneratedWorkItem | Internal | Projection | Planning | Core | Plan output. |
| Capability | Internal | Mechanism | Implementation | ADR-007 | Runtime extension point. |
| Adapter | Internal | Mechanism | Implementation | ADR-004 / ADR-017 | External system bridge. |
| ExecutionGate | Internal | Mechanism | Control / Governance | Kernel Freeze | Single mutation authority. |
| RuntimeEngine | Internal | Mechanism | Runtime | Kernel Freeze | Execution and persistence. |
| EventStore | Internal | Mechanism | Infra | Kernel Freeze | Append-only storage. |
| StateStore | Internal | Mechanism | Infra | Kernel Freeze | State persistence. |
| PolicyEngine | Internal | Mechanism | Governance | Core | Invariant enforcement. |
| MissionStudio | Internal | Mechanism | Planning | ADR-027 | Planning orchestrator. |
| Genesis | Ambiguous | Layer or mechanism | Ambiguous | ADR-035 / ADR-048 / ADR-045 | See Section 5. |
| Program | Internal | Organizational | Governance | ADR-039 | Program portfolio. |
| ConvergenceReview | Internal | Workflow | Governance | ADR-039 | Architectural alignment gate. |

### Findings

- The public vocabulary is clean and small.
- Internal concepts outnumber public concepts by roughly 4:1.
- Many internal concepts are workflow or projection state that could be derived.
- The Genesis/Alignment cluster (`IntentModel`, `RefinementSession`, `RefinementReport`, `AlignmentContract`, `DivergenceGate`) is the largest source of ambiguity.
- `Genesis` itself has no clear owner; it is treated as both a lifecycle layer and a runtime mechanism.

### Estimate for new contributors

A new contributor must understand approximately **8-10 core concepts** to make a simple change, but must understand **25+ concepts** to reason about governance, Genesis, or execution. The gap between simple and complex work is large.

---

## 4. Code Ownership Map

### Claimed ownership (from comments and architecture docs)

| Component | File(s) | Owns | Does not own |
|---|---|---|---|
| **ExecutionGate** | `src/control/execution-gate.ts` | Authorization, mutation commit boundary, event emission trigger | Domain logic, external IO |
| **RuntimeEngine** | `src/runtime/engine.ts` | Event persistence, state rebuilding | Authorization, validation, policy |
| **Executor** | `src/runtime/executor.ts` | Pure domain execution for a pre-authorized invocation | Persistence, authorization |
| **Replay** | `src/runtime/replay.ts` | State reconstruction, aggregate graph validation | Mutation, authorization |
| **Domain** | `src/domain/*.ts` | Pure state transition logic | IO, persistence |
| **EventStore** | `src/infra/event-store.ts` | Append-only storage, hash chaining | Authorization |
| **StateStore** | `src/infra/state-store.ts` | State persistence | Authorization |
| **MissionStudio** | `src/mission-studio/*.ts` | Planning, snapshot creation | Event emission, mutation |
| **Genesis** | `src/genesis/*.ts` | Intent-to-seed-events transformation | Normal execution authorization |
| **CLI** | `src/cli/*.ts` | Command parsing, operator surface | Direct mutation (but see below) |
| **Adapters** | `src/adapters/**/*.ts` | External observation, capability implementation | Authorization |
| **Capabilities** | `src/capability/*.ts` | Registry, invocation | Direct mutation |
| **FirstContact** | `src/first-contact/*.ts` | Greenfield onboarding | Normal expedition authority |
| **Mutation** | `src/mutation/*.ts` | Mutation providers | Authorization |

### Observed violations of ownership

| Violation | Evidence | Risk |
|---|---|---|
| CLI writes files directly | `src/cli/agent-artifacts.ts`, `src/cli/bootstrap-apply.ts`, `src/cli/ai-metadata.ts` contain `writeFile`/`mkdir` | Bypasses ExecutionGate. |
| Adapters mutate filesystem | `src/adapters/tdd/adapter.ts`, `src/adapters/filesystem/` | Adapters should observe; mutation should be requested. |
| Genesis bypasses normal authority | `executeGenesis()` in `ExecutionGate` bypasses policy/capability resolution | Necessary but needs explicit model. |
| Mission Studio produces snapshots but no events | `src/mission-studio/snapshot-store.ts` | Snapshots are cached projections, not source of truth. |
| RuntimeEngine both executes and persists | `engine.ts` mixes execution and persistence responsibilities | Minor; persistence is delegated to EventStore. |
| `src/cli/synth.ts` may orchestrate mutations | CLI entry point can dispatch commands | Depends on whether commands route through ExecutionGate. |

### Findings

- The architecture documents clear ownership, but implementation has side doors.
- The most significant side doors are in `src/cli/` and `src/adapters/`.
- `EXP-CAPABILITY-BOUNDARY-001` created the `MutationRequest` boundary, but adoption is incomplete.

---

## 5. Runtime-Ahead-of-Authority Classification

| Concept | Runtime state exists | Governing ADR/Expedition | Status | Likely cause | Recommended remedy |
|---|---|---|---|---|---|
| `intentModels` | Yes | ADR-048 | **Accepted** | B — documentation lag; resolved by renumbering ADR-037-genesis to ADR-048 | Retain; state should become derived. |
| `refinementSessions` | Yes | ADR-048 | **Accepted** | B — documentation lag; resolved by renumbering | Retain; state should become derived. |
| `refinementReports` | Yes | ADR-048 | **Accepted** | B — documentation lag; resolved by renumbering | Retain; state should become derived. |
| `alignmentContracts` | Yes | ADR-048 | **Accepted** | B — documentation lag; resolved by renumbering | Retain; state should become derived. |
| `divergenceGates` | Yes | ADR-048 | **Accepted** | B — documentation lag; resolved by renumbering | Retain; state should become derived. |
| `reviewGateExpeditions` | Yes | ADR-045 / EXP-PROGRAM-035 | Accepted | N/A | Already ratified. |
| `executionIntents` | Yes | EXP-EXEC-001 | Completed/Accepted | N/A | Already ratified. |
| `executionGraphs` | Yes | EXP-EXEC-001 | Completed/Accepted | N/A | Already ratified. |
| ADR numbering collision (036, 037) | N/A | N/A | **Stagnation / drift** | Process failure | Resolve collisions; update README. |
| Stale ADR README | N/A | N/A | **Stagnation** | Process failure | Update README through ADR-046. |

### Key finding

The Genesis/Alignment concepts are **not** accidental implementations. They are intentional capabilities whose ADRs lagged behind implementation. This is **Case B (documentation lag)**, not Case A (governance failure). The correct remedy is to update the ADRs to Accepted or merge them into the already-Accepted ADR-045, not to remove the runtime state.

However, the ADR numbering collision and stale README are **process failures** that allowed ambiguity to persist.

---

## 6. Simplification Opportunities

### High-value simplifications

1. **Reduce `CanonicalState` to irreducible truth**
   - Remove or reclassify: `reviewGateExpeditions`, `intentModels`, `refinementSessions`, `refinementReports`, `alignmentContracts`, `divergenceGates`, `generatedWorkItems`, `executions`, `executionIntents`, `executionGraphs`.
   - These can remain in the event log but should not be first-class canonical fields.

2. **Derive gate state from events**
   - `ReviewGateState`, `AcceptanceGateState`, and `DivergenceGateState` can be computed on demand.
   - This eliminates workflow state from canonical state.

3. **Clarify Genesis boundary**
   - Decide: is Genesis a lifecycle layer (Option B) or an adapter/runtime mechanism (Option A)?
   - Current evidence: ADR-048 says layer; implementation says mechanism. ADR-045 accepts the layer view.
   - Recommendation: treat Genesis as the **pre-Mission lifecycle layer** and move its state out of canonical state into derived projections.

4. **Merge or derive execution intent state**
   - `executionIntents` and `executionGraphs` are planning outputs. They should be derivable from Expedition + WorkItem + Capability information.

5. **Close CLI/adapter side doors**
   - Route all direct writes through `ExecutionGate.execute()`.
   - This is the goal of `EXP-MUTATION-LIFECYCLE-001`, but it should happen after the canonical model is simplified.

### Simplifications to avoid

- Do not delete Genesis/Alignment events. They are intentional and ADR-045 has accepted the layer.
- Do not remove `Mission`, `Expedition`, `Plan`, `WorkItem`, `Evidence`, `Event`, `State`, or `Replay` from public vocabulary.
- Do not add new concepts to replace the ones being simplified.

---

## 7. Final Assessment and Recommendation

### Diagnosis confirmed

The root issue is the same across incidents:

> Authority exists. Representation exists. Implementation bypasses authority ordering.

But the reason the bypass keeps happening is that **the system has too many surfaces to protect**. When canonical state contains workflow and projection fields, every new feature naturally adds more authority checks, more gates, and more concepts.

### Recommendation: Simplify first, then enforce

Do not implement `EXP-GOVERNANCE-ENFORCEMENT-001` yet. Instead, run a focused simplification expedition with this scope:

1. **Canonical state reduction** — move workflow/projection fields out of `CanonicalState`.
2. **Derived gate state** — compute gate status from events.
3. **Genesis boundary resolution** — document Genesis as a lifecycle layer with derived state.
4. **ADR housekeeping** — resolve numbering collisions, update README, ratify ADR-047 and ADR-048.
5. **Authority-state resolver** — design the resolver for `EXP-GOVERNANCE-ENFORCEMENT-001`, but do not wire it yet.

After simplification, the authority enforcement will have fewer surfaces to protect and clearer rules to evaluate.

### Why not enforce first?

Enforcing authority ordering on the current model would:

- Lock in the over-broad `CanonicalState`.
- Require `EXPEDITION_AUTHORIZED` checks for workflow/projection mutations.
- Make it harder to later remove fields because they would be "governed."
- Add machinery without reducing complexity.

### Smallest correction

The smallest correction that addresses the root cause is:

> Reduce canonical state to irreducible truth, then enforce that no mutation may represent a concept whose authority is incomplete.

This is two expeditions, not one. But the second expedition becomes trivial once the first is done.

---

## Evidence Annex

### Files read

- `src/types/state.ts`
- `src/types/event.ts`
- `src/types/execution-intent.ts`
- `src/control/execution-gate.ts`
- `src/runtime/engine.ts`
- `src/runtime/executor.ts`
- `src/runtime/replay.ts`
- `src/domain/index.ts`
- `src/genesis/index.ts`
- `src/mission-studio/engine.ts`
- `docs/architecture/constitutional-layer-boundaries.md`
- `docs/architecture/constitution.md`
- `docs/adr/ADR-035-genesis-protocol.md`
- `docs/adr/ADR-047-intent-refinement-and-alignment-governance.md`
- `docs/adr/ADR-048-genesis-lifecycle-and-alignment-contracts.md`
- `docs/adr/ADR-045-governance-lifecycle-state-machine.md`
- `docs/adr/ADR-046-implementation-authority-ordering.md`
- `docs/analysis/simplified-interaction-model-decision.md`
- `docs/reference/term-inventory.md`
- `tests/public-vocabulary-audit.test.js`
- `data/event-log.jsonl` (sample)

### No mutations performed

This report was produced by read-only inspection. No code, events, ADRs, or governance artifacts were modified.
