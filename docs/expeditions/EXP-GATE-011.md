# EXP-GATE-011 — Retrofit Program 027

**Status:** Proposed  
**Kind:** Integration Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-035 — Intent Refinement & Review Governance  
**Era:** III — Architecture  
**Phase:** Phase 4 — Integration  
**Depends On:** EXP-GATE-001, EXP-GATE-002, EXP-GATE-003, EXP-GATE-004, EXP-GATE-005, EXP-GATE-006, EXP-GATE-007, EXP-GATE-008, EXP-GATE-009, EXP-GATE-010  
**Blocks:** EXP-GATE-012

---

## Thesis

> **A governance model is proven only when it can govern work already in flight.**

Program 027 (Mission Studio Homepage) was paused at a natural checkpoint with completed expeditions and downstream work waiting. Retrofitting it to the three-gate model freezes those completed expeditions as baseline evidence and defines their path through Refinement, Review, and Acceptance before the program resumes.

---

## Purpose

Migrate the paused **EXP-PROGRAM-027 — Mission Studio Homepage** onto the three-gate governance model defined by **EXP-PROGRAM-035**. This means:

- Freezing the completed expeditions (EXP-HOME-001, EXP-HOME-002, EXP-HOME-025) as baseline evidence.
- Defining the gate path for each completed and pending expedition through Refinement Gate, Review Gate, and Acceptance Gate.
- Declaring completion policies for every expedition in Program 027.
- Ensuring no downstream expedition begins while an upstream gate is unresolved.
- Preparing Program 027 to resume as the pilot certification project for the three-gate model.

---

## Goal

Produce a governed retrofit plan and evidence set that allows Program 027 to re-enter execution under the three-gate model. The output must:

1. Identify which Program 027 expeditions are already complete and which are pending.
2. Treat completed expeditions as baseline candidates, not as automatically accepted work.
3. Produce or backfill a Refined Intent, Review Gate Package, and Acceptance Gate Package for each completed expedition where required.
4. Assign a completion policy (Automatic, Human Approval Required, or AI Approval Required) to every expedition.
5. Define reviewer authority and resolver rules for each gate based on EXP-GATE-007.
6. Verify that downstream expeditions are blocked until upstream gates resolve.
7. Feed the retrofit into EXP-GATE-012 certification scenarios.

---

## Retrofit Scope

Program 027 milestones and their gate treatment:

```text
Milestone A — Mission Studio Foundations
  EXP-HOME-001  Mission Studio Design Language        → Baseline → Review Gate → Acceptance Gate
  EXP-HOME-002  Mission Studio Component Catalog      → Baseline → Review Gate → Acceptance Gate
  EXP-HOME-003  Mission Studio UI Specification       → Refinement Gate → Review Gate → Acceptance Gate
  EXP-HOME-025  Mission Studio Design Governance      → Baseline → Review Gate → Acceptance Gate

Milestone B — Homepage Experience
  EXP-HOME-004  Homepage / Mission Studio Integration → Refinement Gate → Review Gate → Acceptance Gate
  EXP-HOME-005  Intent Phase                          → Refinement Gate → Review Gate → Acceptance Gate
  EXP-HOME-006  Discovery Phase                       → Refinement Gate → Review Gate → Acceptance Gate
  EXP-HOME-007  Mission Phase                         → Refinement Gate → Review Gate → Acceptance Gate
  EXP-HOME-008  Expeditions Phase                     → Refinement Gate → Review Gate → Acceptance Gate
  EXP-HOME-009  Governance & Replay Phase             → Refinement Gate → Review Gate → Acceptance Gate

Milestone C — Runtime Integration
  EXP-HOME-016 through EXP-HOME-024                   → Refinement Gate → Review Gate → Acceptance Gate

Milestone D — Production Certification
  EXP-HOME-010 through EXP-HOME-015                   → Refinement Gate → Review Gate → Acceptance Gate
```

Completed expeditions (EXP-HOME-001, EXP-HOME-002, EXP-HOME-025) skip Refinement Gate only if an approved Refined Intent already exists or is backfilled; otherwise they must produce one before Review.

---

## Definition of Done / Acceptance Criteria

- [ ] Every expedition in Program 027 has a declared completion policy and resolver authority per EXP-GATE-002 and EXP-GATE-007.
- [ ] Completed expeditions (EXP-HOME-001, EXP-HOME-002, EXP-HOME-025) are frozen as baseline evidence and their implementation state is recorded with reproducible references (hashes, tags, or artifact IDs).
- [ ] Each completed expedition either has an approved Refined Intent or a backfilled Refined Intent that passes the Refinement Gate.
- [ ] Review Gate Packages are produced for all completed expeditions and reviewed by the appropriate resolver.
- [ ] Acceptance Gate Packages confirm whether each completed expedition is accepted, rejected, or requires revision.
- [ ] Downstream expeditions in Milestones B, C, and D are explicitly blocked from starting until all upstream gates in Milestone A are resolved.
- [ ] The retrofit plan is documented in `docs/expeditions/EXP-PROGRAM-027.md` and any affected expedition charters are updated.
- [ ] At least one certification scenario from EXP-GATE-012 can be demonstrated using Program 027 expeditions.

---

## Protected Assets

This expedition touches governance schemas and engine logic that are protected under EXP-PROGRAM-035:

- Refined Intent schema
- Review Gate Package format
- Acceptance Gate Package format
- Review Decision event schema
- Completion policy definitions
- Acceptance policy definitions
- Gate engine logic
- Program 027 frozen baseline references

Any change to these assets after this program is certified requires an Architecture Expedition and a new ADR.

---

## Out of Scope

- Implementing new homepage features or continuing homepage development.
- Rewriting completed expeditions; they remain frozen as evidence.
- Defining the three-gate model itself (EXP-GATE-001 through EXP-GATE-007).
- Building the gate engine (EXP-GATE-008) or Mission Studio integration (EXP-GATE-010).
- Running the full certification suite (EXP-GATE-012).

---

## Relationship to Program 035

EXP-GATE-011 is the second expedition in **Phase 4 — Integration** of **EXP-PROGRAM-035 — Intent Refinement & Review Governance**. It applies the three-gate model to a real, paused program and proves that the model can govern work that predates it. Program 027 becomes the pilot certification project, and its completed expeditions become the first baseline evidence processed through Refinement, Review, and Acceptance Gates.

---

## Related

- `docs/expeditions/EXP-PROGRAM-035.md` — Intent Refinement & Review Governance
- `docs/expeditions/EXP-PROGRAM-027.md` — Mission Studio Homepage
- `docs/expeditions/EXP-GATE-001.md` — Review Lifecycle
- `docs/expeditions/EXP-GATE-002.md` — Completion Policies
- `docs/expeditions/EXP-GATE-003.md` — Refinement Lifecycle
- `docs/expeditions/EXP-GATE-004.md` — Decision Model
- `docs/expeditions/EXP-GATE-005.md` — Review Gate Package
- `docs/expeditions/EXP-GATE-006.md` — Refined Intent Artifact
- `docs/expeditions/EXP-GATE-007.md` — Acceptance Policies
- `docs/expeditions/EXP-GATE-008.md` — Review Gate Engine
- `docs/expeditions/EXP-GATE-009.md` — Revision Governance
- `docs/expeditions/EXP-GATE-010.md` — Mission Studio Integration
- `docs/expeditions/EXP-GATE-012.md` — Certification

---

## Long-Term Vision

Every existing SYNTH program can be retrofitted to the current governance model without rewriting its history. Completed work becomes evidence, pending work gets a clear gate path, and the three-gate model governs both greenfield and brownfield programs from the same deterministic foundation.
