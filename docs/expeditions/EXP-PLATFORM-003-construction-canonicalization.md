# EXP-PLATFORM-003 — Construction Canonicalization

> Phase III of the SYNTH simplification program: reduce the number of ways complex objects are constructed.

## Authority

- Depends on: `EXP-PLATFORM-001`, `EXP-PLATFORM-002`
- Classification: **Application**
- Kernel: **Protected**. No changes to Event Store, Canonical State, Replay, ExecutionGate, or Runtime.

## Objective

Find and canonicalize construction patterns.

Implementation duplication is easy to see. Construction duplication is harder. If `DiscoverySession` is constructed in twelve places with twelve slightly different initialization protocols, then there are effectively twelve implementations.

The expedition asks:

> **How many ways exist to construct X?**

## Constraints

- No new concepts.
- No new lifecycle states.
- No new events.
- No new public vocabulary.
- No kernel modifications.
- No new abstractions beyond canonical factory functions.
- Stateless functions preferred over classes where possible.

## Mandatory artifact

**Canonical Construction Matrix:** `docs/expeditions/EXP-PLATFORM-003-construction-matrix.md`

| Type | Constructors | Canonical Factory | Consumers | Action |
|---|---|---|---|---|
| `DiscoverySession` | N | TBD | list | KEEP / MERGE / DELETE |
| `MissionContext` | N | TBD | list | KEEP / MERGE / DELETE |
| `ExecutionContext` | N | TBD | list | KEEP / MERGE / DELETE |
| `CapabilityGraph` | N | TBD | list | KEEP / MERGE / DELETE |
| `Workspace` | N | TBD | list | KEEP / MERGE / DELETE |

## Methodology

1. Identify complex domain objects that are constructed in multiple places.
2. Count constructor calls and factory functions for each.
3. Compare constructor arguments and side effects.
4. Determine whether multiple constructors encode the same semantic intent.
5. Create canonical factory functions where duplication exists.
6. Migrate consumers.

## Candidate objects

Initial scan suggests investigating:

```
DiscoverySession
MissionContext
ExecutionContext
ReplayEngine
CapabilityGraph
Workspace
ProjectModel
IntentModel
DomainModel
KnowledgeGraph
PlanningSession
ReviewGateState
```

## Success metrics

| Metric | Before | After target |
|---|---|---|
| Types with multiple constructors | Baseline | ≤20% reduction |
| Canonical factories created | 0 | N |
| Consumers migrated | 0 | All duplicate constructors |
| Kernel files touched | — | 0 |
| Public API changes | — | 0 |
| Test failures | — | 0 |

## Deliverables

1. `docs/expeditions/EXP-PLATFORM-003-construction-matrix.md`
2. Canonical factory functions in `sdk/` or appropriate domain modules
3. Migrated consumers
4. Updated deletion list

## Non-goals

- Do not change object semantics.
- Do not merge constructors that have different authority or lifecycle implications.
- Do not introduce builder classes unless absolutely necessary.

---

## Approval

Approve after EXP-PLATFORM-002 establishes the SDK. Construction canonicalization builds on top of canonical infrastructure; it should not precede it.
