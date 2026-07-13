# ADR-0007: Invocation Permit

## Status

Accepted

## Context

A single mutation authority with policy evaluation is structurally sound. But policy evaluation alone is an internal decision. If the system needs to prove that an execution was authorized — to an auditor, to another system, or to itself during replay — it needs evidence that the authorization happened.

We needed a mechanism that binds authorization to execution cryptographically, so that the evidence of authorization cannot be forged or separated from the execution it authorized.

## Decision

Every authorized execution shall be represented by an InvocationPermit: an immutable, cryptographically signed token that binds a transaction ID, capability, actor, and timestamp.

The permit shall be created by the ExecutionGate (CommandBus) and verified by the ExecutionCoordinator before delegation to the RuntimeEngine. The RuntimeEngine shall never see or verify permits. It receives only the plain invocation.

Permit signatures shall use HMAC-SHA256 with a gate key generated during bootstrap and never exposed outside the kernel.

## Alternatives

**Alternative A: No permits — policy decision is sufficient**

Trust the policy decision without cryptographic binding. Rejected: policy decisions are internal state. Without a permit, there is no evidence that can be verified independently or across system restarts.

**Alternative B: Digital signatures (asymmetric cryptography)**

Use public-key signatures instead of HMAC. Rejected: adds complexity without additional benefit in this threat model. The gate key is never exposed; asymmetric cryptography would require key management infrastructure without improving security.

**Alternative C: Runtime verifies permits**

Make the RuntimeEngine responsible for permit verification. Rejected: the Runtime should be crypto-ignorant. Its responsibility is execution, not authorization. Separating these concerns keeps the Runtime pure and simple.

## Consequences

**Positive:**

- Every execution carries cryptographic proof of authorization
- Forged permits are structurally impossible without the gate key
- Permits bind authorization to a specific (capability, actor, transaction) tuple
- The Runtime remains crypto-ignorant and purely focused on execution

**Negative:**

- Adds one cryptographic operation per mutation (HMAC-SHA256)
- Gate key loss (e.g., system restart) invalidates verification of historical permits
- Permit verification adds latency (minor: one HMAC comparison)

**Invariants established:**

- I7: Every execution shall require a validated permit
- Runtime shall remain crypto-ignorant

## Related Decisions

- [ADR-0001: Single Mutation Authority](ADR-0001-single-mutation-authority.md) — The authority creates permits
- [ADR-0004: Execution Gate](ADR-0004-execution-gate.md) — The gate creates permits at stage 4
- [ADR-0006: Governance Layer](ADR-0006-governance-layer.md) — Permits are only created after policy approval
