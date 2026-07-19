> This ADR is required by **EXP-GENESIS-002 — Genesis Intent Capture & Classification**.

# ADR-028 — Genesis Intent Capture Semantics

## Status

Accepted

## Context

Genesis must turn unstructured operator input into a classified, scoped artifact before Mission materialization. The artifact needs to capture not just what the operator said, but what they meant, under what constraints, and with what unknowns.

EXP-PROGRAM-022 proved that a deterministic First Contact workflow can extract intent, detect ambiguity, and generate clarification questions. EXP-PROGRAM-023 elevates that workflow into the canonical Genesis intent capture layer.

## Decision

1. Intent capture produces an `IntentExtractionResult` with structured fields for intent, audience, environment, capabilities, constraints, unknowns, and confidence.
2. Context classification assigns repository type, phase, implementation state, and source history.
3. Constraint extraction separates functional and non-functional constraints.
4. Scope negotiation uses MoSCoW priorities and recommends an MVP boundary.
5. Ambiguity detection generates clarification questions; blocking unknowns prevent approval.
6. Every field is traceable to evidence and transcript entries.
7. Adapters are versioned and deterministic for fixed inputs.

## Consequences

- Genesis artifacts are inspectable and replayable.
- Operators can verify why the artifact contains each value.
- Two agents using the same adapter version converge on substantially equivalent artifacts.
- Mission Studio receives validated, classified intent rather than raw prompts.

## References

- `docs/reference/genesis-intent-capture-contract.md`
- `docs/reference/genesis-artifact-contract.md`
- `src/first-contact/extract/types.ts`
- `src/first-contact/clarify/types.ts`
