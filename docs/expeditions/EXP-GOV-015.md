# EXP-GOV-015 — Gate Decision Completeness

> **Governance expedition.** Implement condition fulfillment tracking for `approve_with_conditions`, fix `superseded` decision mapping, enforce Convergence Certification before close.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 2 — Governance  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GOV-014  
**Blocks:** None  
**Completed:** 2026-07-25

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Findings Addressed

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| M1 | `approve_with_conditions` condition fulfillment not replayed into derived state | Medium | Fixed |
| M2 | Five rich review decisions (split/merge/supersede/escalate) typed but aliased to "rejected" | Medium | Deferred |
| M3 | `npm run govern` described as raw pipeline chain | Medium | Fixed |
| M4 | `superseded` evaluation result mapping | Medium | Deferred |
| M5 | Convergence Certification not enforced as prerequisite to closing | Medium | Fixed |
| L1 | `deriveAlignmentContractFromIntentModel` uses hardcoded scores | Low | Deferred |

---

## Deliverables

1. **Condition fulfillment tracking** — Persist conditions from `approve_with_conditions` decisions into derived state via `CONDITION_FULFILLED` events; block acceptance gate opening until all conditions are fulfilled.
2. **Superseded / rich decision mapping** — Deferred to a future collaborative governance initiative; current aliasing to `"rejected"` is documented.
3. **Convergence Certification enforcement** — `CloseExpedition` now requires a certified convergence record for the expedition in derived state.
4. **`docs/governance.md` pipeline fix** — Documented that `npm run govern` invokes the governance profiler/orchestrator, which runs build, test:all, and proof and emits timing/dependency artifacts.
5. **Alignment contract derivation fix** — Deferred; low-severity and not on the v1.0 critical path.
6. **Tests** — Condition fulfillment lifecycle and convergence-before-close enforcement.

---

## Acceptance Criteria

1. Review decision `approve_with_conditions` creates trackable conditions.
2. Acceptance gate blocks opening if conditions are unfulfilled.
3. `CloseExpedition` fails if Convergence Certification has not passed.
4. `docs/governance.md` accurately describes `npm run govern` as the profiler-driven orchestrator.
5. All existing governance tests pass.

**Deferred criteria:** rich decision mapping (`superseded`, split/merge/escalate) and alignment-contract score defaults are out of scope for v1.0.

---

## Evidence

| Finding | Status | Evidence |
|---------|--------|----------|
| M1 — Condition fulfillment | **Fixed** | `src/governance/review-gate-engine.ts` now emits `expeditionId` on `CONDITION_FULFILLED` events. `src/state/derived/build-derived-state.ts` applies those events to the gate's condition list. `tests/governance-evaluation-enforcement.test.js` proves acceptance is blocked until every condition is fulfilled. |
| M3 — `npm run govern` documentation | **Fixed** | `docs/governance.md` now describes `npm run govern` as invoking the governance profiler/orchestrator that runs build → test:all → proof and emits timing/dependency artifacts. |
| M5 — Convergence before close | **Fixed** | `src/domain/execution.ts` `CloseExpedition` now checks `derivedState.convergenceCertifications` for a certified record matching the expedition. Regression test proves close fails without convergence and succeeds after auto-chain convergence. |
| M2/M4/L1 | **Deferred** | Rich review decisions and alignment-contract score defaults are not required for SYNTH Platform v1.0. |

---

## Out of Scope

- Implementing split/merge/supersede/escalate runtime behavior (deferred — see note below).
- Changes to the Refinement Gate lifecycle.

---

## Note on Rich Review Decisions

The five rich review decisions (split, merge, supersede, escalate_to_mission, escalate_to_program) are defined as valid `ReviewDecisionType` values but currently map to `"rejected"` status. Full implementation of these behaviors would require significant engineering (expedition splitting logic, state migration, parent-child expedition relationships). This expedition documents their current status but does not implement them — that work is deferred until real-world usage demonstrates the need.

---

## Relationship to Other Work

- **EXP-GOV-014** — Depends on corrected gate model and engine integrity fixes.
- **EXP-PROGRAM-035** — Completes remaining decision mapping gaps in this program.
- **EXP-PROGRAM-036** — Fixes alignment contract derivation quality.
