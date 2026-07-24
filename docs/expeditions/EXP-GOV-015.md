# EXP-GOV-015 — Gate Decision Completeness

> **Governance expedition.** Implement condition fulfillment tracking for `approve_with_conditions`, fix `superseded` decision mapping, enforce Convergence Certification before close.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** Medium  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 2 — Governance  
**Authority:** Synth Architectural Constitution  
**Depends On:** EXP-GOV-014  
**Blocks:** None

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

| ID | Finding | Severity |
|----|---------|----------|
| M1 | `approve_with_conditions` has no condition fulfillment tracking | Medium |
| M2 | Five rich review decisions (split/merge/supersede/escalate) typed but aliased to "rejected" | Medium |
| M3 | `npm run govern` is a profiler wrapper, not the documented pipeline chain | Medium |
| M4 | `superseded` evaluation result silently dropped in decision-mapping.ts | Medium |
| M5 | Convergence Certification not enforced as prerequisite to closing | Medium |
| L1 | `deriveAlignmentContractFromIntentModel` uses hardcoded scores | Low |

---

## Deliverables

1. **Condition fulfillment tracking** — New `Condition` type with `id`, `description`, `fulfilled`, `fulfilledBy`, `fulfilledAt` fields. Store conditions from `approve_with_conditions` decisions. Block acceptance gate opening until all conditions are fulfilled.
2. **Superseded decision mapping** — Add `"superseded"` to `mapToReviewDecision` and `mapToAcceptanceDecision` in `decision-mapping.ts`. Map to appropriate status transitions.
3. **Convergence Certification enforcement** — `closeExpedition` requires a successful Convergence Certification result. Add `certifiedAt` or `convergenceReportId` to close payload validation.
4. **`docs/governance.md` pipeline fix** — Document the actual `npm run govern` command (profiler wrapper) and the scripts it invokes. Or replace the profiler wrapper with the documented pipeline chain.
5. **Alignment contract derivation fix** — Replace hardcoded scores in `deriveAlignmentContractFromIntentModel` with null defaults requiring explicit scoring.
6. **Tests** — Condition fulfillment lifecycle, superseded mapping, convergence-before-close enforcement.

---

## Acceptance Criteria

1. Review decision `approve_with_conditions` creates trackable conditions.
2. Acceptance gate blocks opening if conditions are unfulfilled.
3. `superseded` evaluation result maps to a valid gate decision.
4. `closeExpedition` fails if Convergence Certification has not passed.
5. `npm run govern` or `docs/governance.md` accurately describes the actual pipeline.
6. Alignment contracts derived from intent models have null/default scores, not hardcoded values.
7. All existing governance tests pass.

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
