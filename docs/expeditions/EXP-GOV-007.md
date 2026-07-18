# EXP-GOV-007 — Canonical State Resolution & Status Authority

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Governance / Runtime  
**Priority:** Critical  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-GOV-006, EXP-PROGRAM-016, EXP-INIT-001  
**Blocks:** EXP-INIT-002 — Initialization Evidence & Replay, future operator commands that depend on authoritative state

---

## Objective

Make canonical state resolution authoritative and resilient against legacy event-log imperfections, so that `synth status` becomes the single source of operational truth.

The resolver must derive one deterministic canonical state from historical evidence, or fail cleanly with actionable diagnostics when no authoritative interpretation is possible.

> **Canonical State Authority Invariant:** A valid SYNTH runtime must expose exactly one deterministic canonical state derived from all accepted historical evidence.

---

## Problem Statement

The current resolver assumes the event log is already normalized. `data/event-log.jsonl` contains historical artifacts including:

* duplicate legacy identities
* orphaned references
* superseded object identifiers
* incomplete historical relationships

Running `synth status` today produces a `GovernanceResolutionFailure` with hundreds of duplicate warnings instead of a resolved state. The resolver is therefore acting as a raw event-log diagnostic rather than a state projection.

This violates the core SYNTH principle:

> The operator should never infer or reconstruct governance state. The runtime must determine it.

If `status` cannot confidently answer:

* Where are we?
* What is active?
* What is blocked?
* What is the next valid transition?

then execution must stop until the inconsistency is resolved or normalized.

---

## Architectural Principle

`status` is not a reporting command. It is the runtime's interpretation engine.

Every execution path should begin with the same state resolution logic used by `status`.

```
Event Stream
      |
      v
Historical Normalizer
      |
      v
Identity Resolver
      |
      v
Reference Resolver
      |
      v
Canonical State Builder
      |
      v
Status Projection
```

The event log may be imperfect, but the resolver must produce one authoritative interpretation or a clean failure.

---

## Desired Behavior

Every invocation of `synth status` must produce one of the following.

### Success path

```
Resolved Canonical State

Missions:     1
Expeditions:  1
Objectives:   1

Resolution:   PASS
Warnings:     <non-blocking historical normalization notices>

Next valid transition:
  review → accept expedition
```

### Failure path

```
Governance Resolution Failure

Category:
  LEGACY_REFERENCE_CONFLICT

Affected artifacts:
  - mission-id: xxx
  - expedition-id: yyy

Resolution required:
  <specific remediation>

The canonical state cannot be safely reconstructed.
```

Never:

```
hundreds of duplicate warnings
+ stack trace
+ ambiguous state
```

---

## Outcomes

### Outcome 1 — Historical Normalizer

Detect and classify historical artifacts without mutating the event log:

* duplicate identities
* legacy aliases
* orphaned references
* superseded identifiers

Output provenance for each normalized artifact so traceability is preserved.

### Outcome 2 — Identity Resolver

Establish deterministic identity resolution rules:

1. explicit canonical identity
2. latest accepted identity
3. lineage relationship
4. deterministic fallback

Never rely on "first object encountered wins" because event ordering is not semantic authority.

### Outcome 3 — Reference Resolver

Resolve references through a recoverability hierarchy:

```
Reference
  |
  +-- resolved
  |
  +-- recoverable legacy alias
  |
  +-- unresolved fatal
```

Example:

```
EXP-001 references mission-old-id

Resolver:
  mission-old-id
      |
      v
  alias lookup
      |
      v
  mission-001

Resolution: RECOVERED
```

### Outcome 4 — Canonical State Builder

Construct the canonical state from normalized identities and resolved references. The builder is the single authority for:

* active mission
* active program
* active expedition
* lifecycle state
* outstanding transitions
* blocking conditions

### Outcome 5 — Status as Projection

`status` becomes a read-only projection of the canonical state. Its output answers:

1. Where am I?
2. What changed last?
3. What is blocking progress?
4. What is the next valid action?

Nothing more.

---

## Required Artifacts

```
src/
 ├── runtime/
 │    └── governance-resolver.ts            # existing: refactor into resolver pipeline
 │    └── historical-normalizer.ts          # new
 │    └── identity-resolver.ts              # new
 │    └── reference-resolver.ts             # new
 │    └── canonical-state-builder.ts        # new
 │    └── status-projection.ts              # existing: consume canonical state
 │
 docs/
 └── operator/status-resolution.md
 └── expeditions/EXP-GOV-007.md             # this charter

tests/
 ├── governance-resolver.test.js
 ├── historical-normalizer.test.js
 ├── identity-resolver.test.js
 └── reference-resolver.test.js
```

---

## Acceptance Criteria

### AC-001

`synth status` resolves successfully against the current repository history.

### AC-002

Duplicate legacy identities no longer block resolution.

### AC-003

Recoverable orphan references are normalized with provenance.

### AC-004

Irrecoverable ambiguity produces actionable governance failure with a specific category and affected artifacts.

### AC-005

Resolver output is deterministic across repeated executions.

### AC-006

Resolution diagnostics are structured evidence, not console noise.

### AC-007

Every command that needs governance context resolves state through the same resolver service.

### AC-008

Resolver output is replay-stable: identical accepted historical evidence produces byte-equivalent canonical state regardless of execution order.

### AC-009

`npm run govern` passes.

---

## Success Criteria

This expedition is complete when:

* `synth status` is the single authoritative operational view of the repository.
* Every runtime command shares the same state interpretation.
* Legacy event-log imperfections are normalized deterministically or reported as a clean failure.
* The runtime either provides one unambiguous next action or explicitly reports that governance state cannot be resolved.
* `npm run govern` passes.

---

## Important Boundary

This is **not** a migration expedition. The goal is not to repair `data/event-log.jsonl`. The goal is to make SYNTH capable of interpreting imperfect history deterministically.

> A governance system that requires perfect history is fragile. A governance system that can derive authoritative state from imperfect history is resilient.

---

## Relationship to Other Expeditions

### EXP-GOV-006 — Agent Lifecycle Enforcement

Ensures agents cannot act outside the governed lifecycle.

### EXP-GOV-007 — Canonical State Resolution & Status Authority

Ensures the runtime always knows the current lifecycle state before any action is taken.

Together they establish:

> **Every governed action begins from a single, authoritative interpretation of canonical state, and every transition is validated against that state before execution.**

### EXP-INIT-001 → EXP-GOV-007 → EXP-INIT-002

```
EXP-INIT-001 ✅
      |
      v
EXP-GOV-007 — restore authoritative state interpretation
      |
      v
EXP-INIT-002 — Initialization Evidence & Replay
```

Initialization evidence and replay depend on a trusted state authority. EXP-GOV-007 is therefore a prerequisite for EXP-INIT-002, not a parallel improvement.

---

## Completion Notes

**Completed:** 2026-07-18  
**Merged:** [#152](https://github.com/synth-framework/synth/pull/152)

- Historical normalizer, identity resolver, reference resolver, canonical state builder, and status projection implemented under `src/runtime/`.
- `synth status` now resolves deterministically against the current repository history; legacy duplicate identities and recovered orphan references are handled as warnings rather than failures.
- Replay graph integrity tests pass; resolver output is deterministic.
- `npm run govern` passes.

## Definition of Done

- [x] Charter accepted.
- [x] Historical normalizer implemented and tested.
- [x] Identity resolver implemented and tested.
- [x] Reference resolver implemented and tested.
- [x] Canonical state builder integrated with `status`.
- [x] `synth status` resolves successfully on current repository history.
- [x] Irrecoverable ambiguity produces structured failure.
- [x] `npm run govern` passes.
