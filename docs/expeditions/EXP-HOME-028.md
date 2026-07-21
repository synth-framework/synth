# EXP-HOME-028 — Mission Projection Experience

> **Integration expedition.** Integrate the canonical `ProjectMission` capability into Mission Studio, allowing visitors to observe, understand, review, and approve the projected Mission without reimplementing any constitutional logic.

**Status:** Proposed  
**Kind:** Integration Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-027, EXP-REFINE-014  
**Blocks:** EXP-HOME-001, EXP-HOME-002, EXP-HOME-003, EXP-HOME-025

> **Authority:** ADR-045 — Governance Lifecycle & State Machine Specification, EXP-REFINE-013 — Mission Projection & Derivation

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

Integrate the canonical `ProjectMission` capability into Mission Studio so that the homepage becomes the first consumer of SYNTH's deterministic Mission Projection lifecycle.

Mission Studio must invoke `ProjectMission`; it must never derive Mission data locally, invent projection rules, or weaken governance. The expedition turns the homepage into an executable explanation of how an approved Alignment Contract becomes a Mission.

---

## Purpose

Until now, Program 027 repeatedly uncovered missing constitutional concepts. That phase is complete. The Governance Architecture v1.0 is frozen, Mission Projection is implemented, and the Alignment Contract for Program 027 is approved.

EXP-HOME-028 is the first expedition that purely consumes the platform. Its job is to visualize, explain, and make tangible the constitutional lifecycle the visitor is already experiencing.

---

## Required Integration

### 1.1 Invoke `ProjectMission`

The homepage must call the canonical capability:

```text
ProjectMission(alignmentContractId)
```

using the approved Program 027 Alignment Contract:

```text
alignment-contract-mru2bqph-zze9m7
```

No local derivation. No hardcoded Mission fields. No duplication of projection rules.

### 1.2 Render the Mission Projection Package

Display the returned package:

```text
Mission
Provenance
Coverage Matrix
Lineage
Fingerprint
Certification Report
```

### 1.3 Provenance Panel

Provide a collapsible or navigable panel showing field-level provenance:

```text
Mission Title
← Alignment Contract.intentSummary

Objectives
← Alignment Contract.objectiveCoverage[aligned=true]

Constraints
← Alignment Contract.requiredProperties ∪ technicalConstraints

Non-Goals
← Alignment Contract.explicitNonRequirements ∪ forbiddenInterpretations

Allowed Variation
← Alignment Contract.allowedVariation

Forbidden Drift
← Alignment Contract.forbiddenDrift

Reference Evidence
← Alignment Contract.referenceEvidenceIds

Fingerprint
← hash(Alignment Contract + Intent Model + Refinement Report)
```

### 1.4 Certification Visualization

Visibly distinguish the phases:

```text
Projecting…
  ↓
Projected
  ↓
Certified
```

Do not skip from invocation to "Mission Ready." Certification is part of the experience.

### 1.5 Replay Timeline

The Mission Studio replay timeline must include:

```text
Alignment Approved
  ↓
Mission Projected
  ↓
Projection Certified
  ↓
Mission Approved
```

This teaches the constitutional lifecycle by example.

---

## Definition of Done

- [ ] Homepage invokes `ProjectMission` with the Program 027 Alignment Contract ID.
- [ ] Homepage renders the projected Mission from the Mission Projection Package.
- [ ] Displayed Mission fingerprint matches the runtime fingerprint.
- [ ] Provenance panel maps every Mission field to its source rule.
- [ ] Certification status is visible and transitions through `Projecting → Projected → Certified`.
- [ ] Replay timeline includes `Alignment Approved`, `Mission Projected`, `Projection Certified`, and `Mission Approved`.
- [ ] No projection logic, invariant checks, or business rules are implemented in homepage code.
- [ ] Expedition does not introduce new constitutional concepts.

---

## Out of Scope

- Defining Mission Projection rules (EXP-REFINE-013).
- Implementing the `ProjectMission` capability (EXP-REFINE-014).
- Mission Approval Gate implementation.
- Homepage component implementation beyond the Mission Projection experience.

---

## Acceptance Criteria

- A visitor can see how the Program 027 Mission was derived from the approved Alignment Contract.
- A visitor can inspect objectives, constraints, non-goals, lineage, and fingerprint.
- A visitor can observe the certification transition.
- Removing or modifying the Alignment Contract produces a detectable change in the displayed fingerprint.
- The homepage code contains no fallback or duplicate projection logic.

---

## Artifacts

| Artifact | Path | Description |
|---|---|---|
| Alignment Contract | `docs/governance/program-027/alignment-contract.json` | Source contract for projection |
| Alignment Review Package | `docs/governance/program-027/alignment-review-package.md` | Context for the projection |
| Mission Projection Spec | `docs/expeditions/EXP-REFINE-013.md` | Constitutional specification |
| Mission Projection Capability | `src/governance/project-mission.ts` | Runtime capability to consume |

---

## Related

- EXP-PROGRAM-027 — Mission Studio Homepage
- EXP-HOME-027 — Homepage Alignment Contract
- EXP-REFINE-013 — Mission Projection & Derivation
- EXP-REFINE-014 — Mission Projection Capability
- ADR-045 — Governance Lifecycle & State Machine Specification
