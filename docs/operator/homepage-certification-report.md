# Mission Studio Homepage Certification Report

> **Production certification report for the SYNTH Mission Studio Homepage under EXP-HOME-015.** Captures acceptance evidence, test results, and operator sign-off.

---

## Purpose

Prove that the Mission Studio Homepage meets all acceptance criteria before release: comprehension, technical quality, accessibility, performance, and runtime honesty.

---

## Program context

| Field | Value |
|---|---|
| Program | EXP-PROGRAM-027 — Mission Studio Homepage |
| Expedition | EXP-HOME-015 — Production Certification |
| Kind | Certification Expedition |
| Status | Pending acceptance |

---

## Comprehension certification

Structured tests with first-time visitors. Each participant must answer the following questions within five minutes:

1. What problem does SYNTH solve?
2. What is Genesis?
3. What is Discovery?
4. What is a Mission?
5. What is an Expedition?
6. Why does Governance matter?
7. What is Replay?
8. How do Greenfield and Brownfield differ?
9. Why doesn't SYNTH generate code immediately?
10. How does SYNTH transform intent into governed software?

### Acceptance threshold

- At least 80% of participants answer all ten questions correctly within five minutes.

### Test script

- Provide the participant with the homepage URL and no other context.
- Allow free exploration for up to five minutes.
- Ask each question in order and record the answer.
- Score answers as correct, partially correct, or incorrect.

### Results template

| Participant | Time (s) | Correct / 10 | Notes |
|---|---|---|---|
| P1 | | | |
| P2 | | | |
| P3 | | | |
| P4 | | | |
| P5 | | | |

---

## Technical certification checklist

| Check | Tool / Method | Acceptance | Result | Evidence |
|---|---|---|---|---|
| Lighthouse performance score ≥ 90 | Lighthouse CI | Pass / Fail | | |
| Automated accessibility audit WCAG 2.1 AA | axe / Lighthouse | Pass / Fail | | |
| Visual regression tests pass | Percy / Playwright | Pass / Fail | | |
| No broken documentation links | Link checker | Pass / Fail | | |
| Deterministic Genesis demo output | Unit / integration tests | Pass / Fail | | |
| Motion system follows tokens | Manual / automated review | Pass / Fail | | |
| Responsive breakpoints verified | Browser / device matrix | Pass / Fail | | |
| Runtime-honesty audit passed | Manual review | Pass / Fail | | |

---

## Runtime-honesty audit

Every homepage element must map to a real SYNTH concept. Any decorative or invented element must be removed or justified.

### Audit template

| Element | SYNTH concept | Status | Notes |
|---|---|---|---|
| Hero wordmark | Brand | | |
| Intent input | Intent artifact | | |
| Source selector | Starting point / mode | | |
| Terminal | CLI projection | | |
| Genesis navigator | Genesis lifecycle | | |
| Artifact cards | Artifact types | | |
| Replay scrubber | Replay capability | | |
| Governance visualization | Governance state | | |
| Capability grid | Capability model | | |
| Architecture explorer | Architecture layers | | |
| Status bar | Runtime status | | |
| Adapters section | Adapter model | | |

---

## Blockers

- EXP-HOME-003 (Genesis Experience) is blocked by EXP-AI-001 (Genesis Protocol).
- EXP-HOME-007 (Replay Experience) is blocked by runtime Replay integration.
- Certification cannot be completed until these blockers are resolved and their expeditions are accepted.

---

## Sign-off

| Role | Name | Date | Signature / Approval |
|---|---|---|---|
| Product Owner | | | |
| Design Lead | | | |
| Engineering Lead | | | |
| Governance Operator | | | |

---

## Acceptance criteria

- At least 80% of first-time visitors answer all ten comprehension questions correctly within five minutes.
- Performance, accessibility, and visual regression tests pass.
- Every homepage element maps to a SYNTH concept.
- Documentation links are valid.
- Certification report is reviewed and signed off.

---

## Definition of Done

- [ ] Comprehension tests completed and meet threshold.
- [ ] Technical certification checklist complete with evidence.
- [ ] Runtime-honesty audit complete.
- [ ] All blockers resolved or formally accepted.
- [ ] Sign-off obtained from Product, Design, Engineering, and Governance.

---

## Related documents

- [EXP-HOME-015 — Production Certification](../expeditions/EXP-HOME-015.md)
- [LDS-002 — Mission Studio Design System](../design/lds-002.md)
- [Mission Workspace Specification](../design/mission-workspace.md)
- [Genesis Experience Specification](../design/genesis-experience.md)
- [Performance Specification](../design/performance.md)
- [Accessibility Specification](../design/accessibility.md)
