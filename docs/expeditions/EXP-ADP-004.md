# EXP-ADP-004 — BDD Adapter

**Status:** Completed
**Kind:** Methodology Adapter  
**Program:** EXP-PROGRAM-018 — Foundation Architecture Program  
**External System:** No  
**Priority:** Medium  
**Depends On:** EXP-ADP-000  
**Blocks:** Future behavior-driven adapters

---

## Purpose

Provide behavior-driven engineering through executable specifications.

This adapter connects architecture with language.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Methodology Adapter |
| External system | None |
| Kernel dependency | Capability execution, proof generation |
| Primary value | Traceability from mission to behavior to implementation |

---

## Responsibilities

- Feature files
- Scenario generation
- Acceptance criteria
- Traceability
- Living documentation

---

## Canonical Workflow

```
Mission
    ↓
Feature
    ↓
Scenario
    ↓
Acceptance Criteria
    ↓
Execution
    ↓
Evidence
```

---

## Canonical Capabilities

```
CreateFeature
CreateScenario
GenerateAcceptanceTests
VerifyBehavior
GenerateBehaviorEvidence
```

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

---

## Governance

Behavior must be satisfied before implementation is considered complete.

---

## Evidence

Produces:

- Features
- Scenarios
- Acceptance report
- Traceability matrix
- Coverage of behaviors

---

## Implementation

- `src/adapters/bdd/types.ts` — `BddFeature`, `BddScenario`, `BddEvidence`, and capability result contracts.
- `src/adapters/bdd/adapter.ts` — `BddAdapterImpl` with canonical lifecycle and capabilities.
- `src/adapters/registry.ts` — registered as `"bdd"` methodology adapter.
- `src/cli/adapter.ts` — added `bdd-create-feature`, `bdd-create-scenario`, `bdd-generate-tests`, `bdd-verify`, `bdd-evidence` CLI commands.
- `tests/adapter-bdd.test.js` — 8 tests covering registry listing, lifecycle, feature/scenario creation, acceptance-test generation, evidence generation, and health checks.

Test command:

```bash
node --test tests/adapter-bdd.test.js
```

## Success Criteria

- Every implemented capability can be traced back to an executable behavior specification.
- The adapter can be enabled/disabled without affecting Kernel behavior.
- BDD evidence contributes to the proof pipeline.
- No behavior-specification logic leaks into the Kernel.
