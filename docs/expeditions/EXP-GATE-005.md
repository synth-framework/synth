# EXP-GATE-005 — Review Gate Package

> **Architecture expedition.** Define the canonical schema for the package produced at every Review Gate.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Era:** III — Architecture  
**Phase:** Phase 2 — Artifacts  
**Depends On:** EXP-GATE-001, EXP-GATE-002, EXP-GATE-003, EXP-GATE-004  
**Blocks:** EXP-GATE-006, EXP-GATE-007, EXP-GATE-008, EXP-GATE-009, EXP-GATE-010, EXP-GATE-011

---

## Objective

Establish a single, canonical schema for the package that every Review Gate must produce. The package is the minimum evidence set required to decide whether an expedition's implementation satisfies its Refined Intent, and it must be machine-readable, human-reviewable, and replayable.

---

## Purpose

The Review Gate exists to answer one question: *Did we build what we agreed to build?* That question cannot be answered from the implementation alone, from the Refined Intent alone, or from a conversation. It requires a governed package that binds intent, implementation, divergence, evidence, and decision together.

This expedition defines the canonical schema for that package so that every Review Gate produces comparable, replayable evidence. Without this schema, reviews become ad hoc, divergences are hidden, and decisions cannot be audited.

---

## Goal

Produce a canonical Review Gate Package schema with stable field names, value domains, and validation rules. The schema must support:

- unambiguous reference to the expedition under review and its governing Refined Intent;
- complete description of the current implementation state submitted for review;
- structured reporting of known, accepted, and rejected divergence;
- identification of the reviewer according to the Completion Policy in force;
- a decision drawn from the Review Gate decision model;
- a human-readable reason for the decision;
- a concrete next action when the decision is not a plain approval;
- timestamped evidence supporting every claim in the package; and
- compatibility with the replayable `Review Decision` event format defined by EXP-PROGRAM-035.

---

## Canonical Schema

A Review Gate Package MUST contain the following fields:

```text
Review Gate Package

  targetExpedition          → stable identifier of the expedition under review
  refinedIntentRef          → stable reference to the approved Refined Intent
  implementation            → current implementation state or artifact reference

  divergence
    known                   → observed differences between implementation and intent
    accepted                → differences explicitly approved as acceptable
    rejected                → differences explicitly rejected as unacceptable

  reviewer                  → human, AI, council, or engine per the Completion Policy
  decision                  → Approve
                              Approve with Conditions
                              Revision Required
                              Reject
                              Supersede Expedition
                              Split Expedition
                              Merge Expedition
                              Escalate to Mission
                              Escalate to Program

  reason                    → human-readable justification for the decision
  nextAction                → concrete step required after the decision
  evidence                  → list of references, hashes, or artifacts supporting the package
  timestamp                 → point in time at which the package was produced
```

### Field requirements

- `targetExpedition` and `refinedIntentRef` must be stable, versioned identifiers.
- `implementation` must be a reference to a reproducible state, not a mutable branch name.
- `divergence` entries must be classified and linked to evidence.
- `reviewer` must be resolvable to an actor or policy authority.
- `decision` must be one of the enumerated values; no extension is permitted without a governance event.
- `reason` must be present for every non-`Approve` decision.
- `nextAction` must be present for `Approve with Conditions`, `Revision Required`, `Reject`, and every escalation decision.
- `evidence` must not be empty; at least one evidence item must be provided.
- `timestamp` must be deterministic relative to the execution context that produced the package.

---

## Definition of Done

- [ ] Review Gate Package schema is documented in `docs/reference/review-gate-package.md`.
- [ ] A machine-readable schema file exists (e.g., JSON Schema or TypeScript types) under `src/governance/review/`.
- [ ] Every enumerated `decision` value has a documented meaning and required fields.
- [ ] Validation rules reject packages with missing `targetExpedition`, `refinedIntentRef`, `decision`, `reason` (when required), `nextAction` (when required), or empty `evidence`.
- [ ] The schema maps cleanly onto the replayable `Review Decision` event schema defined by EXP-PROGRAM-035.
- [ ] At least one synthetic example package passes validation and is checked into `tests/fixtures/governance/`.
- [ ] A gap analysis confirms the schema can express every decision listed in EXP-GATE-004.

---

## Acceptance Criteria

1. The schema explicitly includes all fields named in the expedition title: target expedition, Refined Intent reference, implementation, divergence, reviewer, decision, reason, next action, evidence, and timestamp.
2. Divergence is modeled as three distinct categories: known, accepted, and rejected.
3. The decision enumeration is frozen to the nine values defined in EXP-GATE-004 unless a governance event changes it.
4. Every non-approval decision requires both a `reason` and a `nextAction`.
5. A validator can parse a complete Review Gate Package and report every schema violation.
6. The package format is compatible with the `Review Decision` event logged by the execution engine.
7. The schema is sufficiently complete to represent a Review Gate Package for Program 027 (Mission Studio Homepage) as the pilot certification project.

---

## Protected Assets

This expedition defines a Protected Asset. The following SHALL NOT be modified without an Architecture Expedition and a new ADR:

- Review Gate Package schema and field names
- Review Gate Package decision enumeration
- Review Gate Package validation rules
- Mapping from Review Gate Package to Review Decision event

These protections ensure that downstream engine logic, tooling, and audit scripts can rely on a stable contract.

---

## Out of Scope

- Implementation of the Review Gate engine that enforces the package (EXP-GATE-008).
- UI for rendering Review Gate Packages in Mission Studio (EXP-GATE-010).
- Certification scenarios for the full three-gate lifecycle (EXP-GATE-012).
- Tooling-specific review interfaces or diff algorithms.

---

## Relationship to Program 035

EXP-GATE-005 is the first artifact-definition expedition in Phase 2 of **EXP-PROGRAM-035 — Intent Refinement & Review Governance**. The program introduces three gate types (Refinement Gate, Review Gate, Acceptance Gate) and their associated artifacts. This expedition defines the artifact produced at the Review Gate, the checkpoint that occurs after implementation and before acceptance.

Program 035 is the last architectural program before the testing and stabilization era. Once this schema is accepted, the Review Gate Package becomes a Protected Asset and a dependency of every downstream expedition, including the engine integration and the retrofit of **EXP-PROGRAM-027 — Mission Studio Homepage**, which serves as the pilot certification project for the three-gate model.

---

## Related

- `docs/expeditions/EXP-PROGRAM-035.md`
- `docs/expeditions/EXP-GATE-001.md` — Review Lifecycle
- `docs/expeditions/EXP-GATE-002.md` — Completion Policies
- `docs/expeditions/EXP-GATE-003.md` — Refinement Lifecycle
- `docs/expeditions/EXP-GATE-004.md` — Decision Model
- `docs/expeditions/EXP-GATE-006.md` — Refined Intent Artifact
- `docs/expeditions/EXP-GATE-007.md` — Acceptance Policies
- `docs/expeditions/EXP-PROGRAM-027.md` — Mission Studio Homepage
