# ADR-020 — First Contact Discovery Artifact Schema

**Status:** Proposed  
**Date:** 2026-07-19  
**Author:** SYNTH Architecture  
**Deciders:** EXP-AIFC-002 — Discovery Artifact Schema

---

## Context

The Greenfield Discovery Lifecycle (ADR-019) defines phases from operator intent to approved Mission. To make that lifecycle deterministic and replayable, the output of Discovery must be a stable, versioned artifact rather than an ad hoc data structure. Without a canonical schema, downstream phases (architecture projection, capability verification, Mission materialization) cannot validate inputs, compute hashes, or prove provenance.

## Decision

Define a canonical **First Contact Discovery Artifact** schema with the following properties:

- **Versioned.** The schema is `synth-first-contact-artifact-v1` and follows semantic versioning.
- **Complete.** It captures intent, audience, environment, capabilities, constraints, unknowns, risks, confidence, architecture candidates, selected architecture, capability verification, transcript, and provenance.
- **Deterministic.** Canonical serialization uses sorted keys, stable array ordering, and standardized timestamps so the artifact can be hashed.
- **Validatable.** A JSON Schema at `docs/schemas/first-contact-artifact.schema.json` enforces structure.
- **Immutable.** Once approved, the artifact is not mutated; later changes produce new artifacts or events.

The artifact hash excludes the `artifactHash` field itself and is computed over the canonical JSON serialization.

## Consequences

- Downstream expeditions have a stable contract to implement against.
- Replay and governance can verify artifact integrity by hash.
- Schema evolution is explicit and gated by version bumps.
- Implementers must ensure canonical serialization before hashing.

## Proof Impact

- **P2 (Determinism):** Artifact serialization and hash must be deterministic across runs.
- **P3 (Governance):** JSON Schema validation and example artifacts become part of the certification suite.
- **P4 (Public vocabulary):** The artifact is an internal implementation detail; no protected vocabulary changes.

## Kernel Impact

No kernel components listed in `docs/kernel-freeze.md` are modified by this ADR. The artifact schema is a product-layer contract.

## Constitutional Baseline Impact

No changes to `docs/architecture/constitutional-baseline.md` are required. The artifact supports the existing event model and replay contract.

## Related

- [EXP-AIFC-002 — Discovery Artifact Schema](../expeditions/EXP-AIFC-002.md)
- [First Contact Discovery Artifact Schema](../reference/first-contact-artifact-schema.md)
- [First Contact Discovery Artifact Examples](../reference/first-contact-artifact-examples.md)
- [ADR-019 — Greenfield Discovery Lifecycle](ADR-019-greenfield-discovery-lifecycle.md)
