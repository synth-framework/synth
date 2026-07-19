# EXP-GOVERN-006 — Governance Completion

> **Architecture expedition.** Finalize the normative Mission/Expedition lifecycle contract, approval semantics, mutation boundaries, and event taxonomy so that Genesis builds on a stable governance platform.

**Status:** Executing  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-PROGRAM-021 (Incremental Governance)  
**Coordinates With:** EXP-RUNTIME-001 (Runtime correctness — implements bridges and recovery primitives; GOVERN-006 defines the contract and certifies satisfaction)

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

## Objective

Mission and Expedition governance are functionally complete, but lifecycle semantics, contracts, and approval boundaries should be finalized before Genesis builds upon them.

Success means governance becomes a stable platform rather than an evolving dependency.

---

## Required Change

### 6.1 Define the Mission lifecycle contract

Produce a normative contract describing canonical states, transitions, emitted events, and invalid transitions:

```text
Draft
  ↓ approve
Approved
  ↓ commit
Committed
  ↓ start
Executing
  ↓ complete
Completed
```

The contract is the source of truth; runtime implementation (event emission, atomicity, recovery) belongs to EXP-RUNTIME-001.

### 6.2 Define the Expedition lifecycle contract

Mirror the Mission contract for Expeditions with explicit transitions from approved proposal to runtime entity.

### 6.3 Define approval semantics

Make approval deterministic in specification:

- Required evidence before approval.
- Confidence threshold semantics.
- Unknown resolution requirements.
- Rejection and revision path.

### 6.4 Define replay reconstruction contract

Specify how governance decisions must be reconstructible from events:

- Mission creation.
- Mission approval.
- Expedition creation.
- Expedition start/commit/complete.
- Evidence attachment.

### 6.5 Finalize event taxonomy

Document the canonical governance event types and schemas, aligned with `src/types/event.ts`.

### 6.6 Define mutation boundaries

Explicitly classify operations:

- `READ_ONLY` — safe during discovery.
- `PROPOSAL_ONLY` — generates a proposal but does not mutate runtime state.
- `MUTATING` — requires approval and mutates runtime state.

### 6.7 Finalize bootstrap contract

Publish the brownfield bootstrap contract as a normative reference for onboarding.

### 6.8 Add contract certification tests

Add tests that verify the runtime satisfies the governance contract without depending on runtime internals.

---

## Deliverables

1. Mission lifecycle contract — `docs/reference/governance-lifecycle-contract.md` §1.
2. Expedition lifecycle contract — `docs/reference/governance-lifecycle-contract.md` §2.
3. Approval semantics specification — `docs/reference/governance-lifecycle-contract.md` §3.
4. Governance event taxonomy — `docs/architecture/09-event-model.md` §Governance Events.
5. Mutation boundary contract — `docs/reference/governance-lifecycle-contract.md` §4.
6. Brownfield bootstrap contract — `docs/guides/brownfield-bootstrap-specification.md`.
7. ADR on governance lifecycle freeze — `docs/adr/ADR-026-governance-lifecycle-freeze.md`.
8. Certification tests — `tests/governance-lifecycle-contract.test.js`.

---

## Acceptance Criteria

- The Mission lifecycle contract states, transitions, and events are documented and match `src/types/state.ts` / `src/types/event.ts`.
- The Expedition lifecycle contract states, transitions, and events are documented and match `src/types/state.ts` / `src/types/event.ts`.
- Approval semantics specify required evidence, confidence threshold, unknown resolution, and rejection/revision paths.
- Replay reconstruction requirements are documented for all governance lifecycle events.
- Mutation boundaries classify every public CLI command as `READ_ONLY`, `PROPOSAL_ONLY`, or `MUTATING`.
- Bootstrap contract is published and testable.
- Certification tests pass and use only public CLI commands and documented artifacts.
- `npm run govern` passes.

---

## Relationship to EXP-RUNTIME-001

GOVERN-006 owns the **contract** and **certification**:

- What states and transitions are valid.
- What events must appear in the log for each transition.
- What mutation classifications apply.
- What tests prove the contract is satisfied.

RUNTIME-001 owns the **implementation**:

- Atomic transition execution.
- Event emission guarantees.
- `synth repair replay` / `synth reconcile` recovery primitives.

GOVERN-006 may add certification tests that fail if RUNTIME-001's implementation is incomplete, but it does not implement the runtime bridges itself.

---

## Out of Scope

- Discovery compiler architecture changes.
- Protected Asset modifications.
- Code generation.
- IDE/MCP/Web integrations.

---

## Success Criteria

Governance becomes a stable, contract-defined platform that Genesis can depend on without encountering lifecycle edge cases.
