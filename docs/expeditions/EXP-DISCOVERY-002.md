# EXP-DISCOVERY-002 — Discovery Engine

> **Discovery expedition.** This charter implements the Discovery compiler: Acquire, Normalize, Correlate, project over the EvidenceGraph (canonical IR), and Verify.

**Status:** Completed  
**Started:** 2026-07-18  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Discovery Platform  
**Depends On:** EXP-DISCOVERY-001

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

Implement the `DefaultDiscoveryEngine` as a deterministic compiler: Acquire observations from adapters, Normalize them, Correlate them into an immutable `EvidenceGraph` (canonical IR), execute registered Projections over that IR, and Verify replayability.

---

## Problem Statement

EXP-DISCOVERY-001 established the adapter contract and a stub engine. The engine currently collects observations and returns a minimal session, but it does not:

- Normalize observations into a canonical shape.
- Correlate multiple observations into evidence claims in an `EvidenceGraph`.
- Treat findings and ProjectModel as projections over the canonical IR.
- Execute projections through a registry.
- Verify full provenance during replay.

Without these stages, Discovery cannot produce the evidence-backed understanding that Brownfield Genesis and other consumers require.

---

## Motivation

The Discovery engine is the core of the Discovery Capability. It transforms raw observations into structured, replayable knowledge while preserving the invariant that evidence is canonical and all downstream artifacts are projections.

---

## Goals

The Discovery Engine shall:

- Execute the five pipeline stages deterministically.
- Keep adapters confined to the Acquire stage.
- Correlate observations into evidence claims in an immutable `EvidenceGraph`.
- Register and execute projections over the `EvidenceGraph`.
- Project findings and a ProjectModel as derived artifacts.
- Verify replay by reconstructing the `EvidenceGraph` and projections.
- Preserve full adapter provenance in the session.
- Remain read-only and never modify observed systems.

---

## Non-Goals

This expedition shall not:

- Add new source adapters (deferred to EXP-DISCOVERY-003).
- Implement persistence, approval, or governance.
- Modify Protected Assets.
- Produce events.
- Create `.synth/` artifacts.
- Implement CLI projections beyond what is needed for testing.

---

## Pipeline Stages

```text
Acquire           → adapters produce observations
Normalize         → observations are validated and canonically ordered
Correlate         → observations are transformed into an EvidenceGraph
Project           → registered projections consume the EvidenceGraph
Verify            → replay checks determinism and provenance
```

---

## DiscoverySession Aggregate Root

A completed session is immutable and contains:

- `id`, `hash`, `startedAt`, `completedAt`
- `parentSessionId` for lineage
- `sources`
- `adapters` with id, version, determinism
- `executionOrder`
- `observations` (normalized)
- `evidenceGraph` (canonical IR)
- `projections` (findings, project-model, and future projections)
- `pipeline` provenance for every stage
- `replay` result

---

## Acceptance Criteria

A successful Discovery Engine:

- [x] Executes all five pipeline stages deterministically.
- [x] Correlates multiple observations into evidence claims.
- [x] Synthesizes at least one meaningful finding category (e.g., missing artifact).
- [x] Projects a ProjectModel with identity, intent, lifecycle stage, and inventory.
- [x] Verifies replay for deterministic sessions as `exact`.
- [x] Verifies replay for environment-dependent sessions as `contextual`.
- [x] Detects tampered evidence during replay.
- [x] Preserves full adapter provenance.
- [x] `npm run build` passes.
- [x] New tests pass.
- [x] `npm run govern` passes.

---

## Architectural Principles

This expedition establishes the following invariants:

> **Adapters participate only in Acquire.**

> **Evidence is canonical; findings and ProjectModel are projections.**

> **Replay verifies the full provenance chain.**

> **Discovery shall never modify the observed system.**

---

## Expected Outcome

After completion:

- SYNTH can run a complete discovery pipeline against a filesystem source.
- The resulting session contains normalized observations, an `EvidenceGraph`, and registered projections (findings, project-model).
- Another agent can replay the session from its evidence.
- The engine is ready to support concrete adapters and bootstrap integration.

---

## Governance

### Protected

- Pipeline stage contracts
- Evidence schema
- Session immutability
- Replay semantics

### Not included

- New adapter implementations
- Persistence layer
- Approval lifecycle
- Bootstrap integration
- CLI projection

---

## Related Documents

- [EXP-PROGRAM-006 — Discovery Platform](EXP-PROGRAM-006.md)
- [EXP-DISCOVERY-001 — Source Adapter Framework](EXP-DISCOVERY-001.md)
