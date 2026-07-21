# EXP-REFINE-014 — Mission Projection Capability

> **Synthesis capability.** Implement the deterministic `ProjectMission` capability specified by EXP-REFINE-013.

**Status:** Proposed  
**Kind:** Synthesis Capability Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-036 — Intent Refinement & Alignment Governance  
**Phase:** 3 — Genesis/Synthesis Boundary  
**Authority:** EXP-REFINE-013 — Mission Projection & Derivation, ADR-045

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Goal

Implement the core `ProjectMission` capability that deterministically projects a `Mission` from an approved `Alignment Contract`.

This is the reference implementation of the constitutional specification written in EXP-REFINE-013. No consumer (homepage, CLI, API, IDE) may implement its own projection logic. All consumers must use this capability.

---

## Purpose

Mission Projection is now a constitutional capability, not an ad-hoc consumer feature. The first implementation belongs in the core runtime so that every surface projects Missions the same way, produces the same fingerprint, and enforces the same invariants.

Program 027 — Mission Studio Homepage will become the **first consumer** of this capability, not its birthplace.

---

## Deliverables

1. **`ProjectMission` domain capability** in `src/governance/project-mission.ts`.
2. **`MissionProjectionPackage` artifact schema**.
3. **Projection invariant enforcement** with named, catchable errors.
4. **Deterministic fingerprint computation** from inputs.
5. **Projection Completeness checks**.
6. **Projection Certification** with pass/fail result.
7. **Governance events**: `MISSION_PROJECTED`, `PROJECTION_CERTIFIED`, `PROJECTION_CERTIFICATION_FAILED`.
8. **Unit tests** covering valid projection, invariant violations, completeness failures, and determinism.
9. **Minimal developer CLI** (`synth mission project --alignment-contract-id <id>`) as a convenience only.

Out of scope: UI, homepage rendering, Mission Studio integration, review/approval gates.

---

## Inputs

| Input | Source | Required |
|---|---|---|
| Approved `AlignmentContract` | Governance state | Yes |
| Bound `Reference Evidence` | Alignment Contract reference list | Yes |
| Approved `IntentModel` | Governance state | Yes |
| Approved `RefinementReport` | Governance state | Yes |

No repository inspection, no runtime state, no AI interpretation, no operator additions.

---

## Projection Rules

Implemented exactly as specified in EXP-REFINE-013.

```text
Mission.id
  ← deterministic hash(contractId + version + projectionTimestamp)

Mission.title
  ← IntentModel.title || AlignmentContract.intentSummary

Mission.purpose
  ← AlignmentContract.expectedExperience

Mission.objectives
  ← AlignmentContract.objectiveCoverage where aligned === true

Mission.constraints
  ← AlignmentContract.requiredProperties ∪ AlignmentContract.technicalConstraints

Mission.nonGoals
  ← AlignmentContract.explicitNonRequirements ∪ AlignmentContract.forbiddenInterpretations

Mission.allowedVariation
  ← AlignmentContract.allowedVariation

Mission.forbiddenDrift
  ← AlignmentContract.forbiddenDrift

Mission.referenceEvidence
  ← AlignmentContract.referenceEvidenceIds

Mission.lineage.alignmentContractId
  ← AlignmentContract.id

Mission.lineage.intentModelId
  ← AlignmentContract.intentModelId

Mission.lineage.refinementReportId
  ← RefinementReport.id

Mission.fingerprint
  ← hash(AlignmentContract + IntentModel + RefinementReport)
```

---

## Invariants Enforced

| Invariant | Error Thrown |
|---|---|
| Authorized Objectives Only | `ProjectionInvariantError: unauthorized_objective` |
| Constraints Preserved | `ProjectionInvariantError: constraints_not_preserved` |
| Forbidden Interpretations Preserved | `ProjectionInvariantError: forbidden_not_preserved` |
| No New Requirements | `ProjectionInvariantError: invented_requirement` |
| Lineage Complete | `ProjectionInvariantError: incomplete_lineage` |
| Determinism | Verified by test, not a runtime error |
| Immutability | Projection Package is immutable after creation |
| Certification Required | Mission is not exposed without certification |

---

## Projection Completeness Checks

| Check | Failure |
|---|---|
| Objective Completeness | Every aligned objective appears exactly once |
| Constraint Completeness | Every required property and technical constraint appears exactly once |
| Forbidden Interpretation Completeness | Every forbidden interpretation appears exactly once |
| Evidence Reachability | Every reference evidence ID remains reachable |
| Provenance Completeness | Every Mission field has a documented provenance rule |
| Lineage Completeness | Lineage records all three parent IDs |

---

## Events

| Event | Emitted When | Payload |
|---|---|---|
| `MISSION_PROJECTED` | Projection Package produced | `projectionId`, `contractId`, `missionFingerprint`, `timestamp` |
| `PROJECTION_CERTIFIED` | Certification passes | `certificationId`, `projectionId`, `checks`, `timestamp` |
| `PROJECTION_CERTIFICATION_FAILED` | Certification fails | `certificationId`, `projectionId`, `reason`, `timestamp` |

---

## Definition of Done

- [ ] `ProjectMission` capability is implemented and exports a single projection function.
- [ ] All projection invariants are enforced with named errors.
- [ ] Projection Completeness checks are implemented.
- [ ] Deterministic fingerprint is computed and verified.
- [ ] Projection Certification produces pass/fail results.
- [ ] `MISSION_PROJECTED`, `PROJECTION_CERTIFIED`, and `PROJECTION_CERTIFICATION_FAILED` events are emitted.
- [ ] Unit tests cover valid projection, invariant violations, completeness failures, and determinism.
- [ ] Minimal CLI command exists for developer convenience.
- [ ] ADR-045 references this capability as the reference implementation.

---

## Out of Scope

- Homepage-specific projection logic.
- Mission Studio rendering of projection packages.
- Mission Approval Gate implementation.
- Rich CLI beyond the minimal developer interface.

---

## Acceptance Criteria

- Two independent runs with identical inputs produce identical Mission fingerprints.
- A Mission field without provenance causes projection failure.
- An omitted aligned objective causes completeness failure.
- A weakened constraint causes invariant failure.
- Events are replayable and reconstruct the projection state.

---

## Related

- EXP-REFINE-013 — Mission Projection & Derivation
- ADR-045 — Governance Lifecycle & State Machine Specification
- EXP-PROGRAM-036 — Intent Refinement & Alignment Governance
- EXP-HOME-028 — Homepage Mission Projection (consumer, blocked by this expedition)
