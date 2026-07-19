> This ADR is required by **EXP-GENESIS-001 — Genesis Lifecycle & Artifact Schema**.

# ADR-027 — Genesis Artifact Semantics

## Status

Accepted

## Context

SYNTH has a mature execution engine for Missions and Expeditions, and a hardened brownfield onboarding workflow. The missing piece is the upstream greenfield path: converting a raw operator idea into an approved Mission before any repository state exists.

EXP-PROGRAM-022 demonstrated that a First Contact Discovery workflow can produce replayable, approval-driven artifacts. EXP-PROGRAM-023 converges greenfield and brownfield onboarding on a single **Genesis** abstraction.

## Decision

The unit of greenfield onboarding is the **Genesis Artifact**:

1. It captures intent, context, constraints, scope, unknowns, architecture candidates, and verification evidence.
2. It is immutable after approval.
3. It gates Mission materialization: no repository, manifest, event log, or generated code may be created until the artifact is approved.
4. Architecture candidates are projections; only the selected architecture becomes canonical through approval.
5. The artifact schema is `synth-genesis-artifact-v1`.

The Genesis lifecycle has six phases:

```text
Intent Capture → Context Classification → Constraint Extraction
      → Scope Negotiation → Capability Verification → Mission Materialization
```

## Consequences

- Greenfield onboarding becomes deterministic and replayable.
- Genesis artifacts provide a stable contract for downstream Semantic Modeling and Knowledge programs.
- Mission Studio receives pre-validated intent rather than raw prompts.
- No governance state is created prematurely.

## References

- `docs/reference/genesis-artifact-contract.md`
- `docs/guides/greenfield-discovery-lifecycle.md`
- `src/cli/first-contact.ts`
- `src/first-contact/` modules
