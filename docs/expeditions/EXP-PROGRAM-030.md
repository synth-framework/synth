# EXP-PROGRAM-030 — Intelligent Governance Orchestration

**Status:** Completed and accepted  
**Kind:** Program  
**Priority:** Critical  
**Authority:** Synth Architectural Constitution  
**Scope:** Knowledge-aware validation planning, dependency-driven execution, and explainable governance orchestration  
**Era:** III — Architecture  
**Architecture Impact:** High  
**Constitutional Impact:** None  
**Public Impact:** High  
**Product Impact:** High  
**Execution Impact:** High
**Completed In:** PR #205

---

## Thesis

> **SYNTH can execute governance checks incrementally, but it does not yet reason about repository impact, govern classes of validation, or explain why a check ran or was skipped.**

Program 021 established the foundation for incremental governance: fingerprints, proofs, dependency graphs, and a scheduler. Program 030 raises that foundation into an intelligent orchestration layer that scales governance with repository impact rather than repository size, while preserving the constitutional guarantee that every skipped check has a deterministic, replayable reason.

The goal is to make governance **knowledge-aware**:

| Capability | Current | Target |
| --- | :---: | :---: |
| Repository Impact Analysis | 85% | 100% |
| Validation Dependency Graph | 90% | 100% |
| Artifact Fingerprinting | 90% | 100% |
| Governance Classes | 0% | 100% |
| Validation Planning | 85% | 100% |
| Incremental Execution | 90% | 100% |
| Proof Cache Lifecycle | 85% | 100% |
| CI Orchestration | 60% | 100% |
| Certification Profiles | 0% | 100% |
| Validation Explanation | 0% | 100% |
| Performance Benchmarking | 60% | 100% |

---

## Purpose

Make SYNTH governance scale with repository impact while remaining deterministic and explainable:

- Analyze repository impact before planning validation.
- Classify every artifact into a governance class.
- Build a canonical dependency graph between artifacts and validators.
- Compute semantic fingerprints for governed artifacts.
- Maintain a versioned proof cache with explicit lifecycle semantics.
- Schedule only the validators affected by a change.
- Provide certification profiles for local, PR, main, and release contexts.
- Explain every skip decision with a deterministic reason.
- Benchmark validation time against concrete targets.

---

## Core Abstraction — Validation Proof

> **A ValidationProof is a deterministic artifact asserting that a governance property holds for a specific dependency fingerprint.**

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

Every proof carries:

- `check` — the validator that produced it
- `fingerprint` — the semantic fingerprint it asserts against
- `dependencies` — upstream fingerprints that affect its validity
- `result` — PASS or FAIL
- `validatorVersion` and `algorithmVersion` — automatic invalidation on validator evolution

---

## Mission

Close the gap between incremental execution and intelligent orchestration:

- Extend repository impact analysis with governance classes and promotion risk.
- Make the dependency graph aware of artifact classes, not just checks.
- Separate semantic fingerprints from raw content hashes.
- Define governance classes: `documentation`, `knowledge`, `runtime`, `kernel`, `compiler`, `release`, `design`.
- Enhance the validation planner to produce explainable plans.
- Execute only the planned validators with deterministic scheduling.
- Cache proofs with cold, warm, corrupt, version-mismatch, and manual-rebuild semantics.
- Provide certification profiles for different promotion contexts.
- Make every skipped validator explainable through `synth govern --explain`.
- Benchmark and report against target durations.

---

## Program Composition

> **Note:** Expedition identifiers GOV-001 through GOV-009 are assigned to
> EXP-PROGRAM-018 — Foundation Architecture Program. This program therefore
> uses GOV-012 through GOV-022 to avoid identity collisions while preserving
> the original expedition structure proposed for the Intelligent Governance
> Orchestration layer.

```text
EXP-PROGRAM-030
Intelligent Governance Orchestration
│
├── EXP-GOV-012  Repository Impact Model
│       Architecture Expedition
│       Extend impact analysis with governance classes, artifact types,
│       and promotion risk.
│
├── EXP-GOV-013  Governed Dependency Graph
│       Architecture Expedition
│       Artifact-to-validator dependency graph with deterministic
│       propagation and cycle detection.
│
├── EXP-GOV-014  Artifact Fingerprinting
│       Architecture Expedition
│       Semantic fingerprints for governed artifacts, separating content
│       hashes from semantic identity.
│
├── EXP-GOV-015  Governance Classes
│       Architecture Expedition
│       Define and assign documentation, knowledge, runtime, kernel,
│       compiler, release, and design classes.
│
├── EXP-GOV-016  Validation Planner
│       Architecture Expedition
│       Generate minimum sound validation plans from impact, classes,
│       and dependencies.
│
├── EXP-GOV-017  Incremental Validator Engine
│       Engineering Expedition
│       Dependency-driven execution with skip/run decisions and proof
│       recording.
│
├── EXP-GOV-018  Governance Cache
│       Engineering Expedition
│       Persistent proof cache with lifecycle semantics and version
│       invalidation.
│
├── EXP-GOV-019  CI Orchestration
│       Engineering Expedition
│       GitHub Actions workflow that executes only the required
│       validators for each pull request.
│
├── EXP-GOV-020  Certification Profiles
│       Product Expedition
│       local-fast, pull-request, main-branch, and release profiles.
│
├── EXP-GOV-021  Validation Explanation
│       Product Expedition
│       Deterministic reasons for skipped validators via CLI and
│       structured output.
│
└── EXP-GOV-022  Performance Benchmarking
        Engineering Expedition
        Capture timing, compare against targets, and produce baseline
        artifacts.
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

| Allowed | Forbidden |
|---|---|
| Extending impact analysis with classes and risk | Modifying Protected Assets |
| Defining governance classes and artifact mappings | Bypassing ExecutionGate for mutations |
| Building artifact-to-validator dependency graphs | Changing Mission or Expedition lifecycle semantics |
| Computing semantic fingerprints | Making governance decisions non-deterministic |
| Caching versioned proofs | Treating cached proofs as canonical evidence without revalidation |
| Scheduling validators based on impact | Skipping validators without a recorded reason |
| Providing certification profiles | Hard-coding CI platform assumptions beyond GitHub Actions adapter |
| Explaining skip decisions | Inventing non-replayable heuristics |
| Benchmarking validation performance | Using benchmarks to weaken governance guarantees |

### Hard Constraints

> **Incremental execution must be observationally equivalent to a clean full run.** Running `synth govern` incrementally followed immediately by `synth govern --full` must produce identical certification results.
>
> **Every skipped check has a deterministic, explainable reason.** No skip is allowed without a recorded reason derived from fingerprints, dependencies, or profile rules.
>
> **Proofs are not canonical.** A proof is evidence of a past validation; it does not replace revalidation when inputs or validators change.
>
> **Semantic fingerprints are distinct from content hashes.** The architecture must support content hashes today and AST/canonical hashes tomorrow without changing the proof model.
>
> **Validator evolution invalidates proofs.** A change to `validatorVersion` or `algorithmVersion` automatically invalidates every proof for that validator.

---

## Out of Scope

- Changes to Mission or Expedition lifecycle semantics.
- Changes to Genesis, Semantic Modeling, or Canonical Knowledge semantics.
- IDE or editor integrations.
- Commercial cloud CI integrations beyond the GitHub Actions adapter.
- Remote/shared proof cache backends.

---

## Success Criteria

The program is complete when it can demonstrate:

### Cold Run

```text
synth govern --full
```

produces the same behavior as today's full validation pipeline.

### Warm Run With No Changes

```text
synth govern
```

reuses all proofs and completes nearly instantaneously.

### Small Localized Change

```text
Change website/
      ↓
Documentation and website validators run
      ↓
Runtime, kernel, compiler validators skipped with reason
```

### Cross-Cutting Architectural Change

```text
Change src/runtime/events.ts
      ↓
Runtime, replay, determinism, adversarial validators run
      ↓
Documentation validators skipped with reason
```

### Observational Equivalence

```text
synth govern
synth govern --full
```

produce identical certification results.

### Explainability

```text
synth govern --explain
```

emits a deterministic reason for every skipped validator.

### Performance Targets

| Change Class | Target |
| --- | --- |
| Documentation-only PR | < 15 seconds |
| Knowledge-only PR | < 30 seconds |
| Runtime change | < 2 minutes |
| Compiler change | full validation |
| Release promotion | complete certification |

---

## Relationship to Other Work

- **EXP-PROGRAM-021 — Incremental Governance** provides the fingerprint, proof, dependency graph, scheduler, and incremental engine foundations used by this program.
- **EXP-PROGRAM-022–024** define *what* SYNTH governs: intent, domain, knowledge, and validation before implementation.
- **EXP-PROGRAM-028 — Repository & Release Governance** defines *when* changes are promoted; this program decides *what evidence is required* before promotion.
- **EXP-PROGRAM-029 — AI Ecosystem Distribution** will distribute the orchestration model through skills, MCP, and repository metadata.
- **docs/reference/capability-validation-map.json** remains the canonical capability-to-test mapping consumed by the Validation Planner.
