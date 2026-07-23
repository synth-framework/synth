# ADR-049 — Repository Quality Audit (RQA) Framework

**Status:** Proposed  
**Date:** 2026-07-21  
**Author:** Operator  
**Deciders:** TBD  

---

## Context

The complexity audit (EXP-SIMPLIFICATION-003) revealed that many architectural discussions in SYNTH become subjective:

- "This feels over-engineered."
- "There are too many abstractions."
- "This subsystem is difficult to maintain."

These observations are useful but not deterministic. The next evolution should convert them into measurable evidence through a repeatable, machine-readable **Repository Quality Audit (RQA)** capability.

The RQA must:

- Run independently or compose with other audits.
- Produce numeric scores tied to concrete evidence.
- Recommend only canonical actions: KEEP, MERGE, MOVE, DELETE, and optionally SPLIT.
- Avoid introducing new lifecycle concepts, kernel mutations, or governance gates.
- Remain an application-level capability built on the frozen SYNTH kernel.

## Decision

Introduce a **Repository Quality Audit (RQA)** framework as a canonical SYNTH application capability.

### Audit contract

Every audit implements the same interface:

```
Audit
├── id
├── name
├── purpose
├── inputs
├── metrics
├── evidence
├── findings
├── recommendations
├── score
└── artifacts
```

Each audit produces:

- A numeric score.
- A list of violations with evidence.
- A list of recommendations constrained to KEEP, MERGE, MOVE, DELETE, or SPLIT.
- Machine-readable output (JSON).
- Human-readable output (Markdown).

### Audit registry

Audits are registered by category. Initial catalog:

```
Core
 ├── core-alignment
 ├── determinism
 ├── security

Architecture
 ├── complexity
 ├── simplicity
 ├── maintainability
 ├── cohesion
 ├── coupling

Quality
 ├── performance
 ├── testability
 ├── documentation
 ├── technical-debt

AI
 ├── ai-adaptability
 ├── explainability
 ├── discoverability
```

### Composition

Audits compose through a runner:

```
synth audit complexity
synth audit complexity simplicity
synth audit security maintainability cohesion
synth audit all
```

Predefined profiles:

```
synth audit quick        # core-alignment, complexity, security
synth audit architecture # complexity, simplicity, cohesion, coupling, maintainability
synth audit ai           # ai-adaptability, documentation, explainability, discoverability
synth audit release      # security, determinism, performance, documentation, testability
synth audit full         # every registered audit
```

### Shared evidence model

The framework collects evidence once and shares it across audits:

```
Repository
      ↓
Evidence Collection
      ↓
Dependency Graph
Type Graph
Export Graph
Call Graph
Metrics
Tests
Coverage
Documentation
Events
```

Each audit consumes the shared evidence instead of re-scanning the repository.

### Recommendation vocabulary

Every audit emits recommendations using a fixed vocabulary:

- **KEEP** — the component is justified.
- **MERGE** — two or more components share responsibility and contract.
- **MOVE** — the component belongs in a different module or layer.
- **DELETE** — the component is unused or superseded.
- **SPLIT** — one component has multiple responsibilities.

Any recommendation that cannot be expressed with these verbs is out of scope for a single audit and must become its own expedition.

### Determinism audit

A dedicated **Determinism Audit** verifies SYNTH's first-class architectural properties:

- Replay determinism.
- Event ordering guarantees.
- Canonical state reproducibility.
- Mutation authority.
- Idempotency.
- Stable projections.
- Time-independent behavior.
- Absence of hidden mutable state.

This audit is a gate for any kernel change.

## Consequences

- Architectural debates shift from opinion to evidence.
- Simplification expeditions gain a repeatable starting point.
- Future expeditions can target specific audit scores instead of vague concerns.
- The audit catalog can grow without changing the kernel.
- Risk: the framework itself can become over-engineered if built before simplification stabilizes the repository.

## Proof Impact

- **P1 — Replay integrity:** Determinism audit verifies replay guarantees.
- **P2 — Authority ordering:** Core-alignment audit verifies single mutation authority.
- **P3 — Constitutional compliance:** Core-alignment audit verifies protected assets and public vocabulary.
- **P4 — Certification:** RQA results become evidence for certification reports.
- **P5 — Operational safety:** Security and determinism audits feed operational review.

## Kernel Impact

None.

The RQA framework is an application-level capability. It reads canonical state, events, source code, and documentation; it emits reports and evidence. It does not modify the kernel, event schema, replay semantics, mutation authorities, or constitutional baseline.

## Constitutional Baseline Impact

None required.

A future constitutional provision may require RQA certification before kernel changes, but that is outside the scope of this ADR.

## Implementation sequencing

1. Complete the active simplification program (EXP-SIMPLIFICATION-002 onward).
2. Implement the shared evidence collector.
3. Implement three foundational audits: **core-alignment**, **complexity**, **determinism**.
4. Add audits incrementally; never add an audit without a consumer.
5. Introduce profiles only after individual audits are stable.

## Related

- [ADR-046 — Implementation Authority Ordering](ADR-046-implementation-authority-ordering.md)
- [ADR-048 — Genesis Lifecycle and Alignment Contracts](ADR-048-genesis-lifecycle-and-alignment-contracts.md)
- `docs/analysis/post-simplification-duplicates.md`
- `docs/kernel-boundary.md` (kernel/application classification authority)
