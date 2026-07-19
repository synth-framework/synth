# EXP-PROGRAM-024 — Semantic Modeling

**Status:** Executing  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Canonical intent and domain semantics independent of implementation  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** High

---

## Thesis

> **SYNTH can capture intent and validate feasibility, but it cannot yet reason about what the system should do in a form that survives changes to implementation, framework, or documentation.**

Genesis produces an approved artifact. Semantic Modeling turns that artifact into a canonical semantic representation: a structured model of intent and domain that is independent of technology, code, and generated documents.

The goal is to raise two capabilities to production readiness:

| Capability      | Current | Target |
| --------------- | :-----: | :----: |
| Intent Modeling |   35%   |  100%  |
| Domain Modeling |   50%   |  100%  |

---

## Purpose

Produce deterministic, replayable semantic artifacts before implementation:

- **Intent Model** — what the system should achieve, for whom, and under what assumptions.
- **Domain Model** — the concepts, relationships, invariants, and boundaries of the problem space.

These artifacts become the canonical source for requirements, architecture, Missions, Expeditions, and documentation. The implementation stack becomes a projection of the semantic model, not its source.

---

## Core Abstraction — Semantic Model

> **The Semantic Model is the deterministic transition from an approved Genesis artifact to canonical intent and domain knowledge.**

```text
Approved Genesis Artifact
        ↓
Intent Model
        ↓
Domain Model
        ↓
Canonical Knowledge Graph
```

The Semantic Model is implementation-independent. Replacing the chosen runtime or framework should not change the intent or domain models.

---

## Mission

Make SYNTH reason about intent and domain before writing code:

- Every approved Genesis artifact produces an Intent Model.
- The Intent Model captures goals, problems, stakeholders, outcomes, success criteria, assumptions, and unknowns.
- The Intent Model exposes an intent graph showing how goals derive from problems and requirements derive from goals.
- Ambiguity and conflict are detected automatically.
- The Domain Model maps the problem space into entities, value objects, aggregates, relationships, invariants, policies, bounded contexts, and events.
- The Domain Model produces a governed ubiquitous language.
- Domain integrity rules detect duplicated concepts, conflicting terminology, cyclic dependencies, and inconsistent ownership.
- Both models are versioned, replayable, and deterministic for fixed inputs.

---

## Program Composition

```text
EXP-PROGRAM-024
Semantic Modeling
│
├── EXP-SEMANTIC-001  Intent Modeling Engine
│       Architecture Expedition
│       Define the intent ontology, intent graph, confidence model,
│       ambiguity detection, and replay semantics for operator intent.
│
└── EXP-SEMANTIC-002  Domain Modeling Engine
        Architecture Expedition
        Define the domain ontology, ubiquitous language, bounded contexts,
        integrity rules, and semantic drift detection for the problem space.
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
| Defining intent and domain ontologies | Modifying Protected Assets |
| Building deterministic semantic engines | Code generation quality as a primary goal |
| Detecting ambiguity and conflict in intent | Bypassing ExecutionGate for mutations |
| Producing a governed ubiquitous language | IDE or editor integrations |
| Modeling bounded contexts and invariants | Commercial cloud CI integrations |
| Versioning and replaying semantic models | Canonical knowledge graph persistence (Program 025) |
| Consuming the Genesis artifact as input | Changing the Genesis lifecycle semantics |

### Hard Constraints

> **Implementation independence:** The semantic model must not depend on a specific framework, language, runtime, or deployment target.
>
> **Determinism:** The same approved Genesis artifact and adapter version must produce the same semantic model.
>
> **Replayability:** The evolution of the intent and domain models must be reconstructible from inputs and decisions.
>
> **Canonical vocabulary:** Semantic models may only use terms defined in `docs/ubiquitous-language.md` or introduce new terms with explicit definitions.

---

## Out of Scope

- Canonical Knowledge Model persistence and projection engine (covered by EXP-PROGRAM-025).
- Prototype-first validation (covered by EXP-PROGRAM-025).
- Changes to Genesis intent capture semantics.
- Changes to Mission or Expedition lifecycle semantics.
- Code generation from semantic models.
- IDE or editor integrations.
- Commercial cloud CI integrations.

---

## Success Criteria

The program is complete when the following scenarios are deterministic:

### Intent Modeling

```text
Approved Genesis Artifact
        ↓
Intent Model
        ↓
Goal Graph
        ↓
Conflict / Ambiguity Report
```

### Domain Modeling

```text
Intent Model
        ↓
Domain Model
        ↓
Entities, Relationships, Invariants
        ↓
Ubiquitous Language
```

### Convergence

Two independent agents using the same adapter version and the same approved Genesis artifact must produce substantially equivalent intent and domain models.

---

## Relationship to Other Work

- **EXP-PROGRAM-023 — Genesis** provides the approved artifact that is the input to Semantic Modeling.
- **EXP-PROGRAM-025 — Canonical Knowledge & Validation** consumes the Semantic Model and persists it as a versioned knowledge graph.
- **EXP-PROGRAM-021 — Incremental Governance** provides the execution performance foundation; semantic model validation must benefit from incremental validation.
- **docs/ubiquitous-language.md** defines the vocabulary contract that semantic models must respect.
- **docs/architecture/knowledge-layer.md** defines the architectural context for canonical knowledge.
