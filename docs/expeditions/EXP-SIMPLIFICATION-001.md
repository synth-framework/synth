# EXP-SIMPLIFICATION-001 — Canonical State Simplification & Authority Restoration

> Restore SYNTH's authority model by reducing runtime state to irreducible truth and making workflow, governance, and projection concerns derived artifacts.

**Status:** Approved  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Authority:** `EXP-SIMPLIFICATION-ASSESSMENT-001`, Constitutional Baseline, ADR-004, ADR-045  
**Touches Protected Assets:** Yes — `CanonicalState`, `SynthEvent` replay semantics, `ExecutionGate` authority model  
**Depends On:** `EXP-SIMPLIFICATION-ASSESSMENT-001`  
**Blocks:** `EXP-GOVERNANCE-ENFORCEMENT-001`, implementation of `ADR-046`

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires expedition approval; no new public vocabulary
  Requires ADR: No
```

---

## Goal

Transform SYNTH's storage model so that `CanonicalState` contains only irreducible domain truth. All workflow state, governance coordination state, execution coordination state, and cached projections become derived artifacts.

Current:

```text
Events
  ↓
CanonicalState
  ↓
Workflow engines
  ↓
Governance layers
  ↓
Projections
```

Target:

```text
Facts
  ↓
Event Store
  ↓
Canonical State
  ↓
Derived Projections
  ↓
Operator Views
```

The system must stop storing processes and start deriving them from facts.

---

## Purpose

`EXP-SIMPLIFICATION-ASSESSMENT-001` showed that `CanonicalState` has accumulated projection, workflow, execution, and cache fields. This creates two problems:

1. Governance enforcement would protect accidental representations of truth, not canonical truth itself.
2. The conceptual model has matured faster than the storage model, producing semantic debt.

This expedition restores architectural alignment. It is not cleanup. It is a correction to the authority boundary.

---

## Core Hypothesis

The comment at the top of `src/types/state.ts` is correct:

> State is a derived, materialized projection of the Event Store. It is NOT primary data.

But the current runtime violates this. Fields like `reviewGateExpeditions`, `intentModels`, `refinementSessions`, `executionIntents`, and `executionGraphs` are workflow or projection state stored as if they were primary data.

Reducing `CanonicalState` to irreducible truth will:

- Make authority enforcement precise.
- Reduce the number of mutation surfaces.
- Clarify what `ExecutionGate` is protecting.
- Make replay and projections simpler.

---

## Objectives

### Objective 1 — Restore canonical state boundaries

Reduce `CanonicalState` from a mix of truth, workflow, execution, projection, and cache into irreducible domain truth only.

**Retain in `CanonicalState`:**

| Field | Why retained |
|---|---|
| `lifecycle` | Global project lifecycle flag. |
| `workItems` | Canonical execution entity. |
| `plans` | Public vocabulary term; source of truth. |
| `milestones` | Grouping construct; source of truth. |
| `projects` | Top-level container; source of truth. |
| `missions` | Public vocabulary term; source of truth. |
| `expeditions` | Public vocabulary term; source of truth. |
| `objectives` | Expedition outcomes; source of truth. |
| `discoveries` | Learned knowledge; source of truth. |
| `decisions` | Chosen directions; source of truth. |
| `referenceEvidence` | Bound artifacts; source of truth. |
| `repository` | External forge state; source of truth. |

**Move out of `CanonicalState`:**

| Field | New classification |
|---|---|
| `reviewGateExpeditions` | Derived projection |
| `intentModels` | Derived projection |
| `refinementSessions` | Derived projection |
| `refinementReports` | Derived projection |
| `alignmentContracts` | Derived projection |
| `divergenceGates` | Derived projection |
| `generatedWorkItems` | Derived projection |
| `executions` | Derived projection / audit |
| `executionIntents` | Derived projection |
| `executionGraphs` | Derived projection |
| `version` | Replay cache |
| `stateHash` | Replay cache |
| `lastEventOffset` | Replay cache |

These fields are **not deleted**. They are reclassified as derived state, computed on demand from the event log.

### Objective 2 — Separate facts from orchestration

Distinguish events that record facts from events that encode workflow transitions.

**Facts** (remain events):

```text
MISSION_CREATED
EXPEDITION_CREATED
DECISION_ACCEPTED
EVIDENCE_CAPTURED
WORK_ITEM_CREATED
OBJECTIVE_ADDED
DISCOVERY_RECORDED
```

**Workflow transitions** (become derivable):

```text
REVIEW_GATE_OPENED / RESOLVED
ACCEPTANCE_GATE_OPENED / RESOLVED
EXECUTION_INTENT_CREATED / STARTED / COMPLETED
EXPEDITION_STARTED / COMPLETED
```

Target: a projection like `ExpeditionLifecycleView` can derive states such as `awaiting_review`, `approved`, `executing`, `completed` from a smaller set of facts.

The event question becomes:

> Did something happen in reality?

Not:

> What is the workflow engine currently doing?

### Objective 3 — Genesis reconciliation

The Genesis/Alignment concepts (`intentModels`, `refinementSessions`, `refinementReports`, `alignmentContracts`, `divergenceGates`) are intentional capabilities whose ADRs lagged behind implementation. This is **Case B** (documentation lag), not Case A (accidental implementation).

Correct action:

```text
ADR-048
      +
ADR-045
      ↓
Genesis canonicalization as derived state
```

Do not remove Genesis capabilities. Reclassify their state as derived projections under a clear Genesis lifecycle layer.

### Objective 4 — Repair ADR governance

Produce:

- ADR Registry Audit
- ADR Number Collision Resolution
- ADR README Refresh
- ADR Status Normalization

Specifically:

- Resolve duplicate `ADR-036` files by renumbering the Proposed intent-refinement ADR to `ADR-047`.
- Resolve duplicate `ADR-037` files by renumbering the Proposed genesis-lifecycle ADR to `ADR-048`.
- Update `docs/adr/README.md` through `ADR-048`.
- Ratify Genesis decisions by accepting `ADR-047` and `ADR-048`.

### Objective 5 — Create authority resolver design

Do not implement enforcement. Produce only:

```text
docs/expeditions/EXP-SIMPLIFICATION-001-authority-resolver-design.md
```

The design must answer:

Given:

```text
Event history
+
Canonical state
+
Derived projections
```

how does SYNTH determine:

- What is authoritative?
- What is derived?
- What can mutate?
- Who owns the transition?

This design becomes the foundation for `EXP-GOVERNANCE-ENFORCEMENT-001`.

---

## Constraints

1. **No deletion of Genesis capabilities.** Reclassify state, do not remove behavior.
2. **No removal of runtime behavior without replacement.** Every current consumer of moved state must have a derived-state path.
3. **Preserve replay compatibility.** Existing event logs must replay without semantic change.
4. **Preserve existing expedition history.** No events may be removed or altered.
5. **Produce migration evidence for every state transition.** Every reclassification must be documented with before/after evidence.
6. **No implementation of governance enforcement until simplification certification passes.** `EXP-GOVERNANCE-ENFORCEMENT-001` remains blocked.

---

## Non-deliverables

- No new ADR beyond housekeeping updates.
- No new governance artifacts (Alignment Contract, Divergence Gate, etc.).
- No new lifecycle states.
- No new public vocabulary.
- No implementation of `ExecutionGate` authority-state resolver.
- No CLI surface changes.

---

## Out of Scope

- Product-facing changes (homepage, UI, examples).
- Capability additions.
- Adapter redesign.
- Direct-write path migration (remains with `EXP-MUTATION-LIFECYCLE-001`).

---

## Implementation Order

1. **ADR housekeeping** — resolve numbering collisions, update README, ratify Genesis ADRs.
2. **Define derived-state contract** — specify how each moved field is computed from events.
3. **Implement derived-state builders** — create projection functions for workflow, governance, Genesis, and execution state.
4. **Reduce `CanonicalState`** — remove or deprecate derived fields while preserving event log.
5. **Update replay** — ensure `rebuildState` produces only canonical truth.
6. **Update consumers** — route all code that read derived fields to derived-state builders.
7. **Add regression tests** — prove replay compatibility and projection correctness.
8. **Produce authority resolver design** — document how authority will be evaluated after simplification.
9. **Certify and request acceptance**.

---

## Success Criteria

After this expedition:

- `CanonicalState` contains only irreducible domain truth.
- Workflow state is derived from events, not stored canonically.
- Genesis authority is documented and ratified.
- ADR registry is consistent (no collisions, README current).
- Authority resolver design is approved.
- All existing tests pass.
- Replay produces the same operational semantics as before.
- No public vocabulary changes.
- No new concepts introduced.

---

## Risks

| Risk | Mitigation |
|---|---|
| Derived-state performance cost | Cache projections with provenance stamps; invalidate on event append. |
| Consumers depend on old fields | Update all consumers incrementally; keep compatibility aliases during transition. |
| Replay semantics change | Version the state shape; add migration handlers if necessary. |
| Genesis concepts treated as removable | Charter explicitly preserves Genesis capabilities. |
| Scope creep into governance enforcement | Blocked by charter; authority resolver is design-only. |

---

## Definition of Done

- [x] ADR numbering collisions resolved.
- [x] `docs/adr/README.md` updated through ADR-048.
- [x] Genesis ADRs ratified (ADR-047 and ADR-048 Accepted).
- [x] `CanonicalState` reduced to irreducible truth.
- [x] Derived-state builders implemented for all moved fields.
- [x] Replay tests pass.
- [x] Regression tests added.
- [x] Authority resolver design document produced.
- [ ] Expedition accepted.

---

## Related

- `docs/expeditions/EXP-SIMPLIFICATION-ASSESSMENT-001-report.md`
- `docs/expeditions/EXP-GOVERNANCE-ENFORCEMENT-001.md`
- `docs/adr/ADR-046-implementation-authority-ordering.md`
- `docs/adr/ADR-045-governance-lifecycle-state-machine.md`
- `docs/adr/ADR-047-intent-refinement-and-alignment-governance.md`
- `docs/adr/ADR-048-genesis-lifecycle-and-alignment-contracts.md`
- `docs/architecture/constitutional-layer-boundaries.md`
