# Architectural Constitution of Synth

> This document is the highest-level artifact in the repository.
> Everything else derives from it.
> It contains no implementation details.
> It contains only architectural provisions.

---

## Preamble

Synth is a deterministic execution system. Its architecture exists to ensure that every state transition is authorized, recorded, reproducible, and tamper-evident. The following provisions define the architectural foundations of the system. They are not implementation details. They are constitutional constraints that every implementation must satisfy.

---

## Article I — Authority

**Provision 1.** There shall exist exactly one mutation authority in the system.

**Provision 2.** All persistent state changes shall flow through this authority.

**Provision 3.** No component outside the trusted computing base shall possess the capacity to mutate persistent state.

---

## Article II — Determinism

**Provision 4.** Every state transition shall be deterministic.

**Provision 5.** Given the same sequence of events, the system shall always reconstruct the same state.

**Provision 6.** Nondeterministic inputs — including but not limited to system clocks, random number generators, and external system calls — shall not influence domain logic.

---

## Article III — Immutability of History

**Provision 7.** The event log shall be append-only.

**Provision 8.** Events shall not be modified after they are written.

**Provision 9.** Events shall not be deleted after they are written.

**Provision 10.** The event log is the single source of truth. State is a derived projection.

---

## Article IV — Governance

**Provision 11.** Governance shall precede execution.

**Provision 12.** Every mutation shall be evaluated against the active governance rules before it is permitted to proceed.

**Provision 13.** A governance denial shall be a hard stop. There shall be no override mechanism.

**Provision 14.** Governance rules shall be frozen in operational mode. They shall not change without explicit system reinitialization.

---

## Article V — Authorization

**Provision 15.** Every authorized execution shall carry cryptographic proof of its authorization.

**Provision 16.** Proof of authorization shall be verifiable independently of the authorizing component.

**Provision 17.** Execution without valid authorization shall be structurally impossible.

---

## Article VI — Replay

**Provision 18.** Every mutation shall be replayable.

**Provision 19.** Replay shall produce the same state as the original execution.

**Provision 20.** Replay shall detect tampering with the event log.

---

## Article VII — Structural Enforcement

**Provision 21.** Execution authority shall be structurally enforced, not conventionally assumed.

**Provision 22.** It shall be impossible to bypass the mutation authority through the public interface.

**Provision 23.** Architectural constraints shall be enforced by the structure of the system, not by documentation, developer discipline, or code review.

---

## Article VIII — Trust Boundaries

**Provision 24.** Trust boundaries shall be explicit.

**Provision 25.** Components shall be classified as trusted, semi-trusted, or untrusted.

**Provision 26.** Untrusted components shall not be able to affect system state without passing through all trusted layers.

---

## Article IX — Capability Control

**Provision 27.** The system's functional surface shall be explicit.

**Provision 28.** Only registered capabilities shall be executable.

**Provision 29.** The capability registry shall be frozen in operational mode.

---

## Article X — Invariants

**Provision 30.** Every architectural invariant shall be executable.

**Provision 31.** Violation of an invariant shall halt the violating operation.

**Provision 32.** Invariants shall be defined independently of implementation language.

---

## Article XI — Architecture and Implementation

**Provision 33.** Architecture shall remain implementation-independent.

**Provision 34.** This Constitution shall contain no implementation details.

**Provision 35.** Implementations shall conform to the Architecture. The Architecture shall not conform to implementations.

---

## Article XII — Mission Studio

**Provision 36.** Planning shall precede execution and shall remain structurally separated from it.

**Provision 37.** The Mission Studio is the sole constitutional authority for transforming evidence into an approved Mission Model.

**Provision 38.** Mission Studio shall operate exclusively in read-only observation and proposal modes; it shall not mutate runtime state, append events, or invoke capabilities.

**Provision 39.** Evidence consumed by Mission Studio shall be immutable, traceable, and delivered exclusively through adapter interfaces.

**Provision 40.** Every element of the World Model produced by Mission Studio shall carry an explainable confidence score grounded in referenced evidence.

**Provision 41.** Genesis shall be the only component authorized to commit an approved Mission Model to the Kernel, and only through the single mutation authority.

---

## Article XIII — Observation

**Provision 42.** `Observation` shall be a canonical, frozen primitive of the Kernel.

**Provision 43.** An Observation is the sole unit of knowledge that Mission Studio may receive from adapters.

**Provision 44.** Every Observation shall identify its source adapter, its category, its subject, the evidence supporting it, and a confidence level.

**Provision 45.** Adapters that produce planning evidence shall implement the `ObservableAdapter` contract and expose a read-only `observe()` operation.

**Provision 46.** `observe()` shall not mutate runtime state, append events, invoke capabilities, or access the ExecutionGate.

**Provision 47.** Mission Studio shall not read external systems, files, or platforms directly; it shall consume only `Observation[]` emitted through `ObservableAdapter` instances.

---

## Article XIV — Expeditions

**Provision 48.** Expeditions are the canonical governance mechanism for all architectural work.

**Provision 49.** No architectural change may be implemented without an approved Expedition.

**Provision 50.** Every Expedition shall declare its kind: Discovery, Implementation, or Certification.

**Provision 51.** Every Expedition shall declare its Impact — what layers of the system it is permitted to change — before implementation begins.

**Provision 52.** An Expedition whose Impact declares a constitutional change or requires an Architectural Decision Record shall not be approved until the ADR process is complete.

---

## Amendment

Amendments to this Constitution require:
1. Architectural review
2. Justification addressing every affected provision
3. Update to all derived documents
4. Verification that all invariants remain satisfied

---

## Supremacy

In the event of conflict between this Constitution and any other document in the repository, this Constitution prevails.

All architecture documents, implementation code, tests, and operational procedures shall be consistent with the provisions herein.

---

*Adopted as the foundational architecture of Synth v2.*
