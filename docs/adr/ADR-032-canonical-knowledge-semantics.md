> This ADR is required by **EXP-KNOWLEDGE-001 — Canonical Knowledge Model**.

# ADR-032 — Canonical Knowledge Semantics

## Status

Accepted

## Context

Semantic Modeling produces intent and domain artifacts. The missing capability is a stable, versioned source of truth that persists that understanding and projects it into Missions, Expeditions, ADRs, and documentation. Without it, generated artifacts risk becoming the source of truth, causing drift and loss of understanding.

EXP-PROGRAM-025 elevates canonical knowledge into a first-class architectural capability.

## Decision

1. The unit of canonical knowledge is the **KnowledgeGraph**.
2. The graph aligns with the Synth Knowledge Representation (SKR) node and relationship types.
3. The graph is built from the approved Intent Model and Domain Model.
4. Projections (Mission, Expedition, ADR, documentation) are derived from the graph and are not canonical.
5. The graph is versioned with lineage and provenance.
6. Semantic drift detection identifies when projections or implementation diverge from the graph.
7. The default adapter is deterministic and rule-based.

## Consequences

- Generated artifacts can be deleted and regenerated without losing understanding.
- Mission and Expedition proposals are traceable to intent and domain knowledge.
- Drift between documentation, architecture, requirements, and knowledge is detectable.
- Downstream synthesis programs receive validated, versioned knowledge.

## Proof Impact

- P2 (governance integration): knowledge graphs are deterministic artifacts produced from semantic models.
- P4 (deterministic derivation): identical inputs produce identical graphs and projections.

## Kernel Impact

None. This ADR introduces new modules without modifying Protected Assets.

## Constitutional Baseline Impact

None.

## Related

- `docs/reference/canonical-knowledge-contract.md`
- `docs/expeditions/EXP-KNOWLEDGE-001.md`
- `src/knowledge/`
- `docs/architecture/decisions/ADR-0012-canonical-knowledge-representation.md`
