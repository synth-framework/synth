# EXP-GOV-014 — Governance Model & Engine Integrity

> **Governance expedition.** Fix gaps between documented governance model and actual implementation, harden gate engine enforcement.

**Status:** Executing  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 1 — Governance  
**Authority:** Synth Architectural Constitution  
**Depends On:** None  
**Blocks:** EXP-GOV-015

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
| H1 | `docs/governance.md` describes old CI-CD proof pipeline, not the three-layer gate model | High |
| H2 | `engineOpenAcceptanceGate` synthesizes fake ReviewDecision (hardcodes approve/operator) | High |
| H3 | Self-approval check is `reviewer.id === "implementer"` — not a real identity check | High |
| H4 | No quorum enforcement — `GatePolicy.quorum` typed but never read | High |
| H5 | Intake gate doesn't check governance gate state (mission.approve / expedition.start bypass gates) | High |
| L2 | `review-gate-validation.ts` added fields not in original charter schemas | Low |

---

## Deliverables

1. **`docs/governance.md` rewrite** — Document the three-layer gate model (Genesis/Synthesis/Governance), all gate types (Refinement, Divergence, Review, Acceptance, Convergence), satisfier model (Automatic/AI/Human/Quorum), and the updated `npm run govern` pipeline.
2. **`engineOpenAcceptanceGate` fix** — Replace synthetic ReviewDecision construction with actual retrieval from stored gate state. Preserve conditions, reviewer identity, evidence, and reason from the real review.
3. **Self-approval identity resolution** — Track the implementing agent per expedition. Replace string-literal check with actual identity comparison.
4. **Quorum enforcement** — Implement `GatePolicy.quorum` in `resolveReviewGate` and `resolveAcceptanceGate`: `all` (unanimous), `any` (first approval), or `number` (N approvals required).
5. **Intake gate wiring** — `intake.ts` checks `reviewGateExpeditions` derived state: `mission.approve` requires Divergence Gate passed; `expedition.start` calls `isBlockedByUpstreamGate()`.
6. **Tests** — Verify quorum, self-approval blocking, intake gate checking, and real ReviewDecision data in acceptance.

---

## Acceptance Criteria

1. `docs/governance.md` references ADR-045, names all five gate types, and describes the satisfier model.
2. `engineOpenAcceptanceGate` reads the real stored review decision — no synthetic data.
3. Self-approval is blocked based on actual agent identity, not the string `"implementer"`.
4. Quorum of `all` requires all reviewers; `any` requires at least one; `N` requires N approvals.
5. Intake gate rejects `mission.approve` if Divergence Gate is unresolved.
6. Intake gate rejects `expedition.start` if upstream dependencies are unresolved.
7. All existing governance tests pass; new enforcement tests pass.

---

## Out of Scope

- Condition fulfillment tracking for `approve_with_conditions` (see EXP-GOV-015).
- Rich review decision implementation (split/merge/supersede/escalate).

---

## Evidence

| Finding | Status | Evidence |
|---------|--------|----------|
| H2 — Synthetic ReviewDecision in `engineOpenAcceptanceGate` | **Fixed** | `src/governance/review-gate-engine.ts` now retrieves the real review decision from the stored gate and validates `decision`, `reviewer`, `reason`, and `resolvedAt` before opening acceptance. `src/state/derived/build-derived-state.ts` now persists `payload.reviewer` for `REVIEW_GATE_RESOLVED` and `ACCEPTANCE_GATE_RESOLVED`. Regression tests in `tests/governance-evaluation-enforcement.test.js` prove acceptance cannot open without a resolved review decision and cannot synthesize one from thin air. |
| H4 — Numeric quorum enforcement | **Deferred** | Per Option C, `all` and `any` semantics are enforced by the existing flow; numeric quorum requires an architectural decision on multi-reviewer accumulation before implementation. |

---

## Relationship to Other Work

- **EXP-PROGRAM-035** — This expedition fixes gaps in that program's engine implementation.
- **EXP-GOV-015** — Depends on the corrected gate model from this expedition.
- **EXP-GATE-013** — Dependency enforcement provides runtime blocking; this expedition wires the intake gate to check that state.
