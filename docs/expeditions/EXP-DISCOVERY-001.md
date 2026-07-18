# EXP-DISCOVERY-001 — Source Adapter Framework

> **Discovery expedition.** This charter defines the source abstraction, adapter contract, adapter registry, and capability interface for the SYNTH Discovery Platform.

**Status:** Completed  
**Started:** 2026-07-18  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-INIT-001, EXP-GOV-007

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

Define and implement the source abstraction, adapter contract, adapter registry, and `DiscoveryCapability` interface so that future Discovery stages are source-agnostic and consumers depend only on the capability contract.

---

## Problem Statement

Current SYNTH has no unified way to inspect external systems before governance begins. Existing repository analysis is embedded in CLI-specific bootstrap code and cannot be reused by Mission Studio, MCP, IDE, Web UI, or automation.

As a result:

- Repository inspection is coupled to bootstrap.
- Adapter logic is mixed with CLI concerns.
- New source types require redesigning existing code.
- Replay and provenance are impossible to verify.

---

## Motivation

Discovery must become a platform capability. Before the engine, synthesizer, or consumers can exist, there must be a stable contract between sources and adapters.

A well-defined adapter framework enables:

- Source-agnostic discovery.
- Deterministic adapter selection and ordering.
- Immutable observations with provenance.
- Future extension to Git, GitHub, APIs, databases, deployments, and containers.

---

## Goals

The Source Adapter Framework shall:

- Define a source-agnostic `DiscoverySource` union.
- Define an immutable `Observation` type.
- Define a `DiscoveryAdapter` contract.
- Provide an adapter registry with deterministic resolution.
- Expose a `DiscoveryCapability` interface for consumers.
- Remain read-only and never modify observed systems.

---

## Non-Goals

This expedition shall not:

- Implement the full Discovery engine pipeline.
- Synthesize evidence, findings, or ProjectModel.
- Implement persistence, approval, or governance.
- Modify Protected Assets.
- Produce events.
- Create `.synth/` artifacts.

---

## Lifecycle

```text
DiscoveryInput
        |
        v
Adapter Registry
        |
        v
DiscoveryAdapter(s)
        |
        v
Observations
        |
        v
Future: Engine → Evidence → Findings → ProjectModel
```

---

## Source Types

The framework supports an extensible set of source descriptors:

- `filesystem` — local directory
- `git` — Git repository
- `github` — GitHub repository
- `knowledge` — knowledge package
- `tickets` — ticket system
- `api` — API endpoint
- `deployment` — running deployment
- `database` — database connection
- `container` — container image

---

## Adapter Contract

```ts
interface DiscoveryAdapter {
  id: string
  version: string
  determinism: "deterministic" | "environment-dependent"
  canHandle(source: DiscoverySource): boolean
  collectObservations(
    source: DiscoverySource,
    context: DiscoveryContext,
  ): Promise<Observation[]>
}
```

Adapters produce only immutable facts. They do not interpret, synthesize, or emit findings.

---

## Capability Contract

```ts
interface DiscoveryCapability {
  discover(input: DiscoveryInput): Promise<DiscoverySession>
  replay(session: DiscoverySession): Promise<ReplayResult>
}
```

Consumers depend only on `DiscoveryCapability`. `DefaultDiscoveryEngine` is the internal implementation.

---

## Acceptance Criteria

A successful Source Adapter Framework:

- [x] Defines `DiscoverySource`, `DiscoveryInput`, `Observation`, and `DiscoveryAdapter` contracts.
- [x] Defines `DiscoveryCapability` interface.
- [x] Implements an adapter registry with deterministic resolution.
- [x] Provides a stub `DefaultDiscoveryEngine` implementing `DiscoveryCapability`.
- [x] Adapters declare `canHandle` and `determinism` correctly.
- [x] Adapters return observations with required provenance.
- [x] Adapters do not modify sources.
- [x] `npm run build` passes.
- [x] New tests pass.

---

## CLI Changes

No CLI changes in this expedition. The CLI projection is deferred to EXP-DISCOVERY-002 and EXP-DISCOVERY-005.

---

## Architectural Principles

This expedition establishes the following invariants:

> **Adapters produce only immutable facts.**

> **Adapters participate only in the Acquire stage.**

> **Discovery is source-agnostic.**

> **Consumers depend on the capability contract, not adapter implementations.**

---

## Expected Outcome

After completion:

- SYNTH has a stable source abstraction and adapter contract.
- New source types can be added without redesigning Discovery.
- The Discovery engine can be built on top of this framework.
- Consumers have a single capability interface to depend on.
- The foundation for replayable, evidence-backed discovery is in place.

---

## Governance

### Protected

- Adapter contract
- Observation schema
- Source abstraction
- Capability interface

### Not included

- Engine pipeline implementation
- Evidence synthesis
- Finding synthesis
- ProjectModel projection
- Persistence
- Approval lifecycle
- Bootstrap integration
- CLI projection

---

## Completion Notes

EXP-DISCOVERY-001 was completed on 2026-07-18.

Delivered:

- Source-agnostic `DiscoverySource` union.
- Immutable `Observation` contract with adapter provenance.
- `DiscoveryAdapter` contract with determinism declaration.
- `DiscoveryCapability` public interface.
- Deterministic adapter registry.
- `DefaultDiscoveryEngine` stub implementing the capability.
- Filesystem discovery adapter as the first concrete adapter.
- 15 passing tests covering capability and adapter contracts.
- Full `npm run govern` validation passed.

Next: EXP-DISCOVERY-002 — Discovery Engine.

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-PROGRAM-004 — First Contact Program](EXP-PROGRAM-004.md)
- [EXP-INIT-001 — Adapter-based Project Bootstrap](EXP-INIT-001.md)
- [EXP-GOV-007 — Canonical State Resolution & Status Authority](EXP-GOV-007.md)
