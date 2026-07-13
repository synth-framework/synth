# ADR-0004: Execution Gate

## Status

Accepted

## Context

A single mutation authority is necessary but not sufficient. The authority itself must be structured so that every mutation passes through validation and governance before execution. If the authority can execute intents without validation, the validation layer is merely decorative.

We needed a design where the mutation authority enforces a strict pipeline: validation, then governance, then execution, then persistence. Each stage is mandatory. None can be skipped.

The question was where this pipeline lives and how it is enforced.

## Decision

The CommandBus shall serve as the Execution Gate. It shall enforce a strict, ordered pipeline for every mutation:

1. VALIDATE — schema-level validation of the intent
2. POLICY_CHECK — authorization evaluation
3. RESOLVE_CAPABILITY — look up the capability
4. CREATE_PERMIT — sign an invocation permit
5. EXECUTE — delegate to the runtime through the ExecutionCoordinator
6. EMIT_EVENTS — collect events from execution
7. GUARDED_PERSIST — write events through the guarded store
8. FINGERPRINT — compute deterministic proof

No stage shall be optional. No stage shall be bypassable. The pipeline shall be the only path from intent to persisted event.

## Alternatives

**Alternative A: Middleware-based validation**

Use a middleware chain where validation and policy are pluggable interceptors. Rejected: middleware can be reordered, disabled, or bypassed by configuration. The pipeline must be structural, not configurable.

**Alternative B: Decorator pattern**

Wrap the execution function with validation and policy decorators. Rejected: decorators can be removed or reordered. The enforcement must be internal to the authority, not external to it.

**Alternative C: Separate validation service**

Call an external validation service before executing. Rejected: introduces network dependency and latency. Validation must be synchronous and local to the authority.

## Consequences

**Positive:**

- Every mutation is validated, governed, and logged by construction
- The pipeline is the only path — there are no shortcuts
- The design is easy to verify: one function to audit

**Negative:**

- The CommandBus is a large, complex component
- Adding a new pipeline stage requires modifying the CommandBus
- The entire pipeline runs synchronously for each mutation

**Invariants established:**

- I1: There shall exist exactly one mutation authority
- I3: No state mutation shall occur without authorization

## Related Decisions

- [ADR-0001: Single Mutation Authority](ADR-0001-single-mutation-authority.md) — The gate implements the authority
- [ADR-0007: Invocation Permit](ADR-0007-invocation-permit.md) — Permits are created at stage 4 of the pipeline
