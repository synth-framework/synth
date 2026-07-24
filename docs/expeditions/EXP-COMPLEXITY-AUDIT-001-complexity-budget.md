# EXP-COMPLEXITY-AUDIT-001 — Complexity Budget

> Cost/value rating for every major SYNTH subsystem.

**Status:** Draft  
**Expedition:** `EXP-COMPLEXITY-AUDIT-001`  
**Date:** 2026-07-21  

---

## Method

Cost and value are rated Low / Medium / High based on:

- **Cost:** lines of code, file count, test surface, conceptual load, cross-subsystem coupling.
- **Value:** core guarantee protected, user-facing capability, production workflow exercised.

**Verdicts:**

- **essential** — cannot be removed without breaking a core guarantee.
- **watch** — high value but high cost; monitor for simplification opportunities.
- **simplify** — overlaps with another subsystem or carries disproportionate cost.
- **candidate** — high cost, low value; strong candidate for removal or demotion.

---

## Essential core

| Component | Lines | Files | Cost | Value | Verdict | Evidence |
|---|---|---:|---:|---|---|---|---|
| Event Store | ~400 | 2 | Low-Medium | Maximum | essential | `src/infra/event-store.ts`, 44 callers |
| CanonicalState + Replay | ~2,500 | 10 | Medium | Maximum | essential | `src/runtime/replay.ts`, `src/types/state.ts` |
| ExecutionGate | ~1,500 | 5 | Medium-High | High | essential | `src/control/execution-gate.ts`, `tests/governance/execution-gate-regression.test.js` |
| Runtime Engine / Executor | ~1,000 | 4 | Medium | High | essential | `src/runtime/engine.ts`, `src/runtime/executor.ts` |
| Capability Registry | ~1,000 | 4 | Medium | High | essential | `src/capability/registry.ts`, 36 capabilities |
| Domain Logic | ~1,800 | 8 | Medium | High | essential | `src/domain/`, all state transitions |
| Policy Engine | ~230 | 2 | Low | Medium-High | essential | `src/policy/`, protects invariants |
| State Store / Persistence | ~200 | 2 | Low | High | essential | `src/infra/state-store.ts`, `src/infra/event-store.ts` |
| Replay Verifier | ~300 | 1 | Low-Medium | High | essential | `src/core/replay-verifier.ts`, `npm run test:replay` |
| Graph Integrity Validator | ~350 | 1 | Medium | High | essential | `src/core/graph-integrity.ts`, `npm run test:graph-integrity` |
| Bootstrap | ~800 | 2 | Medium | High | essential | `src/core/bootstrap.ts`, every test/CLI entry |
| Types / Contracts | ~1,100 | 10 | Low-Medium | High | essential | `src/types/`, cross-cutting contracts |

**Essential core total:** ~10,180 lines across ~51 files.

---

## Governance / lifecycle layer

| Component | Lines | Files | Cost | Value | Verdict | Evidence |
|---|---|---:|---:|---|---|---|---|
| Review Gate Engine | ~1,200 | 4 | Medium-High | High | essential | Expedition review/acceptance lifecycle |
| Divergence Gate Engine | ~400 | 2 | Medium | Medium | watch | `src/governance/divergence-gate.ts`, alignment checking |
| Genesis / Alignment (intent, refinement, contracts) | ~2,500 | 10 | High | Medium-High | watch | `src/genesis/`, `src/governance/intent-model.js`, ADR-047/ADR-048 |
| Execution Intent / Graph | ~660 | 3 | Medium | Medium | simplify | `src/execution/`, parallel expedition progress model |
| Semantic Modeling | ~1,315 | 8 | Medium | Low | candidate | `src/semantic-modeling/`, overlaps with Genesis |

---

## Cognition / analysis layer

| Component | Lines | Files | Cost | Value | Verdict | Evidence |
|---|---|---:|---:|---|---|---|---|
| Planning Cognition Engine | ~770 | 6 | Medium | Medium-High | watch | Mission/expedition synthesis |
| Workspace Cognition Environment | ~1,270 | 8 | Medium | Medium | simplify | Overlaps with Discovery and Knowledge extraction |
| Discovery | ~5,600 | 27 | High | Medium-High | simplify | `src/discovery/`, overlaps with Workspace/Knowledge/Environment |
| Knowledge | ~875 | 8 | Medium | Medium | watch | Canonical knowledge storage |

---

## External integration layer

| Component | Lines | Files | Cost | Value | Verdict | Evidence |
|---|---|---:|---:|---|---|---|---|
| Adapter Registry + adapters | ~5,650 | 36 | High | Medium-High | simplify | 16 registered adapters, many overlap with capabilities |
| Environment capabilities | ~3,725 | 18 | High | Medium | simplify | Only 1 provider; dual model with adapters |
| Repository governance | ~470 | 5 | Medium | Medium | simplify | Canonical state + adapter both model repository |

---

## Presentation / CLI layer

| Component | Lines | Files | Cost | Value | Verdict | Evidence |
|---|---|---:|---:|---|---|---|---|
| CLI surface | ~8,236 | 19 | High | Medium-High | simplify | 19 files, overlapping explain/briefing commands |
| First Contact | ~2,864 | 24 | High | Medium | candidate | Product-specific workflow in core source |
| Documentation projection | ~857 | 8 | Medium | Medium | watch | Website/docs generation |

---

## Supporting infrastructure

| Component | Lines | Files | Cost | Value | Verdict | Evidence |
|---|---|---:|---:|---|---|---|---|
| Verification | ~692 | 5 | Medium | Medium | simplify | Name overlap with Validation |
| Validation | ~(part of runtime) | 1 | Low | Medium | essential | Input validation for capabilities |
| Compiler | ~289 | 2 | Low | Low | candidate | No dedicated test script |
| API | ~415 | 1 | Low | Medium | essential | Public API surface |
| Command bus | ~(minimal) | 1 | Low | Low | watch | Legacy command layer |
| Observability | ~151 | 2 | Low | Medium | watch | Logging/telemetry |

---

## Aggregate view

| Category | Lines | Share of source | Verdict distribution |
|---|---:|---:|---|
| Essential core | ~10,180 | 19% | 12 essential |
| Governance / lifecycle | ~5,275 | 10% | 2 essential, 2 watch, 1 simplify, 1 candidate |
| Cognition / analysis | ~8,515 | 16% | 4 simplify/watch |
| External integration | ~9,845 | 19% | 3 simplify |
| Presentation / CLI | ~11,957 | 23% | 1 simplify, 1 candidate, 1 watch |
| Supporting infrastructure | ~1,547 | 3% | 1 simplify, 1 candidate, 2 watch/essential |
| **Total** | **~47,319** | **90%** | — |

*Note: totals exclude type declarations and small shared utilities. Total TypeScript source is ~52,677 lines.*

---

## Key observations

1. **Essential core is ~19% of source.** The remaining ~81% is not accidental by definition, but it is where simplification opportunities live.
2. **Presentation / CLI is the largest category** (~23%). This is high surface area for a system whose core guarantees are event-sourcing and governance.
3. **External integration has two parallel models** (adapters + environment providers). This is the clearest accidental-complexity signal.
4. **Cognition / analysis has multiple knowledge-extraction paths.** Consolidation would reduce conceptual load.
5. **Governance / lifecycle has multiple gate engines.** A single parameterized gate primitive could replace review, divergence, and execution-graph engines.
6. **First Contact and Compiler are the strongest deletion/migration candidates** based on cost/value ratio.

---

## Complexity budget conclusion

SYNTH is **more complex than its essential core requires**. The essential core (~19% of source) is well-justified. The remaining subsystems provide real value but contain overlapping abstractions and parallel mechanisms that inflate conceptual and maintenance cost.

The highest-leverage simplification targets are:

1. Unify adapters and environment providers.
2. Consolidate knowledge extraction across Planning, Workspace, Discovery, and Knowledge.
3. Demote execution intent/graph to a projection.
4. Reduce CLI explain/briefing surface.
5. Move First Contact out of core source.
