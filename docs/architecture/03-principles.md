# 03 - Principles

## Principle 1: Single Mutation Authority

**Statement:** The system has exactly one component authorized to mutate persistent state.

**Purpose:** Eliminates conflicting mutation paths, race conditions, and bypass opportunities.

**Benefits:**
- All mutations flow through a single chokepoint where validation, policy, and logging occur
- State changes are always ordered (no concurrent writes)
- Bypass is architecturally impossible -- there is no other path to the store

**Tradeoffs:**
- Throughput is limited to the authority's processing rate
- The authority becomes a single point of failure for mutations (but not for reads)

**Example:**
In Synth, the *CommandBus* is the sole mutation authority. Every state change must pass through its `dispatch` method. The *RuntimeEngine* executes domain logic but does not write to the store directly -- execution produces events that the CommandBus persists through the guarded store.

---

## Principle 2: Deterministic Execution

**Statement:** Given the same inputs, the system always produces the same outputs. No hidden state, no ambient authority, no undefined behavior.

**Purpose:** Enables replay, testing, and verification of system behavior.

**Benefits:**
- Events can be replayed to reconstruct identical state
- Tests are reliable across runs
- Distributed systems can verify consistency without communication
- Debugging can work backwards from state to events

**Tradeoffs:**
- Time-based operations must use deterministic time sources (e.g., event timestamp, not system clock)
- Randomness must be controlled and recorded
- External system calls must be modeled as inputs

**Example:**
The *ExecutionFingerprint* hashes the normalized execution record (command, events, result) using SHA-256. Any nondeterminism in execution causes a fingerprint mismatch, which is detected immediately.

---

## Principle 3: Event Sourcing

**Statement:** All state changes are recorded as immutable events in an append-only log. State is derived by folding over the event log.

**Purpose:** Preserves complete history, enables replay, and provides an audit trail.

**Benefits:**
- Complete history is available for auditing and debugging
- State can be reconstructed at any point in time
- Events are the single source of truth
- Temporal queries are natural ("what was the state at time T?")

**Tradeoffs:**
- Event logs grow without bound
- State reconstruction has computational cost
- Schema evolution requires care (events are immutable)

**Example:**
A work item's status changes from `idle` to `active`. Instead of updating a database row, Synth appends a `WORK_ITEM_STARTED` event to the log. The work item's current status is computed by applying all events in order.

---

## Principle 4: Replayability

**Statement:** The system's state must be reproducible by replaying its event log through the same domain logic.

**Purpose:** Verifies that the event log and state reconstruction logic are consistent.

**Benefits:**
- Detects event log tampering
- Detects changes in domain logic that would alter historical behavior
- Provides a correctness guarantee that can be verified independently

**Tradeoffs:**
- Replay may be expensive for large event logs
- Domain logic must not change in ways that affect historical events

**Example:**
The *ReplayVerifier* loads all events from the store, reconstructs state, and compares the resulting hash to the expected hash. A mismatch indicates tampering or logic drift.

---

## Principle 5: Separation of Concerns

**Statement:** Each architectural layer has a single, well-defined responsibility and does not concern itself with the responsibilities of other layers.

**Purpose:** Limits the blast radius of changes and makes the system comprehensible.

**Benefits:**
- Changes to one layer do not require changes to others
- Each layer can be tested independently
- Security properties are localized

**Tradeoffs:**
- Some performance overhead from layering
- More components to understand

**Example:**
The *RuntimeEngine* executes domain logic. It does not validate input (that's the validator), check policy (that's the policy engine), write to the store (that's the CommandBus), or sign permits (that's the ExecutionGate). Its only job is to execute a pre-authorized intent.

---

## Principle 6: Explicit Governance

**Statement:** Every mutation is evaluated against explicit, registered policies before execution. Policy decisions are recorded and attested.

**Purpose:** Prevents unauthorized execution and provides evidence of authorization.

**Benefits:**
- Unauthorized actions are structurally prevented, not merely discouraged
- Policy decisions are auditable
- Policy changes are detectable (attestation hash changes)

**Tradeoffs:**
- Policy evaluation has performance cost
- Overly restrictive policies can block legitimate actions

**Example:**
The `completed-work-protection` policy denies any attempt to restart a completed work item. This is not a suggestion or a warning -- it is a hard stop enforced before execution.

---

## Principle 7: Immutable History

**Statement:** Events in the log are never modified or deleted. The log is append-only.

**Purpose:** Preserves the integrity of the system's history.

**Benefits:**
- Audit trail is permanent and tamper-evident
- Replay always produces the same result
- State at any historical point can be reconstructed

**Tradeoffs:**
- Storage requirements grow over time
- Sensitive data in events cannot be removed (must be handled at the projection layer)

**Example:**
The event store's `append` method adds events to the log. There is no `update`, `delete`, or `rewrite` method. Even the bootstrap *genesis* phase writes through a special raw store that is sealed after initialization.

---

## Principle 8: Capability Isolation

**Statement:** Capabilities are isolated from each other. The execution of one capability cannot interfere with the execution of another except through explicitly declared state changes.

**Purpose:** Limits the scope of any capability's effects.

**Benefits:**
- Capabilities can be understood and tested independently
- Adding a new capability does not risk breaking existing ones
- Security analysis can be performed per-capability

**Tradeoffs:**
- Cross-capability coordination requires explicit event-based communication
- Some operations that naturally span capabilities become more complex

**Example:**
`StartWorkItem` and `CompleteWorkItem` are separate capabilities. Each is validated, authorized, and executed independently. They interact only through the shared state of the work item entity.

---

## Principle 9: Trust Boundaries

**Statement:** The system has clearly defined trust boundaries between components. Trust assumptions are explicit and minimal.

**Purpose:** Limits the trusted computing base and makes security analysis tractable.

**Benefits:**
- Security reviews can focus on the trust boundaries
- Compromise of an untrusted component does not compromise the kernel
- Migration and refactoring are safer when trust is explicit

**Tradeoffs:**
- Boundary crossings have performance cost
- More complex error handling at boundaries

**Example:**
The API layer is untrusted. It may receive malformed requests from malicious actors. The *ExecutionGate* (CommandBus) is trusted -- but only after validation. The *RuntimeEngine* is trusted only because it is unreachable from untrusted code.

---

## Principle 10: Structural Enforcement

**Statement:** Architectural constraints are enforced by the structure of the system, not by convention, documentation, or developer discipline.

**Purpose:** Makes architectural correctness a property of the code, not a policy.

**Benefits:**
- Architectural violations are impossible, not merely discouraged
- Code review can focus on logic, not on checking architectural compliance
- New developers cannot accidentally violate invariants

**Tradeoffs:**
- Some flexibility is lost
- Testing architectural constraints requires integration-level tests

**Example:**
The *RuntimeEngine* is not exported from the bootstrap function. This is not documented as "do not use RuntimeEngine directly." It is structurally impossible to access it through the public API. Bypass would require modifying the kernel source code.

---

## Principle Interactions

These principles are not independent. They reinforce each other:

- **Single Mutation Authority** + **Structural Enforcement** = Bypass is architecturally impossible
- **Event Sourcing** + **Immutable History** + **Deterministic Execution** = Replay is a structural guarantee
- **Explicit Governance** + **Cryptographic Attestation** = Authorization is verifiable, not merely claimed
- **Trust Boundaries** + **Capability Isolation** = Compromise scope is limited

## Related Documents

- [02 - Philosophy](02-philosophy.md) -- Rationale behind these principles
- [17 - Runtime Invariants](17-runtime-invariants.md) -- Executable instantiations of these principles
