# ADR-024 — Incremental Governance Scheduler

**Status:** Accepted
**Date:** 2026-07-19
**Author:** SYNTH Core Team
**Deciders:** Program 021 Architecture Review

---

## Context

With a dependency graph and proof cache in place, the next step is to avoid running checks whose inputs have not changed. The scheduler must map file changes to governance modules, invalidate affected checks, and explain every run/skip decision without weakening the deterministic governance contract.

## Decision

Introduce an **incremental scheduler** that:

1. Detects changed files from `git diff` or an explicit list.
2. Maps changed paths to governance modules.
3. Invalidates checks whose inputs intersect changed paths or downstream dependencies.
4. Reuses cached proofs for unaffected checks.
5. Produces a deterministic reason for every scheduling decision.

A `--full` flag bypasses incrementality and runs every check, preserving the cold-run / CI baseline behavior.

## Consequences

### Positive

- Local feedback loops for small changes become fast.
- CI can still run full validation for baseline certification.
- Every skipped check has a deterministic, inspectable reason.

### Negative

- Requires accurate input declarations; overly broad inputs reduce incrementality.
- Assumes unchanged outputs remain valid on disk.

## Change Detection

Default: `git diff --name-only HEAD` (or against the merge base when on a feature branch).
Explicit: `--changes path1,path2`.

## Module Mapping

Changed paths are mapped to modules by prefix and glob conventions:

| Path prefix | Module |
|---|---|
| `src/runtime/**` | runtime |
| `src/mission-studio/**` | missions |
| `src/core/**` | kernel |
| `docs/**` | documentation |
| `website/**` | website |
| `src/cli/**` | cli |
| `tests/**` | tests |
| default | tests |

## Scheduling Rules

1. If a changed path matches a check's declared inputs, the check runs (reason: `input-changed`).
2. If a check depends on a check that is running, it runs (reason: `downstream`).
3. If a valid cached proof exists for the current fingerprint, the check skips (reason: `no-change`).
4. If no cached proof exists, the check runs (reason: `cache-miss`).
5. Non-deterministic checks always run.
6. `--full` forces every check to run.

## Reason Engine

Every decision includes a human-readable reason. Example:

```json
{
  "checkId": "replay-verification",
  "decision": "executed",
  "reason": "runtime module changed: src/runtime/events.ts"
}
```
