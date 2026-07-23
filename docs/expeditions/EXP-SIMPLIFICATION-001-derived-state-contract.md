# EXP-SIMPLIFICATION-001 — Derived State Contract

> Specifies how every non-canonical field is computed from the event log.

**Status:** Draft  
**Expedition:** `EXP-SIMPLIFICATION-001`  
**Date:** 2026-07-21  
**Authority:** `EXP-SIMPLIFICATION-ASSESSMENT-001-report.md`

---

## Principle

`CanonicalState` contains only irreducible domain truth. Every field that can be recomputed from events without loss of information is a **derived state**.

Derived state:

- Is never persisted as primary data.
- Is computed on demand from `SynthEvent[]` or from `CanonicalState` plus events.
- May be cached with a provenance stamp (`sourceStateHash`, `computedAt`).
- Does not affect replay semantics or state hash.

---

## Canonical state fields (irreducible truth)

These fields remain in `CanonicalState`:

| Field | Source events | Why irreducible |
|---|---|---|
| `lifecycle` | `PROJECT_INITIALIZED`, `MISSION_MATERIALIZED`, `SYSTEM_GENESIS` | Global project state flag. |
| `workItems` | `WORK_ITEM_*`, `TICKET_*` | Canonical execution entity. |
| `plans` | `PLAN_*` | Public vocabulary; source of truth. |
| `milestones` | `MILESTONE_*` | Grouping construct. |
| `projects` | `PROJECT_*` | Top-level container. |
| `missions` | `MISSION_*` | Public vocabulary; source of truth. |
| `expeditions` | `EXPEDITION_*` | Public vocabulary; source of truth. |
| `objectives` | `OBJECTIVE_ADDED` | Expedition outcomes. |
| `discoveries` | `DISCOVERY_RECORDED` | Learned knowledge. |
| `decisions` | `DECISION_ACCEPTED`, `DECISION_REJECTED` | Chosen directions. |
| `referenceEvidence` | `REFERENCE_EVIDENCE_*` | Bound artifacts. |
| `repository` | `REPOSITORY_*`, `BRANCH_*`, `PULL_REQUEST_*`, `PROMOTION_*`, `RELEASE_CREATED` | External forge state. |

---

## Derived state fields

### 1. Review / Acceptance / Gate state

**Moved field:** `reviewGateExpeditions`

**Derived from:**

- `REVIEW_GATE_OPENED`
- `REVIEW_GATE_RESOLVED`
- `REVISION_REQUESTED`
- `ACCEPTANCE_GATE_OPENED`
- `ACCEPTANCE_GATE_RESOLVED`
- `EXPEDITION_CLOSED`
- `REFINED_INTENT_APPROVED`

**Builder:** `buildReviewGateState(events)`

**Output:** `Record<string, ReviewGateExpeditionState>`

**Rationale:** Gate status is workflow coordination. It can be reconstructed from gate events.

---

### 2. Genesis / Alignment state

**Moved fields:** `intentModels`, `refinementSessions`, `refinementReports`, `alignmentContracts`, `divergenceGates`

**Derived from:**

- `INTENT_MODEL_CREATED` / `REVISED` / `SUBMITTED` / `SUPERSEDED`
- `REFINEMENT_SESSION_STARTED`
- `REFINEMENT_QUESTION_ANSWERED`
- `REFINEMENT_REPORT_CREATED` / `APPROVED` / `REJECTED`
- `ALIGNMENT_CONTRACT_CREATED` / `SUBMITTED` / `APPROVED` / `REJECTED` / `SUPERSEDED`
- `REFERENCE_EVIDENCE_CREATED` / `BOUND`
- `DIVERGENCE_GATE_OPENED` / `RESOLVED`

**Builder:** `buildGenesisState(events)`

**Output:**

```ts
{
  intentModels: Record<string, IntentModelState>
  refinementSessions: Record<string, RefinementSessionState>
  refinementReports: Record<string, RefinementReportState>
  alignmentContracts: Record<string, AlignmentContractState>
  divergenceGates: Record<string, DivergenceGateState>
}
```

**Rationale:** Genesis produces structured interpretations and agreements before Mission creation. The interpretations are valuable but derivable from the Genesis events.

---

### 3. Execution intent state

**Moved fields:** `executionIntents`, `executionGraphs`

**Derived from:**

- `EXECUTION_INTENT_CREATED`
- `EXECUTION_INTENT_GRAPH_CREATED`
- `EXPEDITION_BRANCH_CREATED`
- `EXECUTION_INTENT_STARTED` / `COMPLETED` / `FAILED` / `ROLLEDBACK`
- `EXPEDITION_EXECUTION_COMMITTED` / `PROJECTED`

**Builder:** `buildExecutionState(events)`

**Output:**

```ts
{
  executionIntents: Record<string, ExecutionIntentState>
  executionGraphs: Record<string, ExecutionGraphState>
}
```

**Rationale:** Execution intents and graphs are planning outputs for how an expedition will execute. They are derivable from the execution event history.

---

### 4. Planning generated work items

**Moved field:** `generatedWorkItems`

**Derived from:** `WORK_ITEM_GENERATED`

**Builder:** `buildGeneratedWorkItems(events)`

**Output:** `Record<string, GeneratedWorkItem>`

**Rationale:** Generated work items are a planning projection of objectives into executable units.

---

### 5. Execution audit

**Moved field:** `executions`

**Derived from:** `TRANSACTION_STARTED`

**Builder:** `buildExecutionAudit(events)`

**Output:** `Record<string, Execution>`

**Rationale:** Transaction records are audit trail, not domain truth.

---

### 6. Replay cache fields

**Moved fields:** `version`, `stateHash`, `lastEventOffset`

**Derived from:** event log

**Builder:** internal replay helpers

**Rationale:** These are computed values used for identity and provenance. They are not domain truth.

---

## API Contract

### Builder signature

```ts
type DerivedStateBuilder<T> = (events: SynthEvent[]) => T
```

Builders are pure functions. They accept the full event log and return the derived view.

### Caching

Derived state may be cached as a `Projection<T>`:

```ts
{
  version: number
  data: T
  sourceStateHash: string
  computedAt: number
}
```

A cached projection is invalidated when `sourceStateHash` no longer matches the current canonical state hash.

### Integration with `CanonicalState`

After simplification:

```ts
const canonical = rebuildState(events)
const derived = buildDerivedState(events)
```

Consumers that need a derived view receive it separately from `CanonicalState`.

---

## Backward Compatibility

- Existing event logs remain valid.
- `applyEvent` no longer writes derived fields.
- Tests that asserted derived fields directly must call builder functions.
- `computeStateHash` excludes derived fields, so state hashes will change. This is expected and will be captured in migration evidence.

---

## Migration evidence required

For every moved field:

1. Before-state: field present in `CanonicalState`.
2. After-state: field absent from `CanonicalState`; builder produces equivalent data.
3. Test: existing event log produces same derived data through builder as old canonical state did.

---

## Related

- `docs/expeditions/EXP-SIMPLIFICATION-001.md`
- `docs/expeditions/EXP-SIMPLIFICATION-ASSESSMENT-001-report.md`
- `src/types/state.ts`
- `src/runtime/replay.ts`
