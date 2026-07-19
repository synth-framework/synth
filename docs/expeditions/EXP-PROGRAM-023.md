# EXP-PROGRAM-023 — Genesis

**Status:** Completed and accepted  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Intent-to-Mission lifecycle, brownfield and greenfield onboarding  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** High
**Completed In:** PRs #188–#193

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

Transform raw human intent into an approved Mission before any repository or governance state is created.

Genesis is not another onboarding wizard. It is the missing upstream half of SYNTH. Together with Semantic Modeling and Canonical Knowledge & Validation, it completes the top half of the lifecycle:

* **Genesis** captures raw intent, classifies context, negotiates scope, and materializes the first Mission.
* **EXP-PROGRAM-024 — Semantic Modeling** turns intent into a canonical semantic model.
* **EXP-PROGRAM-025 — Canonical Knowledge & Validation** preserves that model and validates it before implementation.
* The existing execution engine runs Missions, Expeditions, Evidence, and Replay.

---

## Core Abstraction — Genesis

> **Genesis** is the deterministic transition from raw intent to an approved Mission.

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
Genesis Artifact
  ↓
Mission
  ↓
Expeditions
  ↓
Repository Materialization
```

Genesis produces the first Mission. Semantic Modeling, Knowledge, and Validation continue downstream.

---

## Mission

Make SYNTH greenfield and brownfield onboarding behave like a single intent-to-Mission system:

- Every project begins with Genesis.
- Genesis extracts intent, classifies context, and negotiates scope.
- Genesis identifies constraints and unknowns.
- Capability verification confirms feasibility before Mission creation.
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
├── EXP-GENESIS-001  Genesis Lifecycle & Artifact Schema
│       Architecture Expedition
│       Define the canonical Genesis workflow, artifact schema, and
│       replay/governance integration.
│
├── EXP-GENESIS-002  Genesis Intent Capture & Classification
│       Architecture Expedition
│       Capture intent, classify context, extract constraints, and
│       negotiate scope before Mission materialization.
│
└── EXP-GENESIS-003  Genesis Validation & Mission Materialization
        Product Expedition
        Verify capability feasibility, validate acceptance, and
        materialize the first Mission and Expedition proposals.
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

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

| Allowed | Forbidden |
|---|---|
| Finalizing governance lifecycle contracts | Weakening deterministic validation |
| Brownfield baseline and classification | Modifying Protected Assets |
| Greenfield intent extraction and classification | Code generation quality as a primary goal |
| Scope negotiation and constraint extraction | Bypassing ExecutionGate for mutations |
| Capability verification before Mission creation | IDE or editor integrations |
| Replay and governance integration | Commercial cloud CI integrations |
| Mission materialization pipeline | Canonical domain or knowledge modeling (Programs 024/025) |

### Hard Constraints

> **No state before approval:** No repository, manifest, event log, or generated code may be created until the Genesis artifact is approved and the Mission is created.
>
> **Replayability:** Every Genesis artifact must be reproducible from its inputs and approved state.
>
> **Deterministic projections:** Architecture candidates are projections; the selected architecture becomes canonical only through approval.

---

## Out of Scope

- Canonical intent modeling beyond the Genesis artifact (covered by EXP-PROGRAM-024).
- Canonical domain modeling (covered by EXP-PROGRAM-024).
- Canonical Knowledge Model and validation pipeline (covered by EXP-PROGRAM-025).
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
- **EXP-PROGRAM-024** (Semantic Modeling) consumes the Genesis artifact and produces canonical intent/domain models.
- **EXP-PROGRAM-025** (Canonical Knowledge & Validation) consumes the Semantic Model and validates understanding before implementation.
- **EXP-PROGRAM-006** (Discovery Platform) defines the Discovery compiler; Genesis contributes greenfield-specific observation and projection capabilities.
- **EXP-BROWNFIELD-001** established the brownfield onboarding workflow; EXP-BROWNFIELD-002 completes it.
- **EXP-PROGRAM-022** (AI-Native First Contact) explores greenfield onboarding; EXP-PROGRAM-023 converges greenfield and brownfield on the Genesis abstraction.
