# EXP-PROGRAM-018 — Foundation Architecture Program

**Status:** Completed and accepted  
**Kind:** Program  
**Priority:** Low  
**Authority:** Synth Architectural Constitution  
**Scope:** Capture pre-Program foundation architecture expeditions that shaped the adapter model, determinism, continuous governance, and single mutation authority  
**Era:** II — Adoption  
**Architecture Impact:** High  
**Constitutional Impact:** High  
**Public Impact:** Medium  
**Product Impact:** Medium  
**Execution Impact:** Low  
**Depends On:** None  
**Blocks:** None

---

## Thesis

> Before SYNTH had Programs, it had a foundation of architectural expeditions that established the adapter model, determinism, governance continuity, and the single mutation authority. This Program retroactively recognizes that work as a coherent historical program.

---

## Purpose

Group the pre-Program expeditions that defined SYNTH's foundational architecture into a single historical Program. This preserves lineage, eliminates persistent governance warnings, and makes the pre-Program era explicit without redesigning the governance model.

This Program does not add new work. It is a governance migration that assigns legacy expeditions to a historical container so the repository fully conforms to the current Program governance model.

---

## Problem Statement

The current governance model requires every Expedition to belong to exactly one Program. The earliest expeditions predated the Program concept, so they have no Program assignment. `synth validate` therefore reports warnings for every legacy Expedition, even though all of them are complete and accepted.

Rather than leave these warnings permanent, the legacy Expeditions are grouped into a historical Program that reflects their actual architectural theme: the foundation of SYNTH's architecture before Program-based governance existed.

---

## Guiding Principles

EXP-PROGRAM-018 shall:

- preserve the historical lineage of every legacy Expedition
- assign each legacy Expedition to exactly one historical Program
- mark the Program as completed and immutable
- eliminate persistent Program-assignment warnings
- make no runtime, CLI, or governance engine changes

EXP-PROGRAM-018 shall not:

- create new implementation work
- alter the status or evidence of any legacy Expedition
- introduce new capabilities
- change the meaning of any historical Expedition

---

## Constitutional Invariant

> **Every Expedition belongs to exactly one Program.** Historical Expeditions that predated the Program model are assigned to historical Programs so the invariant holds across the entire repository lineage.

---

## Program Composition

```text
EXP-PROGRAM-018
Foundation Architecture Program
│
├── EXP-ADP-000  Adapter Architecture Specification
│       Constitutional Specification
│       Define the canonical architecture, lifecycle, and
│       governance model for all Synth adapters.
│
├── EXP-ADP-001  Repository Adapter (Git Reference Implementation)
│       Implementation Expedition
│       Implement the canonical Repository adapter using Git
│       as the reference provider.
│
├── EXP-ADP-002  GitHub Adapter
│       Implementation Expedition
│       Implement the GitHub adapter for repository and issue
│       projection operations.
│
├── EXP-ADP-003  TDD Adapter
│       Implementation Expedition
│       Integrate test-driven development workflows into the
│       adapter ecosystem.
│
├── EXP-ADP-004  BDD Adapter
│       Implementation Expedition
│       Integrate behavior-driven development workflows into
│       the adapter ecosystem.
│
├── EXP-ADP-005  Conversation Adapter
│       Implementation Expedition
│       Capture and replay human-agent conversations as
│       durable execution artifacts.
│
├── EXP-ADP-006  Document Adapter
│       Implementation Expedition
│       Project canonical documents to and from external
│       document stores.
│
├── EXP-ADP-007  Repository Adapter Observation Extension
│       Implementation Expedition
│       Extend the Repository adapter with observation and
│       evidence-gathering capabilities.
│
├── EXP-ADP-008  Filesystem Adapter
│       Implementation Expedition
│       Provide a filesystem capability adapter for
│       environment-independent I/O.
│
├── EXP-ADP-009  Specification Adapter
│       Implementation Expedition
│       Project structured specifications between SYNTH and
│       external specification tools.
│
├── EXP-ADP-010  Knowledge Extraction Adapter
│       Implementation Expedition
│       Extract domain knowledge from repository artifacts.
│
├── EXP-ADP-011  Confidence Adapter
│       Implementation Expedition
│       Compute and project confidence scores for planning
│       artifacts.
│
├── EXP-ADP-012  Dependency Adapter
│       Implementation Expedition
│       Discover and track dependencies across repository
│       artifacts.
│
├── EXP-ADP-013  Architecture Adapter
│       Implementation Expedition
│       Project architectural models between SYNTH and
│       external modeling tools.
│
├── EXP-ADP-014  Mission Builder Adapter
│       Implementation Expedition
│       Provide adapter support for synthesizing Mission
│       drafts from external inputs.
│
├── EXP-ADP-015  Expedition Builder Adapter
│       Implementation Expedition
│       Provide adapter support for synthesizing Expedition
│       plans from external inputs.
│
├── EXP-ADP-016  Objective Builder Adapter
│       Implementation Expedition
│       Provide adapter support for synthesizing Objectives
│       from external inputs.
│
├── EXP-ADP-017  Wizard Adapter
│       Implementation Expedition
│       Provide interactive wizard support through the
│       adapter ecosystem.
│
├── EXP-ADP-OBS-001  Observation Adapter
│       Implementation Expedition
│       Standardize observation collection across adapters.
│
├── EXP-AUD-002  Zero-Trust Architecture Verification
│       Architecture Expedition
│       Verify the zero-trust architectural boundaries of
│       the SYNTH runtime.
│
├── EXP-DET-001  Deterministic Execution
│       Architecture Expedition
│       Establish deterministic execution as a core
│       architectural property.
│
├── EXP-GOV-001  Continuous Governance
│       Governance Expedition
│       Establish continuous governance verification as a
│       routine operational property.
│
└── EXP-SMA-001  Complete Single Mutation Authority
        Architecture Expedition
        Ensure exactly one authority exists for all state
        mutations in SYNTH.
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

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. Every Expedition in this Program is already complete and accepted.
4. No new implementation work is introduced by this Program.
5. The Program is historical and immutable after acceptance.

---

## Success Criteria

- All 23 legacy Expeditions are assigned to EXP-PROGRAM-018.
- `scripts/verify-expedition-governance.js` reports zero Program-assignment warnings.
- No runtime, CLI, or governance engine behavior changes.
- Historical lineage and expedition statuses are preserved.

---

## Definition of Done

- [x] EXP-PROGRAM-018 created and accepted.
- [x] All legacy Expeditions reference EXP-PROGRAM-018.
- [x] Expedition governance validator reports zero warnings.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/prefix-registry.json` | Canonical identifier prefixes for all Expeditions and Programs. |
| `docs/expeditions/EXP-PROGRAM-014.md` | Governance Maturation Program; introduced the Program model that this historical Program now conforms to. |
