# Synth Adapter Architecture

**Version:** 1.0.0  
**Authority:** EXP-ADP-000

---

## Three-Layer Model

Synth is organized into three architectural strata:

```
Layer 0 — Constitution
    Principles, ADRs, ATLs, Governance, Proof

Layer 1 — Kernel
    ExecutionGate
    Runtime
    EventStore
    Replay
    Capability Registry
    Adapter Registry

Layer 2 — Adapters
    Repository
    GitHub
    Docker
    Kubernetes
    Filesystem
    LLM
    Cloud
    ...
```

The Constitution governs both the Kernel and the Adapters. The Kernel remains the stable execution engine. Adapters become the primary mechanism for extending capabilities.

---

## Layer 0: Constitution

The Constitution defines:

- Architectural principles
- Governance processes
- Proof obligations
- ATL levels
- Adapter contract (EXP-ADP-000)
- Kernel freeze policy

It does not contain implementation logic.

---

## Layer 1: Kernel

The Kernel is frozen except through ADR-driven constitutional amendments.

Responsibilities:

- Single Mutation Authority (`ExecutionGate`)
- Event sourcing (`EventStore`)
- State reconstruction (`Replay`)
- Deterministic execution (`Runtime`)
- Capability registration
- Adapter orchestration (`AdapterRegistry`)
- Proof generation

The Kernel never talks directly to external systems.

---

## Layer 2: Adapters

Adapters implement the EXP-ADP-000 contract. They are:

- Optional
- Isolated
- Replaceable
- Observable
- Governed
- Deterministic
- Capability-driven

Adapters extend Synth without modifying the Kernel.

---

## Communication Model

```
Kernel → AdapterRegistry → Adapter → Capability → External System
```

The Kernel invokes capabilities. The Adapter translates capabilities into platform-specific operations.

No Kernel component may directly invoke:

- Git commands
- GitHub APIs
- Docker APIs
- Kubernetes APIs
- File-system mutations outside the workspace
- Network calls

All such operations flow through adapters.

---

## Adapter Taxonomy

Adapters are classified into kinds based on what they extend:

```
Adapter
│
├── Integration Adapter
│      Repository       (EXP-ADP-001)
│      GitHub           (EXP-ADP-002)
│      Docker
│      Kubernetes
│      Slack
│      ...
│
├── Methodology Adapter
│      TDD              (EXP-ADP-003)
│      BDD              (EXP-ADP-004)
│      DDD
│      Security
│      Performance
│      ...
│
└── Runtime Adapter
       LLM
       Filesystem
       Database
       HTTP
       ...
```

| Kind | External System | Example | Purpose |
|------|-----------------|---------|---------|
| Integration Adapter | Yes | Repository, GitHub | Connect Synth to external platforms |
| Methodology Adapter | No | TDD, BDD | Inject engineering discipline into the workflow |
| Runtime Adapter | Maybe | LLM, Filesystem, Database | Provide runtime capabilities without kernel coupling |

All adapters share the same EXP-ADP-000 lifecycle and constitutional invariants. The taxonomy only describes what the adapter does, never how it is governed.

---

## Mission Studio Adapter Ecosystem

Mission Studio consumes evidence exclusively through adapters. The ecosystem is organized into three layers:

```text
Evidence Adapters       Intelligence Adapters      Planning Adapters
(read)                  (infer)                    (propose)

Repository    ─┐
Document       ├─→  Observation Bus  ─→  Knowledge     ─→  Mission
Conversation   │                        Extraction          Builder
Filesystem    ─┘                        Confidence      ─→  Expedition
Specification   ─→                     Adapter              Builder
GitHub          ─→                     Dependency      ─→  Objective
Secrets         ─→                     Adapter              Builder
Runtime         ─→                     Architecture    ─→  Wizard
                                                                  Adapter
```

### Layer 1 — Evidence Adapters

Evidence adapters read external material and emit Observations. They do not infer.

| Expedition | Adapter | Reads |
|------------|---------|-------|
| EXP-ADP-005 | Conversation | Natural-language operator input |
| EXP-ADP-006 | Document | Markdown, PDF, DOCX, TXT, ADRs |
| EXP-ADP-007 | Repository | Git repositories (languages, deps, structure) |
| EXP-ADP-008 | Filesystem | Local folders, schemas, assets |
| EXP-ADP-009 | Specification | OpenAPI, GraphQL, Proto, AsyncAPI, JSON Schema |

### Layer 2 — Intelligence Adapters

Intelligence adapters enrich Observations into Knowledge. They do not read files directly.

| Expedition | Adapter | Produces |
|------------|---------|----------|
| EXP-ADP-010 | Knowledge Extraction | Missions, capabilities, components |
| EXP-ADP-011 | Confidence | Confidence scores, missing evidence, conflicts |
| EXP-ADP-012 | Dependency | Dependency, component, and capability graphs |
| EXP-ADP-013 | Architecture | Architectural style inference |

### Layer 3 — Planning Adapters

Planning adapters build the final planning artifacts consumed by Mission Studio.

| Expedition | Adapter | Produces |
|------------|---------|----------|
| EXP-ADP-014 | Mission Builder | Mission |
| EXP-ADP-015 | Expedition Builder | Expeditions |
| EXP-ADP-016 | Objective Builder | Objectives |
| EXP-ADP-017 | Wizard Adapter | Interactive approve/reject/merge/split/refine |

All three layers share the same Observation contract defined in EXP-ADP-OBS-001.

### Infrastructure Adapters

These adapters do not feed Mission Studio directly, but may produce observations about their domains:

```text
Secrets, Docker, Kubernetes, Slack, Azure, AWS, GCP, LLM, Database, Email
```

Mission Studio does not know them. It only consumes their Observations.

---

## Reference Implementations

| Expedition | Adapter | Kind | Status |
|------------|---------|------|--------|
| EXP-ADP-001 | Repository | Integration | Complete |
| EXP-ADP-002 | GitHub | Integration | Complete |
| EXP-ADP-003 | TDD | Methodology | Complete |
| EXP-ADP-004 | BDD | Methodology | Complete |
| EXP-ADP-OBS-001 | Observation | Constitutional | Complete |
| EXP-ADP-005 | Conversation | Evidence | Complete |
| EXP-ADP-006 | Document | Evidence | Complete |
| EXP-ADP-007 | Repository Observation | Evidence | Complete |
| EXP-ADP-008 | Filesystem | Evidence | Complete |
| EXP-ADP-009 | Specification | Evidence | Complete |
| EXP-ADP-010 | Knowledge Extraction | Intelligence | Complete |
| EXP-ADP-011 | Confidence | Intelligence | Complete |
| EXP-ADP-012 | Dependency | Intelligence | Complete |
| EXP-ADP-013 | Architecture | Intelligence | Complete |
| EXP-ADP-014 | Mission Builder | Planning | Complete |
| EXP-ADP-015 | Expedition Builder | Planning | Complete |
| EXP-ADP-016 | Objective Builder | Planning | Complete |
| EXP-ADP-017 | Wizard Adapter | Planning | Complete |

Future adapters implement the same EXP-ADP-000 contract and, when feeding Mission Studio, emit Observations per EXP-ADP-OBS-001.

---

## Governance Across Layers

| Layer | Governed By |
|-------|-------------|
| Constitution | ADR process |
| Kernel | `npm run govern`, proof generation, pre-commit hooks |
| Adapters | EXP-ADP-000 compliance, adapter tests, health checks |

A change that affects multiple layers requires evidence for every affected layer.
