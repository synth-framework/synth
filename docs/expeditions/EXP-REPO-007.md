# EXP-REPO-007 — Release Governance

> **Product expedition.** Govern version tagging, release notes, and deployment promotion.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-REPO-003, EXP-REPO-004  
**Blocks:** None

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

Make release creation a governed event with deterministic notes and evidence references.

---

## Deliverables

- `Release` type in `src/types/state.ts`.
- `RELEASE_CREATED` event and replay handler.
- `formatReleaseNotes(state)` helper in `src/repository/governance.ts`.
- CLI command `synth repo release create --tag <t> --commit <sha> [--evidence <path>]`.

---

## Acceptance Criteria

- [x] Release creation advances the repository lifecycle to `released`.
- [x] Release notes are derived from active missions and completed expeditions.
- [x] Evidence references can be attached to a release.

---

## Evidence

- `tests/repository-governance.test.js` validates release replay and release notes.
- `tests/synth-cli-repo.test.js` exercises `synth repo release create`.
