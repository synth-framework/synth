# EXP-PROGRAM-021 — Incremental Governance

**Status:** Completed  
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

## Core Abstraction — Validation Proof

The unit of incrementality is not a command, a check, or a file. It is a **Validation Proof**:

> A deterministic artifact asserting that a governance property holds for a specific dependency fingerprint.

```text
Source Changes
        ↓
Fingerprint Changes
        ↓
Proof Invalidation
        ↓
Proof Revalidation
        ↓
Updated Proof Set
```

A proof records *what* was validated and *for which inputs*, not the raw command output. Caching, scheduling, and explanation are all built on top of proofs. This keeps the architecture from drifting toward command-output caching.

A proof carries at minimum:

```text
id
  check                 — which governance property was validated
  fingerprint           — hash of the inputs the proof applies to
  dependencies[]        — fingerprints of upstream proofs
  result                — PASS | FAIL
  validatorVersion      — version of the validator implementation/algorithm
  timestamp             — when the proof was produced
  proofHash             — integrity hash of the proof object itself
```

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
├── EXP-GOVERN-003  Proof Model and Fingerprint Store
│       Architecture Expedition
│       Define the Validation Proof model, semantic fingerprints, and
│       a persistent proof store. Caching is an implementation detail
│       built on top of the proof model.
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

## Proof Versioning

Validators evolve. A proof produced by `govern:vocabulary@1` must not be reused after `govern:vocabulary@2` changes implementation. Every proof therefore carries a **validator version** (and, where appropriate, an **algorithm version**) that is part of its identity.

When validator logic changes, every proof for that validator is invalidated automatically. Versioning prevents silent stale approvals and makes validator evolution safe.

---

## Semantic Fingerprints

Fingerprints are semantic, not merely byte-level. The goal is to distinguish meaningful changes from incidental ones.

Examples:

| Input | Fingerprint strategy |
|---|---|
| Markdown file | AST fingerprint, not raw bytes |
| JSON file | Canonical normalized hash |
| Source file | AST or normalized token stream |
| Event log | Segment hash over canonical events |

If semantic fingerprints are too ambitious for the first iteration, the proof model must still allow the fingerprint strategy to be swapped later without changing the rest of the architecture. The first implementation may use content hashes; the model must not hardcode that choice.

---

## Reason Engine

The system must explain *why* a check ran or was skipped.

Example output:

```text
Replay Verification
  SKIPPED
  Reason: fingerprint unchanged
  Dependencies: runtime/, missions/, events/
```

The reason engine is a first-class deliverable. It makes incremental execution inspectable rather than magical and provides the evidence surface that EXP-CERT-001 can certify.

---

## Cache Lifecycle Semantics

The following states are defined from the start:

| State | Meaning |
|---|---|
| **Cold cache** | No proofs exist; every check executes. |
| **Warm cache** | Proofs are reusable and dependency fingerprints are unchanged. |
| **Corrupt cache** | Proof integrity check fails; proof is discarded and rebuilt. |
| **Version mismatch** | Validator or algorithm version changed; affected proofs invalidated. |
| **Manual rebuild** | Operator can force a clean proof set (e.g., `synth govern --rebuild`). |

These states keep cache behavior explicit and testable.

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

### Hard Constraints

> **Observational Equivalence:** Running `synth govern` incrementally followed immediately by `synth govern --full` must produce identical certification results.
>
> Incremental execution is only an optimization; it must not change the observable governance verdict.

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
- A **warm run with no changes** reuses all valid proofs and completes in seconds.
- A **small localized change** runs only the validation graph affected by that change.
- A **cross-cutting architectural change** automatically expands validation scope as needed.
- **Observational equivalence** holds: an incremental run followed by a full run produces identical certification results.
- Every skipped check can be explained with a deterministic reason via the reason engine.
- The performance model, dependency inventory, and proof model are documented and maintained.

---

## Relationship to Other Work

- **EXP-CLI-001** improves diagnostics; this program depends on accurate CLI reporting.
- **EXP-RUNTIME-001** hardens lifecycle correctness; incremental governance must not compromise it.
- **EXP-CERT-001** certifies failure behavior; incremental scheduling must be included in certification coverage.
- **EXP-PROGRAM-006** defines the Discovery compiler; project modules may influence governance modules.
