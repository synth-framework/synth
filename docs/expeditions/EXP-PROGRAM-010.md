# EXP-PROGRAM-010 — Constitutional Hardening Program

**Status:** Completed and accepted  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Implementation hardening of frozen constitutional architecture  
**Era:** II — Adoption  
**Architecture Impact:** None  
**Constitutional Impact:** High  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** High

---

## Thesis

> Strengthen every implementation layer until it fully realizes the frozen SYNTH v2 Constitution without modifying constitutional architecture.

EXP-PROGRAM-010 is the first program whose customer is **the architecture itself** rather than the operator. It does not introduce new public concepts, redesign the architecture, or change operator workflows. It hardens the existing implementations of Mission Studio, Genesis, Replay, and validation until they fully realize the constitutional guarantees already defined.

---

## Purpose

Close the gap between constitutional intent and implementation reality by correcting defects, adding defensive validation, and establishing permanent regression guards — while preserving the Constitutional Freeze, public vocabulary, operator workflows, replay semantics, Mission Studio authority, and Genesis authority.

---

## Problem Statement

Programs 001–009 established SYNTH's architecture, distribution, documentation, and first-contact experience. During that work, several implementation defects were discovered that do not violate the constitution but prevent it from being fully realized. Examples include:

- Mission Studio proposals that reference parent IDs from the wrong identity space.
- Snapshots that are approved but not persisted as standalone artifacts.
- Genesis intake that trusts rather than validates the snapshot it consumes.
- Replay that verifies determinism but not graph integrity.
- Aggregate navigation that cannot be trusted because parent references may be invalid.

These defects are acceptable during adoption but must be corrected before SYNTH v2 can be considered fully hardened.

---

## Guiding Principles

EXP-PROGRAM-010 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- preserve operator workflows
- preserve replay semantics
- preserve Mission Studio authority
- preserve Genesis authority

EXP-PROGRAM-010 may:

- strengthen implementations
- strengthen validation
- strengthen replay
- strengthen Genesis
- strengthen Mission Studio internals
- strengthen determinism

EXP-PROGRAM-010 shall not:

- redesign the architecture
- introduce new public concepts
- change operator workflows without constitutional justification

---

## Workstreams

### Workstream A — Mission Studio Integrity

Mission Studio already produces excellent planning. Now it must produce a perfectly connected graph.

Objectives:

- Correct proposal parent references.
- Preserve proposal identity through the planning pipeline.
- Validate proposal graphs.
- Detect orphan proposals.
- Detect duplicate identities.
- Detect invalid references.

### Workstream B — Snapshot Integrity

`ApprovedMissionModelSnapshot` becomes a permanent constitutional artifact.

Objectives:

- Persist approved snapshots.
- Snapshot certification.
- Snapshot signatures.
- Snapshot migration.
- Snapshot compatibility validation.

### Workstream C — Genesis Hardening

Genesis becomes defensive rather than trusting.

Objectives:

- Snapshot acceptance validator.
- Relationship validator.
- Genesis certification report.
- Graph certification.
- Genesis integrity proofs.

### Workstream D — Replay Hardening

Replay should prove more than determinism. Replay should prove correctness.

Objectives:

- Graph-aware replay.
- Referential integrity verification.
- Aggregate navigation validation.
- Cross-version replay.
- Projection equivalence.

### Workstream E — Graph Integrity

Introduce Graph Integrity as a first-class constitutional proof.

A graph is valid only if:

- every Mission is reachable
- every Expedition belongs to exactly one Mission
- every Objective belongs to exactly one Expedition
- every Work Item belongs to exactly one Objective
- no orphan nodes exist
- no cycles exist
- every parent resolves
- every root is reachable

Graph Integrity becomes as important as Replay Integrity.

### Workstream F — Validation Expansion

Create a new generation of validation expeditions.

Examples:

- Relationship Integrity
- Snapshot Certification
- Replay Graph Validation
- Genesis Intake Validation
- Cross-Version Replay
- Projection Determinism
- Long-Running Replay
- Graph Integrity Certification

These become permanent regression suites.

### Workstream G — Observability

Improve forensic capabilities.

Examples:

- Aggregate lineage visualization
- Proposal lineage
- Snapshot lineage
- Graph visualization
- Relationship diagnostics
- Replay diagnostics
- Validation dashboards

Everything discovered during Program 010 should be explainable by replay.

---

## Program Composition

```text
EXP-PROGRAM-010
Constitutional Hardening Program
│
├── EXP-HARDEN-001  Mission Studio Integrity
│       Implementation Expedition
│       Correct proposal parent references and validate proposal graphs.
│
├── EXP-HARDEN-002  Snapshot Integrity
│       Implementation Expedition
│       Persist, certify, sign, and validate ApprovedMissionModelSnapshots.
│
├── EXP-HARDEN-003  Genesis Hardening
│       Implementation Expedition
│       Make Genesis defensive with snapshot acceptance and graph certification.
│
├── EXP-HARDEN-004  Replay Hardening
│       Implementation Expedition
│       Prove correctness, graph integrity, and cross-version replay.
│
├── EXP-HARDEN-005  Graph Integrity
│       Implementation Expedition
│       Introduce Graph Integrity as a first-class constitutional proof.
│
├── EXP-HARDEN-006  Validation Expansion
│       Certification Expedition
│       Create permanent regression suites for relationships, snapshots, replay, and graph integrity.
│
└── EXP-HARDEN-007  Observability
        Implementation Expedition
        Provide lineage, visualization, and diagnostic tooling for forensic analysis.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Decision Record and explicit constitutional approval.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Fixing implementation defects | Redesigning the architecture |
| Adding defensive validation | Introducing new public concepts |
| Strengthening replay checks | Changing operator workflows without constitutional justification |
| Persisting snapshots as artifacts | Modifying the event model |
| Adding graph integrity proofs | Altering the capability model |
| Creating diagnostic tooling | Changing Protected Asset semantics |

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. No new architectural concepts are introduced without an ADR.
4. No Protected Asset is modified.
5. Every change is replay-verifiable.
6. Every validation becomes a permanent regression guard.

---

## Success Criteria

- Every implementation defect discovered during Programs 007–009 has either been corrected or formally accepted with documented rationale.
- Every aggregate relationship is validated before execution.
- Every snapshot is self-consistent and replayable.
- Genesis rejects structurally invalid snapshots.
- Replay verifies both deterministic execution and graph integrity.
- New validation suites permanently guard against regression.
- No constitutional document requires modification.
- The SYNTH v2 public vocabulary remains unchanged.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [x] EXP-HARDEN-001 completed and accepted.
- [x] EXP-HARDEN-002 completed and accepted.
- [x] EXP-HARDEN-003 completed and accepted.
- [x] EXP-HARDEN-004 completed and accepted.
- [x] EXP-HARDEN-005 completed and accepted.
- [x] EXP-HARDEN-006 completed and accepted.
- [x] EXP-HARDEN-007 completed and accepted.
- [x] Program accepted.

---

## Completion Notes

**Accepted 2026-07-16 — Constitutional objectives achieved.**

All seven expeditions merged (PRs #77–#83, CI `proof` green, 122 new hardening tests). The implementation was corrected to meet the frozen Constitution; the Constitution was not modified. Full evidence in `docs/expeditions/EXP-PROGRAM-010-completion-report.md`.

Findings dispositions:

- **F1 (WorkItem → Objective event-model edge):** Accepted Constitutional Gap. Routed to ADR → event-model evolution → v2.1. Not implementation debt.
- **F2 (legacy forensic logs):** Preserved immutable — local 215-event log (206 pinned violations) and First Contact Archive A (32 events, 36 violations). History is not regenerated; the defects are evidence that governance worked.
- **F3 (confidence thresholds):** Unchanged; Mission Studio confidence remains evidence-driven.

External validation: the TaskPRO first-contact field experiment (rc.1, Windows, autonomous agent) independently confirmed the HARDEN-002 / 006 / 007 failure classes in the wild, and the hardened verifier certifies its event log clean (`docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md`).

Follow-on: EXP-FIRSTCONTACT-009 re-records the canonical journey on the hardened pipeline, preserving Archive A as historical evidence.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/operator/EXP-PROGRAM-010-completion-report.md` | Completion report with Constitution Provenance Matrix and findings dispositions. |
| `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` | External field evidence (TaskPRO rc.1 experiment) and follow-on program proposals. |
| `docs/adr/ADR-004-synth-eras-and-protected-assets.md` | Eras, Protected Assets, and Post-Freeze Rule. |
| `docs/reference/public-vocabulary.md` | Canonical seven-concept vocabulary. |
| `docs/expeditions/EXP-PROGRAM-009.md` | Canonical First Contact Experience; source of deferred defects. |
| `docs/expeditions/EXP-FIRSTCONTACT-003.md` | Acceptance note documenting defects deferred to this program. |
