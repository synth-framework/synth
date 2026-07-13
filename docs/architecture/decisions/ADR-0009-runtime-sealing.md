# ADR-0009: Runtime Sealing

## Status

Accepted

## Context

A system that allows runtime modification of its own governance configuration is a system where governance is advisory, not mandatory. If capabilities can be registered after bootstrap, new attack surface can be introduced at any time. If policies can be changed after bootstrap, the rules of authorization are fluid.

We needed a mechanism to transition from a flexible configuration phase to a locked operational phase — and for that transition to be one-way.

## Decision

The system shall support a one-way transition called "seal" that permanently freezes the system's configuration.

After seal:
- The CapabilityRegistry becomes immutable (no new capabilities)
- The PolicyEngine becomes immutable (no new policies)
- The API surface becomes immutable (no method changes)
- Invariants I1 and I5 are verified

Seal shall be irreversible without full system restart. Double-seal shall be an error.

## Alternatives

**Alternative A: No sealing**

Allow runtime registration of capabilities and policies. Rejected: this makes the system's attack surface and governance rules fluid. A compromised or buggy component could register malicious capabilities or weaken policies.

**Alternative B: Reversible seal**

Allow unsealing for configuration changes. Rejected: a reversible seal is not a seal. The whole point is to create a hard boundary between configuration and operation.

**Alternative C: Per-component sealing**

Allow sealing individual components independently. Rejected: creates complexity and potential for inconsistent states. The seal is a system-wide transition.

## Consequences

**Positive:**

- The system's attack surface is fixed after seal
- Governance rules cannot be tampered with at runtime
- The system behavior is predictable and auditable
- Seal provides a clear boundary between configuration time and runtime

**Negative:**

- Adding capabilities or policies requires system restart
- Seal makes the system less flexible for dynamic environments
- The decision to seal is irreversible for the current process lifetime

**Invariants established:**

- I5: The capability graph shall be immutable after seal
- I6: The policy graph shall be immutable after seal

## Related Decisions

- [ADR-0005: Capability Registry](ADR-0005-capability-registry.md) — The registry is frozen by seal
- [ADR-0006: Governance Layer](ADR-0006-governance-layer.md) — The policy engine is frozen by seal
- [ADR-0008: Trust Boundary](ADR-0008-trust-boundary.md) — Seal enforces trust boundary immutability
