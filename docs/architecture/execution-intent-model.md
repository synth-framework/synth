# Execution Intent Model

**Status:** Draft (EXP-EXEC-001)  
**Authority:** Synth Architectural Constitution  
**Scope:** Bridge between approved Expedition planning and governed repository execution  
**Related:** `docs/expeditions/EXP-PROGRAM-016.md`, `src/types/state.ts`, `src/types/event.ts`

---

## Purpose

Define the canonical model that translates an approved Expedition's Objectives and Work Items into an ordered, executable graph of repository mutations.

The Execution Intent Model sits between:

```text
Mission Studio planning
        │
        ▼
ApprovedMissionModelSnapshot
        │
        ▼
Execution Intent Model  ←── this document
        │
        ▼
ExecutionGate → Runtime → VersioningCapability
        │
        ▼
Repository mutations + immutable Events
```

Planning produces **what** and **why**. The Execution Intent Model produces **how**, in a form the Runtime can execute deterministically.

---

## Core Concepts

### `ExecutionIntent`

The smallest unit of governed repository mutation. Every intent is:

- **Authorized**: derived from an approved Expedition's Work Item.
- **Idempotent**: safe to replay; same intent + same state → same result.
- **Observable**: emits one or more Events when executed.
- **Atomic**: either completes and emits Events, or fails and emits a failure Event.

```text
ExecutionIntent
{
  id                  // stable unique identifier
  expeditionId        // authorizing expedition
  objectiveId         // source objective
  workItemId          // source work item
  sequence            // order within the expedition
  capability          // target capability: filesystem, versioning, forge, process, ...
  operation           // capability-specific operation
  target              // repository-relative path, branch, or resource locator
  payload             // operation arguments
  dependencies        // intent IDs that must complete first
  verification        // how to verify the intent succeeded
  rollback            // optional rollback intent if this intent fails
}
```

### `ExecutionIntentGraph`

A directed acyclic graph of intents for a single Expedition.

```text
ExecutionIntentGraph
{
  expeditionId
  branch              // isolated execution branch
  intents[]           // flat list
  edges[]             // dependency edges
  ordered[]           // topologically sorted intent IDs
}
```

Properties:

- **Acyclic**: cycles produce an `INVARIANT_VIOLATION`.
- **Connected**: every intent must be reachable from at least one root intent.
- **Deterministically ordered**: topological sort is stable across replays.

### `ExecutionPhase`

An Expedition's execution progresses through phases:

```text
approved
   │
   ▼
branch-created
   │
   ▼
executing  ──► intents applied in order
   │
   ▼
committed  ──► revision captured
   │
   ▼
projected  ──► pull request / review boundary surfaced
```

Each phase transition is an Event.

---

## Mapping from Planning to Execution

### Source artifacts

| Planning artifact | Execution artifact |
|---|---|
| Mission | Authorization boundary |
| Expedition | ExecutionIntentGraph container |
| Objective | Group of related intents |
| GeneratedWorkItem | One or more ExecutionIntents |

### GeneratedWorkItem → ExecutionIntent

A single Work Item may decompose into multiple intents. For example:

```text
GeneratedWorkItem: "Add versioning capability contract"
  │
  ├── ExecutionIntent: create file src/environment/versioning-capability.ts
  ├── ExecutionIntent: append export to src/environment/index.ts
  └── ExecutionIntent: run typecheck
```

The decomposition is performed by an **Intent Synthesizer**, which is a bounded planning-side function. It does not execute; it only produces intents.

---

## Event Model Additions

The following events are introduced by EXP-EXEC-001. They extend the StateEvent family without modifying existing event semantics.

```text
EXECUTION_INTENT_CREATED
  intentId
  expeditionId
  objectiveId
  workItemId
  capability
  operation

EXECUTION_INTENT_GRAPH_CREATED
  expeditionId
  intentIds[]
  edgeCount

EXPEDITION_BRANCH_CREATED
  expeditionId
  branch
  baseCommit

EXECUTION_INTENT_STARTED
  intentId
  expeditionId

EXECUTION_INTENT_COMPLETED
  intentId
  expeditionId
  resultSummary

EXECUTION_INTENT_FAILED
  intentId
  expeditionId
  reason

EXPEDITION_EXECUTION_COMMITTED
  expeditionId
  commit

EXPEDITION_EXECUTION_PROJECTED
  expeditionId
  projectionType   // "pull_request", "patch", "diff"
  projectionUrl?   // optional external locator
```

All new event types preserve the existing `SynthEvent` envelope (id, type, timestamp, transactionId, capability, actor, payload, eventHash, previousHash).

---

## Ordering and Dependencies

### Default ordering

Intents are ordered by:

1. Objective sequence (as planned).
2. Work Item sequence within each Objective.
3. Dependency edges declared by the Intent Synthesizer.
4. Stable tie-breaker: intent ID lexicographic order.

### Dependency rules

- A filesystem write intent may depend on a directory-create intent.
- A versioning commit intent depends on all prior filesystem write intents in the same Expedition.
- A process execution intent may depend on one or more filesystem write intents.
- Cross-expedition dependencies are not allowed; expeditions are isolated by branch.

---

## Verification

Each intent declares a verification strategy:

```text
Verification
{
  kind: "path_exists" | "path_content" | "command_exit" | "revision_exists" | "none"
  target             // path, command, or revision
  expectation        // expected value, hash, or exit code
}
```

Verification is executed after the intent. Failure emits `EXECUTION_INTENT_FAILED` and halts the Expedition unless a rollback intent is provided.

---

## Rollback

When an intent fails:

1. Emit `EXECUTION_INTENT_FAILED`.
2. If a rollback intent exists, execute it.
3. Emit `EXECUTION_INTENT_ROLLEDBACK`.
4. Halt further intents in the Expedition.
5. Leave the branch in a known, partially-applied state for inspection.

Rollback is optional and capability-specific. Versioning operations can often be undone by reverting to the base commit; filesystem operations may require explicit reverse intents.

---

## Relationship to Protected Assets

The Execution Intent Model does **not** modify:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model envelope
- Capability Model
- Constitutional Baseline
- Public Vocabulary

It adds new event types and state shapes below the constitutional boundary, in the Implementation layer.

---

## Open Questions for Downstream Expeditions

| Question | Owner |
|---|---|
| How does the Intent Synthesizer discover file dependencies? | EXP-EXEC-002 |
| Which capabilities need execution-specific options? | EXP-EXEC-002 |
| How is the Expedition branch named deterministically? | EXP-EXEC-003 |
| Should commits be squashed or per-intent? | EXP-EXEC-004 |
| What is the pull request projection format? | EXP-EXEC-005 |

