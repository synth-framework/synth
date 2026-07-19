# EXP-REPO-004 — Semantic Version Governance

> **Architecture expedition.** Infer MAJOR/MINOR/PATCH from missions, expeditions, decisions, and contracts.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-REPO-001  
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

Derive the next version bump from canonical project state rather than manual editing.

---

## Deliverables

- `inferVersionBump(state)` in `src/repository/governance.ts`.
- `nextSemanticVersion(current, bump)` helper.
- Heuristics: breaking decisions → major, new capability missions/expeditions → minor, completed expeditions → patch.

---

## Acceptance Criteria

- [x] Version bump can be inferred from canonical state.
- [x] Semantic version arithmetic handles `v` prefix and standard MAJOR.MINOR.PATCH.
- [x] No bump is returned when insufficient evidence exists.

---

## Evidence

- `tests/repository-governance.test.js` validates `inferVersionBump` and `nextSemanticVersion`.
