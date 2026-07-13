# ADR-0005: Capability Registry

## Status

Accepted

## Context

A system without an explicit capability model operates on implicit assumptions about what actions are possible. Every function that can be called is a potential capability — but without registration, the system cannot validate, govern, or audit these capabilities consistently.

We needed a mechanism to make the system's functional surface explicit: a catalog of actions that are known, validatable, governable, and extensible. Unknown actions should not produce errors — they should produce defined behavior (specifically, a noop) that the system can reason about.

## Decision

All executable actions shall be registered as named capabilities in a CapabilityRegistry. The registry shall define each capability's input schema, output events, preconditions, and side-effect status.

If an intent references a capability not present in the registry, the dispatch shall return a noop — not an error. This ensures the system remains stable in the face of unknown capabilities.

The registry shall be frozen after the system seal. No new capabilities may be registered in operational mode.

## Alternatives

**Alternative A: Function-based dispatch**

Allow intents to invoke any function by name. Rejected: no validation, no governance, no schema enforcement. This is the implicit model the capability registry replaces.

**Alternative B: Error on unknown capability**

Throw an error when an unknown capability is referenced. Rejected: errors are disruptive. A noop is deterministic, predictable, and allows the system to handle unknown capabilities gracefully.

**Alternative C: Dynamic capability loading**

Allow capabilities to be loaded at runtime from external sources. Rejected: dynamic loading introduces security risks and violates the sealed system model. Capabilities must be registered during bootstrap before the seal.

## Consequences

**Positive:**

- The system's functional surface is explicit and auditable
- Every capability is validated, governed, and logged
- Unknown capabilities produce predictable behavior
- The registry is immutable after seal, preventing attack surface expansion

**Negative:**

- Adding a capability requires a system restart (bootstrap + seal)
- The registry is a single point of configuration
- All capabilities must be known at bootstrap time

**Invariants established:**

- I5: The capability graph shall be immutable after seal
- Unknown capabilities shall produce a noop, not an error

## Related Decisions

- [ADR-0006: Governance Layer](ADR-0006-governance-layer.md) — Policies govern capabilities
- [ADR-0009: Runtime Sealing](ADR-0009-runtime-sealing.md) — Sealing freezes the registry
