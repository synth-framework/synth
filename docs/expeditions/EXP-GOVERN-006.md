# EXP-GOVERN-006 — Governance Completion

> **Architecture expedition.** Finalize Mission/Expedition lifecycle semantics, approval boundaries, and replay contracts so that Genesis builds on a stable governance platform.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-023 — Genesis  
**Depends On:** EXP-PROGRAM-021 (Incremental Governance), EXP-RUNTIME-001 (Runtime correctness)

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

### 6.1 Freeze Mission lifecycle

Define the canonical states and transitions:

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

Each transition must emit the required runtime events or fail atomically.

### 6.2 Freeze Expedition lifecycle

Mirror the Mission lifecycle for Expeditions with explicit transitions from approved proposal to runtime entity.

### 6.3 Approval semantics

Make approval deterministic:

- Required evidence before approval.
- Confidence threshold semantics.
- Unknown resolution requirements.
- Rejection and revision path.

### 6.4 Replay reconstruction

Ensure replay fully reconstructs governance decisions from events:

- Mission creation.
- Mission approval.
- Expedition creation.
- Expedition start/commit/complete.
- Evidence attachment.

### 6.5 Event taxonomy

Finalize the canonical event types and schemas for governance.

### 6.6 Mutation boundaries

Explicitly define:

- What constitutes a mutating operation.
- Which operations require approval.
- Which operations are safe during discovery.
- Which operations are proposal-only.

### 6.7 Bootstrap contracts

Finalize the brownfield bootstrap contract as a normative reference for onboarding.

---

## Deliverables

1. Frozen Mission lifecycle contract.
2. Frozen Expedition lifecycle contract.
3. Approval semantics specification.
4. Governance event taxonomy.
5. Mutation boundary contract.
6. Bootstrap contract finalized.
7. ADR on governance lifecycle freeze.

---

## Acceptance Criteria

- Mission lifecycle transitions emit required runtime events or fail atomically.
- Expedition lifecycle transitions emit required runtime events or fail atomically.
- Replay reconstructs governance decisions from events.
- Mutation boundaries are documented and enforced.
- Bootstrap contract is published and testable.
- `npm run govern` passes.

---

## Out of Scope

- Discovery compiler architecture changes.
- Protected Asset modifications.
- Code generation.
- IDE/MCP/Web integrations.

---

## Success Criteria

Governance becomes a stable, contract-defined platform that Genesis can depend on without encountering lifecycle edge cases.
