# EXP-GOV-007 — Canonical State Resolution & Status Authority

**Status:** Proposed  
**Started:** 2026-07-18  
**Kind:** Governance / Runtime  
**Priority:** Critical  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-GOV-006, EXP-PROGRAM-016  
**Blocks:** Future operator commands that depend on authoritative state  

---

## Objective

Establish `synth status` as the authoritative source of operational truth by ensuring it deterministically resolves the current governance state and recommends the only valid next action.

The operator must never compensate for incorrect or incomplete governance state.

---

## Problem Statement

Today, the runtime can enter situations where:

```
Mission approved
  ↓
Expedition accepted
  ↓
State updated
  ↓
synth status
  ↓
Stale guidance
```

The canonical state and the guidance presented to the operator diverge.

This violates one of SYNTH's core principles:

> The operator should never infer or reconstruct governance state. The runtime must determine it.

If `status` cannot confidently answer:

* Where are we?
* What is active?
* What is blocked?
* What is the next valid transition?

then execution should stop until the inconsistency is resolved.

---

## Architectural Principle

`status` is not a reporting command.

It is the runtime's interpretation engine.

Every execution path should begin with the same state resolution logic used by `status`.

The runtime should never contain multiple interpretations of project state.

```
Canonical State
  ↓
State Resolver
  ├── status
  ├── begin
  ├── build
  ├── approve
  ├── mission
  ├── expedition
  └── future commands
```

One resolver.
One interpretation.
One truth.

---

## Current Failure

Observed behavior:

```
Mission approved
  ↓
Snapshot created
  ↓
Decision recorded
  ↓
status
  ↓
Recommends stale action
```

The governance artifacts indicate one state.
The operator guidance reflects another.
The system therefore exposes two different realities.

---

## Desired Behavior

Every invocation of `synth status` must answer:

### Current Governance State

Example:

```
Mission:   Approved
Program:   EXP-PROGRAM-004
Expedition: EXP-FC-003
State:     Review
Blocking Issues: None
```

### Current Transition

```
Last Event
  ↓
Evidence Accepted
```

### Valid Next Transition

```
Review
  ↓
Accept Expedition
```

or

```
Accepted
  ↓
Complete Expedition
```

or

```
Completed
  ↓
Begin Next Expedition
```

Exactly one recommended action.

### Invalid States

If multiple interpretations exist:

```
BLOCKED

Canonical state cannot be resolved.

Conflicting artifacts:
  • Snapshot indicates accepted
  • Canonical state indicates active

Required action:
  Resolve governance inconsistency.
```

The runtime must refuse progression.

---

## Outcomes

### Outcome 1 — Canonical State Resolver

Implement a single resolver responsible for determining:

* active mission
* active program
* active expedition
* lifecycle state
* outstanding transitions
* blocking conditions

No command should implement independent state interpretation.

### Outcome 2 — Deterministic Next-Action Engine

Given a resolved state, compute the next valid transition.

Example:

```
planned
  ↓
Start Expedition
```

```
active
  ↓
Produce Evidence
```

```
review
  ↓
Approve Evidence
```

```
accepted
  ↓
Complete Expedition
```

```
completed
  ↓
Begin Next Expedition
```

The next action is derived from the lifecycle, not inferred heuristically.

### Outcome 3 — Stale State Detection

Detect inconsistencies between:

* canonical state
* event log
* snapshots
* expedition metadata
* governance decisions

If any disagree:

```
State Resolution Failed
```

No recommendations are produced until consistency is restored.

### Outcome 4 — Guidance as Projection

`status` should become a projection of runtime state rather than a collection of procedural rules.

Its output should answer four questions:

1. Where am I?
2. What changed last?
3. What is blocking progress?
4. What is the next valid action?

Nothing more.

### Outcome 5 — Shared Runtime Service

Extract state resolution into a reusable runtime service.

Consumers include:

* `status`
* `begin`
* `approve`
* `mission`
* `expedition`
* future operator commands

All commands must rely on the same resolved state.

---

## Required Artifacts

```
runtime/
 ├── canonical-state-resolver.ts
 ├── next-action-engine.ts
 └── state-consistency-validator.ts

docs/
 └── operator/status-resolution.md

tests/
 ├── canonical-state.test.js
 ├── next-action.test.js
 ├── stale-state.test.js
 └── conflicting-state.test.js
```

---

## Acceptance Criteria

### Canonical Resolution

* [ ] Every command resolves state through a single resolver.
* [ ] State resolution is deterministic.
* [ ] Conflicting governance artifacts are detected.

### Status Authority

* [ ] `synth status` always reports the current canonical state.
* [ ] `synth status` reports the last completed transition.
* [ ] `synth status` recommends exactly one valid next action.
* [ ] Recommendations are derived from lifecycle rules rather than heuristics.

### Failure Handling

* [ ] Inconsistent governance state blocks progression.
* [ ] Clear diagnostics identify the conflicting artifacts.
* [ ] Operators are never required to infer the correct state manually.

---

## Success Criteria

This expedition is complete when:

* `synth status` is the single authoritative operational view of the repository.
* Every runtime command shares the same state interpretation.
* Incorrect or stale guidance cannot be produced without triggering a governance failure.
* The runtime either provides one unambiguous next action or explicitly reports that governance state cannot be resolved.

---

## Relationship to EXP-GOV-006

These two expeditions form complementary layers of governance:

* **EXP-GOV-006 — Agent Lifecycle Enforcement** ensures agents cannot act outside the governed lifecycle.
* **EXP-GOV-007 — Canonical State Resolution & Status Authority** ensures the runtime always knows the current lifecycle state before any action is taken.

Together they establish a key invariant for SYNTH:

> **Every governed action begins from a single, authoritative interpretation of canonical state, and every transition is validated against that state before execution.**

---

## Definition of Done

- [ ] Expedition approved.
- [ ] Canonical state resolver implemented and unit-tested.
- [ ] Next-action engine implemented and unit-tested.
- [ ] State consistency validator implemented and unit-tested.
- [ ] `synth status` uses the resolver as its only state source.
- [ ] At least one downstream command migrated to use the shared resolver.
- [ ] Regression suite detects stale, conflicting, and unresolved governance state.
- [ ] `npm run govern` passes.
