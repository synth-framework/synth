# ADR-0001: Single Mutation Authority

## Status

Accepted

## Context

A deterministic execution system must be able to answer a fundamental question about any state change: where did it come from? If multiple paths exist to modify persistent state, the system cannot reliably enforce validation, governance, or audit requirements.

In conventional software, this problem is addressed by convention. Developers agree to call specific functions, review code to catch violations, and write tests to verify behavior. This approach fails when the system grows beyond the capacity of a single reviewer's attention, or when automated agents make changes without understanding the full implications.

We needed a structural guarantee: not that developers would not bypass the rules, but that they could not.

## Decision

The system shall have exactly one component authorized to cause persistent state mutations. All state changes must flow through this single authority, and no other path to the persistent store shall exist.

This component — the CommandBus — orchestrates the entire execution pipeline: validation, policy evaluation, capability resolution, execution delegation, and event persistence. The RuntimeEngine, which executes domain logic, does not write to the store directly. The EventStore rejects all writes unless the authority has explicitly activated a guard token.

The RuntimeEngine shall not be exposed outside the kernel boundary.

## Alternatives

**Alternative A: Convention-based enforcement**

Document that all writes should go through the central handler, but allow direct store access. Rejected: conventions are respected until they are not. A system where correctness depends on developer discipline is a system where correctness is probabilistic.

**Alternative B: Multiple mutation authorities with coordination**

Allow multiple authorized writers with distributed coordination. Rejected: this introduces consensus problems, increases attack surface, and makes the system harder to reason about. Single-point ordering is a feature, not a bug.

**Alternative C: Validation at the store layer**

Move all validation to the EventStore itself, allowing writes from any component that provides valid input. Rejected: this inverts the architecture. The store should be a dumb persistence layer. Intelligence belongs in the authority.

## Consequences

**Positive:**

- Architectural correctness is structurally enforced, not conventionally assumed
- All mutations are validated, governed, and logged by construction
- The system is easier to reason about: there is exactly one place to look
- Automated agents cannot accidentally create new mutation paths

**Negative:**

- The authority becomes a throughput bottleneck (mitigated by per-partition queues)
- The authority is a single point of failure for mutations (not for reads)
- Testing requires exercising the full pipeline, not just individual functions

**Invariants established:**

- I1: There shall exist exactly one mutation authority

## Related Decisions

- [ADR-0004: Execution Gate](ADR-0004-execution-gate.md) — The gate implements the authority
- [ADR-0007: Invocation Permit](ADR-0007-invocation-permit.md) — Permits are the authorization mechanism used by the authority
- [ADR-0009: Runtime Sealing](ADR-0009-runtime-sealing.md) — Sealing prevents runtime changes to the authority's configuration
