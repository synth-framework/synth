> This ADR is required by **EXP-GENESIS-003 — Genesis Validation & Mission Materialization**.

# ADR-029 — Genesis Validation & Mission Materialization Semantics

## Status

Accepted

## Context

Genesis captures intent and classifies context before Mission creation. The remaining gap is proving that the scoped artifact is feasible and then transforming it into a governed Mission and Expedition proposals. This decision closes the Genesis pipeline.

EXP-GENESIS-001 defined the artifact and lifecycle. EXP-GENESIS-002 defined intent capture and classification. EXP-GENESIS-003 must guarantee that capability verification, architecture projection, acceptance validation, and Mission materialization are deterministic, gated, and replayable.

## Decision

1. **Capability verification is required before materialization.**
   - The selected architecture candidate's assumptions are verified by a `CapabilityVerifier`.
   - Only `MISSING` or `DEGRADED` capabilities block materialization.
   - `UNAVAILABLE` external capabilities are warnings, not blockers.
   - Verification reports are deterministic and hashed.

2. **Architecture candidates are projections.**
   - Candidates are generated from the Genesis artifact fields.
   - They include rationale, tradeoffs, assumptions, and confidence.
   - Only the selected candidate is promoted into the approved artifact.

3. **Acceptance validation gates Mission approval.**
   - Approval requires no unresolved ambiguities, no blocking unknowns, and a passing verification report.
   - The approved artifact is hashed and stored immutably.

4. **Mission materialization is gated on approval.**
   - Materialization creates the manifest, event log, canonical state, and proposals.
   - No `.synth/data/` or manifest exists before materialization.
   - Events are chained and replayable.

5. **Expedition proposals are generated from the Mission.**
   - Default proposals cover baseline capture and architecture validation.
   - Proposals are not canonical until committed through the Expedition lifecycle.

6. **The greenfield CLI exposes a complete operator flow.**
   - `synth first-contact` is the canonical namespace.
   - `synth genesis` is an alias that dispatches to the same handlers.
   - Commands are classified by safety: read-only, proposal-only, or mutating.

## Consequences

- Greenfield onboarding is deterministic from intent to Mission.
- Materialization cannot occur without evidence of feasibility.
- Architecture exploration does not pollute canonical state.
- The CLI teaches the operator journey through help and `nextStep` hints.
- Downstream programs (Semantic Modeling, Canonical Knowledge) receive validated Genesis artifacts.

## Proof Impact

- P2 (governance integration): materialization emits replayable events.
- P3 (CLI contract): `first-contact` and `genesis` namespaces are covered by certification tests.
- P4 (deterministic derivation): approved artifact hash is stable for identical inputs.

## Kernel Impact

None. This ADR builds on the existing Mission/Expedition lifecycle and first-contact modules without modifying Protected Assets.

## Constitutional Baseline Impact

None.

## Related

- `docs/reference/genesis-verification-contract.md`
- `docs/reference/genesis-materialization-contract.md`
- `docs/reference/genesis-artifact-contract.md`
- `docs/reference/genesis-intent-capture-contract.md`
- `src/first-contact/verify/`
- `src/first-contact/materialize/`
- `src/cli/first-contact.ts`
