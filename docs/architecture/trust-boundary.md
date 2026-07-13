# Synth v2 — Trust Boundary Document

## Purpose

This document defines where trust begins and ends in the Synth execution kernel. It is written to survive language rewrites, framework changes, and implementation refactoring. The security model is captured independently of any specific code.

Every future contributor should be able to answer one question after reading this:

> **Where does trust begin and end?**

---

## System Classification

Synth is a **cryptographically sealed, event-sourced execution kernel** with a single enforced mutation authority.

It is NOT:
- A workflow engine
- An AI pipeline
- A general-purpose framework

It IS:
- A deterministic execution substrate with governance as a cryptographic primitive
- A system where incorrect execution is structurally impossible
- A trust boundary that is closed, not merely documented

---

## Trust Zones

### Trusted Components (Core Kernel)

These components constitute the trusted computing base. They are assumed correct, and their integrity is enforced structurally.

| Component | Role | Enforcement |
|-----------|------|-------------|
| **ExecutionGate** (CommandBus) | Sole mutation authority | Structural: only exported mutation path |
| **RuntimeEngine** | Pure execution operator | Structural: non-exported, crypto-ignorant |
| **EventStore** | Append-only truth log | Cryptographic: hash-chained events |
| **PolicyEngine** | Deterministic constraint evaluator | Frozen after bootstrap, hash-identified |

**Properties of Trusted Components:**
- They do not call into untrusted code during mutation
- They are frozen after bootstrap (`Object.freeze()` + internal `_frozen`)
- Their state is verifiable (hashes, attestations, chain integrity)
- They are never directly exposed to external input without validation

---

### Semi-Trusted Components

These components are trusted to function correctly but do not have mutation authority. Their failure cannot corrupt state.

| Component | Role | Trust Model |
|-----------|------|-------------|
| **CapabilityRegistry** | Intent → capability mapping | Read-only after seal; frozen |
| **ExecutionCoordinator** | Permit validation → runtime delegation | Validates permits; cannot execute without permit |
| **InvocationPermit** | Signed execution authorization | HMAC-SHA256 signed by ExecutionGate |
| **ReplayVerifier** | State reconstruction validation | Pure function of EventStore; detects tampering |
| **ExecutionFingerprint** | Determinism proof per command | SHA-256 of normalized execution record |

**Properties of Semi-Trusted Components:**
- They enhance verification but are not required for safety
- They operate on read-only or derived data
- Their output is independently checkable

---

### Untrusted Components

These components are NOT trusted. They may fail, be compromised, or behave maliciously without affecting kernel integrity.

| Component | Attack Surface | Mitigation |
|-----------|---------------|------------|
| **API** (SynthAPI) | Receives all external requests | Validation → Policy → Permit → Guard |
| **Users / Actors** | May send arbitrary intents | Schema validation + policy engine |
| **External adapters** | Input transformation | Untrusted: must pass through validation |
| **Plugins** | Potential code injection | No plugin system in kernel; external only |
| **Network** | Transport layer | Not used by kernel; external concern |
| **Filesystem inputs** | Persistence layer | Hash-verified on load |

**Key Invariant:**
> No untrusted component can mutate state without passing through all trusted layers.

---

## Boundary Definitions

### Boundary 1: API → ExecutionGate

```
[Untrusted: API request]
        ↓
[VALIDATE] — rejects malformed input
        ↓
[Trusted: ExecutionGate]
```

- **What enters:** Actor, capability, payload (all validated)
- **What leaves:** InvocationPermit (signed), or rejection
- **What must be verified:** Input schema, actor identity, capability existence
- **Assumptions:** Validator is pure and correct

### Boundary 2: ExecutionGate → Runtime

```
[Trusted: ExecutionGate]
        ↓
[POLICY CHECK] — rejects unauthorized intents
        ↓
[PERMIT CREATE] — signs InvocationPermit
        ↓
[Trusted: ExecutionCoordinator] — validates permit
        ↓
[Trusted: RuntimeEngine] — executes (crypto-ignorant)
```

- **What enters:** Validated intent + signed permit
- **What leaves:** Domain result (events), transaction record
- **What must be verified:** Permit signature matches ExecutionGate key
- **Assumptions:** ExecutionCoordinator and Runtime are not subverted (structurally enforced)

### Boundary 3: Runtime → EventStore

```
[Trusted: RuntimeEngine]
        ↓
[GUARD ACTIVATE] — token from CommandBus
        ↓
[Trusted: EventStore.append] — hash-chained write
        ↓
[Persistence: Filesystem]
```

- **What enters:** Events with transaction IDs
- **What leaves:** Persisted events with chain hashes
- **What must be verified:** Guard token is active; events have txId
- **Assumptions:** Filesystem is append-only (enforced by L2 guard)

### Boundary 4: EventStore → State Reconstruction

```
[Persistence: Event log]
        ↓
[Trusted: rebuildState] — pure fold
        ↓
[State hash] — deterministic verification
```

- **What enters:** Event log (hash-verified)
- **What leaves:** Canonical state + state hash
- **What must be verified:** Replay hash matches stored hash
- **Assumptions:** rebuildState is a pure function (no side effects)

---

## Cryptographic Primitives

| Primitive | Purpose | Algorithm |
|-----------|---------|-----------|
| Execution permit signing | Prove intent was authorized by ExecutionGate | HMAC-SHA256 |
| Event chain hashing | Tamper-evident append-only log | SHA-256 |
| Execution fingerprint | Deterministic proof per command | SHA-256 |
| Policy attestation | Immutable policy identity | SHA-256 |
| State integrity | Verify state file not tampered | computeStateHash (deterministic) |

---

## Invariant Summary

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| I1 | Every mutation has exactly one authority | `CommandBus` is sole exported mutation path |
| I2 | Every event belongs to one transaction | Runtime assertion on `transactionId` |
| I3 | No state mutation without authorization | Guard token (`GUARD_PASS`) required |
| I4 | Replay produces identical state | Hash comparison: replay vs stored |
| I5 | Capability graph is immutable after bootstrap | `registry.freeze()` + `_frozen` check |
| P2 | State file integrity is verifiable | Hash saved alongside state, verified on load |

---

## Attack Model

| Attack | Target | Result |
|--------|--------|--------|
| Direct Runtime call | Bypass ExecutionGate | **Prevented:** Runtime not exported |
| Direct EventStore write | Inject events | **Prevented:** Guard token required |
| Post-seal capability add | Expand attack surface | **Prevented:** Registry frozen |
| Post-seal policy change | Change governance | **Prevented:** Policy engine frozen |
| Tampered state file | Corrupt state | **Prevented:** Hash mismatch on load |
| Tampered event log | Corrupt history | **Detectable:** Chain hash verification fails |
| Invalid permit | Execute without authorization | **Prevented:** Coordinator rejects invalid permits |
| API surface mutation | Runtime monkey-patching | **Prevented:** Objects frozen after seal |

---

## Document Version

- **Version:** 2.0
- **Date:** 2026-06-28
- **Applies to:** Synth v2 with P0 (Structural Closure) + P1 (Crypto Attestation) + P2 (Hardening)
- **Author:** Synth System Architecture
- **Review cycle:** On any change to trust boundaries or enforcement mechanisms
