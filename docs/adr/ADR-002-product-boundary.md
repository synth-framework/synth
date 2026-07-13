# ADR-002 — Product Boundary

**Status:** Accepted  
**Date:** 2026-07-12  
**Author:** Synth Architecture  
**Deciders:** Synth v2 Productization Program (EXP-PROGRAM-001)

---

## Context

Synth v2 has been frozen (ADR-001). The public vocabulary has been simplified to seven concepts: Mission, Expedition, Evidence, Plan, Event, State, Replay (EXP-PROD-004). However, the codebase still contains many internal components whose names appear in APIs, code, and generated documentation: Mission Studio, Genesis, ExecutionGate, Capability Registry, SnapshotStore, KnowledgeGraph, etc.

The risk is that these internal names leak back into the public product contract, either through documentation drift, API naming, or operator training. Once an internal name becomes something users depend on, it becomes hard to evolve.

## Decision

The internal architecture is **not** part of the public product contract.

The public contract is exactly these seven concepts:

1. **Mission** — the strategic goal
2. **Expedition** — a bounded investigation or build
3. **Evidence** — what we know and how we know it
4. **Plan** — the approved path forward
5. **Event** — an immutable record that something happened
6. **State** — the current picture, derived from events
7. **Replay** — rebuilding state from events to prove correctness

Internal components may evolve, be renamed, be replaced, or be removed in future versions as long as the public contract is preserved.

Internal components that are **not** public contract include, but are not limited to:

- Mission Studio
- Genesis
- ExecutionGate
- Capability Registry
- Adapter Registry
- SnapshotStore
- KnowledgeGraph
- RuntimeEngine
- EventStore / StateStore / CheckpointStore
- PlanningEngine / PlanningCoordinator

## Consequences

- **Easier:** Internal refactoring does not require a public major version bump.
- **Easier:** Public documentation remains stable even when implementation changes.
- **Harder:** Every public-facing artifact must be reviewed against the seven-concept boundary.
- **Harder:** API names that use internal terms (`handleIntent`, `capability`) are now explicitly flagged for potential aliasing in a future release.

## Proof Impact

- **P1 Structural:** Reinforced — public surface is smaller than internal surface.
- **P2 Behavioral:** Unchanged.
- **P3 Historical:** Unchanged.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Unchanged.

## Kernel Impact

No kernel components are modified by this decision. This ADR establishes a policy boundary around the existing kernel.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md` and referenced from `docs/architecture/constitutional-baseline.md` as a governance policy.

## Related

- `docs/architecture/constitutional-baseline.md`
- `docs/adr/ADR-001-v2-freeze-certification.md`
- `docs/expeditions/EXP-PROD-004.md`
- `docs/expeditions/EXP-PROD-005.md`
- `docs/reference/public-vocabulary.md`
- `docs/operator/synth-v2-freeze-report.md`
