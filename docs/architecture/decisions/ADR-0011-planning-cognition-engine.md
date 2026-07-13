# ADR-0011: Planning Cognition Engine (PCE)

## Status

Accepted (revised)

## Context

Planning Architecture v2 (Expedition Engine) successfully replaced the linear ticket model with an event-driven planning graph. However, v2 retains a CRUD-style operational pattern — capabilities like `CreateMission` and `AddObjective` imply manual construction of plans, which contradicts the observed reality of software development: plans emerge, discoveries happen, objectives evolve.

This decision has been refined through architecture review to establish two parallel trust models and a principle-driven planning layer.

## Decision

The planning architecture shall evolve into a two-layer system with parallel permit-based trust:

### Layer 1: Expedition Domain (v3) — The Canonical Ledger

A pure ledger that records stable engineering knowledge and immutable planning events. It performs no reasoning. It accepts outputs from the cognition layer and persists them deterministically.

The ledger does not know what the PCE is. It does not know about AI. It does not know about planners. It only knows that it received a valid **Planning Permit**.

### Layer 2: Planning Cognition Engine (PCE) — The Reasoning Layer

An orchestration layer above the ledger that owns:
- Intent classification
- Question generation (identifying uncertainty)
- Knowledge resolution (reducing uncertainty)
- Objective synthesis
- Discovery evaluation
- Side-quest recognition
- Decision evaluation
- Planning confidence estimation

The PCE is ephemeral and adaptive. Its reasoning is not canonical. Only its outputs survive to the ledger.

### Parallel Trust Model

The system shall have two structurally identical trust chains:

```
Execution:  ExecutionGate → ExecutionPermit → ExecutionCoordinator → Runtime
Planning:   PlanningEngine → PlanningPermit → PlanningCoordinator → Ledger
```

The Ledger never trusts the PCE. It trusts the Planning Permit. The Permit is a cryptographically signed authorization token produced by the Planning Engine and verified by the Planning Coordinator before the Ledger accepts any write.

### Foundational Invariant

> **No engineering knowledge becomes canonical until uncertainty has been resolved.**

The Ledger never records guesses. It records resolved understanding. This invariant explains why the PCE exists: to resolve uncertainty before anything enters canonical history.

## PCE Internal Pipeline

```
Intent
  |
  ▼
Intent Analyzer
  |
  ▼
Question Generator           ← identifies what is unknown
  |
  ▼
Knowledge Resolver           ← answers questions using documents, repository, context
  |
  ▼
Objective Synthesizer        ← produces stable outcomes from resolved understanding
  |
  ▼
Discovery Evaluator          ← evaluates discoveries for impact and action
  |
  ▼
Decision Evaluator           ← evaluates whether decisions warrant ADR candidacy
  |
  ▼
Planning Permit Generator    ← signs a Planning Permit for the resolved knowledge
  |
  ▼
Planning Coordinator         ← validates the Planning Permit
  |
  ▼
Expedition Ledger            ← records the knowledge if the Permit is valid
```

## Event Naming: Engineering Evolution

Planning events shall describe engineering evolution, not object mutations:

| Object-Mutation Style (Deprecated) | Engineering-Evolution Style (v3) |
|-----------------------------------|----------------------------------|
| `MISSION_CREATED` | `MISSION_CHARTED` |
| `MISSION_APPROVED` | `MISSION_COMMISSIONED` |
| `EXPEDITION_CREATED` | `EXPEDITION_CHARTED` |
| `OBJECTIVE_ADDED` | `PLAN_EXPANDED` |
| `OBJECTIVE_COMPLETED` | `OBJECTIVE_FULFILLED` |
| `DISCOVERY_RECORDED` | `KNOWLEDGE_ACQUIRED` |
| `DECISION_ACCEPTED` | `DIRECTION_SET` |
| `DECISION_REJECTED` | `DIRECTION_DECLINED` |
| `WORK_ITEM_GENERATED` | (non-canonical, not in ledger) |

## Alternatives

**Alternative A: PCE authenticates itself to the Ledger**

The PCE holds an authentication token and presents it to the Ledger for each write. Rejected: this creates a trust relationship based on component identity rather than permit verification. It violates the principle that the Ledger should not know what the PCE is. It also creates a single point of failure: compromise the PCE, compromise the token.

**Alternative B: Extend Expedition Engine with reasoning logic**

Add AI-driven reasoning directly into Expedition Domain capabilities. Rejected: couples ephemeral reasoning to canonical state. Violates Principle 2 (Knowledge is canonical; reasoning is ephemeral).

**Alternative C: Replace Expedition Engine entirely**

Remove v2 and build PCE as the sole planning system. Rejected: wastes a proven deterministic event-sourced foundation. The ledger's architecture is correct; it just needs the right interface.

## Consequences

**Positive:**
- Two parallel trust models provide structural symmetry between execution and planning
- The Ledger is decoupled from PCE implementation — any compliant planner can produce Planning Permits
- Planning events describe engineering evolution, making replay a narrative of understanding
- Question Generation makes the planner behave like a senior engineer (asks first, decomposes second)
- The foundational invariant ("No knowledge canonical until uncertainty resolved") explains the entire architecture

**Negative:**
- Two-layer architecture adds conceptual complexity
- Planning Permit infrastructure mirrors Execution Permit infrastructure (duplication of pattern)
- Event renaming requires migration path
- Question Generation adds latency to planning (acceptable: planning is not latency-sensitive)

**Invariants established:**
- **P-1:** No engineering knowledge becomes canonical until uncertainty has been resolved.
- **P-2:** The Ledger only trusts Planning Permits, not Planning Engines.
- **P-3:** Reasoning is ephemeral; knowledge is canonical.

## Constitutional Impact

**Article II (Determinism):** The Expedition Ledger remains deterministic. PCE reasoning is explicitly non-canonical. Consistent with Constitution.

**Article VII (Structural Enforcement):** The Planning Permit is the structural enforcement mechanism. It is not a convention. It is a cryptographically signed token. Consistent with Constitution.

**New document:** [Engineering Cognition Principles](../../engineering-cognition-principles.md) extends the Constitution into the planning domain. It is subordinate to the Constitution and must be interpreted consistently with it.

## Migration Path

Phase 1: Implement Planning Permit infrastructure (parallel to Execution Permit)
Phase 2: Refactor Expedition Domain to pure ledger (strip CRUD, rename events)
Phase 3: Build PCE with Question Generator, Permit Generator, and all subsystems
Phase 4: Connect PCE to Ledger via Planning Coordinator
Phase 5: Validate all planning replay remains consistent

## Related Decisions

- [ADR-0007: Invocation Permit](ADR-0007-invocation-permit.md) — Execution Permit pattern that Planning Permit mirrors
- [ADR-0009: Runtime Sealing](ADR-0009-runtime-sealing.md) — PCE configuration sealed alongside existing configuration
- [Engineering Cognition Principles](../../engineering-cognition-principles.md) — Philosophical foundation for PCE
