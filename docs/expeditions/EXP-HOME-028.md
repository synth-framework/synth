# EXP-HOME-028 — Homepage Mission Approval

> **Genesis expedition.** Approve the Mission Studio homepage Mission only after the Alignment Contract is aligned.

**Status:** Proposed  
**Kind:** Genesis Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-026, EXP-HOME-027  
**Blocks:** EXP-HOME-001, EXP-HOME-002, EXP-HOME-003, EXP-HOME-025

> **Authority:** ADR-045 — Governance Lifecycle & State Machine Specification

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Obtain formal Mission approval for Program 027 under Governance Architecture v1.0. Approval is authorized only when the Alignment Contract has passed the Divergence Gate with an `aligned` decision. This expedition proves that SYNTH's governance lifecycle can block Mission creation until intent is validated.

---

## Origin Evidence

Previously, Program 027 proceeded from intent to Mission to Expeditions without a governed alignment checkpoint. The homepage incident demonstrated that this shortcut permits semantic drift. EXP-PROGRAM-036 introduced the Divergence Gate; this expedition applies it to Program 027.

---

## Required Change

### 1.1 Mission approval prerequisites

- Approved Intent Model (EXP-HOME-026).
- Approved Alignment Contract (EXP-HOME-027).
- Divergence Gate decision: `aligned`.
- Authorized reviewer satisfies the Mission Approval Gate per policy.

### 1.2 Mission approval artifacts

```text
Mission Draft
Alignment Contract reference
Divergence Gate decision
Reviewer identity
Approval timestamp
```

### 1.3 Failure modes

- If the Divergence Gate resolves to `revision_required`, the Alignment Contract must be refined before Mission approval.
- If the Divergence Gate resolves to `rejected`, the intent cannot be pursued as stated.
- If the Divergence Gate resolves to `superseded`, a new Intent Model must be created.

---

## Definition of Done

- [ ] Mission Draft is created for Program 027.
- [ ] Mission approval request references the aligned Alignment Contract.
- [ ] Mission Approval Gate resolves to `approved`.
- [ ] Approved Mission is recorded as a governance event.
- [ ] Downstream Synthesis expeditions are unblocked.

---

## Out of Scope

- Intent Model creation (EXP-HOME-026).
- Alignment Contract creation (EXP-HOME-027).
- Implementation of homepage expeditions.

---

## Acceptance Criteria

- Mission approval fails if no aligned Alignment Contract is present.
- Mission approval succeeds only with an explicit `aligned` Divergence Gate decision.
- The approval event is replayable from the event log.
- Downstream expeditions cannot begin before this expedition completes.
