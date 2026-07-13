# Planning Layer

**Part of:** SKR-001
**Status:** Active Architecture
**Date:** 2026-06-28

---

## Purpose

The Planning Layer defines how the system reasons about engineering work. It operates exclusively on canonical engineering concepts from the Knowledge Layer.

## Pipeline

```
Intent
  ↓
Understanding          (parse and classify the intent)
  ↓
Planning               (resolve uncertainty, generate questions)
  ↓
Decision               (choose approach with documented reasoning)
  ↓
ExecutionPlan          (sequence of canonical operations)
```

## Planning Artifacts

| Artifact | Description | Canonical? |
|----------|-------------|------------|
| Intent | What the engineer wants | Yes |
| Understanding | Parsed intent with classification | Yes |
| Plan | Resolved uncertainty, known objectives | Yes |
| Decision | Chosen direction with alternatives | Yes |
| ExecutionPlan | Sequence of canonical operations | Yes |

## Key Rule

Execution instructions SHALL NOT appear in planning artifacts. An `ExecutionPlan` in the Planning Layer is a sequence of canonical operations:

```yaml
# Planning Layer ExecutionPlan
steps:
  - operation: CreateWorkItem
    params: { title: "Implement feature" }
  - operation: CreateExpedition
    params: { goal: "Deliver feature" }
```

NOT capability invocations:

```yaml
# WRONG — this is Execution IR
steps:
  - capability: CreateWorkItem
    handler: createWorkItemHandler
    runtime: nodejs
```

## Invariants

- **KI-004:** Planning SHALL operate exclusively on canonical engineering concepts
- **KI-002:** Execution vocabulary MUST remain below planning

## Mission Studio

The Planning Layer is realized constitutionally by Mission Studio (`EXP-MST-001`).

Mission Studio consumes only canonical `Observation[]` through the Mission Intake Pipeline, produces the immutable graph-based World Model, and hands an immutable `ApprovedMissionModelSnapshot` to Genesis for execution. It never mutates runtime state.

Key concepts:

- **Observation** — canonical planning input, adapter-agnostic.
- **Evidence** — immutable first-class artifact referenced by every Observation.
- **World Model** — immutable graph of nodes (missions, expeditions, objectives, components, capabilities, actors, constraints, risks, assumptions, unknowns) and edges.
- **Planning Session** — reproducible container for a planning episode.
- **PlanningHistory** — sequential record of World Model derivations.
- **ApprovedMissionModelSnapshot** — sealed, signed, versioned, deterministic artifact accepted by Genesis.

See [EXP-MST-001](../expeditions/EXP-MST-001.md) for the full constitutional specification and invariants MS-001 through MS-013.

## Related Documents

- [SKR-001.md](SKR-001.md) — Full SKR specification
- [INTENT-001.md](../INTENT-001.md) — Execution is implementation of intent
- [EXP-MST-001.md](../expeditions/EXP-MST-001.md) — Mission Studio constitutional specification

---

*Part of SKR-001 — Synth Knowledge Representation*
