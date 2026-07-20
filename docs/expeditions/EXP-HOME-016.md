# EXP-HOME-016 — Homepage Runtime

> **Architecture expedition.** Introduce a browser-compatible, in-memory runtime that executes a deterministic subset of SYNTH for the Mission Studio homepage.

**Status:** Proposed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-027 — Mission Studio Homepage  
**Depends On:** EXP-HOME-002 (Mission Workspace), EXP-HOME-004 (Artifact System)  
**Blocks:** EXP-HOME-017, EXP-HOME-018, EXP-HOME-019, EXP-HOME-021, EXP-HOME-024

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

Provide the homepage with a deterministic, stateless runtime that can execute SYNTH concepts without a filesystem, without `.synth/`, and without mutating any repository state.

---

## Origin Evidence

The homepage cannot depend on the CLI or on-disk SYNTH project state. Visitors arrive without a repository, and the demo must run entirely in the browser. At the same time, the homepage must remain honest: it should reuse SYNTH's existing deterministic engines rather than invent a parallel implementation.

---

## Required Change

### 1.1 Runtime package

Create a browser-compatible runtime package (initially `@synth/homepage-runtime` or a local `packages/homepage-runtime/` directory) that:

- Exports pure TypeScript functions.
- Has no Node.js filesystem dependencies.
- Has no `.synth/` directory requirement.
- Does not emit or consume runtime events from a real event store.
- Runs entirely in memory.

### 1.2 Reuse existing engines

Where possible, the runtime wraps existing deterministic engines:

- Intent extraction from `src/first-contact/extract/engine.ts`.
- Replay logic from `src/runtime/replay.ts`.
- Clarification and architecture projection from `src/first-contact/`.

Wrappers must strip out filesystem side effects and repo-specific assumptions.

### 1.3 Execution context

Provide an in-memory execution context that holds:

- The current phase.
- The artifact projection.
- The replay event list.
- The current replay offset.

No persistence. No event log append. No state store.

---

## Deliverables

1. **Homepage Runtime package** with browser-compatible exports.
2. **In-memory execution context** implementation.
3. **Wrappers** around existing deterministic engines.
4. **Tests** verifying deterministic output for curated demo inputs.

---

## Acceptance Criteria

- The runtime runs in a browser environment without Node-specific APIs.
- It produces deterministic output for the same input and phase.
- It does not read or write files.
- It does not mutate any external state.
- It wraps existing SYNTH engines rather than duplicating their logic.

---

## Out of Scope

- Full Runtime SDK extraction (Phase 2).
- CLI migration to the runtime.
- Server-side execution.
- Real AI model integration.

---

## Success Criteria

The expedition succeeds when the homepage can execute a complete Genesis → Mission → Expedition flow in memory without touching the filesystem or CLI.

---

## Related documents

- [EXP-PROGRAM-027 — Mission Studio Homepage](EXP-PROGRAM-027.md)
- [EXP-HOME-017 — Homepage Genesis Projection](EXP-HOME-017.md)
- [EXP-HOME-018 — Homepage Replay Projection](EXP-HOME-018.md)
- [EXP-HOME-022 — Runtime Abstraction Layer](EXP-HOME-022.md)
