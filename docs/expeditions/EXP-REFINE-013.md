# EXP-REFINE-013 — Mission Projection & Derivation

> **Genesis expedition.** Specify how an approved `Alignment Contract` is deterministically projected into a canonical `Mission` artifact.

**Status:** Accepted  
**Kind:** Genesis Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 3 — Genesis/Synthesis Boundary  
**Authority:** ADR-045 — Governance Lifecycle & State Machine Specification

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Goal

Answer one constitutional question:

> Given an approved Alignment Contract, what is the canonical Mission?

This expedition produces the specification that governs the transition from Genesis into Synthesis. No Mission may be considered authoritative unless its projection from an approved Alignment Contract can be reproduced, reviewed, and certified.

---

## Purpose

Today the lifecycle says:

```text
Alignment Contract
↓
Mission
```

That is a leap. Mission is treated as if it were "created" by an imperative step, which leaves room for hidden interpretation, unauthorized objectives, and weakened constraints.

This expedition closes that gap by making Mission a **deterministic projection** of the approved Alignment Contract. Mission ceases to be an artifact that is "made" and becomes an artifact that is **exposed after its projection has been certified**.

After this expedition the canonical lifecycle becomes:

```text
Alignment Contract
↓
Mission Projection
↓
Mission Projection Certification
↓
Mission
```

---

## Deliverables

1. **Mission Projection Specification** (this expedition).
2. **Canonical Mission schema** derived from Alignment Contract fields.
3. **Projection mapping** proving provenance for every Mission field.
4. **Projection invariants** that become constitutional regression tests.
5. **Projection Certification criteria** and required certification report.
6. **Mission Projection Package** specification.

No runtime code. No CLI. No UI.

---

## 1. Projection Inputs

A Mission Projection consumes exactly these artifacts:

| Input | Role | Required |
|---|---|---|
| Approved `Alignment Contract` | Source of truth for authorized intent | Yes |
| Bound `Reference Evidence` | Evidence referenced by the contract | Yes |
| Approved `Intent Model` | Source of objectives, implicit objectives, and forbidden interpretations | Yes |
| Approved `Refinement Report` | Record of questions, answers, and confidence deltas | Yes |
| Alignment metadata | Contract ID, approval timestamp, approver identity | Yes |

What is **not** an input:

- Runtime state.
- Repository inspection.
- CLI arguments beyond the Alignment Contract identifier.
- AI interpretation of intent.
- Operator free-form additions.

The projection must be reproducible from these inputs alone.

---

## 2. Projection Rules

Every field of the resulting Mission must have explicit provenance.

```text
Mission.id
  ← generated deterministically from Alignment Contract ID + version

Mission.title
  ← Intent Model.title or Alignment Contract.intentSummary

Mission.purpose
  ← Alignment Contract.expectedExperience

Mission.objectives
  ← Alignment Contract.objectiveCoverage (only aligned objectives)

Mission.constraints
  ← Alignment Contract.requiredProperties
            + Alignment Contract.technicalConstraints

Mission.nonGoals
  ← Alignment Contract.explicitNonRequirements
            + Alignment Contract.forbiddenInterpretations

Mission.allowedVariation
  ← Alignment Contract.allowedVariation

Mission.forbiddenDrift
  ← Alignment Contract.forbiddenDrift

Mission.referenceEvidence
  ← Alignment Contract.referenceEvidenceIds

Mission.lineage.alignmentContractId
  ← Alignment Contract.id

Mission.lineage.intentModelId
  ← Alignment Contract.intentModelId

Mission.lineage.refinementReportId
  ← Refinement Report.id

Mission.fingerprint
  ← hash(Alignment Contract + Intent Model + Refinement Report)
```

No field may be invented by the projection engine. If a Mission field cannot be traced to one of the inputs, that field is out of scope for this projection and must be supplied by a later governed process.

---

## 3. Projection Invariants

These invariants are constitutional. Any projection that violates them is invalid.

```text
I1. Authorized Objectives Only
    Mission.objectives ⊆ Alignment Contract.objectiveCoverage.aligned

I2. Constraints Preserved
    Mission.constraints ⊇ Alignment Contract.requiredProperties

I3. Forbidden Interpretations Preserved
    Mission.nonGoals ⊇ Alignment Contract.forbiddenInterpretations

I4. No New Requirements
    Mission.objectives \ Alignment Contract.objectiveCoverage.aligned = ∅

I5. Lineage Complete
    Mission.lineage records alignmentContractId, intentModelId, and refinementReportId.

I6. Determinism
    Re-running projection with identical inputs produces identical Mission fingerprint.

I7. Immutability
    Once projected, the Mission Projection Package is immutable. A changed Alignment Contract produces a new Mission with a new fingerprint.

I8. Certification Required
    No Mission may be exposed without a passed Projection Certification.
```

These invariants become the basis of a constitutional regression suite.

---

## 4. Projection Completeness

Determinism is not enough. A projection can be deterministic and still silently omit authorized intent. Projection Completeness requires that every authorized element of the Alignment Contract is represented exactly once in the projected Mission.

Completeness checks:

```text
C1. Objective Completeness
    Every aligned objective in Alignment Contract.objectiveCoverage
    appears exactly once in Mission.objectives.

C2. Constraint Completeness
    Every required property and technical constraint in the Alignment Contract
    appears exactly once in Mission.constraints.

C3. Forbidden Interpretation Completeness
    Every forbidden interpretation in the Alignment Contract
    appears exactly once in Mission.nonGoals.

C4. Evidence Reachability
    Every referenceEvidenceId in the Alignment Contract
    remains reachable through Mission.referenceEvidence.

C5. Provenance Completeness
    Every field in the projected Mission has a documented provenance rule.
    No synthesized field lacks provenance.

C6. Lineage Completeness
    Mission.lineage records alignmentContractId, intentModelId, and refinementReportId.
```

A projection that fails completeness is not merely inaccurate; it is incomplete and must not be certified.

---

## 5. Projection Certification

Before a projected Mission becomes authoritative, the projection itself must be certified. Certification combines invariants, completeness, and provenance into a single auditable decision.

Certification checks:

| Check | Question |
|---|---|
| Invariants | Does the projection satisfy all constitutional invariants? |
| Completeness | Does every authorized element appear exactly once? |
| Conservation | Did any objective, constraint, or forbidden interpretation disappear? |
| Provenance | Does every Mission field trace to a projection rule? |
| Determinism | Does the fingerprint match a recomputed projection? |
| Lineage | Does the Mission record its originating Alignment Contract? |

Certification result:

```text
PASSED  → Mission may proceed to Mission Review and Approval.
FAILED  → Projection is rejected; Alignment Contract must be revised.
```

---

## 6. Mission Projection Package

The projection must produce a reviewable package containing:

```text
Mission Projection Package
├── Alignment Contract
├── Intent Model
├── Refinement Report
├── Projected Mission
├── Projection Mapping
│   └── field-by-field provenance
├── Lineage
│   ├── alignmentContractId
│   ├── intentModelId
│   └── refinementReportId
├── Coverage Matrix
│   └── objectives × evidence × aligned
├── Fingerprint
└── Certification Report
    ├── checks
    ├── result
    └── certifier
```

This package is the artifact that Mission Review evaluates. A reviewer must be able to approve or reject the Mission based on the package contents and evidence alone, without reference to the conversation that produced it.

---

## Definition of Done

- [x] Mission Projection Specification is written and accepted.
- [x] Canonical Mission schema is defined with provenance for every field.
- [x] Projection invariants are listed and classified as constitutional.
- [x] Projection Completeness checks are specified.
- [x] Projection Certification criteria are specified.
- [x] Mission Projection Package structure is specified.
- [x] ADR-045 is updated to include the `Alignment Contract → Mission Projection → Mission Projection Certification → Mission` lifecycle, with the Alignment Contract remaining the Genesis/Synthesis boundary.

---

## Out of Scope

- Implementation of the projection engine.
- CLI command to project a Mission.
- Mission Review Gate implementation.
- Homepage-specific Mission projection (this is EXP-HOME-028).

---

## Acceptance Criteria

- A competent implementer can build the projection engine from this specification without asking interpretive questions.
- Every Mission field traces to exactly one projection rule.
- Every projection invariant is falsifiable.
- The Projection Package can be reviewed independently of the refinement conversation.
- ADR-045 explicitly records Mission Projection as the constitutional boundary between Genesis and Synthesis.

---

## Related

- ADR-036 — Intent Refinement and Alignment Governance
- ADR-045 — Governance Lifecycle & State Machine Specification
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-REFINE-002 — Alignment Contract
- EXP-HOME-027 — Homepage Alignment Contract
- EXP-HOME-028 — Homepage Mission Projection (blocked by this expedition)
