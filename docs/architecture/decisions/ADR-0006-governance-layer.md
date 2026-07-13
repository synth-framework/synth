# ADR-0006: Governance Layer

## Status

Accepted

## Context

Execution without authorization is not execution. It is a side effect. Most systems check permissions at the API layer — but if the execution kernel can be called directly, those permission checks are merely decorative.

We needed a governance mechanism that lives inside the kernel, not at the perimeter. A mechanism that evaluates every intent before execution, that cannot be bypassed, and that produces evidence of its decisions.

## Decision

Every intent shall be evaluated by a PolicyEngine before execution. Policies are rules with conditions, effects (ALLOW or DENY), and severity levels. A single DENY from any policy prevents execution entirely. There is no override.

Policy decisions shall be attested: each decision includes a cryptographic hash of the policies active at the time and a hash of the decision inputs. This makes policy decisions independently verifiable and tamper-evident.

The PolicyEngine shall be frozen after the system seal. No new policies may be registered in operational mode.

## Alternatives

**Alternative A: Role-based access control (RBAC)**

Define roles and assign permissions to roles. Rejected: RBAC is too coarse. Policies need to evaluate conditions based on system state (e.g., "deny if ticket is completed"), not just role membership.

**Alternative B: Attribute-based access control (ABAC)**

Use attributes of the actor, resource, and environment to make authorization decisions. Rejected: while more flexible than RBAC, ABAC introduces complexity and potential nondeterminism. Policy conditions must be pure functions.

**Alternative C: External authorization service**

Call an external service for authorization decisions. Rejected: introduces network dependency, latency, and a new trust boundary. Authorization must be local to the kernel.

## Consequences

**Positive:**

- Governance is structurally enforced, not optionally applied
- Policy decisions are deterministic and auditable
- Policy changes are detectable (attestation hash changes)
- The sealed policy engine prevents governance tampering

**Negative:**

- Policy evaluation adds latency to every mutation
- Complex policies can be hard to debug
- Policy changes require system restart

**Invariants established:**

- I6: The policy graph shall be immutable after seal
- Governance shall precede execution

## Related Decisions

- [ADR-0004: Execution Gate](ADR-0004-execution-gate.md) — The gate evaluates policies at stage 2
- [ADR-0007: Invocation Permit](ADR-0007-invocation-permit.md) — Permits are only created after policy approval
