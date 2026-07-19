# EXP-REPO-006 — Pull Request Contract

> **Product expedition.** Treat pull requests as governance artifacts generated from SYNTH state.

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-028 — Repository & Release Governance  
**Depends On:** EXP-REPO-005  
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

Represent a pull request as a replayable governance artifact tied to missions, expeditions, and evidence.

---

## Deliverables

- `PullRequest` type in `src/types/state.ts`.
- `PULL_REQUEST_OPENED`, `PULL_REQUEST_UPDATED`, `PULL_REQUEST_MERGED` events.
- Replay handlers in `src/runtime/replay.ts`.
- CLI command `synth repo pr open --head <h> --base <b> --title <t> --body-file <f>`.
- Body files follow ADR-037 shell-safe command construction.

---

## Acceptance Criteria

- [x] PR state is replayable from events.
- [x] PRs carry optional `missionId` and `expeditionId` references.
- [x] Opening a PR advances the repository lifecycle to `promotion-proposed`.

---

## Evidence

- `tests/repository-governance.test.js` validates PR replay semantics.
- `tests/synth-cli-repo.test.js` exercises `synth repo pr open`.
