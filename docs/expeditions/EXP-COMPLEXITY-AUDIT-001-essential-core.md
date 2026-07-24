# EXP-COMPLEXITY-AUDIT-001 — Essential Core Report

> Subsystems that pass the kernel test: their removal would prevent SYNTH from establishing canonical truth.

**Status:** Draft  
**Expedition:** `EXP-COMPLEXITY-AUDIT-001`  
**Date:** 2026-07-21  

---

## The kernel test

A subsystem is essential (kernel) if and only if:

1. Removing it prevents SYNTH from answering one of:
   - What happened?
   - Who authorized it?
   - Can replay reconstruct it?
2. No other subsystem already provides the same guarantee.

Subsystems that prove properties of truth (verifiers) or consume truth (applications) are not kernel, even if they are critical for certification or user workflows.

---

## Kernel subsystems

### 1. Event Store

| Criterion | Evidence |
|---|---|
| Unique problem | Immutable, append-only record of every state-changing intent. |
| Used by | `src/infra/event-store.ts`, `src/runtime/engine.ts`, `src/core/bootstrap.ts`, `src/control/execution-gate.ts`, `src/mission-studio/engine.ts`, `src/workspace/state-reader.ts`, `src/cli/explain-observability.ts`, 44 test/script files. |
| Redundancy | No other subsystem persists events. |
| Kernel test | Remove it → no history. **Kernel.** |
| Cost | Low-medium. |
| Value | Maximum. Events are the source of truth. |

---

### 2. CanonicalState + Replay (`src/runtime/replay.ts`, `src/types/state.ts`)

| Criterion | Evidence |
|---|---|
| Unique problem | Materialized projection of irreducible domain truth from the event log. |
| Used by | `src/runtime/engine.ts`, `src/runtime/executor.ts`, `src/core/bootstrap.ts`, `src/infra/state-store.ts`, all domain logic. |
| Redundancy | Cannot be replaced by derived state; derived state is computed from canonical state + events. |
| Kernel test | Remove it → determinism collapses. **Kernel.** |
| Cost | Medium (core invariant; recently simplified by EXP-SIMPLIFICATION-001). |
| Value | Maximum. Defines what SYNTH considers true. |

---

### 3. ExecutionGate (`src/control/execution-gate.ts`)

| Criterion | Evidence |
|---|---|
| Unique problem | Single mutation authority: every repository mutation flows through one enforcement point. |
| Used by | `src/core/bootstrap.ts`, `src/runtime/engine.ts`, `src/cli/synth.ts`, `tests/governance/execution-gate-regression.test.js`. |
| Redundancy | No other component authorizes mutations. |
| Kernel test | Remove it → authority collapses. **Kernel.** |
| Cost | Medium-high. |
| Value | High. Core guarantee proven by regression tests. |

---

### 4. Runtime Engine / Executor (`src/runtime/engine.ts`, `src/runtime/executor.ts`)

| Criterion | Evidence |
|---|---|
| Unique problem | Execute authorized intents, apply domain logic, produce events, compute new state. |
| Used by | `src/api/index.ts`, `src/control/execution-gate.ts`, `src/core/bootstrap.ts`. |
| Redundancy | No other component orchestrates intent → event → state. |
| Kernel test | Remove it → authorized intents cannot become history. **Kernel.** |
| Cost | Medium. |
| Value | High. The only path from authorized intent to event. |

---

### 5. Capability Registry (`src/capability/registry.ts`)

| Criterion | Evidence |
|---|---|
| Unique problem | Map capability names to handlers; enforce that capabilities are registered and sealed. |
| Used by | `src/core/bootstrap.ts`, `src/runtime/executor.ts`, `src/control/execution-gate.ts`. |
| Redundancy | No other component resolves capabilities. |
| Kernel test | Remove it → authority vocabulary is undefined. **Kernel.** |
| Cost | Medium (1041 lines in `src/capability/`). |
| Value | High. Defines the executable vocabulary. |

---

### 6. Domain Logic (`src/domain/`)

| Criterion | Evidence |
|---|---|
| Unique problem | Pure functions that translate intents into events (work items, plans, missions, expeditions, etc.). |
| Used by | `src/runtime/executor.ts`, `src/capability/registry.ts`, many tests. |
| Redundancy | No other layer emits domain events deterministically. |
| Kernel test | Remove it → the same intent would not produce the same events. **Kernel.** |
| Cost | Medium (1844 lines). |
| Value | High. Encodes the public vocabulary behavior. |

---

### 7. Policy Engine (`src/policy/`)

| Criterion | Evidence |
|---|---|
| Unique problem | Guard against forbidden operations (e.g., `DeleteSystem`, completed-work-item mutation). |
| Used by | `src/control/execution-gate.ts`, `src/core/bootstrap.ts`. |
| Redundancy | ExecutionGate checks authority; Policy checks operation-level invariants. Distinct. |
| Kernel test | Remove it → forbidden mutations can occur. **Kernel.** |
| Cost | Low (230 lines). |
| Value | Medium-high. Protects core invariants. |

---

### 8. State Store / Persistence (`src/infra/state-store.ts`, `src/infra/event-store.ts`)

| Criterion | Evidence |
|---|---|
| Unique problem | Persist canonical state and event log across process restarts. |
| Used by | `src/core/bootstrap.ts`, `src/runtime/engine.ts`, `src/cli/explain-observability.ts`. |
| Redundancy | No other persistence layer. |
| Kernel test | Remove it → history and state cannot survive restarts. **Kernel.** |
| Cost | Low-medium. |
| Value | High. Enables durable governance. |

---

### 9. Bootstrap (`src/core/bootstrap.ts`)

| Criterion | Evidence |
|---|---|
| Unique problem | Initialize or resume a SYNTH project from event log and state. |
| Used by | Every test, every CLI command, `scripts/verify-replay.js`. |
| Redundancy | No other initialization path. |
| Kernel test | Remove it → SYNTH cannot resume and reconstruct truth. **Kernel.** |
| Cost | Medium (orchestrates all layers). |
| Value | High. Single entry point. |

---

### 10. Types / Contracts (`src/types/`)

| Criterion | Evidence |
|---|---|
| Unique problem | Shared type contracts across all subsystems. |
| Used by | Every source file. |
| Redundancy | Cannot be removed without rewriting the system. |
| Kernel test | Remove it → subsystems cannot agree on truth. **Kernel.** |
| Cost | Low-medium (1139 lines). |
| Value | High. Prevents interface drift. |

---

## Subsystems previously mistaken for kernel

These subsystems are critical but not kernel. Removing them does not prevent SYNTH from establishing canonical truth.

| Subsystem | Why it is not kernel | What it actually is |
|---|---|---|
| Replay Verifier | Determinism exists without verification. | Proof application. |
| Graph Integrity Validator | The graph exists without validation. | Proof application. |
| Review Gate Engine | Events still record expeditions and decisions. | Workflow application. |
| Divergence Gate Engine | Alignment contracts still exist as evidence. | Workflow application. |
| Execution Intent / Graph | Expedition lifecycle already records progress. | Planning projection. |
| Genesis / Alignment | Pre-mission intent refinement. | Workflow application. |
| Planning Cognition Engine | Proposes missions; kernel creates them. | Cognition application. |
| Mission Studio | Reads and presents state. | Read-only application. |
| Workspace Cognition Environment | Analyzes repository semantics. | Analysis application. |
| Discovery | Observes repository and extracts facts. | Observation application. |
| Adapters | Translate to/from external systems. | Integration applications. |
| CLI | Human interface. | Presentation application. |

---

## Summary

| Subsystem | Cost | Value | Verdict |
|---|---|---|---|
| Event Store | Low-medium | Maximum | Kernel |
| CanonicalState + Replay | Medium | Maximum | Kernel |
| ExecutionGate | Medium-high | High | Kernel |
| Runtime Engine / Executor | Medium | High | Kernel |
| Capability Registry | Medium | High | Kernel |
| Domain Logic | Medium | High | Kernel |
| Policy Engine | Low | Medium-high | Kernel |
| State Store / Persistence | Low-medium | High | Kernel |
| Bootstrap | Medium | High | Kernel |
| Types / Contracts | Low-medium | High | Kernel |

---

## Notes

- `EXP-SIMPLIFICATION-001` reduced the cost of `CanonicalState` by moving derived fields out. This lowered complexity without removing any kernel subsystem.
- The kernel is approximately 10,000–12,000 lines of TypeScript across event store, replay, runtime, gate, domain, policy, persistence, bootstrap, and types.
- Total source is ~52,700 lines. The kernel is roughly 19–23% of the codebase.
- The remaining ~77–81% is applications, proof tools, and integration layers built on the kernel.
