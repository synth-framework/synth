# EXP-GOV-014 — Governance Model & Engine Integrity

> **Governance expedition.** Fix gaps between documented governance model and actual implementation, harden gate engine enforcement.

**Status:** Completed  
**Kind:** Governance Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-038 — Audit Remediation  
**Phase:** 1 — Governance  
**Authority:** Synth Architectural Constitution  
**Depends On:** None  
**Blocks:** EXP-GOV-015  
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
| H1 | `docs/governance.md` describes old CI-CD proof pipeline, not the three-layer gate model | High | Fixed |
| H2 | `engineOpenAcceptanceGate` synthesizes fake ReviewDecision (hardcodes approve/operator) | High | Fixed |
| H3 | Self-approval check is `reviewer.id === "implementer"` — not a real identity check | High | Fixed |
| H4 | Numeric quorum enforcement beyond `any`/`all` | High | Deferred by design for v1.0 |
| H5 | Intake gate doesn't check governance gate state (mission.approve / expedition.start bypass gates) | High | Fixed |
| L2 | `review-gate-validation.ts` added fields not in original charter schemas | Low | Out of scope |

---

## Deliverables

1. **`docs/governance.md` rewrite** — Document the three-layer gate model (Genesis/Synthesis/Governance), all gate types (Refinement, Divergence, Review, Acceptance, Convergence), satisfier model (Automatic/AI/Human/Quorum), and the updated `npm run govern` pipeline.
2. **`engineOpenAcceptanceGate` fix** — Replace synthetic ReviewDecision construction with actual retrieval from stored gate state. Preserve conditions, reviewer identity, evidence, and reason from the real review.
3. **Self-approval identity resolution** — Track the implementing agent per expedition. Replace string-literal check with actual identity comparison.
4. **Quorum enforcement** — Enforce `GatePolicy.quorum` values `all` (unanimous) and `any` (first approval) in `resolveReviewGate` and `resolveAcceptanceGate`. Numeric quorum is explicitly rejected with a clear `ReviewGateError` and deferred to a future collaborative governance initiative.
5. **Intake gate wiring** — `intake.ts` checks `reviewGateExpeditions` derived state: `mission.approve` requires Divergence Gate passed; `expedition.start` calls `isBlockedByUpstreamGate()`.
6. **Tests** — Verify quorum, self-approval blocking, intake gate checking, and real ReviewDecision data in acceptance.

---

## Acceptance Criteria

1. `docs/governance.md` references ADR-045, names all five gate types, and describes the satisfier model.
2. `engineOpenAcceptanceGate` reads the real stored review decision — no synthetic data.
3. Self-approval is blocked based on actual agent identity, not the string `"implementer"`.
4. Quorum of `all` requires all reviewers; `any` requires at least one. Numeric quorum (`N > 1`) is rejected deterministically and documented as unsupported in SYNTH Platform v1.0.
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
| H4 — Numeric quorum enforcement | **Deferred by design** | `docs/governance.md` now documents that SYNTH Platform v1.0 supports only `any` and `all` quorum policies. `src/governance/review-gates.ts` rejects numeric quorum with a clear `ReviewGateError`. Multi-reviewer accumulation, weighted voting, hierarchical approvals, and delegated approvals are reserved for a future collaborative governance program. |

---

## Closeout Notes

This expedition closes the governance model integrity gaps that were blocking Platform v1.0 stabilization. The engine now enforces real review evidence, authentic reviewer identity, and explicit quorum boundaries. Numeric and collaborative quorum semantics were intentionally removed from the v1.0 scope to preserve a single-resolution, deterministic event model. The extension point is preserved in the governance specification for a future program (proposed: **EXP-PROGRAM-043 — Collaborative Governance**).

## Relationship to Other Work

- **EXP-PROGRAM-035** — This expedition fixes gaps in that program's engine implementation.
- **EXP-GOV-015** — Depends on the corrected gate model from this expedition.
- **EXP-GATE-013** — Dependency enforcement provides runtime blocking; this expedition wires the intake gate to check that state.
