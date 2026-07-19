> This ADR is required by **EXP-KNOWLEDGE-002 — Prototype-First Validation**.

# ADR-033 — Prototype-First Validation Semantics

## Status

Accepted

## Context

Canonical knowledge provides a versioned source of truth, but it does not prove that the understanding is correct or feasible. The missing capability is validation before implementation: acceptance scenarios, prototypes, mock APIs, simulations, and runtime verification.

EXP-PROGRAM-025 elevates prototype-first validation into a first-class product capability.

## Decision

1. The unit of prototype-first validation is the **ValidationReport**.
2. The report is derived from the Canonical Knowledge Graph.
3. Acceptance scenarios are generated from objectives and domain events.
4. Mock APIs are generated from domain events.
5. Simulation traces provide deterministic validation of event-driven scenarios.
6. Runtime verification checks capability availability before implementation.
7. A validation status of `blocked` prevents Mission approval.
8. The default adapter is deterministic and rule-based.

## Consequences

- Projects can reach Mission approval without production code.
- Acceptance criteria are traceable to knowledge graph objectives.
- Runtime feasibility is verified before implementation commitments.
- Manual validation scenarios are surfaced explicitly.

## Proof Impact

- P2 (governance integration): validation reports are deterministic artifacts produced from knowledge graphs.
- P4 (deterministic derivation): identical knowledge graphs produce identical validation reports.

## Kernel Impact

None. This ADR introduces new modules without modifying Protected Assets.

## Constitutional Baseline Impact

None.

## Related

- `docs/reference/prototype-validation-contract.md`
- `docs/expeditions/EXP-KNOWLEDGE-002.md`
- `src/knowledge/validation/`
