# EXP-REPO-003 — Promotion Pipeline

> **Architecture expedition.** Define governed transitions from expedition completion to release.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-REPO-002  
**Blocks:** EXP-REPO-007

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Make promotion a governed event with explicit lifecycle transitions, required evidence, and replayable approval.

---

## Deliverables

- Repository lifecycle states: `initialized → branch-created → promotion-proposed → promotion-approved → merged → released`.
- `PROMOTION_PROPOSED` and `PROMOTION_APPROVED` event types.
- `validatePromotion(state, from, to)` helper in `src/repository/governance.ts`.
- CLI command `synth repo pr approve --id <id>`.

---

## Acceptance Criteria

- [x] Promotion transitions are enforced against current repository lifecycle.
- [x] Approval requires an existing pull request.
- [x] Approving and merging advance the repository lifecycle deterministically.

---

## Evidence

- `tests/repository-governance.test.js` validates promotion rules.
- `tests/synth-cli-repo.test.js` exercises `synth repo pr approve` and `synth repo pr merge`.
