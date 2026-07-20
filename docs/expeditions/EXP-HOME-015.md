# EXP-HOME-015 — Production Certification

> **Certification expedition.** Certify that the Mission Studio Homepage meets all acceptance criteria before release.

**Status:** Completed (pending acceptance)  
**Started:** 2026-07-20  
**Completed:** 2026-07-20  
**Kind:** Certification Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-001 through EXP-HOME-014  
**Blocks:** none

> **Specification:** See [`docs/operator/homepage-certification-report.md`](../operator/homepage-certification-report.md).

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

Prove that a first-time visitor can understand SYNTH in under five minutes without reading external documentation, and that the homepage meets design, accessibility, performance, and correctness standards.

---

## Origin Evidence

Without certification, the homepage risks becoming a beautiful but ineffective marketing layer. Certification ensures it fulfills its educational purpose.

---

## Required Change

### 1.1 Comprehension certification

Conduct structured tests with first-time visitors. Each participant must be able to answer:

- What problem does SYNTH solve?
- What is Genesis?
- What is Discovery?
- What is a Mission?
- What is an Expedition?
- Why does Governance matter?
- What is Replay?
- How do Greenfield and Brownfield differ?
- Why doesn't SYNTH generate code immediately?
- How does SYNTH transform intent into governed software?

### 1.2 Technical certification

- Lighthouse performance score ≥ 90.
- Automated accessibility audit passes WCAG 2.1 AA.
- Visual regression tests pass.
- No broken documentation links.
- Deterministic Genesis demo output.

### 1.3 Runtime-honesty certification

Review every UI element and verify it maps to a real SYNTH concept. Any decorative or invented element must be removed or justified.

---

## Deliverables

1. **Production Certification Report** under `docs/operator/homepage-certification-report.md`.
2. **Comprehension test script** and results.
3. **Technical certification checklist** with evidence.
4. **Runtime-honesty audit** of every homepage element.

---

## Acceptance Criteria

- At least 80% of first-time visitors answer all ten comprehension questions correctly within five minutes.
- Performance, accessibility, and visual regression tests pass.
- Every homepage element maps to a SYNTH concept.
- Documentation links are valid.

---

## Out of Scope

- New homepage features.
- Changes to SYNTH runtime or governance.

---

## Success Criteria

The expedition succeeds when the homepage is certified for production release and the certification report is accepted.
