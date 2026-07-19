# EXP-PROGRAM-016 — Governed Expedition Execution

**Status:** Completed and accepted  
**Accepted:** 2026-07-18
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Close the loop between approved Expeditions and actual repository changes  
**Era:** II — Adoption  
**Architecture Impact:** Medium  
**Constitutional Impact:** Low  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** High  
**Depends On:** EXP-PROGRAM-015 (Repository Versioning Capability)  
**Blocks:** None  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (agent-created files and runtime patches outside SYNTH governance boundary; no governed path from approved Expedition to repository mutation)

---

## Thesis

> Approved Expeditions should produce material changes through SYNTH's governance boundary, not around it.

SYNTH can plan, approve, record, and replay work. The Repository Versioning Capability (EXP-PROGRAM-015) gives SYNTH the means to read and write repository history. What remains is the bridge between an approved Expedition's Objectives and Work Items and the actual repository mutations that realize them. This program builds that bridge.

---

## Problem Statement

The TaskPRO experiment exposed the execution gap directly:

- Approved Expeditions produced no governed repository artifacts.
- The agent created, edited, and committed files outside SYNTH's event log.
- Runtime patches and workarounds were applied without Expedition authorization.
- There was no deterministic path from "Expedition accepted" to "branch created, files changed, commit recorded, pull request opened."
- Version control existed as a capability, but no Expedition could invoke it.

Without governed execution, SYNTH remains a planning and recording system that watches implementation happen elsewhere. This program makes execution a first-class governed concern.

---

## Guiding Principles

EXP-PROGRAM-016 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- route every material change through the ExecutionGate
- require an approved Expedition before any repository mutation
- capture every mutation as an immutable Event
- use the VersioningCapability for all repository history operations
- keep human approval at pull-request boundaries

EXP-PROGRAM-016 shall not:

- redesign Mission Studio, Genesis, Replay, or the Event Model
- introduce new public concepts
- allow unapproved work items to mutate repository state
- bypass the ExecutionGate for any repository mutation
- conflate planning identity with runtime identity

---

## Constitutional Invariant

> **Execution is governance.** A repository mutation is legitimate only when it is authorized by an approved Expedition, routed through the ExecutionGate, and recorded as an Event.

---

## Program Composition

```text
EXP-PROGRAM-016
Governed Expedition Execution
│
├── EXP-EXEC-001  Execution Intent Model
│       Architecture Expedition
│       Define how an approved Expedition's Objectives and Work Items
│       are translated into executable, ordered mutation intents.
│
├── EXP-EXEC-002  Work Item Runtime
│       Implementation Expedition
│       Implement a runtime that executes Work Items through the
│       ExecutionGate, emitting events for each mutation.
│
├── EXP-EXEC-003  Branch-per-Expedition Workflow
│       Implementation Expedition
│       Use VersioningCapability to create an isolated branch for each
│       approved Expedition and switch to it before execution.
│
├── EXP-EXEC-004  Commit-as-Evidence
│       Implementation Expedition
│       Map completed Work Items to VersioningCapability revisions,
│       ensuring every commit is replayable from events.
│
└── EXP-EXEC-005  Pull Request Projection
        Implementation Expedition
        Surface completed Expedition output as a pull request or
        equivalent review boundary, keeping human approval outside the
        automated execution path.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model (the model itself; new providers may be registered)
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Decision Record and explicit constitutional approval.

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. No repository mutation occurs without an approved Expedition.
4. Every mutation flows through the ExecutionGate as a registered capability invocation.
5. Every mutation is recorded as an immutable Event.
6. Repository history operations use only the VersioningCapability contract.
7. Human review remains a first-class boundary at pull-request or equivalent surfaces.

---

## Success Criteria

- An approved Expedition can be executed to produce repository changes.
- Each executed Work Item emits a corresponding Event.
- Expedition execution creates an isolated branch using the VersioningCapability.
- Completed Work Items are captured as VersioningCapability revisions.
- Expedition output can be surfaced as a pull request for human review.
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [x] EXP-EXEC-001 completed and accepted.
- [x] EXP-EXEC-002 completed and accepted.
- [x] EXP-EXEC-003 completed and accepted.
- [x] EXP-EXEC-004 completed and accepted.
- [x] EXP-EXEC-005 completed and accepted.
- [x] Program accepted.

---

## Completion Notes

All five expeditions completed and merged via PRs #124–#128. Governed Expedition Execution is now a first-class capability:

- **EXP-EXEC-001** established the `ExecutionIntent` and `ExecutionIntentGraph` model, event types, and replay projections.
- **EXP-EXEC-002** delivered the Work Item Runtime (`src/execution/runtime.ts`) that dispatches intents to injected capability handlers and emits lifecycle events.
- **EXP-EXEC-003** added deterministic `exp/<expedition-id>` branch creation through `VersioningCapability`, recording the base commit in replay.
- **EXP-EXEC-004** added per-expedition revision creation, recording the resulting commit hash in `EXPEDITION_EXECUTION_COMMITTED`.
- **EXP-EXEC-005** added pull-request projection through `ForgeCapability`, recording the PR locator in `EXPEDITION_EXECUTION_PROJECTED`.

The program preserves the Constitutional Freeze: no changes were made to Mission Studio, Genesis, Replay, ExecutionGate, the Event Model envelope, the Capability Model itself, the Constitutional Baseline, or the public vocabulary.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-PROGRAM-015.md` | Provides the VersioningCapability used by execution workflows. |
| `docs/architecture/execution-gate.md` | Defines the ExecutionGate mutation authority. |
| `docs/architecture/constitutional-layer-boundaries.md` | Positions execution as an Implementation-layer concern. |
| `docs/expeditions/EXP-PROGRAM-010-evidence-annex-taskpro.md` | Field evidence that ungoverned execution breaks replay integrity. |
