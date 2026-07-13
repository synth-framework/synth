---
Title: Public Vocabulary
Domain: reference
Audience: everyone
Prerequisites: philosophy/00-introduction.md
Knowledge Establishes: The seven public concepts used to explain Synth
Depends On: philosophy/00-introduction.md
Builds Toward: operator guides, architecture diagrams, landing narrative
Version: 1.0.0
Status: stable
---

# Public Vocabulary

Synth is explained with exactly seven public concepts. Everything else is implementation detail.

## The Seven Concepts

### 1. Mission

A strategic goal you want to achieve.

> *Example:* "Build a customer support portal that lets users track tickets."

A mission is long-term and may require many expeditions to complete.

---

### 2. Expedition

A bounded investigation or build that moves a mission forward.

> *Example:* "Design the authentication flow for the support portal."

An expedition has a clear goal, a start, and an end. It produces evidence, discoveries, and decisions.

---

### 3. Evidence

What you know and how confidently you know it.

> *Example:* "User interviews show 80% of support requests are password resets."

Evidence reduces uncertainty. Weak evidence creates questions. Strong evidence supports decisions.

---

### 4. Plan

The approved path forward, including the work to do.

> *Example:* "Approved plan: implement login page, session management, and password reset."

A plan is created from evidence, approved explicitly, and then committed to execution.

---

### 5. Event

An immutable record that something happened.

> *Example:* "Mission approved." "Expedition started." "Objective completed."

Events are the permanent history of the system. Once written, they never change.

---

### 6. State

The current picture of the world, derived from events.

> *Example:* "The support portal mission is active, the authentication expedition is executing, and the login objective is complete."

State is always computed from history. It is never edited directly.

---

### 7. Replay

Rebuilding state from events to prove correctness.

> *Example:* "Replay the event log to verify that the current state matches the history."

Replay is the root of trust. If replay produces a different picture, the system is inconsistent.

---

## What These Concepts Replace

| Public Concept | What It Replaces (Implementation Detail) |
|---|---|
| Mission | long-term strategic objective |
| Expedition | project, sprint, investigation, spike |
| Evidence | observation, adapter output, input data |
| Plan | approved mission model, snapshot, world model |
| Event | log entry, immutable record |
| State | canonical state, derived view, current picture |
| Replay | event replay, state reconstruction, verification |

## Concepts That Are NOT Public

The following terms are implementation details. They belong in developer, architect, and generated documentation, not in public-facing explanations.

- ExecutionGate
- Capability / Capability Registry
- Adapter / Adapter Registry
- EventStore / StateStore / CheckpointStore
- RuntimeEngine
- Planning Cognition Engine
- World Model
- Snapshot
- Seal / Bootstrap
- Intent (as a technical request object)
- Canonical State (use **State**)

## Using the Vocabulary

When writing public docs:

1. Prefer the seven public concepts.
2. If you need a sub-concept, map it to one of the seven.
3. If an implementation term is unavoidable, put it in a parenthetical and immediately explain it with public vocabulary.
4. Never use an internal component name as if the operator must understand it.

## Example: Before and After

**Before (implementation-focused):**

> "Synth uses an ExecutionGate to validate CapabilityInvocations against the Capability Registry before persisting events to the EventStore."

**After (public vocabulary):**

> "Synth checks every action against the approved plan before recording it as an event."

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-12 | Initial public vocabulary for v2 freeze |
