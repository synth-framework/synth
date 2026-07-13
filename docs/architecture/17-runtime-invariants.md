# 17 - Runtime Invariants

This document defines every invariant enforced by Synth. Each invariant has a formal identifier, description, enforcement location, and test coverage.

## Invariant Summary

| ID | Name | Enforced At |
|----|------|-------------|
| I1 | Single Mutation Authority | Bootstrap seal, runtime |
| I2 | Event Transaction Binding | CommandBus dispatch |
| I3 | Authorized Mutation Only | EventStore guard |
| I4 | Replay Consistency | ReplayVerifier |
| I5 | Immutable Capability Graph | Registry freeze, seal |
| I6 | Immutable Policy Graph | PolicyEngine freeze, seal |
| I7 | Permit Validation | ExecutionCoordinator |
| I8 | Event Chain Integrity | EventStore verifyChain |

---

## I1: Single Mutation Authority

**Identifier:** I1

**Description:** The system has exactly one component authorized to mutate persistent state. All mutations must flow through the CommandBus.

**Formal Definition:**
```
FORALL mutations m:
    EXISTS(CommandBus.dispatch(intent) = m)
    AND NOT EXISTS(otherComponent.write = m)
```

**Explanation:**
The CommandBus is the sole mutation authority. The RuntimeEngine executes domain logic but does not write to the store. The EventStore only accepts writes when the guard token is active, and only the CommandBus can activate the guard.

**Examples:**
- Valid: `api.handleIntent(request)` → CommandBus.dispatch → EventStore.append
- Invalid: Direct call to RuntimeEngine (structurally impossible)
- Invalid: Direct write to EventStore without guard (rejected by guard)

**Violation Examples:**
- RuntimeEngine.write(event) -- Runtime has no write method
- EventStore.append(event) without guard -- throws ILLEGAL_EVENTSTORE_WRITE

**Enforcement Location:**
- Bootstrap: RuntimeEngine not included in return value
- Runtime: Guard token check on EventStore writes
- Seal: Invariant assertion verified

**Tests Covering:**
- Runtime not in bootstrap return
- Guard blocks direct writes
- CommandBus is sole authority after seal

---

## I2: Event Transaction Binding

**Identifier:** I2

**Description:** Every event produced by the system belongs to exactly one transaction. All events have a transactionId field.

**Formal Definition:**
```
FORALL events e:
    e.transactionId EXISTS
    AND e.transactionId IS NOT NULL
    AND e.transactionId IS NOT EMPTY
```

**Explanation:**
Every event is produced by a transaction (a CommandBus.dispatch call). The transactionId is assigned at the start of dispatch and attached to all events produced by that dispatch.

**Examples:**
- Valid: Event with transactionId "tx-abc123"
- Invalid: Event with no transactionId (rejected by I2 assertion)

**Violation Examples:**
- Event missing transactionId -- InvariantViolation I2
- Event with null transactionId -- InvariantViolation I2

**Enforcement Location:**
- CommandBus.dispatch: I2 assertion after event production

**Tests Covering:**
- All emitted events have transactionId
- Genesis events have transactionId "genesis-tx"

---

## I3: Authorized Mutation Only

**Identifier:** I3

**Description:** No state mutation occurs without authorization. All writes to the EventStore require an active guard token.

**Formal Definition:**
```
FORALL writes w to EventStore:
    guard.isActive() = TRUE
    OR throw INVARIANT_VIOLATION
```

**Explanation:**
The EventStore has a guard mechanism. Writes are only accepted when the guard token is active. Only the CommandBus can activate the guard token, and it only activates it during dispatch.

**Examples:**
- Valid: CommandBus.dispatch activates guard, writes events, deactivates guard
- Invalid: Direct EventStore.append without guard -- throws error

**Violation Examples:**
- Direct store write outside dispatch -- ILLEGAL_EVENTSTORE_WRITE
- Guard token forged -- impossible (token is a module-level Symbol)

**Enforcement Location:**
- EventStore: Guard check on append and appendBatch

**Tests Covering:**
- Guard blocks direct writes
- Guard allows writes during dispatch
- Guard auto-deactivates after write

---

## I4: Replay Consistency

**Identifier:** I4

**Description:** Replaying the event log through the domain logic must always produce the same canonical state. The replayed state hash must match the expected hash.

**Formal Definition:**
```
FORALL eventLogs L:
    replay(L).stateHash = expectedHash(L)
```

**Explanation:**
Replay takes all events, folds them through the domain logic, and produces state. Given the same event log, replay must always produce the same state. Any divergence indicates tampering, corruption, or nondeterminism.

**Examples:**
- Valid: replay(eventLog).stateHash == expectedHash -- consistent
- Invalid: replay(eventLog).stateHash != expectedHash -- inconsistency detected

**Violation Examples:**
- Event log tampering -- chain hash break or state hash mismatch
- Domain logic change -- produces different events for same input
- Nondeterministic execution -- fingerprint mismatch

**Enforcement Location:**
- ReplayVerifier.verify(): Compares replayed hash to expected
- Background verification: After batch writes

**Tests Covering:**
- Replay produces consistent state
- Empty replay produces empty state
- Multi-entity replay produces correct state

---

## I5: Immutable Capability Graph

**Identifier:** I5

**Description:** The capability registry cannot be modified after the system is sealed. No new capabilities can be registered, and no existing capabilities can be removed.

**Formal Definition:**
```
FORALL times t AFTER seal:
    registry.register(capability) THROWS InvariantViolation
    AND registry.size() = constant
```

**Explanation:**
The capability registry is frozen at seal. The internal Map is frozen, and a _frozen flag is set. Any attempt to register a capability after seal throws an InvariantViolation.

**Examples:**
- Valid: Register capability during bootstrap (before seal)
- Invalid: registry.register(newCapability) after seal -- throws

**Violation Examples:**
- Post-seal capability registration -- InvariantViolation I5
- Post-seal capability removal -- not possible (Map is frozen)

**Enforcement Location:**
- Registry.register(): Checks _frozen flag
- Seal: Freezes the Map and sets _frozen

**Tests Covering:**
- Registry frozen after seal
- Post-seal registration throws
- Pre-seal registration succeeds

---

## I6: Immutable Policy Graph

**Identifier:** I6

**Description:** The policy engine cannot be modified after the system is sealed. No new policies can be registered, and no existing policies can be changed.

**Formal Definition:**
```
FORALL times t AFTER seal:
    policyEngine.register(policy) THROWS InvariantViolation
    AND policyEngine.policies() = constant
```

**Explanation:**
The policy engine is frozen at seal. The internal Map is frozen, and a _frozen flag is set. Any attempt to register a policy after seal throws an InvariantViolation.

**Examples:**
- Valid: Register policy during bootstrap (before seal)
- Invalid: policyEngine.register(newPolicy) after seal -- throws

**Violation Examples:**
- Post-seal policy registration -- InvariantViolation I5
- Post-seal policy modification -- not possible (Map is frozen)

**Enforcement Location:**
- PolicyEngine.register(): Checks _frozen flag
- Seal: Freezes the Map and sets _frozen

**Tests Covering:**
- Policy engine frozen after seal
- Post-seal registration throws

---

## I7: Permit Validation

**Identifier:** I7

**Description:** Every execution must be authorized by a valid InvocationPermit. The ExecutionCoordinator must verify the permit before delegating to RuntimeEngine.

**Formal Definition:**
```
FORALL executions e:
    EXISTS(permit p)
    AND InvocationPermit.verify(p, gateKey) = TRUE
    AND p.capability = e.capability
    AND p.actor = e.actor
```

**Explanation:**
The ExecutionCoordinator validates the permit signature and ensures the permit matches the invocation. If either check fails, execution is rejected with InvariantViolation.

**Examples:**
- Valid: Permit created by CommandBus, verified by Coordinator
- Invalid: Forged permit (wrong signature) -- rejected
- Invalid: Mismatched permit (different capability) -- rejected

**Violation Examples:**
- Permit with invalid signature -- InvariantViolation P1
- Permit for capability A used with invocation for capability B -- InvariantViolation P1

**Enforcement Location:**
- ExecutionCoordinator.execute(): Signature and match verification

**Tests Covering:**
- Valid permit allows execution
- Invalid permit rejects execution
- Mismatched invocation rejects

---

## I8: Event Chain Integrity

**Identifier:** I8

**Description:** The event chain must be cryptographically intact. Every hashed event must correctly link to its predecessor.

**Formal Definition:**
```
FORALL hashed events e at index i > 0:
    e.previousHash = events[i-1].eventHash
```

**Explanation:**
Each operational event contains a previousHash that must equal the preceding event's eventHash. This creates a cryptographic chain where tampering with any event invalidates all subsequent links.

**Examples:**
- Valid: Event[i].previousHash == Event[i-1].eventHash for all i
- Invalid: Event[5].previousHash != Event[4].eventHash -- chain break

**Violation Examples:**
- Tampered event log -- verifyChain reports breaks
- Corrupted storage -- verifyChain reports breaks

**Enforcement Location:**
- EventStore.verifyChain(): Checks all hash links
- EventStore.append(): Computes chain hashes on write

**Tests Covering:**
- Chain valid after operations
- Chain links are sequential
- Genesis event links to "genesis"

## Invariant Enforcement Matrix

| Invariant | Enforcement | Detection | Response |
|-----------|-------------|-----------|----------|
| I1 | Bootstrap return + guard | Structural | Structurally impossible |
| I2 | Runtime assertion | Runtime | InvariantViolation |
| I3 | Guard token | Runtime | Error thrown |
| I4 | ReplayVerifier | On-demand | Report inconsistency |
| I5 | Registry freeze | Runtime | InvariantViolation |
| I6 | PolicyEngine freeze | Runtime | InvariantViolation |
| I7 | Coordinator verify | Runtime | InvariantViolation |
| I8 | Chain hash | On-demand | Report chain break |

## Related Documents

- [03 - Principles](03-principles.md) -- Architectural principles behind invariants
- [14 - Security](14-security.md) -- Security mechanisms including invariant enforcement
