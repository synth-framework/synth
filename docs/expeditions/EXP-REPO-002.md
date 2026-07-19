# EXP-REPO-002 — Branch Taxonomy

> **Architecture expedition.** Standardize canonical branch types and naming rules for SYNTH repositories.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-REPO-001  
**Blocks:** EXP-REPO-003

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

Define the canonical branch taxonomy used across all SYNTH projects so that branches are self-describing, validated, and tied to governance entities.

---

## Deliverables

- `src/repository/branch-taxonomy.ts` — `BranchType`, `BRANCH_RULES`, classification, validation, and generation helpers.
- Branch types: `main`, `release/*`, `mission/*`, `expedition/*`, `hotfix/*`.
- Validation rules requiring `missionId` and/or `expeditionId` where applicable.

---

## Acceptance Criteria

- [x] Branch names classify into canonical types deterministically.
- [x] Validation reports missing required governance identifiers.
- [x] Generation produces canonical names from branch type and identifiers.

---

## Evidence

- `tests/repository-governance.test.js` exercises `classifyBranch`, `validateBranchName`, and `generateBranchName`.
- `tests/synth-cli-repo.test.js` exercises `synth repo branch create`.
