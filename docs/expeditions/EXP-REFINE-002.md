# EXP-REFINE-002 — Alignment Contract

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 2 — Alignment Artifacts  
**Authority:** Synth Architectural Constitution

---

## Goal

Create the canonical `Alignment Contract` artifact — the formal agreement between operator and SYNTH that captured intent matches intended outcome.

---

## Purpose

The Alignment Contract is the missing bridge between human understanding and machine execution. It makes explicit what interpretations are allowed, what interpretations are forbidden, what may vary, and what constitutes forbidden drift. A Mission cannot be created until the Alignment Contract is approved.

---

## Deliverables

1. **Alignment Contract artifact schema** in `src/governance/alignment-contract.ts`.
2. **Contract creation API** that derives an Alignment Contract from a Refined Intent.
3. **Contract approval lifecycle**:
   - `draft`
   - `awaiting_review`
   - `approved`
   - `rejected`
   - `superseded`
4. **Validators** for the Alignment Contract schema.
5. **Unit tests** covering valid/invalid contracts and approval transitions.

---

## Alignment Contract Fields

```text
id
intentModelId
refinedIntentId
intentSummary
expectedExperience
requiredBehaviors
visualReferences
functionalExpectations
technicalConstraints
successCriteria
explicitNonRequirements
allowedInterpretation
allowedVariation
forbiddenInterpretation
forbiddenDrift
approvedBy
approvedAt
version
```

---

## Acceptance Criteria

- An Alignment Contract can be created from any approved Refined Intent and its source Intent Model.
- The contract must include at least one visual or behavioral reference.
- The contract must explicitly define Allowed Interpretation, Forbidden Interpretation, Allowed Variation, and Forbidden Drift.
- The Forbidden Interpretation section must be non-empty.
- Approval requires a valid reviewer per policy.
- A rejected contract cannot produce a Mission.
- The schema validates correctly with the existing validation framework.

---

## Out of Scope

- Divergence Gate implementation.
- Automated divergence detection.
- Mission Studio UI for contract review.

---

## Related

- ADR-047 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-011 — Intent Interpretation Model
- EXP-REFINE-001 — Refinement Layer Model
- EXP-REFINE-003 — Divergence Gate
