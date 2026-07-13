# 18 - Formal Specification

This document provides an implementation-independent specification of Synth. It describes the system's entities, state machine, execution semantics, and security guarantees without reference to any programming language or implementation detail.

This specification should be sufficient for reimplementing Synth in any language while preserving its architectural properties.

## 1. Entities

### 1.1 Intent

An **intent** is a request to execute a capability. It has the following fields:

- `actor`: identifier -- the entity requesting execution
- `capability`: name -- the capability to execute
- `payload`: map -- the capability-specific input data
- `context`: optional map -- additional execution context

### 1.2 Event

An **event** is an immutable record of a state change. It has the following fields:

- `id`: unique identifier
- `type`: event type name (e.g., TICKET_STARTED)
- `timestamp`: time of creation (milliseconds since epoch)
- `transaction_id`: identifier of the transaction that produced this event
- `capability`: name of the capability that produced this event
- `actor`: identifier of the actor who initiated the action
- `payload`: event-specific data
- `previous_hash`: hash of the preceding event (for chain-secured events)
- `event_hash`: cryptographic hash of this event

### 1.3 Transaction

A **transaction** is a logical unit of execution. It has:

- `id`: unique identifier
- `intent`: the intent being executed
- `status`: committed, rejected, or failed
- `events`: list of events produced (empty if rejected)
- `started_at`: start timestamp
- `finished_at`: end timestamp
- `before_state_hash`: state hash before execution
- `after_state_hash`: state hash after execution

### 1.4 Capability

A **capability** is a named contract describing an executable action. It has:

- `name`: unique identifier
- `input_schema`: map of field names to types
- `output_events`: list of event types the capability can produce
- `preconditions`: list of state conditions that must hold
- `side_effects`: boolean (true for mutating capabilities)

### 1.5 Policy

A **policy** is a rule governing authorization. It has:

- `id`: unique identifier
- `name`: human-readable name
- `scope`: which capabilities and actors the policy applies to
- `condition`: function (intent, state) → boolean
- `effect`: DENY or ALLOW
- `severity`: critical, high, medium, low, or informational
- `enabled`: boolean

### 1.6 InvocationPermit

An **invocation permit** is a cryptographically signed authorization token. It has:

- `tx_id`: transaction identifier
- `capability`: capability name
- `actor`: actor identifier
- `payload`: intent payload
- `timestamp`: creation time
- `signature`: HMAC-SHA256 signature

### 1.7 State

**State** is the system's current condition, derived from the event log. It contains:

- `version`: number of events applied
- `state_hash`: deterministic hash of the state
- `entities`: maps of entity identifiers to entity values
- `last_event_offset`: index of last applied event

### 1.8 ExecutionFingerprint

An **execution fingerprint** is a SHA-256 hash of a normalized execution record. It provides a deterministic proof of execution.

## 2. State Machine

The system has the following states and transitions:

```
States: { Created, Bootstrapping, Genesis, Operational, Sealed, Replaying, Shutdown }

Initial state: Created

Transitions:
    Created --bootstrap()→ Bootstrapping
    Bootstrapping --initialize()→ Genesis
    Bootstrapping --skip_genesis→ Operational
    Genesis --seal()→ Sealed
    Genesis --skip_seal→ Operational
    Operational --seal()→ Sealed
    Sealed --replay()→ Replaying
    Operational --replay()→ Replaying
    Replaying --verify()→ (Sealed | Operational)
    Sealed --shutdown()→ Shutdown
    Operational --shutdown()→ Shutdown
```

### State Invariants

- **Created:** No components exist.
- **Bootstrapping:** Components are being created and wired.
- **Genesis:** Events are being written to the raw store.
- **Operational:** System accepts intents.
- **Sealed:** Registry and policy engine are frozen.
- **Replaying:** System is verifying state consistency.
- **Shutdown:** System is terminating.

## 3. Execution Semantics

### 3.1 Dispatch

```
dispatch(intent):
    validate(intent) → valid | validation_error
    if validation_error: return REJECT(validation_error)

    permit = create_permit(intent)
    policy_result = evaluate_policy(intent, state)
    if policy_result.effect = DENY:
        return REJECT(policy_result.reason, policy_result.attestation)

    capability = resolve_capability(intent.capability)
    if capability = null:
        return NOOP

    result = execute(permit, intent)
    events = result.events
    assert_all(events have transaction_id)  // I2

    guard_activate()
    append_events(events)  // hash-chained
    guard_deactivate()

    fingerprint = compute_fingerprint(intent, events, result)
    return ACCEPT(result, fingerprint, policy_result.attestation)
```

### 3.2 Policy Evaluation

```
evaluate_policy(intent, state):
    matches = []
    for policy in active_policies:
        if not policy.enabled: continue
        if policy.scope.excludes(intent.actor): continue
        if not policy.scope.includes(intent.capability): continue
        if policy.condition(intent, state):
            matches.append(policy)

    deny = highest_severity(matches.where(effect = DENY))
    if deny exists:
        return DENY(deny.id, attestation(deny))

    return ALLOW(attestation(matches))
```

### 3.3 Execution

```
execute(permit, intent):
    assert verify_permit(permit, gate_key)  // I7
    assert permit.capability = intent.capability
    assert permit.actor = intent.actor

    state = load_state()
    domain_result = apply_domain(intent, state)
    return domain_result
```

### 3.4 State Reconstruction

```
reconstruct_state(event_log):
    state = empty_state()
    for event in event_log (in order):
        state = apply_event(state, event)
    state.state_hash = compute_state_hash(state)
    return state
```

## 4. Event Semantics

### 4.1 Event Production

Events are produced by domain logic during execution. Every event:
- Has a unique identifier
- Has a transaction identifier
- Has a timestamp
- Has a capability name
- Has an actor identifier
- Has a payload
- Has chain hashes (for operational events)

### 4.2 Event Persistence

Events are persisted to the EventStore:
- Append-only (no modification, no deletion)
- Ordered (maintain insertion order)
- Guarded (require active guard token)
- Chain-secured (each event links to predecessor)

### 4.3 Event Replay

Events are replayed by applying them in order:
- Same event log produces same state
- Chain integrity is verified before replay
- State hash is computed after replay
- Divergence indicates tampering or logic change

## 5. Policy Semantics

### 5.1 Policy Matching

A policy matches an intent if:
- The policy is enabled
- The intent's capability is in the policy's scope
- The intent's actor is not excluded by the policy
- The policy's condition evaluates to true

### 5.2 Policy Precedence

When multiple policies match:
- Results are sorted by severity (critical first)
- The highest-severity DENY determines the outcome
- If no DENY matches, ALLOW

### 5.3 Policy Identity

Policies are identified by hash, not version:
- Policy version hash: SHA-256 of all active policies
- Decision hash: SHA-256 of the specific decision inputs
- Both included in every attestation

## 6. Capability Semantics

### 6.1 Capability Resolution

Capabilities are resolved by name from the CapabilityRegistry. If the capability is not registered, the dispatch returns a NOOP (not an error).

### 6.2 Capability Execution

A capability is executed by:
1. Loading the current state
2. Calling the domain logic for the capability
3. Producing events
4. Returning the events and any result

### 6.3 Capability Extension

New capabilities can be registered before seal. After seal, the registry is immutable.

## 7. Replay Semantics

### 7.1 Replay Correctness

Replay is correct if:
- All events are applied in order
- No events are skipped
- State hash matches the expected hash
- Chain integrity is verified

### 7.2 Replay Failure

Replay fails if:
- Chain hash mismatch (tampering or corruption)
- State hash mismatch (logic change or tampering)
- Invalid entity state (domain invariant violation)

## 8. Security Guarantees

### 8.1 Execution Authorization

All executions require:
- Valid intent (schema validation)
- Policy approval (policy evaluation)
- Valid permit (HMAC-SHA256 verification)
- Guard activation (token-based write protection)

### 8.2 Tamper Detection

Tampering is detected by:
- Event chain hash verification
- State snapshot hash verification
- Execution fingerprint comparison
- Policy attestation hash comparison

### 8.3 Structural Enforcement

Architectural constraints are enforced by:
- RuntimeEngine not exported (structural)
- Guard token on EventStore (structural)
- Registry freeze after seal (structural)
- Policy engine freeze after seal (structural)

## 9. Compatibility Guarantees

### 9.1 Event Log Compatibility

The event log format is stable. Future versions must be able to read event logs from previous versions.

### 9.2 State Compatibility

State reconstruction logic must be versioned. Old events use old domain logic. New events use new domain logic.

### 9.3 Capability Compatibility

Capability names and schemas are stable. Renaming or removing capabilities is a breaking change.

## 10. Required Invariants

The following invariants must hold at all times:

- **I1:** Single mutation authority
- **I2:** All events have transaction identifiers
- **I3:** All writes require guard activation
- **I4:** Replay produces consistent state
- **I5:** Capability registry is immutable after seal
- **I6:** Policy engine is immutable after seal
- **I7:** All executions require valid permits
- **I8:** Event chain is cryptographically intact

## Related Documents

- [01 - Introduction](01-introduction.md) -- System overview
- [17 - Runtime Invariants](17-runtime-invariants.md) -- Detailed invariant descriptions
- [05 - Component Model](05-component-model.md) -- Component descriptions
