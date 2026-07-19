# ADR-022 — Validation Dependency Graph

**Status:** Accepted
**Date:** 2026-07-19
**Author:** SYNTH Core Team
**Deciders:** Program 021 Architecture Review

---

## Context

`npm run govern` executes a monolithic chain of validation checks. Every check runs on every invocation, even when the changed files cannot possibly affect the check's result. Before SYNTH can make governance incremental, the system must know what each check depends on and what it produces.

## Decision

Introduce a declarative **check registration contract** and a **validation dependency graph** that records every governance check, its module membership, inputs, outputs, scope, and protected-asset coverage. The graph is emitted as a `GovernanceDependencyGraph` artifact during every `npm run govern` invocation.

## Consequences

### Positive

- Every check becomes self-describing.
- Future expeditions can compute affected checks from changed files.
- Overlaps, orphans, and cycles become visible and fatal.
- Protected-asset coverage is explicit and auditable.

### Negative

- New checks must be registered or they default to the `tests` module with broad inputs.
- The graph adds a small amount of metadata maintenance.

## Check Contract

```ts
interface GovernanceCheck {
  id: string
  module: string
  inputs: string[]
  outputs: string[]
  scope: "governance" | "product" | "runtime" | "documentation" | "tests"
  protectedAssets: string[]
  dependencies?: string[]
}
```

## Governance Modules

- `contracts`
- `documentation`
- `cli`
- `kernel`
- `runtime`
- `governance`
- `missions`
- `expeditions`
- `website`
- `tests`

## Cycle and Overlap Policy

- Cycles in the dependency graph produce a fatal error.
- Checks with no inputs are global and reported as warnings.
- Overlapping input globs across checks are reported as warnings.

## Relation to Other ADRs

- ADR-021: PR workflow remains mandatory; graph changes go through PR review.
- ADR-005: Architecture Era closure is preserved; this is performance infrastructure, not architectural redesign.
