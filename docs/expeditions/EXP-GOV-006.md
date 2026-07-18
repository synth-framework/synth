# EXP-GOV-006 — Agent Lifecycle Enforcement

**Status:** Completed  
**Started:** 2026-07-18  
**Completed:** 2026-07-18  
**Kind:** Governance / Runtime Enforcement  
**Priority:** Critical  
**Program:** EXP-PROGRAM-016 — Governed Expedition Execution  
**Depends On:** EXP-PROGRAM-016, EXP-REL-006  
**Blocks:** EXP-GOV-007

---

## Objective

Establish deterministic enforcement mechanisms — implemented as a runtime governance capability — that ensure all agent-driven work follows the SYNTH transformation lifecycle. The goal is not to teach agents SYNTH; it is to make the SYNTH-conformant path the only valid operational path:

```
Intent
  ↓
Mission
  ↓
Expedition
  ↓
Evidence
  ↓
Plan
  ↓
Execution
  ↓
Event
  ↓
State Transition
  ↓
Replay
```

Prevent agents from:

* executing outside an authorized expedition
* creating implementation plans without SYNTH context resolution
* advancing workflows without valid state transitions
* treating acceptance as completion
* starting new expeditions before previous expeditions reach terminal state

---

## Problem Statement

Current behavior allows:

```
User Request
  ↓
Agent Interpretation
  ↓
Direct Execution
```

The agent can infer intent and begin work before SYNTH governance is applied.

This creates several risks:

### 1. Intent drift

The agent creates its own transformation path.

Example:

```
User:
"Implement feature X"

Agent:
Creates architecture
Creates plan
Edits files
```

without determining:

* active mission
* active expedition
* authorization state
* expected evidence

The agent optimizes locally instead of following the governed transformation.

### 2. Lifecycle corruption

Current lifecycle allows:

```
planned
 ↓
active
 ↓
accepted
 ↓
next expedition
```

This creates ambiguous state.

`accepted` currently behaves as both:

* evidence validation state
* terminal completion state

Those are different concepts.

The lifecycle must distinguish:

```
Acceptance of evidence

from

Completion of transformation
```

### 3. State accumulation

Current possible state:

```
EXP-001 accepted
EXP-002 accepted
EXP-003 accepted
EXP-004 active
```

This means the system has historical artifacts that never reached closure.

A deterministic system requires:

```
accepted
+
completion event
+
state transition
=
completed
```

before progression.

---

## Desired System Behavior

The agent entry point should become:

```
User Instruction
  ↓
SYNTH Intake Gate
  ↓
Context Resolution
  ↓
Lifecycle Validation
  ↓
Authorized Action
  ↓
Event Recording
  ↓
State Transition
```

The agent should never directly enter execution.

---

## Outcomes

### Outcome 1 — Agent Intake Gate

Introduce a mandatory interpretation boundary.

Before execution, the system resolves:

```
Request Context
```

Questions:

1. What mission does this belong to?
2. What expedition owns this work?
3. Is an expedition active?
4. Is execution authorized?
5. What evidence is required?
6. What state transition should occur?

The agent does not decide whether governance applies.

The runtime decides.

### Outcome 2 — Expedition State Machine Formalization

Replace implicit lifecycle behavior.

Current:

```
planned
active
accepted
```

Target:

```
draft
 ↓
planned
 ↓
active
 ↓
review
 ↓
accepted
 ↓
completed
```

Definitions:

#### planned

Expedition exists but execution has not started.

#### active

Execution is authorized.

#### review

Evidence is being evaluated.

#### accepted

Acceptance criteria satisfied.

Meaning:

> The evidence is valid.

Not:

> The expedition is finished.

#### completed

Terminal state.

Meaning:

> All required transitions, artifacts, events, and closure operations are complete.

Only this state permits progression.

### Outcome 3 — Transition Enforcement

Introduce transition validation.

Example:

Invalid:

```
accepted
   ↓
new expedition
```

Allowed:

```
accepted
  ↓
completion event created
  ↓
completed
  ↓
next expedition unlocked
```

Invalid transition response:

```
BLOCKED

Expedition:
EXP-GOV-006

Current State:
accepted

Required Action:
Create completion event

Required Transition:
accepted → completed
```

### Outcome 4 — Agent Operating Contract

Create:

```
.synth/AGENT_CONTRACT.md
```

Purpose:

Not documentation.

Runtime orientation artifact.

The contract should be intentionally small.

Proposed:

```md
# SYNTH Agent Operating Contract

Before performing work:

1. Resolve the active mission.
2. Resolve the active expedition.
3. Do not create plans outside an expedition.
4. Do not execute without authorization.
5. Every state change requires an event.
6. Accepted evidence does not equal completed work.
7. Do not begin another expedition until the current expedition is completed.
8. Preserve canonical state.
9. Prefer governed transitions over direct modifications.
```

### Outcome 5 — Repository Context Resolution

The runtime should provide agents with a stable initial interpretation.

The agent should not have to infer:

```
What is this repository?
```

from:

```
docs/
UI/
components/
architecture/
```

Instead:

```
.synth/context.json
```

or equivalent should establish:

```json
{
  "repository_type": "synth_governed_project",
  "current_phase": "specification",
  "implementation_exists": false,
  "transformation": "knowledge_to_system",
  "governance_required": true
}
```

This reduces interpretation friction.

The correct model becomes the lowest-energy model.

### Outcome 6 — Regression Test Suite

Add enforcement tests.

#### Test: Execution without expedition

Input:

```
Implement feature X
```

Expected:

```
BLOCKED

No active expedition.
```

#### Test: Plan creation outside lifecycle

Input:

```
Create implementation plan
```

Expected:

```
BLOCKED

Create or activate expedition first.
```

#### Test: Accepted expedition progression

State:

```
EXP-001 accepted
```

Attempt:

```
Create EXP-002
```

Expected:

```
BLOCKED

EXP-001 requires completion.
```

#### Test: Valid completion

State:

```
accepted
```

Event:

```
EXPEDITION_COMPLETED
```

Expected:

```
completed
```

---

## Required Artifacts

This expedition produces:

```
.synth/
 ├── AGENT_CONTRACT.md
 ├── lifecycle/
 │    └── expedition-state-machine.md
 ├── runtime/
 │    └── intake-gate.md
 └── tests/
      └── lifecycle-enforcement.test.ts
```

---

## Success Criteria

The expedition is complete when:

### Runtime

- ✅ Agents cannot execute outside governed lifecycle
- ✅ Agents resolve mission/expedition context before work
- ✅ Invalid transitions are rejected

### Lifecycle

- ✅ Accepted and completed are distinct states
- ✅ Completion requires explicit event
- ✅ Next expedition requires previous completion

### Developer Experience

- ✅ Agents receive enough context to avoid incorrect repository interpretation
- ✅ SYNTH remains invisible as methodology unless needed
- ✅ Project work remains the focus

---

## Relationship to SYNTH Philosophy

This expedition is not adding more instructions.

It is reducing deformation cost.

The agent failure happened because the repository allowed multiple possible interpretations:

```
Specification repository
        |
        +----> Existing application
        |
        +----> Documentation project
        |
        +----> Knowledge repository
```

The agent selected the strongest local attractor.

The enforcement layer creates:

```
Repository
  ↓
SYNTH Context
  ↓
Correct interpretation
  ↓
Correct transformation path
```

The goal is not to make agents smarter.

The goal is to make the correct action the lowest-energy action.

---

## Definition of Done

- [ ] Expedition approved.
- [ ] Agent intake gate specified and implemented.
- [ ] Expedition state machine extended with `completed` terminal state.
- [ ] Transition validator rejects invalid lifecycle moves.
- [ ] `.synth/AGENT_CONTRACT.md` created and validated.
- [ ] Repository context resolution artifact created.
- [ ] Regression suite blocks execution without expedition, plan creation outside lifecycle, and progression from accepted without completion.
- [ ] `npm run govern` passes.
