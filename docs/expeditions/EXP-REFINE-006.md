# EXP-REFINE-006 — Convergence Certification

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 3 — Convergence Certification  
**Authority:** Synth Architectural Constitution

---

## Goal

Define how final outcomes are validated against original intent and the Alignment Contract.

---

## Purpose

Passing tests and reviews is not enough to prove that an implementation matches intent. Convergence Certification compares the final result against the approved Alignment Contract and produces a governed Convergence Report.

---

## Deliverables

1. **Convergence Report artifact schema** in `src/governance/convergence-report.ts`.
2. **Convergence certification API** that compares:
   - Original intent reference
   - Alignment Contract
   - Implementation evidence
   - Final result reference
3. **Divergence classification**:
   - `none`
   - `minor` (allowed variation)
   - `major` (revision required)
   - `critical` (rejected)
4. **Certification decision model**:
   - `certified`
   - `not_certified`
5. **Unit tests** covering all divergence classifications.

---

## Convergence Report Fields

```text
id
intentId
alignmentContractId
implementationEvidenceIds
finalResultReference
divergenceDetected
allowedDivergence
rejectedDivergence
decision
certified
reason
evidence
reviewer
timestamp
```

---

## Acceptance Criteria

- A Convergence Report can be produced after Acceptance Gate approval.
- The report explicitly references the Alignment Contract.
- Divergence is classified as none, minor, major, or critical.
- Minor divergence within Allowed Variation is certified.
- Major or critical divergence produces `not_certified` and triggers revision.
- The report is a replayable governance event.

---

## Out of Scope

- Automated visual or semantic comparison.
- Integration with CI pipelines.
- Mission Studio visualization of convergence reports.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-PROGRAM-035 — Intent Refinement & Review Governance
- EXP-REFINE-002 — Alignment Contract
