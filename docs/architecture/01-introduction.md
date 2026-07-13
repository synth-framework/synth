# 01 - Introduction

## What Synth Is

Synth is a deterministic execution kernel. It accepts structured *intents* from actors, evaluates them against registered *capabilities* and *policies*, and if authorized, applies them to system state through an append-only *event log*.

Every mutation is:

- **Authorized** -- validated against schema, policy, and capability constraints
- **Recorded** -- persisted as an immutable event with cryptographic chain hashes
- **Reproducible** -- the same event log always reconstructs the same state
- **Attested** -- carries cryptographic proof of authorization

Synth is not a general-purpose application framework. It is a controlled execution substrate -- a system where incorrect execution is structurally impossible.

## What Synth Is Not

Synth is deliberately narrow in scope. It is not:

- A workflow engine with flexible routing
- An AI pipeline with inference capabilities
- A general-purpose database or storage system
- A distributed system with consensus protocols
- A web framework or API server

Synth provides the execution and governance layer. Everything else -- user interfaces, network protocols, distributed coordination -- lives outside the kernel.

## The Problem Synth Solves

Most software systems suffer from a fundamental gap between *what the architecture says* and *what the code allows*:

> The diagram shows a single entrypoint. The code exports twenty functions.

This gap is not a bug in any single component. It is a structural property of systems where the enforcement of architectural rules is left to convention -- code reviews, documentation, developer discipline -- rather than to the system itself.

Synth closes this gap by making architectural constraints structurally enforceable:

| Problem | Conventional Approach | Synth Approach |
|---------|----------------------|----------------|
| Multiple mutation paths | "Don't call internal functions" | Runtime is not addressable outside the gate |
| Policy bypass | "Check policy before executing" | Execution requires a signed permit |
| Event tampering | "Trust the database" | Every event carries a chain hash |
| Nondeterministic replay | "Hope the code hasn't changed" | Fingerprinting detects any deviation |

## Target Audience

This documentation serves:

- **System architects** evaluating Synth for adoption
- **Developers** implementing or extending the system
- **Security reviewers** assessing the trust model
- **AI coding agents** making changes to the codebase
- **Future maintainers** reimplementing Synth in another language

## Key Characteristics

### Deterministic

Given the same event log, Synth always reconstructs the same state. This is not a goal. It is an architectural property enforced at every layer.

### Event-Sourced

State is not stored directly. It is derived as a pure fold over an append-only event log. The event log is the source of truth; state is a cached projection.

### Capability-Based

Actions are identified by *capabilities*, not by direct function calls. A capability declares what it accepts, what it produces, and what preconditions it requires. The system resolves capabilities at runtime.

### Policy-Governed

Every intent is evaluated against the *policy engine* before execution. Policies are not suggestions. A policy denial is a hard stop that prevents execution entirely.

### Cryptographically Attested

Every authorized execution carries a signed *invocation permit*. The event log contains chain hashes linking each event to its predecessor. Policy decisions include attestation hashes.

### Structurally Sealed

After the *bootstrap seal* transition, the system's mutation surface is fixed. The capability registry, policy engine, and public API are immutable. The runtime is not addressable from outside the kernel.

## Document Scope

This document introduces Synth. Subsequent documents in this handbook progressively deepen understanding:

- [02 - Philosophy](02-philosophy.md) explains *why* Synth was designed this way
- [03 - Principles](03-principles.md) documents the architectural principles
- [04 - System Overview](04-system-overview.md) shows how the components fit together
- [18 - Formal Specification](18-formal-specification.md) provides the complete implementation-independent specification

## Related Documents

- [02 - Philosophy](02-philosophy.md) -- Design rationale and foundational beliefs
- [Glossary](glossary.md) -- Defined terminology
