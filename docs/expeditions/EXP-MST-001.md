# EXP-MST-001 — Mission Studio

**Status:** Active
**Kind:** Kernel Capability
**Priority:** High
**Program:** EXP-PROGRAM-001 — SYNTH Productization Program
**Depends On:** EXP-SMA-001, EXP-DET-001, EXP-AUD-002, EXP-GOV-001, EXP-ADP-000
**Blocks:** Sample Projects, Agent UI, Project Templates

---

> **Planning precedes authorization. Authorization precedes execution.**
>
> Mission Studio exists to transform observations into an explainable, reviewable, and reproducible mission model. It is intentionally incapable of mutating runtime state. Crossing from planning into execution requires an explicit constitutional transition through Genesis.

---

## Purpose

Mission Studio is the constitutional planning environment of Synth.

Its responsibility is to transform arbitrary evidence into an approved Mission Model before Genesis creates the canonical project state.

Mission Studio never mutates runtime state.

Mission Studio only observes, analyzes, questions, proposes, and refines.

Genesis remains the only component allowed to commit the approved Mission Model into the Kernel.

---

## Constitutional Position

```text
External Systems
        │
        ▼
 Adapters
        │
        ▼
 Observations
        │
        ▼
 Evidence Collection
        │
        ▼
 Normalization
        │
        ▼
 Knowledge Extraction
        │
        ▼
 World Model
        │
        ▼
 Expedition Wizard
        │
        ▼
 Approved Mission Model Snapshot
        │
        ▼
 Genesis
        │
        ▼
 ExecutionGate
        │
        ▼
 Kernel
```

Mission Studio exists entirely above the execution architecture.

Planning never bypasses governance.

---

## Primary Responsibilities

Mission Studio is responsible for:

* Observation ingestion
* Evidence collection
* Evidence normalization
* Knowledge synthesis
* World Model construction
* Proposal generation
* Clarification questions
* Confidence evaluation
* Wizard interaction
* Mission approval
* Orchestrating adapter observation collection through the Adapter Registry
* Translating adapter `Observation[]` into `PlanningObservation[]` via the Mission Intake mapper

Mission Studio is **not** responsible for:

* Runtime mutation
* Event creation
* Event replay
* Command execution
* Execution authorization
* Persistence
* Repository operations
* Adapter implementation
* Directly invoking external systems

---

## Canonical Observation Layer

Mission Studio consumes only canonical `Observation` objects.

Adapters produce `Observation[]`. Mission Studio never consumes adapter-specific data.

A canonical Observation has:

* `id` — stable identifier
* `sourceAdapter` — which adapter produced it
* `type` — category of knowledge
* `payload` — structured content
* `evidenceReference` — pointer to immutable evidence
* `confidence` — confidence level
* `timestamp` — when it was produced

Mission Intake sits between adapters and Mission Studio:

```text
Adapters
   │
   ▼
Observation[]
   │
   ▼
Mission Intake
   │
   ▼
Normalized Observation[]
   │
   ▼
Mission Studio
```

Mission Intake validates, deduplicates, and canonicalizes observations. Mission Studio only sees normalized observations.

---

## Evidence Collection

Evidence is immutable and first-class.

Pipeline:

```text
Evidence Sources
        │
        ▼
Evidence Collection
        │
        ▼
Normalization
        │
        ▼
Knowledge Extraction
```

Mission Studio orchestrates evidence collection.

Adapters never communicate with each other.

Every Observation references immutable Evidence.

---

## Implementation Bridges

Mission Studio is connected to the Adapter ecosystem and Genesis through three explicit bridges. These bridges keep Mission Studio, adapters, and Genesis mutually agnostic while allowing the full planning-to-execution flow.

### Bridge 1: Adapter Observation Mapper

**Location:** `src/mission-studio/adapter-mapper.ts`

Adapters emit `Observation` objects (`src/types/observation.ts`) with rich evidence arrays and adapter-specific sources. Mission Studio consumes `PlanningObservation` objects (`src/planning/observation.ts`) with a flatter, planning-focused shape.

The mapper converts:

| `Observation` field | `PlanningObservation` field |
|---|---|
| `id` | `id` |
| `source.adapter` | `sourceAdapter` |
| `category` | `type` |
| `subject` + `metadata` | `payload` |
| `evidence[0].fingerprint` (or derived hash) | `evidenceReference` |
| `confidence` | `confidence` |
| `timestamp` | `timestamp` |

Invalid or unsupported observations are filtered out. Duplicates are removed.

### Bridge 2: Adapter Observation Collector

**Location:** `src/mission-studio/adapter-observation-collector.ts`

The collector orchestrates the Adapter Registry to gather observations:

```text
AdapterRegistry
       │
       ▼
create(adapterName)
       │
       ▼
observe() / buildFrom() / extractFrom() / evaluateFrom() / inferFrom()
       │
       ▼
Observation[]
       │
       ▼
Adapter Observation Mapper
       │
       ▼
PlanningObservation[]
```

The collector is read-only: it may call adapter observation methods but never mutates runtime state, the event store, or external systems.

### Bridge 3: Approved Mission Model Snapshot → Genesis

**Location:** `src/genesis/snapshot-bridge.ts`

Once Mission Studio approves a World Model, the snapshot is translated into the seed data Genesis expects:

```text
ApprovedMissionModelSnapshot
       │
       ▼
snapshotToGenesisInput()
       │
       ▼
GenesisInput { projectName, systemId, initialProjects, initialPlans, initialWorkItems, seedEvents }
       │
       ▼
ExecutionGate.executeGenesis(seedEvents)
       │
       ▼
Guarded EventStore
```

The bridge maps:

| Snapshot artifact | Genesis seed |
|---|---|
| Actor / Component nodes | `initialProjects` + `PROJECT_CREATED` events |
| Mission proposals | `MISSION_CREATED` seed events |
| Expedition proposals | `initialPlans` + `PLAN_CREATED` + `EXPEDITION_CREATED` events |
| Objective proposals | `initialWorkItems` + `WORK_ITEM_CREATED` + `OBJECTIVE_ADDED` events |

Genesis remains adapter-agnostic and planning-agnostic: it only sees canonical seed events.

---

## World Model

Mission Studio constructs a canonical World Model.

The World Model contains:

* Missions
* Expeditions
* Objectives
* Components
* Capabilities
* Actors
* Constraints
* Risks
* Assumptions
* Unknowns
* Observations
* Evidence References
* Confidence
* Planning Decisions

Planning Decisions are first-class artifacts with identity, rationale, and evidence references.

The World Model is the authoritative planning representation.

Individual documents are not.

---

## Planning Session

A Planning Session is the reproducible container for planning work.

Minimum fields:

* `id`
* `createdAt`
* `observations`
* `evidence`
* `questions`
* `answers`
* `confidence`
* `worldModel`
* `approvalState`

Planning Sessions are reproducible.

Mission Studio may execute multiple sessions before Genesis.

---

## Confidence

Every inferred element carries a confidence score.

Confidence is layered:

* Overall
* Observation Coverage
* Evidence Quality
* Consistency
* Completeness
* Inference Depth
* Unknown Impact
* Contradiction Count

Example:

```text
Mission Confidence: 82%
  Coverage:       96%
  Evidence:       74%
  Unknowns:       18%
  Contradictions: 3%
```

Low-confidence knowledge must generate clarification questions.

High-confidence knowledge may be accepted automatically.

Confidence must be reproducible for identical observations.

---

## Expedition Wizard

Mission Studio exposes the Expedition Wizard.

The Wizard edits the World Model only. It never edits runtime state.

Wizard capabilities include:

* Merge Objectives
* Split Objectives
* Rename Components
* Accept Observations
* Reject Observations
* Add Constraints
* Remove Assumptions
* Request Additional Evidence
* Generate Clarification Questions
* Prioritize Expeditions

The Wizard is the planning editor.

---

## Approved Mission Model Snapshot

Genesis accepts exactly one input: an immutable Approved Mission Model Snapshot.

The snapshot is:

* Immutable
* Signed
* Versioned
* Deterministic
* Sealed
* Lineaged

The snapshot is translated into Genesis seed data by `snapshotToGenesisInput()` in `src/genesis/snapshot-bridge.ts`. The bridge produces `GenesisInput` and canonical seed events, which are then committed through `ExecutionGate.executeGenesis()`.

Genesis shall never:

* infer
* classify
* analyze evidence
* ask questions
* modify planning decisions

Genesis only translates the approved snapshot into canonical events.

---

## Snapshot Lineage

Snapshots are durable and form a lineage.

```text
PlanningSession
        │
        ▼
ApprovedMissionModelSnapshot v1
        │
        ▼
ApprovedMissionModelSnapshot v2 (parent: v1)
        │
        ▼
ApprovedMissionModelSnapshot v3 (parent: v2)
```

Every snapshot carries lineage metadata:

* `lineageId` — stable identifier for the lineage
* `version` — monotonic version within the lineage
* `parentId` — previous snapshot in the lineage
* `approvedAt` — approval timestamp
* `approvedBy` — approving actor

The snapshot store persists both the snapshot and the `PlanningSession` that produced it. This makes reconstruction faithful: given a snapshot id, Mission Studio can restore the exact session.

Lineage is constructed by `buildSnapshotLineage()` in `src/mission-studio/snapshot-lineage.ts`.

### Snapshot Store

`src/mission-studio/snapshot-store.ts` defines the `SnapshotStore` interface and two implementations:

* `InMemorySnapshotStore` — for tests and ephemeral use
* `FileSystemSnapshotStore` — default durable store at `./data/snapshots`

The store enforces immutability: existing snapshot ids cannot be overwritten.

### Snapshot Diffing

`diffSnapshots()` in `src/mission-studio/snapshot-lineage.ts` produces a canonical diff between two snapshots:

* nodes added / removed / changed
* edges added / removed
* planning decisions added
* confidence change summary

### Reconstruction

`reconstructSessionFromSnapshot()` rebuilds the original `PlanningSession` from the snapshot store.

`getSnapshotLineage()` walks a snapshot's ancestry back to root.


---

## Adapter Responsibilities

No adapter changes are required.

Adapters remain responsible only for:

```text
External System
        │
        ▼
Observation[]
```

Mission Studio owns:

* Evidence collection
* Orchestration
* Normalization
* Planning

Adapters remain platform-specific.

Mission Studio remains platform-independent.

---

## Incremental Planning

Mission Studio supports continuous refinement.

New evidence updates the existing World Model.

Planning sessions are additive.

The World Model evolves.

Genesis commits only approved snapshots.

---

## Genesis Integration

Genesis receives only one input:

Approved Mission Model Snapshot

The integration flow is:

```text
Approved Mission Model Snapshot
        │
        ▼
snapshotToGenesisInput()
snapshotToSeedEvents()
        │
        ▼
GenesisInput + Seed Events
        │
        ▼
ExecutionGate.executeGenesis()
        │
        ▼
Guarded EventStore
        │
        ▼
Kernel
```

Two API paths are available:

1. **Bootstrap path:** A caller supplies `GenesisInput` directly to `GenesisIntake.initialize()` during `bootstrap()`.
2. **Mission Studio path:** An approved snapshot is passed to `SynthAPI.genesisFromSnapshot()`, which translates it and commits the seed events through the ExecutionGate.

Both paths use the same guarded EventStore append path. Genesis performs no planning.

Mission Studio performs no execution.

---

## Architectural Invariants

Mission Studio must satisfy:

* Mission Studio consumes Observations, never raw adapter data.
* Every World Model element references one or more Observations.
* Every Observation references immutable Evidence.
* Planning Sessions are reproducible.
* Genesis accepts only immutable approved snapshots.
* Runtime remains unaware of planning concepts.
* Planning is read-only.
* Evidence is immutable.
* World Model is reproducible.
* Confidence is explainable.
* Every proposal references evidence.
* Every expedition originates from the World Model.
* Genesis is the sole planning-to-runtime bridge.
* Execution remains governed by the Single Mutation Authority.

---

## Constitutional Invariants

```text
MS-001  Mission Studio is read-only.
MS-002  Mission Studio consumes only Observation[].
MS-003  Mission Studio produces no SynthEvents.
MS-004  Mission Studio cannot access ExecutionGate.
MS-005  Mission Studio cannot access EventStore.
MS-006  Mission Studio produces proposals only.
MS-007  Only ApprovedMissionModel may enter Genesis.
MS-008  Every proposal references evidence.
MS-009  World Models are immutable.
MS-010  ApprovedMissionModels are immutable.
MS-011  Wizard actions are deterministic.
MS-012  Identical observations produce identical World Models.
MS-013  Mission Studio is replayable.
```

---

## Dual Pipeline Symmetry

Synth has two clear constitutional pipelines:

```text
External World
        │
        ▼
 Observations
        │
        ▼
 Planning
        │
        ▼
 Approved Mission Model
        │
        ▼
 Events
        │
        ▼
 Execution
        │
        ▼
 State
```

One pipeline understands the world. The other changes it.

---

## Success Criteria

* Adapters emit only canonical Observations.
* Mission Studio is the sole planning orchestrator.
* The World Model is the canonical planning artifact.
* Multiple Planning Sessions can converge to a single approved snapshot.
* Genesis remains a pure planning-to-runtime bridge.
* No platform-specific concepts leak beyond adapters.
* Planning remains completely isolated from execution.
* Identical observations generate identical World Models.
* Every proposal references evidence.
* Wizard actions are reproducible.
* Mission Studio has zero runtime mutation paths.
* Mission Studio can operate without Genesis.
* Genesis can operate only from ApprovedMissionModel.
* Removing every Mission Adapter leaves the kernel unchanged.
* Mission Studio depends only on Observation[].
* Adapter observations can be collected through `SynthAPI.adapterOperation({ operation: "observe" })`.
* Mission Studio sessions can be started from adapter observations via `SynthAPI.missionStudioOperation({ operation: "startSession", params: { adapterNames: [...] } })`.
* An approved snapshot can be committed to Genesis via `SynthAPI.genesisFromSnapshot()`.

---

## Completion Criteria

Mission Studio integration is complete when:

- [x] Mission Studio engine produces PlanningSessions, World Models, and ApprovedMissionModelSnapshots.
- [x] Mission Studio remains read-only and has no runtime mutation paths.
- [x] `src/mission-studio/adapter-mapper.ts` translates `Observation[]` to `PlanningObservation[]`.
- [x] `src/mission-studio/adapter-observation-collector.ts` collects observations from the Adapter Registry.
- [x] `src/genesis/snapshot-bridge.ts` translates `ApprovedMissionModelSnapshot` to `GenesisInput` and seed events.
- [x] `SynthAPI` exposes `adapterOperation`, adapter-aware `missionStudioOperation`, and `genesisFromSnapshot`.
- [x] `bootstrap()` instantiates `AdapterRegistry` and injects it into the API.
- [x] Integration tests exercise the full chain: adapters → mapper → Mission Studio → snapshot → Genesis → EventStore.
- [x] `EXP-MST-001.md` is updated to reflect the implemented bridges.

---

## Future Work (Do Not Implement)

Reserve extension points for:

* Continuous Repository Intelligence
* Multi-Repository Missions
* Organization Knowledge Graphs
* Multi-Agent Planning
* Continuous Mission Evolution

These extend Mission Studio without changing its constitutional responsibilities.
