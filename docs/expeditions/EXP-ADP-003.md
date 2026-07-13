# EXP-ADP-003 — TDD Adapter

**Status:** Completed  
**Kind:** Methodology Adapter  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-000  
**Blocks:** Future methodology adapters

---

## Purpose

Provide an opinionated Test-Driven Development workflow as a pluggable engineering methodology.

This is not "run Jest." It is "enforce Test Driven Development."

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Methodology Adapter |
| External system | None |
| Kernel dependency | Capability execution, proof generation |
| Primary value | Enforces engineering discipline |

---

## Responsibilities

- Detect missing tests
- Generate test skeletons
- Verify Red → Green → Refactor cycle
- Prevent implementation before failing tests
- Report coverage progression
- Produce methodology evidence

---

## Canonical Workflow

```
Requirement
    ↓
Generate Test
    ↓
Fail
    ↓
Implement
    ↓
Pass
    ↓
Refactor
    ↓
Proof
```

---

## Canonical Capabilities

```
GenerateTest
RunTests
VerifyFailure
VerifyImplementation
MeasureCoverage
GenerateTddEvidence
```

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

---

## Governance

Implementation cannot be promoted unless:

- Tests existed first
- Tests failed first
- Implementation passed later
- Refactor preserved behavior

---

## Evidence

Produces:

- Initial failing tests
- Passing tests
- Coverage metrics
- Refactor confirmation
- Timeline

---

## Completion Notes

Completed on 2026-06-30.

- Implemented `src/adapters/tdd/types.ts` — TDD-specific types, workflow states, and evidence model.
- Implemented `src/adapters/tdd/adapter.ts` — `TddAdapterImpl` with canonical lifecycle and capabilities:
  - `generateTest` — creates a failing test skeleton for a target function
  - `runTests` — runs TDD-generated tests only (`node --test tests/tdd-*.test.js`)
  - `verifyFailure` — confirms Red phase
  - `verifyImplementation` — confirms Green phase
  - `measureCoverage` — best-effort coverage reporting (currently disabled by default)
  - `generateEvidence` — produces TDD evidence with timeline
- Registered the adapter in `src/adapters/registry.ts`.
- Added CLI commands: `tdd-generate-test`, `tdd-verify-failure`, `tdd-verify-implementation`, `tdd-evidence`.
- Added `tests/tdd-adapter.test.js` with 7 tests, all passing.
- No TDD methodology logic leaks into the Kernel.

---

## Success Criteria

- [x] Synth can demonstrate genuine TDD without requiring a specific test framework.
- [x] The adapter can be enabled/disabled without affecting Kernel behavior.
- [x] TDD evidence contributes to the proof pipeline.
- [x] No methodology logic leaks into the Kernel.
