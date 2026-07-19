# ADR-019 — Greenfield Discovery Lifecycle

**Status:** Proposed  
**Date:** 2026-07-19  
**Author:** SYNTH Architecture  
**Deciders:** EXP-PROGRAM-022 — AI-Native First Contact

---

## Context

SYNTH has a well-defined brownfield onboarding path: understand an existing repository, classify it, propose governance, and initialize state. There is no equivalent path for greenfield work. When an operator starts with only an idea, the agent must invent the transition from intent to Mission, which leads to inconsistent behavior, premature repository mutation, and unclear approval boundaries.

The risk is that greenfield onboarding becomes a collection of ad hoc prompts rather than a deterministic, replayable workflow.

## Decision

Introduce a canonical **Greenfield Discovery Lifecycle** as the first-class path from operator intent to approved Mission.

The lifecycle has eight phases:

```text
Intake → Intent Extraction → Clarification → Architecture Projection →
Capability Verification → Discovery Approval → Mission Materialization →
Expedition Proposal
```

Key architectural commitments:

- **No project state before approval.** No repository, manifest, event log, or generated code may be created until the Discovery artifact is approved.
- **Discovery artifact as the unit of intent.** The artifact captures goals, audience, constraints, unknowns, architecture candidates, and a transcript. It is immutable once approved and replayable.
- **Projections, not commitments.** Architecture candidates are projections until the operator selects one and approves Discovery.
- **Capability verification gates materialization.** Missing or degraded required capabilities block Mission creation.
- **Explicit approvals.** Discovery Approval and Mission Approval are distinct, event-backed gates.

The CLI surface is `synth first-contact` with subcommands for each phase.

## Consequences

- Greenfield onboarding becomes teachable, testable, and certifiable.
- Agents no longer need to infer the workflow from the product surface.
- The Discovery artifact provides provenance for the first Mission.
- Brownfield and greenfield onboarding converge on the same Discovery abstraction with different sources.
- Implementation work is required for intent extraction, clarification, architecture projection, capability verification, and materialization.

## Proof Impact

- **P1 (Runtime correctness):** New lifecycle events (`FIRST_CONTACT_STARTED`, `DISCOVERY_APPROVED`, `MISSION_MATERIALIZED`) must be replayable.
- **P2 (Determinism):** Discovery artifact serialization and architecture projection must be deterministic.
- **P3 (Governance):** Certification scenarios must verify approval gating and no-state-before-approval.
- **P4 (Public vocabulary):** `first-contact` is a new operator-facing term but does not alter the protected seven-concept vocabulary.

## Kernel Impact

No kernel components listed in `docs/kernel-freeze.md` are modified by this ADR. The lifecycle is implemented as a product layer above the existing Discovery, Mission, and ExecutionGate primitives.

## Constitutional Baseline Impact

No changes to `docs/architecture/constitutional-baseline.md` are required. The hard constraint against state before approval reinforces the existing mutation authority of ExecutionGate.

## Related

- [EXP-PROGRAM-022 — AI-Native First Contact](../expeditions/EXP-PROGRAM-022.md)
- [EXP-AIFC-001 — Discovery Lifecycle Specification](../expeditions/EXP-AIFC-001.md)
- [Brownfield Bootstrap Specification](../guides/brownfield-bootstrap-specification.md)
- [ADR-004 — SYNTH Eras and Protected Assets](ADR-004-synth-eras-and-protected-assets.md)
