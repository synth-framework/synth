# EXP-PROGRAM-024 — Semantic Modeling

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Intent and domain semantic artifacts independent of implementation  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **Before SYNTH can synthesize systems deterministically, it must synthesize understanding deterministically.**

Intent and domain should become canonical semantic artifacts, independent of implementation, technology, or documentation. Requirements, architecture, tasks, and code are projections from these artifacts.

---

## Purpose

Raise the following capabilities to production readiness:

| Capability      | Current | Target |
| --------------- | :-----: | :----: |
| Intent Modeling |   35%   |  100%  |
| Domain Modeling |   50%   |  100%  |

Create a deterministic semantic representation of user intent, business domain, constraints, ubiquitous language, and system boundaries before any architecture or implementation decisions are made.

---

## Core Abstraction — Semantic Model

> The **Semantic Model** is the canonical representation of what the system should do and the domain in which it operates.

```text
Intent
  ↓
Domain
  ↓
Constraints
  ↓
Ubiquitous Language
  ↓
System Boundaries
```

The Semantic Model is implementation-independent. Architecture and code are projections from it.

---

## Mission

Make SYNTH understand projects before building them:

- Every project has a deterministic intent model.
- Every project has a deterministic domain model.
- Intent and domain are validated before implementation.
- Ubiquitous language is governed.
- Technology choices are projections, not sources of truth.

---

## Program Composition

```
EXP-PROGRAM-024
Semantic Modeling
│
├── EXP-SEMANTIC-001  Intent Modeling Engine
│       Architecture Expedition
│       Extract, structure, and validate operator intent as a canonical
│       intent graph with confidence, evidence, and provenance.
│
└── EXP-SEMANTIC-002  Domain Modeling Engine
        Architecture Expedition
        Generate entities, aggregates, bounded contexts, invariants,
        policies, and ubiquitous language from intent and evidence.
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
| Intent ontology and graph | Changing Mission lifecycle semantics |
| Domain model generation | Changing Expedition execution semantics |
| Ubiquitous language governance | Code generation quality as a primary goal |
| Ambiguity and conflict detection | Bypassing ExecutionGate for mutations |
| Semantic drift detection | IDE or editor integrations |
| Replay of intent/domain evolution | Commercial cloud CI integrations |

### Hard Constraints

> **Intent is canonical:** Requirements, architecture, and code are projections of intent.
>
> **Domain is canonical:** Technology is a projection of the domain.
>
> **Replayability:** The evolution of intent and domain must be replayable from evidence.

---

## Out of Scope

- Changes to Mission or Expedition execution semantics.
- Repository materialization (covered by Genesis).
- Code generation quality beyond model validation.
- IDE or editor integrations.
- Commercial cloud CI integrations.

---

## Success Criteria

The program is complete when:

- A Mission is generated from the semantic model—not directly from user prompts.
- The implementation stack is replaceable without changing the canonical domain.
- Two independent agents produce materially equivalent intent models from the same inputs.
- Two independent agents produce materially equivalent domain models from the same intent.
- Semantic drift between projections and canonical models is detectable.
- `npm run govern` passes.

---

## Relationship to Other Work

- **EXP-PROGRAM-023** (Genesis) produces the raw intent and evidence that feed the Semantic Model.
- **EXP-PROGRAM-025** (Canonical Knowledge & Validation) consumes the Semantic Model and makes it the foundation of the Knowledge Model.
- **EXP-PROGRAM-006** (Discovery Platform) provides observation and projection capabilities that may be reused for semantic modeling.
