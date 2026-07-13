# 14 - Security

This document describes Synth's security mechanisms: execution permits, cryptographic signatures, hash chains, policy attestation, reflection protection, runtime sealing, and tamper detection.

## Security Architecture

Synth's security model is defense in depth: multiple layers of protection, each sufficient on its own, together providing comprehensive security.

```mermaid
flowchart LR
    A[External Request] --> B[Validation]
    B --> C[Policy Engine]
    C --> D[Permit Signing]
    D --> E[Permit Verification]
    E --> F[Guard Token]
    F --> G[Chain Hash]
    G --> H[State Hash]
```

Each layer is independent. Bypassing one does not bypass the others.

## Execution Permits

### What They Are

An InvocationPermit is a cryptographically signed authorization for a specific execution. It binds:
- A transaction ID
- A capability name
- An actor identity
- A timestamp
- A cryptographic signature

### How They Work

1. **Creation:** The ExecutionGate creates a permit using HMAC-SHA256 with a secret gate key
2. **Verification:** The ExecutionCoordinator verifies the signature using the same gate key
3. **Binding:** The permit's capability and actor must match the invocation being executed

### Security Properties

- **Unforgeable:** Without the gate key, permits cannot be forged
- **Bound:** A permit is valid only for its specific (capability, actor, txId)
- **Time-limited:** The timestamp allows temporal validation
- **Unique:** Each permit has a unique transaction ID

## Cryptographic Signatures

Synth uses HMAC-SHA256 for all signatures:

| Signature | Purpose | Key |
|-----------|---------|-----|
| InvocationPermit | Authorize execution | Gate key (256-bit random) |
| Event chain hash | Link events cryptographically | Previous event's hash |
| ExecutionFingerprint | Prove determinism | Content-derived |
| Policy attestation | Prove policy identity | Active policy set |
| State integrity | Detect state tampering | State content |

### Key Management

- The gate key is generated during bootstrap as a 256-bit random value
- It is shared only between the ExecutionGate and the ExecutionCoordinator
- It is never exposed through the public API
- It is never persisted to disk
- A system restart generates a new gate key

## Hash Chains

### What They Are

Every operational event contains two hash fields that create a chain:

- **previousHash:** The hash of the preceding event
- **eventHash:** The hash of this event (including previousHash)

### How They Work

```
Event 0: previousHash = "genesis", eventHash = SHA-256(event0 + "genesis")
Event 1: previousHash = eventHash_0, eventHash = SHA-256(event1 + eventHash_0)
Event 2: previousHash = eventHash_1, eventHash = SHA-256(event2 + eventHash_1)
...
```

### Tamper Detection

If an attacker modifies Event 1:
- Event 1's eventHash no longer matches its content
- Event 2's previousHash no longer matches Event 1's (modified) eventHash
- `verifyChain()` detects the break

### Properties

- **Sequential:** Each event links to exactly one predecessor
- **Cumulative:** Modifying any event invalidates all subsequent hashes
- **Verifiable:** Chain integrity can be checked in O(n) time
- **Append-only:** New events extend the chain without modifying existing links

## Policy Attestation

### What It Is

Policy attestation is cryptographic proof that a policy decision was made using a specific set of policies.

### Components

- **Policy Version Hash:** SHA-256 of all active policies. Changes if any policy is added, removed, or modified.
- **Decision Hash:** SHA-256 of the specific inputs and matched policies for one decision.

### Security Properties

- **Immutable:** Once computed, a decision hash cannot be changed without changing the inputs
- **Verifiable:** The policy version hash can be independently computed and compared
- **Tamper-evident:** If policies change after a decision, the attestation hash reveals the discrepancy

## Reflection Protection

### What It Is

Reflection protection prevents runtime modification of system components through monkey-patching or property assignment.

### How It Works

After seal, critical components are frozen:
- **API surface:** `Object.freeze(api)` prevents property addition/deletion
- **Registry:** Internal `_frozen` flag + `Object.freeze(registry.map)`
- **Policy engine:** Internal `_frozen` flag + `Object.freeze(policies)`

### What Is Protected

| Component | Protection | What It Prevents |
|-----------|-----------|------------------|
| API | Frozen object | Adding methods, replacing handleIntent |
| Registry | Frozen + flag | Registering capabilities post-seal |
| Policy engine | Frozen + flag | Registering policies post-seal |

### What Is NOT Protected (and Why)

| Component | Why Not Frozen | Reason |
|-----------|---------------|--------|
| CommandBus | Has mutable operational state | mutationCount, queues need to change |
| EventStore | Needs to append | Append-only is the protection, not freezing |
| RuntimeEngine | Not exported | Protected by being unreachable |

## Runtime Sealing

### What It Is

Runtime sealing is the one-way transition from flexible bootstrap mode to locked operational mode.

### What Happens at Seal

1. Capability registry becomes immutable
2. Policy engine becomes immutable
3. API surface becomes immutable
4. Invariants I1 and I5 are verified
5. System enters operational mode

### Security Properties

- **Irreversible:** Seal cannot be undone without system restart
- **Detectable:** The `isSealed` property reports the current state
- **Enforced:** Post-seal mutation attempts throw InvariantViolation

## Tamper Detection

Synth has multiple tamper detection mechanisms:

| Mechanism | Detects | How |
|-----------|---------|-----|
| Chain hash verification | Event log tampering | `verifyChain()` checks hash links |
| State hash verification | State file tampering | `load()` checks stored vs computed hash |
| Fingerprint comparison | Logic drift | Compare fingerprints across replays |
| Policy attestation | Policy tampering | Decision hash changes if policies change |
| Invariant assertions | Structural violations | Runtime checks for I1-I5 |

## Security Invariants

| Invariant | Description |
|-----------|-------------|
| SEC1 | All mutations require a valid InvocationPermit |
| SEC2 | The EventStore only accepts writes with an active guard token |
| SEC3 | The RuntimeEngine is not addressable outside the kernel |
| SEC4 | The capability registry is immutable after seal |
| SEC5 | The policy engine is immutable after seal |
| SEC6 | Event chain hashes are verified on replay |
| SEC7 | State snapshots are hash-verified on load |
| SEC8 | Policy decisions include attestation hashes |

## Related Documents

- [13 - Trust Boundaries](13-trust-boundaries.md) -- Trust model and threat analysis
- [08 - Governance](08-governance.md) -- Policy evaluation and permits
- [17 - Runtime Invariants](17-runtime-invariants.md) -- All runtime invariants including security
