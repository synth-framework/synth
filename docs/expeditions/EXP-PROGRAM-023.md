# EXP-PROGRAM-023 — Genesis

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Intent-to-knowledge lifecycle, brownfield and greenfield onboarding  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** High

---

## Thesis

> **SYNTH has a mature execution engine, but lacks a canonical mechanism to transform raw human intent into governed system knowledge.**

Mission → Expedition → Replay is deterministic once intent exists. The gap is upstream: converting an idea, an existing repository, or a document into the first approved Mission. This program introduces **Genesis**, the first stage of the SYNTH lifecycle.

The goal is to raise three capabilities to production readiness:

| Capability                      | Current | Target |
| ------------------------------- | :-----: | :----: |
| Mission / Expedition Governance |   95%   |  100%  |
| Brownfield Discovery            |   85%   |  100%  |
| Greenfield Discovery            |   40%   |  100%  |

---

## Purpose

Transform raw human intent into replayable, approval-driven knowledge before any repository or governance state is created.

Genesis is not another onboarding wizard. It is the missing upstream half of SYNTH. Governance, brownfield discovery, and greenfield discovery become three layers of a single deterministic lifecycle:

* **Governance** guarantees *how* transformations are recorded and reproduced.
* **Brownfield Discovery** guarantees *what already exists* before transformation.
* **Genesis** guarantees *what should exist* before transformation.

---

## Core Abstraction — Genesis

> **Genesis** is the deterministic transition from raw intent to a governable Knowledge Model.

```text
Intent
  ↓
Evidence
  ↓
Classification
  ↓
Constraints
  ↓
Scope
  ↓
Domain Model
  ↓
Knowledge Model
  ↓
Validation
  ↓
Mission
  ↓
Expeditions
  ↓
Repository Materialization
```

The Knowledge Model is implementation-independent. Architecture, requirements, and documentation are projections from it.

---

## Mission

Make SYNTH greenfield and brownfield onboarding behave like a single intent-discovery system:

- Every project begins with Genesis.
- Genesis extracts intent, detects ambiguity, and identifies unknowns.
- Genesis produces architecture candidates as projections, not canonical state.
- Capability verification confirms that the selected architecture can be realized.
- Mission creation is gated on Genesis approval.
- Repository materialization happens only after Mission approval.

---

## Program Composition

```
EXP-PROGRAM-023
Genesis
│
├── EXP-GOVERN-006   Governance Completion
│       Architecture Expedition
│       Finalize Mission/Expedition lifecycle semantics, approval
│       boundaries, and replay contracts so Genesis builds on a stable
│       platform.
│
├── EXP-BROWNFIELD-002  Brownfield Discovery Completion
│       Product Expedition
│       Harden mutation-free discovery, baseline snapshots, repository
│       classification, and bootstrap contracts for existing systems.
│
└── EXP-GENESIS-001  Genesis — Greenfield Discovery
        Architecture Expedition
        Define the canonical greenfield intent-to-knowledge workflow,
        artifact schema, clarification strategy, and Mission
        materialization pipeline.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Finalizing governance lifecycle contracts | Weakening deterministic validation |
| Brownfield baseline and classification | Modifying Protected Assets |
| Greenfield intent extraction and domain modeling | Code generation quality as a primary goal |
| Knowledge Model as canonical artifact | Bypassing ExecutionGate for mutations |
| Capability verification before Mission creation | IDE or editor integrations |
| Replay and governance integration | Commercial cloud CI integrations |

### Hard Constraints

> **No state before approval:** No repository, manifest, event log, or generated code may be created until the Genesis artifact is approved and the Mission is created.
>
> **Replayability:** Every Genesis artifact must be reproducible from its inputs and approved state.
>
> **Deterministic projections:** Architecture candidates are projections; the selected architecture becomes canonical only through approval.

---

## Out of Scope

- Changes to the core Mission lifecycle semantics.
- Changes to Expedition execution semantics.
- Code generation quality beyond capability verification.
- IDE or editor integrations.
- Commercial cloud CI integrations.

---

## Success Criteria

The program is complete when the following scenarios are deterministic:

### Greenfield

```text
User: "Build me a markdown editor."
  ↓
Genesis
  ↓
Clarification
  ↓
Canonical Knowledge Model
  ↓
Mission
  ↓
Expeditions
  ↓
Bootstrap
```

### Brownfield

```text
Existing Repository
  ↓
Brownfield Discovery
  ↓
Baseline Snapshot
  ↓
Mission
  ↓
Expeditions
```

### Governance

```text
Mission
  ↓
Expedition
  ↓
Evidence
  ↓
Replay
  ↓
Deterministic Reconstruction
```

---

## Relationship to Other Work

- **EXP-PROGRAM-021** (Incremental Governance) provides the execution performance foundation; Genesis workflows must remain governable and benefit from incremental validation.
- **EXP-PROGRAM-006** (Discovery Platform) defines the Discovery compiler; Genesis contributes greenfield-specific observation and projection capabilities.
- **EXP-BROWNFIELD-001** established the brownfield onboarding workflow; EXP-BROWNFIELD-002 completes it.
- **EXP-PROGRAM-022** (AI-Native First Contact) explores greenfield onboarding; EXP-PROGRAM-023 converges greenfield and brownfield on the Genesis abstraction.
