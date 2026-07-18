# EXP-DISCOVERY-004 — Projection Capability Mechanism

> **Discovery expedition.** Establish a generic, rule-driven ProjectionCapability mechanism for the Discovery compiler and implement the ProjectModelProjection as its first consumer.

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-002, EXP-DISCOVERY-003

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Establish a generic `ProjectionCapability` mechanism that lets capabilities contribute projections over the `EvidenceGraph`. Implement the `ProjectModelProjection` as the first such capability, with rule-driven inference, deterministic confidence composition, and schema validation.

---

## Problem Statement

EXP-DISCOVERY-002 introduced projections as functions over the `EvidenceGraph`, and EXP-DISCOVERY-003 added richer observations from Git and filesystem capabilities. The current projection layer works, but it has three limitations:

1. **Specialized, not generic.** ProjectModel inference is hard-coded in one projector. Future projections (architecture, dependencies, threats, capability graph) would require new specialized infrastructure.
2. **Implicit ordering.** Projections are executed in registration order, with no explicit dependency declaration.
3. **Mixed concerns.** Inference logic, confidence computation, and validation are intertwined.

Without a generic projection mechanism, the Discovery compiler cannot cleanly grow beyond the initial set of knowledge views.

---

## Motivation

The Discovery compiler's value is producing knowledge views from evidence. If every new view requires a new engine stage or a new hard-coded projector, the architecture will accumulate special cases. A generic `ProjectionCapability` mechanism keeps the compiler small and the extension surface consistent with `ObservationCapability` and `CorrelationCapability`.

---

## Goals

This expedition shall:

- Define a generic `ProjectionCapability<TOutput>` contract.
- Introduce `ProjectionContext`, an immutable context passed to all projections.
- Allow projections to declare dependencies on other projections and on the `EvidenceGraph`.
- Execute projections in dependency order (topologically).
- Separate inference rules from confidence rules inside the `ProjectModelProjection`.
- Refactor language, framework, runtime, lifecycle, capability, knowledge inventory, and unknown inference into discrete `ProjectModelRule`s.
- Stabilize and validate the `ProjectModel` schema.
- Include projection provenance metadata in the session.
- Preserve replay determinism.
- Add comprehensive tests for projection DAG execution, rule composition, and validation.

---

## Non-Goals

This expedition shall not:

- Add new source observation capabilities.
- Change the EvidenceGraph schema or correlation contract.
- Implement projections other than ProjectModel.
- Modify Protected Assets.
- Implement persistence, approval, or governance.
- Produce events.
- Create `.synth/` artifacts.
- Build CLI projections.

---

## Generic Projection Capability

```ts
interface ProjectionCapability<TOutput = unknown> {
  id: string
  version: string
  /** Unique projection name used as the output key. */
  projectionType: string
  /** Declares which other projections this projection requires. */
  dependencies: string[]
  /** Executes the projection against the shared context. */
  project(context: ProjectionContext): TOutput
}

interface ProjectionContext {
  evidenceGraph: EvidenceGraph
  declaredIntent?: string
  priorOutputs: Record<string, unknown>
  provenance: ProjectionProvenance
}

interface ProjectionProvenance {
  evidenceGraphHash: string
  priorOutputHashes: Record<string, string>
  capabilityVersions: Record<string, string>
}
```

The compiler:

1. Collects all registered projections.
2. Validates the dependency graph is a DAG.
3. Executes projections in topological order.
4. Stores each output under its `projectionType`.
5. Validates each output against its declared schema if a validator is provided.

---

## ProjectModelProjection

The first `ProjectionCapability` produces `ProjectModel`.

```ts
interface ProjectModelProjectionCapability extends ProjectionCapability<ProjectModel> {
  projectionType: "project-model"
  dependencies: ["findings"]
  registerRules(): ProjectModelRule[]
}

interface ProjectModelRule {
  id: string
  domain: ProjectModelDomain
  requiredClaims: string[]
  optionalClaims?: string[]
  infer(evidenceGraph: EvidenceGraph, priorOutputs: Record<string, unknown>): ProjectModelFieldUpdate | undefined
}

type ProjectModelDomain =
  | "identity"
  | "lifecycle"
  | "language"
  | "framework"
  | "runtime"
  | "capability"
  | "knowledge"
  | "unknown"
```

Each rule returns a field update with:

```ts
interface ProjectModelFieldUpdate {
  field: string
  value: unknown
  confidence: ConfidenceScore
  evidenceClaimIds: string[]
}
```

The projector collects updates by domain, resolves conflicts, composes confidence, and assembles the final `ProjectModel`.

---

## Confidence Rules

Confidence is computed separately from inference:

```ts
interface ConfidenceRule {
  id: string
  appliesTo: ProjectModelDomain
  compute(update: ProjectModelFieldUpdate, evidenceGraph: EvidenceGraph): ConfidenceScore
}
```

Default confidence composition:

- Single source: use the rule's stated confidence.
- Multiple supporting claims: raise confidence up to `certain`.
- Conflicting claims: lower confidence and record an unknown.

All confidence composition is deterministic.

---

## Schema Validation

A projection is not considered successfully produced until it validates against its declared schema.

```ts
interface ProjectionSchema<T> {
  validate(output: T): { valid: boolean; errors: string[] }
}
```

For `ProjectModel`:

- Required fields present.
- Confidence scores in valid range.
- Evidence references resolve to claims in the `EvidenceGraph`.
- No duplicate language/framework/runtime names.

Validation failures cause the projection stage to fail with a clear error, producing an `impossible` replay status.

---

## Projection Provenance

Each projection output carries provenance:

```ts
interface ProjectionOutput<T> {
  value: T
  projectionCapabilityId: string
  projectionCapabilityVersion: string
  evidenceGraphHash: string
  dependencyHashes: Record<string, string>
  producedAt: number
}
```

The session stores the raw output value for compatibility, with provenance recorded alongside the pipeline stage.

---

## Execution Flow

```text
Observation Capabilities
            │
            ▼
      Observations
            │
            ▼
      Normalize
            │
            ▼
Correlation Capabilities
            │
            ▼
      EvidenceGraph (IR)
            │
            ▼
   Projection Capabilities
            │
            ├── FindingsProjection
            ├── ProjectModelProjection
            └── (future projections)
            │
            ▼
      Validated Knowledge Models
            │
            ▼
     ReplayVerifier
```

---

## Acceptance Criteria

A successful expedition:

- [x] Generic `ProjectionCapability<TOutput>` contract is defined.
- [x] `ProjectionContext` is passed to every projection.
- [x] Projections can declare dependencies and are executed in topological order.
- [x] Dependency cycles are rejected with a clear error.
- [x] `ProjectModelProjection` is implemented as a `ProjectionCapability`.
- [x] ProjectModel inference is rule-driven via `ProjectModelRule`s.
- [x] Confidence composition is rule-driven and deterministic.
- [x] ProjectModel schema validation is part of projection completion.
- [x] Projection provenance is recorded in the session.
- [x] The existing findings projection is migrated to the new mechanism.
- [x] `npm run build` passes.
- [x] New tests pass.
- [ ] `npm run govern` passes.

---

## Architectural Principles

This expedition reinforces:

> **Projections are first-class capabilities, just like observations and correlation.**

> **ProjectModel is one projection among many future projections.**

> **Projections declare dependencies and execute as a DAG.**

> **A projection is not complete until its output validates against its schema.**

> **Confidence is composed deterministically from evidence.**

> **Projection capabilities are referentially transparent.** They never mutate the `ProjectionContext`, never mutate outputs from other projections, and only produce their declared output.

---

## Expected Outcome

After completion:

- The Discovery compiler has a generic projection extension point.
- `ProjectModelProjection` is a rule-driven, validated projection capability.
- Future projections can be added without changing the compiler engine.
- Every projection carries provenance for replay and audit.

---

## Governance

### Protected

- Projection capability contract
- Projection context contract
- Dependency DAG semantics
- Schema validation contract
- Confidence composition rules
- Projection provenance contract

### Not included

- New observation capabilities
- Additional projection implementations
- CLI projections
- Persistence layer
- Approval lifecycle
- Bootstrap integration

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-002 — Discovery Engine](EXP-DISCOVERY-002.md)
- [EXP-DISCOVERY-003 — First Observation Capabilities](EXP-DISCOVERY-003.md)
