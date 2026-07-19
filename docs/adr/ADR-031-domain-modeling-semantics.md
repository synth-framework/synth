> This ADR is required by **EXP-SEMANTIC-002 — Domain Modeling Engine**.

# ADR-031 — Domain Modeling Semantics

## Status

Accepted

## Context

Intent modeling produces a canonical representation of what the system should achieve. The next step is to model the problem space itself: the concepts, relationships, invariants, and boundaries that exist independently of any implementation choice.

EXP-PROGRAM-024 elevates domain modeling into a first-class architectural capability.

## Decision

1. The unit of domain modeling is the **DomainModel**.
2. The DomainModel contains entities, value objects, aggregates, relationships, invariants, policies, bounded contexts, events, and sources of truth.
3. A governed ubiquitous language is derived from the model.
4. Integrity rules detect duplicated concepts, conflicting terminology, cyclic dependencies, and inconsistent ownership.
5. Bounded contexts are derived from stakeholder ownership and natural semantic boundaries.
6. The default adapter is deterministic and rule-based.
7. The model is reproducible from the IntentModel and adapter version.

## Consequences

- The problem space becomes inspectable and machine-readable.
- Implementation stack decisions become projections of the domain model.
- Ubiquitous language prevents architectural drift.
- Downstream knowledge and validation programs receive a stable domain representation.

## Proof Impact

- P2 (governance integration): domain models are deterministic artifacts produced from intent models.
- P3 (CLI contract): future CLI commands for semantic modeling will be covered by certification tests.
- P4 (deterministic derivation): identical intent models produce identical domain models.

## Kernel Impact

None. This ADR introduces new modules without modifying Protected Assets.

## Constitutional Baseline Impact

None.

## Related

- `docs/reference/semantic-domain-contract.md`
- `docs/expeditions/EXP-SEMANTIC-002.md`
- `src/semantic-modeling/domain/`
- `docs/ubiquitous-language.md`
