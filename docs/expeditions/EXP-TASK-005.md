# EXP-TASK-005 — npm Adapter

> Reduce `package.json` scripts to a thin adapter layer that delegates every command to the canonical SYNTH task engine.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-034 — Task Orchestration Engine  
**Authority:** EXP-REVIEW-002 — Second Convergence Review of Program 034  
**Depends On:** EXP-TASK-001, EXP-TASK-002, EXP-TASK-003, EXP-TASK-004, EXP-GRAPH-001, EXP-REVIEW-002  
**Blocks:** TASK-007 (CI adapter)

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

## Purpose

`EXP-TASK-004` created canonical task definitions for every npm script. This expedition flips the relationship: npm becomes a thin adapter that delegates to the task engine, rather than the source of truth for execution.

---

## Goals

1. Convert every `package.json` script to delegate to `synth task run <id>`.
2. Preserve all existing script names as shims so CI and operator muscle memory continue to work.
3. Keep the original commands inside the task definitions; do not change execution behavior.
4. Add regression tests that prove `npm run <name>` and `synth task run <name>` are equivalent for representative scripts.
5. Leave actual script removal / deprecation to a later acceptance gate.

---

## Acceptance Criteria

- Every script in `package.json` has the form `"<name>": "synth task run <name>"` (or uses the local CLI path during development).
- `npm run build`, `npm run test`, `npm run govern`, and `npm run docs:check-links` still produce the same results as before.
- A test verifies that a sample of npm scripts delegate to the task engine.
- `synth task doctor` remains healthy.
- `synth validate` passes.

---

## Completion Evidence

- `package.json` scripts are reduced to `node dist/cli/synth.js task run <id>` shims.
- `tests/task-npm-adapter.test.js` verifies that representative npm scripts delegate to the task engine and remain equivalent to direct task execution.

---

## Out of Scope

- Removing legacy npm scripts.
- Deprecating task definitions.
- CI workflow changes.
- Modifying task definitions beyond lifecycle metadata.

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
- [EXP-GRAPH-001 — Implement Shared Dependency-Graph Primitive](EXP-GRAPH-001.md)
- [EXP-REVIEW-002 — Second Convergence Review of Program 034](../governance/convergence-review-034-002.md)
