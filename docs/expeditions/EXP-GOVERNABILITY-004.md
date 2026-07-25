# EXP-GOVERNABILITY-004 — Convergence Certification Design

> **Design expedition.** Define the architecture, contract, and evidence model for certifying whether an implemented outcome remains converged with the approved intent after execution, using deterministic evidence derived from the approved decision chain and resulting implementation state.

**Status:** Completed — Convergence certification design is implemented; closed as part of Release Candidate portfolio pruning.
**Kind:** Design Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GOVERNABILITY-003, EXP-HOME-026, EXP-HOME-027  
**Blocks:** EXP-GOVERNABILITY-005, EXP-GATE-012, EXP-GATE-013, EXP-REFINE-009  

---

## Purpose

Program 027 demonstrated that an implementation can satisfy every expedition definition-of-done while still diverging from the original human intent. Convergence Certification closes that gap by providing an explicit, evidence-based checkpoint that compares the delivered outcome against the approved Alignment Contract and Intent Model.

This expedition produces the design required for a later implementation expedition. It does not implement Convergence Certification.

---

## Objective

Define the mechanism that certifies whether an implemented outcome remains converged with the approved Alignment Contract and original intent after execution.

---

## Required Decisions

### 1. Certification Subject

The certification subject is the **completed Mission outcome**, composed of:

- Approved Intent Model
- Approved Alignment Contract
- Reference Evidence Binding
- Implemented Artifacts
- Execution Evidence

The minimum required evidence set is the Alignment Contract plus the implemented artifact set consumed by the Acceptance Gate.

### 2. Lifecycle Position

```text
Intent
  ↓
Alignment Contract
  ↓
Mission
  ↓
Expedition
  ↓
Implementation
  ↓
Review Gate
  ↓
Acceptance Gate
  ↓
Convergence Certification
  ↓
Mission Completion
```

Convergence Certification is required before Mission completion. It is not a blocking gate in the same sense as Review or Acceptance; it is a certification record that confers lifecycle authority.

### 3. Certification Semantics

Convergence Certification is a **certification record with lifecycle authority**:

- It is not another generic approval gate.
- A Mission cannot be completed without a valid certification.
- The certification can pass or fail.
- Failure must be explainable across the four evaluation dimensions.

### 4. Evaluation Dimensions

| Dimension         | Question                                             |
| ----------------- | ---------------------------------------------------- |
| Intent fidelity   | Does the result still represent the original intent? |
| Contract fidelity | Does it satisfy the Alignment Contract?              |
| Evidence fidelity | Does the required evidence trace remain complete?    |
| Drift absence     | Did any prohibited interpretation survive execution? |

### 5. Relationship to Proposal Evaluation

Proposal Evaluation is predictive and executes before or during proposal acceptance:

```text
"What are we about to build?"
            ↓
"Should this proceed?"
```

Convergence Certification is observational and executes after implementation:

```text
"What did we actually build?"
            ↓
"Did we preserve intent?"
```

The two capabilities may share rule infrastructure, evidence models, and explainability models, but they must remain distinct capabilities.

---

## Out of Scope

- Implementation of the certification engine.
- Modification of Protected Assets.
- Modification of Proposal Evaluation.
- New governance concepts beyond the four evaluation dimensions.

---

## Deliverables

- `docs/design/convergence-certification.md`
- `docs/design/convergence-certification-interface.ts`
- `docs/governance/program-027/convergence-certification-model.md`

---

## Acceptance Criteria

- [x] Certification subject defined.
- [x] Lifecycle position decided.
- [x] Gate vs certification semantics decided.
- [x] Evaluation dimensions defined.
- [x] Relationship to Proposal Evaluation documented.
- [x] Interface contract drafted.
- [x] No kernel changes proposed.
- [x] Implementation scope explicitly deferred to EXP-GOVERNABILITY-005.
