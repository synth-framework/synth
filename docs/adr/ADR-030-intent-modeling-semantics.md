> This ADR is required by **EXP-SEMANTIC-001 — Intent Modeling Engine**.

# ADR-030 — Intent Modeling Semantics

## Status

Accepted

## Context

Genesis produces an approved artifact that captures operator intent, context, and constraints. Before SYNTH can reason about implementation, that artifact must become a canonical semantic model. The model must be independent of technology and deterministic for fixed inputs.

EXP-PROGRAM-024 elevates intent modeling from an extraction detail to a first-class architectural capability.

## Decision

1. The unit of intent modeling is the **IntentModel**.
2. The IntentModel contains typed nodes: problems, goals, stakeholders, outcomes, success criteria, assumptions, unknowns, and constraints.
3. Nodes are linked by a typed intent graph.
4. Every node carries confidence, evidence references, and adapter provenance.
5. Ambiguity and conflict are detected automatically and classified.
6. The default adapter is deterministic and rule-based.
7. The model is reproducible from the approved Genesis artifact and adapter version.

## Consequences

- Intent becomes inspectable and machine-readable.
- Requirements and acceptance criteria can be traced back to goals and problems.
- Ambiguity is surfaced before implementation planning begins.
- Downstream domain modeling receives a stable, structured input.

## Proof Impact

- P2 (governance integration): intent models are deterministic artifacts produced from Genesis.
- P3 (CLI contract): future CLI commands for semantic modeling will be covered by certification tests.
- P4 (deterministic derivation): identical artifacts produce identical models.

## Kernel Impact

None. This ADR introduces new modules without modifying Protected Assets.

## Constitutional Baseline Impact

None.

## Related

- `docs/reference/semantic-intent-contract.md`
- `docs/expeditions/EXP-SEMANTIC-001.md`
- `src/semantic-modeling/intent/`
- `docs/ubiquitous-language.md`
