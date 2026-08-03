# EXP-TASK-006 — CI Orchestration Adapter

> Update GitHub Actions workflows to invoke the SYNTH task engine directly, removing the npm-script middleman from CI.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034  
**Depends On:** EXP-TASK-001, EXP-TASK-002, EXP-TASK-003, EXP-TASK-004, EXP-TASK-005, EXP-GRAPH-001, EXP-REVIEW-002  
**Blocks:** TASK-011 acceptance (deprecation of legacy npm scripts)

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: No
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

`EXP-TASK-005` made `package.json` a thin adapter layer. This expedition completes the transition by making CI invoke the task engine directly. npm remains usable locally, but CI no longer depends on it for orchestration.

---

## Goals

1. Inventory all GitHub Actions workflow files that invoke `npm run`.
2. Replace `npm run <script>` with `node dist/cli/synth.js task run <id>` where equivalent.
3. Ensure workflows build `dist/` before invoking the CLI.
4. Preserve exact behavior: the same checks, in the same order, with the same artifacts.
5. Add a regression test that proves representative CI commands work via `synth task`.

---

## Acceptance Criteria

- No workflow step uses `npm run <script>` unless the script is the bootstrap `build`.
- Workflows build `dist/` in a dedicated step before running `synth task`.
- `npm run govern` and `node dist/cli/synth.js task run govern` produce the same proof artifact in CI.
- A test verifies that a sample of CI-equivalent commands exit successfully via `synth task`.
- `synth validate` passes.

---

## Completion Evidence

- GitHub Actions workflows in `.github/workflows/*.yml` invoke `node dist/cli/synth.js task run ...` directly.
- `tests/task-ci-adapter.test.js` verifies that representative CI-equivalent commands exit successfully via `synth task`.

---

## Out of Scope

- Removing npm scripts from `package.json`.
- Deprecating task definitions.
- Changing check ordering or CI matrix strategy.
- Adding new checks or capabilities.

---

## Protected Assets

- Event Model
- Replay Engine
- Constitutional Baseline
- Public Vocabulary

---

## Related documents

- [EXP-PROGRAM-034 — Task Orchestration Engine](EXP-PROGRAM-034.md)
- [EXP-TASK-001 — Task Schema and Registry](EXP-TASK-001.md)
- [EXP-TASK-002 — Task CLI](EXP-TASK-002.md)
- [EXP-TASK-003 — Task Execution CLI](EXP-TASK-003.md)
- [EXP-TASK-004 — npm Script Migration](EXP-TASK-004.md)
- [EXP-TASK-005 — npm Adapter](EXP-TASK-005.md)
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
