# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for Synth. Each ADR captures a significant architectural decision, including its context, the decision itself, alternatives considered, and consequences.

ADRs are numbered sequentially and are immutable once accepted. They represent the institutional memory of the project's architecture.

## Format

Each ADR follows a lightweight format:

- **Status:** Accepted, Proposed, Rejected, Superseded
- **Context:** What forces led to this decision
- **Decision:** What was decided
- **Alternatives:** What was considered and rejected
- **Consequences:** What follows from this decision

## Decisions

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-0001](ADR-0001-single-mutation-authority.md) | Single Mutation Authority | Accepted |
| [ADR-0002](ADR-0002-event-sourcing.md) | Event Sourcing | Accepted |
| [ADR-0003](ADR-0003-deterministic-replay.md) | Deterministic Replay | Accepted |
| [ADR-0004](ADR-0004-execution-gate.md) | Execution Gate | Accepted |
| [ADR-0005](ADR-0005-capability-registry.md) | Capability Registry | Accepted |
| [ADR-0006](ADR-0006-governance-layer.md) | Governance Layer | Accepted |
| [ADR-0007](ADR-0007-invocation-permit.md) | Invocation Permit | Accepted |
| [ADR-0008](ADR-0008-trust-boundary.md) | Trust Boundary | Accepted |
| [ADR-0009](ADR-0009-runtime-sealing.md) | Runtime Sealing | Accepted |
| [ADR-0010](ADR-0010-event-hash-chain.md) | Event Hash Chain | Accepted |
| [ADR-0011](ADR-0011-planning-cognition-engine.md) | Planning Cognition Engine | Accepted (revised) |

## Architecture Impact Assessments

| Document | Subject | Status |
|----------|---------|--------|
| [AIA-001](../AIA-001-planning-cognition-engine.md) | PCE Architecture Impact | Proceed with Conditions |

## Reading Order

ADRs can be read in sequence (0001 through 0011) to understand the evolution of Synth's architecture. They are independent but build on each other.

## Supremacy

The [Architectural Constitution](../constitution.md) is the highest-level artifact. ADRs derive from its provisions. In case of conflict, the Constitution prevails.
