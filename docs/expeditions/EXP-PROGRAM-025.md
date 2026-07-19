# EXP-PROGRAM-025 — Canonical Knowledge & Validation

**Status:** Proposed  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Canonical knowledge graph and prototype-first validation  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** Medium

---

## Thesis

> **Knowledge should become the canonical artifact of a SYNTH project.**

Every other artifact—documentation, architecture, Missions, Expeditions, plans, and implementations—is a projection derived from that knowledge.

---

## Purpose

Raise the remaining capabilities to production readiness:

| Capability                 | Current | Target |
| -------------------------- | :-----: | :----: |
| Canonical Knowledge Model  |   60%   |  100%  |
| Prototype-First Validation |   15%   |  100%  |

Make knowledge the durable, versioned, replayable center of the project. Validate understanding through prototypes, acceptance scenarios, and runtime verification before any production code is written.

---

## Core Abstraction — Knowledge Model

> The **Knowledge Model** is the versioned, canonical graph of everything SYNTH knows about a project.

```text
Intent
  ↓
Domain
  ↓
Constraints
  ↓
Decisions
  ↓
Evidence
  ↓
Assumptions
  ↓
Risks
  ↓
Questions
  ↓
Architecture Rationale
```

All downstream artifacts are projections. No projection becomes the source of truth.

---

## Mission

Make SYNTH preserve and validate knowledge before implementation:

- Knowledge is versioned, replayable, and lineage-aware.
- Documentation, architecture, and Missions are generated projections.
- Prototypes validate understanding before code.
- Runtime capability checks confirm feasibility.
- Acceptance criteria are defined and approved before implementation.

---

## Program Composition

```
EXP-PROGRAM-025
Canonical Knowledge & Validation
│
├── EXP-KNOWLEDGE-001  Canonical Knowledge Model
│       Architecture Expedition
│       Define the versioned knowledge graph, projection engine,
│       semantic drift detection, and knowledge versioning semantics.
│
└── EXP-KNOWLEDGE-002  Prototype-First Validation
        Product Expedition
        Validate intent, domain, and architecture through wireframes,
        prototypes, acceptance scenarios, and runtime verification.
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
| Canonical knowledge graph | Changing Mission lifecycle semantics |
| Projection engine for artifacts | Changing Expedition execution semantics |
| Semantic drift detection | Code generation quality as a primary goal |
| Prototype and acceptance validation | Bypassing ExecutionGate for mutations |
| Runtime capability verification | IDE or editor integrations |
| Knowledge versioning and lineage | Commercial cloud CI integrations |

### Hard Constraints

> **Knowledge is canonical:** No generated document may become the source of truth.
>
> **Validation before implementation:** Major decisions require evidence from prototypes, acceptance, or runtime verification.
>
> **Replayability:** The Knowledge Model must be reconstructible from its inputs and events.

---

## Out of Scope

- Changes to Mission or Expedition execution semantics.
- Intent extraction (covered by Genesis and Semantic Modeling).
- Domain model generation (covered by Semantic Modeling).
- Code generation.
- IDE or editor integrations.

---

## Success Criteria

The program is complete when:

- A project can reach Mission approval without a single line of production code.
- Deleting every generated document does not lose project understanding.
- Every major decision is validated through knowledge, prototypes, or acceptance evidence.
- Documentation, architecture, and Missions are reproducible projections from the Knowledge Model.
- Semantic drift between projections and canonical knowledge is detectable.
- `npm run govern` passes.

---

## Relationship to Other Work

- **EXP-PROGRAM-023** (Genesis) provides raw intent and evidence.
- **EXP-PROGRAM-024** (Semantic Modeling) provides the canonical intent and domain models.
- **EXP-PROGRAM-021** (Incremental Governance) ensures knowledge artifacts remain governable and incrementally validated.
- **EXP-PROGRAM-006** (Discovery Platform) may contribute projection capabilities.
