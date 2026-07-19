# EXP-PROGRAM-021 — Incremental Governance

**Status:** Active  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Governance execution performance and incrementality  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** High

---

## Thesis

> **Why does SYNTH governance take twenty minutes to validate a one-line change?**

Every mission, expedition, and brownfield adoption ends with `npm run govern`. When that command scales linearly with repository size, the feedback loop collapses. Operators stop running governance locally, CI queues grow, and the deterministic contract becomes a bottleneck instead of an enabler.

Governance must become incremental: a small, localized change should run only the validation graph affected by that change, while a full architectural change still runs everything.

---

## Purpose

Transform SYNTH governance from a monolithic, repository-wide pipeline into a dependency-aware, fingerprint-based incremental validation system.

This program introduces performance infrastructure. It does not weaken the deterministic governance contract, skip protected-asset checks, or make validation optional.

> **Constitutional Rule:** An incremental govern run must produce exactly the same trustworthiness as a full govern run; it only runs fewer checks because the unchanged proofs are reused.

---

## Mission

Make `synth govern` behave like a correct, deterministic build system:

- Every check declares what it depends on and what it produces.
- Unchanged dependency sets reuse previously certified proofs.
- Changed dependency sets invalidate only the affected subgraph.
- Execution order respects the dependency graph.
- Operators can see why each check ran or was skipped.

---

## Program Composition

```
EXP-PROGRAM-021
Incremental Governance
│
├── EXP-GOVERN-001  Governance Profiling
│       Architecture Expedition
│       Instrument every governance check and establish a performance baseline.
│
├── EXP-GOVERN-002  Validation Dependency Graph
│       Architecture Expedition
│       Every check declares inputs, outputs, scope, and module membership.
│
├── EXP-GOVERN-003  Fingerprint and Proof Cache
│       Architecture Expedition
│       Persistent semantic fingerprints and reusable validation proofs.
│
├── EXP-GOVERN-004  Incremental Scheduler
│       Architecture Expedition
│       Dependency-driven execution with skip/explain support.
│
└── EXP-GOVERN-005  Advanced Optimization
        Architecture Expedition
        Parallel execution, remote cache, watch mode, and CI optimizations.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Expedition and a new ADR.

---

## Allowed Work

All work in this Program stays in the Allowed column:

| Allowed | Forbidden |
|---|---|
| Profiling and timing instrumentation | Weakening deterministic validation |
| Dependency declaration for checks | Skipping protected-asset checks |
| Fingerprinting and proof caching | Making validation optional |
| Incremental scheduling | Non-deterministic cache invalidation |
| Reason engine and skip explanations | Changing event model semantics |
| Parallel execution within the dependency graph | Bypassing ExecutionGate for mutations |

---

## Out of Scope

- Changing what governance validates.
- Removing existing checks.
- Modifying the event model, replay semantics, or constitutional baseline.
- Distributed governance across multiple repositories.
- Commercial cloud CI integrations (covered later if needed).

---

## Success Criteria

The program is complete when:

- A **cold run** with no cache produces the same results as today's full `npm run govern`.
- A **warm run with no changes** reuses all proofs and completes in seconds.
- A **small localized change** runs only the validation graph affected by that change.
- A **cross-cutting architectural change** automatically expands validation scope as needed.
- Every skipped check can be explained with a deterministic reason.
- The performance model and dependency inventory are documented and maintained.

---

## Relationship to Other Work

- **EXP-CLI-001** improves diagnostics; this program depends on accurate CLI reporting.
- **EXP-RUNTIME-001** hardens lifecycle correctness; incremental governance must not compromise it.
- **EXP-CERT-001** certifies failure behavior; incremental scheduling must be included in certification coverage.
- **EXP-PROGRAM-006** defines the Discovery compiler; project modules may influence governance modules.
