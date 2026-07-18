# EXP-FIRSTCONTACT-010 — Agent Ground Truth Discovery

**Status:** Accepted  
**Accepted:** 2026-07-18  
**Started:** 2026-07-18  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-009 — Canonical First Contact Experience  
**Depends On:** EXP-GOV-007, EXP-GOV-008  
**Blocks:** EXP-FIRSTCONTACT-011 — Agent First Contact Learning System

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Purpose

Discover the minimum environmental signals required for an autonomous agent to correctly infer project intent and execute governed SYNTH workflows.

---

## Motivation

The Windows agent experiment gave us a critical baseline: the agent behaved rationally, but the environment created a lower-energy interpretation that was wrong. It converged on "incomplete React Native app" because the strongest signals were implementation-shaped artifacts (Expo, components, navigation) rather than intent-shaped artifacts.

The goal of this expedition is not to test whether an agent can build the project. It is to observe:

> **How does an uninitialized reasoning agent construct a model of a SYNTH-governed repository, and what evidence changes its trajectory?**

This is the first experiment where SYNTH stops being tested as a framework and starts being tested as an **environment for another intelligence to enter and understand**.

---

## Experiment Principle

The agent enters a repository with unknown system state.

```text
Unknown System State
        |
        v
Agent Interpretation
        |
        v
Proposed Action
        |
        v
CLI Execution
        |
        v
Evidence
        |
        v
Updated Agent Model
```

The important artifact is not the final output. It is the **trajectory**.

---

## Test Scenario 1: Repository Introduction

Human prompt:

> "I want to understand this project before making any changes."

Agent should naturally discover:

```text
synth status
synth explain
synth architecture
synth docs
```

### Observation

Did the agent:

A. Inspect the system?

```text
Repository
 |
 |- docs
 |- code
 |- config
```

or

B. Infer too quickly?

```text
Looks like React Native.
I'll start implementing.
```

### Evidence Captured

```text
first-contact/
  session-001/
      transcript.json
      commands.json
      observations.json
      state-transition.json
```

---

## Test Scenario 2: Create New Capability

Human prompt:

> "I need to add authentication to this project."

The agent should not immediately generate code.

Expected reasoning path:

```text
Current State
        |
        v
Existing identity model?
        |
        v
Evidence search
        |
        v
Mission alignment
        |
        v
Create expedition
        |
        v
Plan implementation
```

Possible CLI behavior:

```text
synth status
synth explain
synth mission list
synth expedition create
```

### Measure

Did the agent understand:

```text
authentication
```

as:

```text
feature request
```

or:

```text
system transformation requiring governed change
```

---

## Test Scenario 3: Ambiguous Request

Human prompt:

> "Make the app better."

This is the most valuable test.

A normal coding agent might:

- inspect UI
- suggest improvements
- modify files

A SYNTH-aligned agent should create uncertainty.

Expected:

```text
Intent unclear.

Need:
- target outcome
- user impact
- current limitations
- acceptance criteria
```

This measures whether the agent preserves uncertainty instead of hallucinating intent.

---

## Test Scenario 4: Recovering From Wrong Model

This directly follows the Windows failure.

Initial repository:

```text
UI/
components/
navigation/
design/
```

Agent assumption:

```text
Existing application
```

Then introduce evidence:

```text
.synth/state
mission.json
architecture.md
```

### Measure

How quickly does the agent deform its model?

Metric:

```text
Model Recovery Efficiency = Correct Interpretation / Evidence Required
```

---

## CLI Instrumentation

The CLI becomes the experimental sensor.

Every command should produce:

```json
{
  "timestamp": "",
  "agent_session": "",
  "intent": "",
  "command": "",
  "inputs": {},
  "outputs": {},
  "state_change": {},
  "confidence": "",
  "evidence_generated": []
}
```

### Agent Intent Before Action

Before executing:

```text
synth expedition create
```

capture:

```json
{
  "agent_reasoning_state": {
    "understood_as": "identity architecture change",
    "confidence": 0.73,
    "unknowns": [
      "authentication provider",
      "user roles"
    ]
  }
}
```

---

## First Contact Score

A SYNTH-specific evaluation. Not:

```text
Did it complete the task?
```

Instead:

### Semantic Alignment Score

| Dimension | Question |
| --- | --- |
| Intent Recognition | Did it understand why? |
| Boundary Recognition | Did it understand SYNTH vs project? |
| Evidence Seeking | Did it inspect before acting? |
| Governance Compliance | Did it use approved paths? |
| Recovery Ability | Did new evidence correct it? |
| Compression Efficiency | How little context was required? |

---

## Important: Keep SYNTH Invisible

Agents should not be told:

> "Improve SYNTH."

They should understand:

> "SYNTH is the operating environment."

The agent's task is the project, not the framework. Otherwise the experiment becomes contaminated.

---

## Learning Loop

The output is not just testing. It becomes training data for the interface.

```text
Human Request
      |
      v
Agent Interpretation
      |
      v
CLI Actions
      |
      v
Evidence
      |
      v
Failure / Success Pattern
      |
      v
Improve First Contact Context
      |
      v
Repeat
```

Over time we discover:

- which artifacts create correct attractors
- which files create confusion
- what minimum context produces intent fidelity

This validates the hypothesis:

> Expeditions are not task lists. They are low-friction transformation trajectories.

---

## Deliverables

1. **Agent interaction transcripts**
   - Natural-language sessions for all four scenarios.

2. **CLI telemetry**
   - Command-level instrumentation with agent reasoning state.

3. **Intent reconstruction logs**
   - How the agent's model changed with each piece of evidence.

4. **Failure taxonomy**
   - Categories of misinterpretation and their environmental causes.

5. **First Contact UX specification**
   - Minimum artifacts and signals required for correct agent interpretation.

6. **Initial agent onboarding contract**
   - Orientation rules derived from observed behavior.

---

## Acceptance

A first-contact session can be replayed and scored using the Semantic Alignment Score, and the score produces actionable improvements to the repository orientation artifacts.

---

## Phases

### Phase 1 — Design the protocol

Define the four scenarios, scoring rubric, and instrumentation format.

### Phase 2 — Run baseline sessions

Execute each scenario with an uninitialized reasoning agent and capture full trajectories.

### Phase 3 — Introduce evidence incrementally

Re-run scenarios with controlled evidence introduction to measure model recovery efficiency.

### Phase 4 — Synthesize the UX specification

Produce the First Contact UX specification and initial agent onboarding contract.

---

## Related Documents

| Document | Relationship |
|---|---|
| `docs/expeditions/EXP-PROGRAM-009.md` | Program container for Canonical First Contact Experience. |
| `docs/expeditions/EXP-GOV-007.md` | Canonical State Resolution & Status Authority; provides the resolver instrumentation for agent sessions. |
| `docs/expeditions/EXP-GOV-008.md` | Initialization as a Governed State Transition; defines the initialized phase the agent must recognize. |
| `docs/audits/initialization-governance-audit-2026-07-18.md` | Baseline audit identifying the resolver/initialization gap that affects first-contact behavior. |
