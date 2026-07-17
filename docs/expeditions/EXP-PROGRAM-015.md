# EXP-PROGRAM-015 — Repository Versioning Capability

**Status:** Active  
**Kind:** Program  
**Priority:** High  
**Authority:** Synth Architectural Constitution  
**Scope:** Version-control operations as first-class SYNTH capabilities  
**Era:** II — Adoption  
**Architecture Impact:** Low  
**Constitutional Impact:** Low  
**Public Impact:** Medium  
**Product Impact:** High  
**Execution Impact:** Low  
**Depends On:** EXP-PROGRAM-007, EXP-PROGRAM-014  
**Blocks:** None  
**Evidence:** `docs/operator/EXP-PROGRAM-010-evidence-annex-taskpro.md` (N1 recursion from `package.json` `govern` script; need for safe repository-level operations)

---

## Thesis

> SYNTH should treat repository versioning as a capability, not an external dependency.

Today SYNTH can observe revisions through the Revision capability, but it cannot participate in them: create a branch, commit a change, open a pull request, or merge an approved Expedition's output. Every one of those operations is currently performed by the operator outside SYNTH, breaking the chain of governed execution. This program closes the loop by making version-control operations first-class capabilities invoked through the ExecutionGate.

---

## Problem Statement

The TaskPRO experiment surfaced the versioning gap indirectly:

- The agent created and edited files outside SYNTH's governance boundary (`package.json`, workarounds, runtime patches).
- There is no governed path for an approved Expedition to produce a branch, a commit, or a PR.
- Repository state (branch, commit, open PRs) is observed but cannot be influenced by Mission Studio planning or Genesis execution.
- Git is assumed; other versioning systems are unreachable without a generic contract.

Version control is an implementation concern, not a governance concern. It belongs in the Implementation layer, behind a capability contract, just like filesystem or process execution.

---

## Guiding Principles

EXP-PROGRAM-015 shall:

- preserve the Constitutional Freeze
- preserve the public vocabulary
- keep version control in the Implementation layer
- define a generic versioning contract before any provider-specific adapter
- route every mutating operation through the ExecutionGate
- emit Observations for Mission Studio from repository state

EXP-PROGRAM-015 shall not:

- redesign the governance kernel
- introduce new public concepts
- hard-code Git semantics into SYNTH Core
- bypass the ExecutionGate for any repository mutation

---

## Constitutional Invariant

> **Version control is an implementation capability.** The Core may only read and write repository state through registered capability providers. Mission Studio may consume Observations produced by versioning adapters, but it may never invoke Git or any versioning tool directly.

---

## Program Composition

```text
EXP-PROGRAM-015
Repository Versioning Capability
│
├── EXP-VCS-001  Versioning Capability Contract
│       Architecture Expedition
│       Define the generic repository-versioning operations
│       (discover, createRevision, switchRevision, integrateRevision,
│       publishRevision, compareRevisions, history) and the
│       Observation types adapters emit.
│
├── EXP-VCS-002  Git Versioning Adapter
│       Implementation Expedition
│       Implement the contract with Git operations invoked through
│       the Environment Process capability.
│
├── EXP-VCS-003  GitHub Forge Adapter
│       Implementation Expedition
│       Implement remote operations (fork, pull request, merge)
│       on top of the Forge capability and the Git adapter.
│
├── EXP-VCS-004  Repository State Observations
│       Implementation Expedition
│       Adapter emits Observations for branch, commit, remote,
│       open PRs, and divergence so Mission Studio can plan
│       versioning-aware Expeditions.
│
└── EXP-VCS-005  Versioning Certification
        Certification Expedition
        Deterministic tests prove that the same sequence of
        versioning capability invocations produces the same
        repository state across environments.
```

---

## Protected Assets

The following artifacts SHALL NOT be modified by any Expedition in this Program:

- Mission Studio
- Genesis
- Replay
- ExecutionGate
- Event Model
- Capability Model (the model itself; new providers may be registered)
- Constitutional Baseline
- Public Vocabulary (Mission, Expedition, Evidence, Plan, Event, State, Replay)

Any change to a Protected Asset requires an Architecture Decision Record and explicit constitutional approval.

---

## Invariants

1. The Constitutional Freeze remains in effect.
2. The seven public concepts remain the only required user-facing vocabulary.
3. Every repository mutation flows through the ExecutionGate as a registered capability invocation.
4. The Core remains versioning-system agnostic; only adapters know Git, GitHub, or other providers.
5. Repository state observations are read-only and emitted through `ObservableAdapter` instances.
6. Every new capability provider is covered by deterministic regression tests.

---

## Success Criteria

- A generic versioning capability contract exists and is documented.
- A Git adapter implements the contract and passes deterministic certification tests.
- A GitHub forge adapter can create and merge pull requests through governed capability invocations.
- Mission Studio can receive repository-state Observations (branch, commit, open PRs, divergence).
- All governance, replay, determinism, and graph integrity proofs pass in CI.

---

## Definition of Done

- [ ] EXP-VCS-001 completed and accepted.
- [ ] EXP-VCS-002 completed and accepted.
- [ ] EXP-VCS-003 completed and accepted.
- [ ] EXP-VCS-004 completed and accepted.
- [ ] EXP-VCS-005 completed and accepted.
- [ ] Program accepted.

---

## Completion Notes

*(pending)*

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/architecture/constitutional-layer-boundaries.md` | Positions version control as an Implementation-layer concern. |
| `docs/expeditions/EXP-PROGRAM-007.md` | Environment Independence; versioning providers extend the environment layer. |
| `docs/expeditions/EXP-PROGRAM-014.md` | Governance Maturation; versioning operations become observable and verifiable. |
| `src/environment/revision-capability.ts` | Existing read-only Revision capability; this program adds write operations through a new adapter contract. |
