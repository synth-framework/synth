# 02 - Philosophy

## Why Deterministic Execution Matters

Non-determinism in software is the root of an entire category of failures:

- Tests that pass on one run and fail on the next
- State that cannot be reconstructed for debugging
- Race conditions that disappear when investigated
- Deployments that behave differently in production

These failures share a common cause: the system produces output that depends on something other than its defined inputs. When a system's behavior is not fully determined by its specification, correctness becomes a matter of probability, not proof.

Synth inverts this. The system's design assumes that determinism is not a desirable property to be tested for, but a structural property to be enforced by the architecture itself.

## Why Event Sourcing

State-based persistence has a fundamental problem: it erases history. When a record is updated, the previous state is overwritten. The system "forgets" how it arrived at its current condition.

This matters because:

- **Debugging** requires understanding the sequence of changes that led to a bug
- **Auditing** requires a complete history of who did what and when
- **Reconstruction** requires the ability to rebuild state from first principles
- **Governance** requires evidence that every mutation was authorized

Event sourcing solves this by making state a derived property. The event log is the truth. State is a fold. If you doubt the state, you can recompute it from the events.

## Why Governance Exists

Most systems separate "what the code does" from "what is allowed." The code executes; governance is an afterthought -- a permission check added to an endpoint, a role check in middleware.

Synth treats governance as a first-class concern because execution without authorization is not execution. It is a side effect.

The policy engine exists at the kernel level, not at the API level, because:

- Governance that lives at the perimeter can be bypassed by internal calls
- Policy that is checked after validation is policy that can be circumvented by malformed input
- Authorization that is not cryptographically bound to execution is authorization that can be forged

## Why Capabilities

Capabilities solve a specific problem: how do you identify what an actor is allowed to do without enumerating every possible action?

A *capability* is a named, versioned contract between the system and its users. It declares:

- What input it accepts (schema)
- What output it produces (events)
- What preconditions it requires (state checks)
- Whether it has side effects (mutating vs. read-only)

Capabilities make the system's functional surface explicit. You cannot execute something that has not been registered as a capability. This transforms the system from "everything is permitted unless denied" to "nothing is permitted unless explicitly registered."

## Why Replay Matters

Replay is not a debugging convenience. It is a correctness guarantee.

If the system is truly deterministic, then replaying the event log must always produce the same state. If it does not, one of the following is true:

- The event log was tampered with (detected by chain hash verification)
- The state reconstruction logic changed (detected by fingerprint mismatch)
- The system is not deterministic (detected by hash divergence)

Replay is the system's self-test. It runs continuously in the background, verifying that the architecture's determinism promise holds.

## Why Structural Enforcement

Documentation, conventions, and code reviews are all necessary. None are sufficient.

A system where correctness depends on developers reading the documentation and following it is a system where correctness is probabilistic. The question is not whether a bypass will occur, but when.

Synth takes a different position: architectural constraints should be enforced by the structure of the code, not by the discipline of the developers.

This means:

- The runtime is not exported, so bypass is not possible through the public API
- The store requires an active guard token, so direct writes are structurally rejected
- The registry is frozen after seal, so capability expansion requires a system restart
- The policy engine is frozen after seal, so governance changes require explicit unseal

These are not policies. They are properties of the architecture.

## Why Cryptographic Attestation

Structural enforcement prevents accidental bypass. Cryptographic attestation prevents intentional tampering.

Without attestation:

- An attacker with store access could inject events that appear legitimate
- A compromised policy engine could silently approve unauthorized actions
- State files could be modified and accepted on load

With attestation:

- Every execution carries a signed permit that can be independently verified
- Every event links cryptographically to its predecessor
- Every policy decision includes a hash that changes if the policy changes
- Every state file carries a hash that is verified on load

Cryptographic attestation transforms trust from an assumption into a verifiable property.

## The Synth Worldview

Synth embodies a specific worldview about software systems:

1. **Understanding precedes execution.** The system must understand an intent before it can execute it. Understanding means validation, policy evaluation, and capability resolution.

2. **Execution never infers intent.** The system does not guess what the user meant. If an intent is ambiguous, it is rejected.

3. **History is truth.** The event log is the authoritative record. State is a derived view.

4. **Trust is verifiable.** Every claim the system makes about its own correctness can be independently checked.

5. **Architecture is enforcement.** The structure of the system should make incorrect usage impossible, not merely discouraged.

## Related Documents

- [01 - Introduction](01-introduction.md) -- What Synth is
- [03 - Principles](03-principles.md) -- Architectural principles derived from this philosophy
