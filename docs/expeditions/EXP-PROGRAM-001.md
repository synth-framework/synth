# EXP-PROGRAM-001 — SYNTH Productization Program

**Status:** Completed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** All v2 freeze work  

---

## Purpose

The SYNTH Productization Program is the final coordinated effort to bring Synth v2 from "architecture validated" to "product frozen." It does not introduce new kernel concepts. It hardens, documents, certifies, and simplifies what has already been built so that v2 can be frozen with confidence.

From this point until v2 freeze, every architectural change must be born as an Expedition. The Expedition process is the governance mechanism: it forces objective, scope, acceptance criteria, risks, verification, and definition of done. That discipline is what prevents architectural drift.

> **Constitutional Rule:** No architectural change may be implemented without an approved Expedition.

---

## Program Composition

```
EXP-PROGRAM-001
SYNTH Productization Program
│
├── EXP-PROD-001  Mission Snapshot Lineage
│       Implementation Expedition
│       Complete the planning persistence model.
│
├── EXP-PROD-002  Documentation Expedition
│       Implementation Expedition
│       Build the Knowledge Compiler.
│
├── EXP-PROD-003  Operator Journey Certification
│       Certification Expedition
│       Prove the end-to-end product journey with real users.
│
├── EXP-PROD-004  Mental Model Simplification
│       Certification Expedition
│       Reduce public concepts and validate external comprehension.
│
└── EXP-PROD-005  Freeze Certification
        Certification Expedition
        Prove v2 is frozen, documented, and ready.
```

---

## Expedition Taxonomy

This program formalizes three kinds of Expeditions:

| Kind | Purpose | Examples |
|---|---|---|
| **Discovery Expedition** | Find truth. | Architecture Review, Repository Analysis, Migration Assessment |
| **Implementation Expedition** | Build capability. | Mission Studio, Replay, Genesis, Adapters |
| **Certification Expedition** | Prove capability. | Freeze, Replay, Documentation, Operator Journey |

Every Expedition in this program declares its kind and its Impact block before implementation begins.

---

## Governance

- The Program is sequenced. Dependencies are explicit in each Expedition.
- No Expedition may be promoted to executing without approval.
- No implementation work may proceed outside an approved Expedition.
- Each Expedition must produce evidence that satisfies its Definition of Done.
- The Program completes when EXP-PROD-005 is accepted.

---

## Success Criteria

- All five Expeditions are approved, executed, and completed.
- Mission Studio can reconstruct itself from Snapshot History.
- Documentation can be regenerated from the system itself.
- An unfamiliar operator can complete the Idea → Done journey.
- Public vocabulary is explainable with approximately seven concepts.
- v2 freeze is certified with a published Freeze Report.

---

## Definition of Done

- [x] EXP-PROD-001 completed and accepted.
- [x] EXP-PROD-002 completed and accepted.
- [x] EXP-PROD-003 completed and accepted.
- [x] EXP-PROD-004 completed and accepted.
- [x] EXP-PROD-005 completed and accepted.
- [x] Constitutional rule "No architectural change without an approved Expedition" is documented and enforced.
- [x] SYNTH v2 Freeze Report is published.
