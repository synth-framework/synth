# ADR-0008: Trust Boundary

## Status

Accepted

## Context

A system that claims structural enforcement must define what is being enforced and against what. If every component is trusted equally, then compromise of any component compromises the system. This makes security analysis intractable and operational isolation impossible.

We needed a trust model that classifies components by their security properties, defines clear boundaries between them, and specifies what crosses each boundary and what verification occurs at each crossing.

## Decision

The system shall have three trust zones:

**Trusted** — components that are the trusted computing base. Their correct operation is assumed.
- ExecutionGate (CommandBus)
- RuntimeEngine
- EventStore
- PolicyEngine

**Semi-Trusted** — components that enhance verification but do not have mutation authority.
- CapabilityRegistry
- ExecutionCoordinator
- InvocationPermit
- ReplayVerifier
- ExecutionFingerprint

**Untrusted** — components that are not trusted. They may fail or be compromised without affecting kernel integrity.
- API Layer
- External actors
- External adapters
- Network
- Filesystem inputs

Trust boundaries shall be explicit and minimal. Every boundary crossing shall require validation.

## Alternatives

**Alternative A: Single trust zone**

Treat all components as equally trusted. Rejected: makes the trusted computing base too large. Compromise of any component compromises the system.

**Alternative B: Two-zone model (trusted/untrusted)**

Only trusted and untrusted zones. Rejected: some components (e.g., the ExecutionCoordinator) are important for security but do not have mutation authority. A three-zone model captures this distinction.

**Alternative C: Per-component trust levels**

Define trust levels for each individual component. Rejected: creates too many boundaries to reason about. Three zones provide sufficient granularity without excessive complexity.

## Consequences

**Positive:**

- Security analysis focuses on the smallest possible trusted computing base
- Compromise of semi-trusted components does not allow state mutation
- Compromise of untrusted components has no kernel impact
- The model is simple enough to verify by inspection

**Negative:**

- The trusted computing base, while small, is critical
- Any vulnerability in a trusted component compromises the system
- The model assumes the bootstrap process is trusted

**Invariants established:**

- Trust boundaries shall be explicit
- No untrusted component shall be able to mutate state without passing through all trusted layers

## Related Decisions

- [ADR-0007: Invocation Permit](ADR-0007-invocation-permit.md) — Permits enforce the boundary between ExecutionGate and Runtime
- [ADR-0009: Runtime Sealing](ADR-0009-runtime-sealing.md) — Sealing enforces immutability of trusted components
