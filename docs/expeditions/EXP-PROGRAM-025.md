# EXP-PROGRAM-025 — Canonical Knowledge & Validation

**Status:** Executing  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Canonical knowledge graph, projections, and prototype-first validation  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** High

---

## Thesis

> **SYNTH can model intent and domain, but it cannot yet persist that understanding as a versioned, projectable knowledge graph or validate it before implementation begins.**

Semantic Modeling produces canonical intent and domain artifacts. Canonical Knowledge & Validation turns those artifacts into the single source of truth for the project: a knowledge graph from which Missions, Expeditions, requirements, architecture, and documentation are projected. It also validates that understanding through prototypes, acceptance scenarios, and runtime capability checks before any production code is written.

The goal is to raise two capabilities to production readiness:

| Capability                 | Current | Target |
| -------------------------- | :-----: | :----: |
| Canonical Knowledge Model  |   60%   |  100%  |
| Prototype-First Validation |   15%   |  100%  |

---

## Purpose

Make SYNTH preserve and validate understanding before implementation:

- The Domain Model becomes a versioned Canonical Knowledge Graph.
- Every projection (Mission, Expedition, ADR, documentation, specification) is derived from the graph.
- Deleting every generated document does not lose project understanding.
- Prototypes, acceptance scenarios, and mock APIs validate understanding.
- Runtime capability checks confirm feasibility before Mission approval.
- Implementation cannot begin until intent, domain, prototype, and acceptance are validated.

---

## Core Abstraction — Canonical Knowledge Graph

> **The Canonical Knowledge Graph is the versioned, replayable source of truth from which every other project artifact is projected.**

```text
Domain Model
        ↓
Canonical Knowledge Graph
        ↓
Projections
        ↓
Missions / Expeditions / ADRs / Docs / Specs
```

The graph is implementation-independent. Changing the runtime or framework changes projections, not the graph.

---

## Mission

Close the gap between understanding and implementation:

- Persist the Domain Model as a Canonical Knowledge Graph.
- Version the graph with replay, branching, lineage, and provenance.
- Project Missions, Expeditions, ADRs, architecture docs, and specifications from the graph.
- Detect semantic drift between the graph and generated artifacts.
- Validate understanding through wireframes, acceptance scenarios, mock APIs, and simulations.
- Verify runtime feasibility before implementation.
- Gate Mission approval on validated knowledge.

---

## Program Composition

```text
EXP-PROGRAM-025
Canonical Knowledge & Validation
│
├── EXP-KNOWLEDGE-001  Canonical Knowledge Model
│       Architecture Expedition
│       Define the knowledge graph schema, projection engine, versioning,
│       lineage, and semantic drift detection.
│
└── EXP-KNOWLEDGE-002  Prototype-First Validation
        Product Expedition
│       Define prototype, acceptance scenario, mock API, simulation, and
│       runtime verification capabilities before implementation.
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
| Defining a canonical knowledge graph schema | Modifying Protected Assets |
| Building projection engines from knowledge to artifacts | Code generation quality as a primary goal |
| Versioning, lineage, and replay for knowledge | Bypassing ExecutionGate for mutations |
| Detecting drift between knowledge and projections | IDE or editor integrations |
| Prototype and acceptance scenario validation | Commercial cloud CI integrations |
| Runtime capability verification before implementation | Changing Genesis or Semantic Modeling semantics |
| Consuming the Domain Model as input | Persisting generated artifacts as canonical |

### Hard Constraints

> **Knowledge is canonical:** The Canonical Knowledge Graph is the source of truth. No projection may become canonical.
>
> **Implementation independence:** The graph must not depend on a specific framework, language, runtime, or deployment target.
>
> **Determinism:** The same Domain Model and projection version produce the same artifacts.
>
> **Validation before implementation:** Mission approval requires validated intent, domain, prototype, and acceptance criteria.
>
> **Replayability:** Knowledge evolution must be reconstructible from inputs and decisions.

---

## Out of Scope

- Changes to Genesis or Semantic Modeling semantics.
- Changes to Mission or Expedition lifecycle semantics.
- Code generation from knowledge (that belongs to downstream synthesis).
- IDE or editor integrations.
- Commercial cloud CI integrations.

---

## Success Criteria

The program is complete when the following scenarios are deterministic:

### Knowledge Persistence

```text
Domain Model
        ↓
Canonical Knowledge Graph
        ↓
Version / Lineage / Provenance
```

### Projection

```text
Knowledge Graph
        ↓
Mission Projection
        ↓
Expedition Proposals
        ↓
ADR Projection
        ↓
Documentation Projection
```

### Validation

```text
Intent
        ↓
Domain
        ↓
Prototype
        ↓
User Validation
        ↓
Mission Approval
        ↓
Implementation
```

### Drift Detection

```text
Knowledge Graph
        ↓
Projections
        ↓
Drift Detection
        ↓
Report
```

---

## Relationship to Other Work

- **EXP-PROGRAM-024 — Semantic Modeling** provides the Domain Model that is the input to the Canonical Knowledge Graph.
- **EXP-PROGRAM-023 — Genesis** provides the approved artifact that feeds Semantic Modeling.
- **EXP-PROGRAM-021 — Incremental Governance** provides the execution performance foundation; knowledge validation must benefit from incremental validation.
- **docs/architecture/decisions/ADR-0012-canonical-knowledge-representation.md** defines SKR, the canonical knowledge representation.
- **docs/ubiquitous-language.md** defines the vocabulary contract.
