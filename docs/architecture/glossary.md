# Glossary

Terms used throughout the Synth documentation. Each term is defined once here and used consistently across all documents.

---

## Actor

An entity that initiates an intent. An actor has an identity (a string identifier) and is the subject of policy evaluation. Actors may be users, systems, services, or automated processes.

## Attestation

A cryptographic proof that a policy decision was made at a specific point in time using a specific set of policies. An attestation includes a *decision hash* and a *policy version hash*.

## Bootstrap

The initialization sequence that creates and wires all system components. Bootstrap produces a fully functional system in either pre-seal or sealed state. See [15 - Bootstrap and Genesis](15-bootstrap-genesis.md).

## Capability

A named, versioned contract describing an action the system can perform. A capability declares its input schema, output events, preconditions, and side-effect status. See [07 - Capability Model](07-capability-model.md).

## Canonical State

The authoritative system state derived by folding all events in the event log through the domain logic. The canonical state is not stored directly; it is computed on demand.

## Chain Hash

A cryptographic hash that links each event to its predecessor. Each event contains a `previousHash` (the hash of the preceding event) and an `eventHash` (the hash of its own content including the previous hash). See [09 - Event Model](09-event-model.md).

## CommandBus

The single mutation authority of the system. All state changes must flow through the CommandBus's `dispatch` method. It orchestrates validation, policy evaluation, capability resolution, execution, and event persistence. See [05 - Component Model](05-component-model.md).

## Decision Hash

A SHA-256 hash of the inputs and matched policies for a specific policy evaluation. The decision hash changes if any input or matched policy changes, making each policy decision uniquely identifiable.

## Deterministic Execution

The property that given the same inputs, the system always produces the same outputs. Determinism is a structural property of Synth, not a tested-for behavior.

## Domain

The pure logic layer that defines entity lifecycles and state transitions. The domain contains no side effects, no I/O, and no reference to infrastructure. See [05 - Component Model](05-component-model.md).

## Environment Layer

The boundary between SYNTH Core and the execution environment. It observes the environment, classifies it, resolves capability providers, and produces replayable discovery evidence, so that Core logic never depends on a specific platform, runtime, or toolchain. See [Environment Layer Reference](../reference/environment-layer.md).

## Event

An immutable record of something that happened in the system. Events have a type, payload, timestamp, transaction ID, capability, and actor. Events are the only mechanism for state mutation. See [09 - Event Model](09-event-model.md).

## Event Log

The append-only sequence of all events in the system. The event log is the single source of truth. All state is derived from it.

## Event Sourcing

The architectural pattern where state is not stored directly but is derived by applying events in sequence to an initial state. See [03 - Principles](03-principles.md) and [09 - Event Model](09-event-model.md).

## ExecutionContract

The formal pipeline that every mutation follows: VALIDATE → POLICY_CHECK → RESOLVE_CAPABILITY → EXECUTE_DOMAIN → EMIT_EVENTS → PERSIST_EVENTS → REBUILD_STATE → COMMIT_TRANSACTION.

## ExecutionCoordinator

The component that validates *invocation permits* before delegating to the *RuntimeEngine*. The ExecutionCoordinator is the only component that verifies permit signatures. See [05 - Component Model](05-component-model.md).

## ExecutionFingerprint

A SHA-256 hash of the normalized execution record (command, capability, events, result). Fingerprints provide a deterministic proof of execution that can be compared across replays. See [10 - Determinism](10-determinism.md).

## ExecutionGate

The conceptual boundary through which all mutations must pass. In Synth, the ExecutionGate is implemented by the *CommandBus* combined with the *PolicyEngine* and *ExecutionCoordinator*.

## Genesis

The initial population of the event log before the system enters operational mode. Genesis writes events through a raw (unguarded) store because the full execution pipeline is not yet available. See [15 - Bootstrap and Genesis](15-bootstrap-genesis.md).

## Guard

The token-based write protection mechanism on the event store. Only the CommandBus can activate the guard token, making direct store writes structurally rejected. See [14 - Security](14-security.md).

## Immutable History

The property that events in the log are never modified or deleted. The log is append-only. This is [Principle 7](03-principles.md) of the Synth architecture.

## Intent

A request to execute a capability. An intent contains an actor, a capability name, and a payload. Intents are validated, authorized, and executed by the execution pipeline.

## Invariant

A property that must always hold true. Invariants are identified as `I1`, `I2`, etc. and are enforced at runtime. See [17 - Runtime Invariants](17-runtime-invariants.md).

## InvocationPermit

A cryptographically signed token authorizing a specific execution. Created by the ExecutionGate, validated by the ExecutionCoordinator. Contains a transaction ID, capability, actor, timestamp, and HMAC-SHA256 signature.

## Kernel

The core execution system comprising the CommandBus, RuntimeEngine, EventStore, PolicyEngine, and related components. The kernel does not include adapters, UI, or external integrations.

## Partition

A logical shard of the command queue. Commands are routed to partitions based on a partition key, and commands within a partition are executed sequentially.

## Policy

A rule evaluated by the *PolicyEngine* that determines whether an intent is authorized. Policies have a condition, effect (ALLOW or DENY), scope, and severity. See [08 - Governance](08-governance.md).

## PolicyEngine

The component that evaluates intents against registered policies. The PolicyEngine is frozen after bootstrap seal. See [05 - Component Model](05-component-model.md).

## Policy Version Hash

A SHA-256 hash of all active policies in the PolicyEngine. Changes whenever a policy is added, removed, or modified.

## Replay

The process of reconstructing state by folding all events through the domain logic. Replay is used for verification, debugging, and state reconstruction. See [11 - Replay](11-replay.md).

## RuntimeEngine

The pure execution operator that applies domain logic to produce events. The RuntimeEngine does not validate input, check policy, or verify permits. It receives pre-authorized invocations and produces event sets.

## Seal

The one-way transition from bootstrap mode to operational mode. After seal, the capability registry, policy engine, and API surface are frozen. The system cannot be unsealed without restart.

## Single Mutation Authority

The architectural principle that exactly one component is authorized to mutate persistent state. In Synth, this is the CommandBus. See [03 - Principles](03-principles.md).

## State Hash

A deterministic hash of the system state. The state hash is computed from the set of entity IDs and their statuses, not from the full entity content. Used for replay verification and state file integrity.

## Structural Enforcement

The architectural principle that constraints are enforced by the structure of the code, not by convention or documentation. See [03 - Principles](03-principles.md).

## Token (Guard Token)

A symbolic authorization that must be active for the event store to accept writes. Only the CommandBus can activate and deactivate the guard token.

## Transaction

A logical unit of execution comprising an intent, its validation, policy evaluation, domain execution, event emission, and persistence. Every transaction has a unique identifier that is attached to all events it produces.

## Trust Boundary

A boundary between components with different trust levels. Data crossing a trust boundary must be validated. See [13 - Trust Boundaries](13-trust-boundaries.md).

## Validation

Schema-level checking of intents before policy evaluation. Validation ensures required fields are present and correctly typed. Validation failures are rejected before policy is consulted.

## Verifier

A component that checks the integrity of the system. The *ReplayVerifier* checks that replay produces consistent state. The *EventStore* verifies chain hash integrity.
