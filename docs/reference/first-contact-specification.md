> **Canonical Source — SYNTH First Contact Experience**
>
> This document is the authoritative source for how a newcomer first encounters and learns SYNTH. Public-facing first-contact surfaces — website pages, onboarding flows, tutorials, videos, installer output, AI prompts, and future media — should derive from this specification.
>
> It is governed by EXP-PROGRAM-009 — Canonical First Contact Experience. Under the Deterministic Projection Model established in EXP-PROGRAM-008, derived first-contact artifacts should be produced as projections from this document and its companion canonical recorded journey, not authored independently.
>
> Companion document: `docs/reference/public-narrative.md` defines SYNTH's public identity, vocabulary, and narrative ladder. This document defines the learning journey that communicates that identity.

# SYNTH First Contact Specification

## Overview

The canonical first-contact experience follows one complete Mission from initial idea to verified Replay.

**Canonical Mission:** Build me a Space Mission Tracking Application.

A newcomer should be able to experience the entire journey in approximately five minutes and answer, without coaching:

- What is SYNTH?
- What problem does it solve?
- Why is it different?
- What role does AI play?
- What role does the CLI play?
- Why do Missions exist?
- Why does Replay matter?

---

## Architectural Note

The First Contact Specification is not user documentation. It is the authoritative experience specification from which onboarding, website content, tutorials, presentations, demonstrations, and other public communication artifacts are deterministically projected. Its purpose is to govern the learning journey, not to duplicate implementation documentation.

The same pattern appears elsewhere in SYNTH:

```text
Reality
    ↓
Authoritative Source
    ↓
Deterministic Projection
    ↓
Consumer Experience
```

For First Contact:

```text
Recorded Journey
    ↓
First Contact Specification
    ↓
Website / Video / Slides / Tutorial / Conference Talk
```

---

## Design Principles

Every episode follows **Show → Explain → Name**:

```text
Experience
    ↓
Explanation
    ↓
Terminology
```

Concepts are encountered as behavior before they are defined. The newcomer sees something happen, learns why it matters, and only then learns the formal term.

---

## Narrative Ladder Alignment

| Level | Question | Episodes |
|---|---|---|
| 1 | What problem exists? | Episode 1 — The Spark |
| 2 | Why does SYNTH solve it? | Episode 2 — The Idea |
| 3 | How does it work? | Episodes 3–7 — Plan, Execute, Events, State, Replay |
| 4 | How do I use it? | Episode 8 — Your Turn |
| 5 | How is it implemented? | Continue Exploring — Architecture |

Architecture is intentionally not part of the core first-contact journey. It belongs to a separate deep-dive path for visitors who want it.

---

## Episode Sequence

### Episode 1 — The Spark

**Level:** 1 — What problem exists?

**Learning objective:**

The newcomer should feel curiosity about why SYNTH pauses to analyze before writing code.

**What the newcomer experiences:**

A short micro-story. The user speaks to an AI agent:

> "Build me a Space Mission Tracking application."

The AI responds:

> "Absolutely. Before I write any code, I'm going to inspect your project, understand its architecture, and propose a plan for your approval."

The terminal begins moving:

```text
Analyzing repository...
Reading package.json...
Inspecting architecture...
Checking tests...
Discovering capabilities...
```

The user thinks: *"Wait... what's happening? Most AI tools just start coding."

**Explanation:**

Most AI tools jump directly into generating code. SYNTH first gathers evidence so every change can be explained later. That pause — analyzing before acting — is the first sign that something different is happening.

**Named concept:**

This is the beginning of **governed execution**. SYNTH closes the accountability gap between what we meant and what gets done.

**Success metric:**

Newcomer describes the opening moment as the AI analyzing before coding, not as a governance abstraction.

---

### Episode 2 — The Idea

**Level:** 2 — Why does SYNTH solve it?

**Learning objective:**

The newcomer should understand that SYNTH captures intent as a strategic objective before any execution begins.

**What the newcomer experiences:**

The agent creates a Mission from the user's request:

```text
Mission: Space Mission Tracking Application
Purpose: Track missions, crew assignments, and launch windows with a simple, realistic implementation.
```

The agent does not start coding. It turns the request into an explicit objective.

**Explanation:**

In SYNTH, work starts with intent described in plain language. A Mission is a strategic objective — what we want to achieve, not how to achieve it. Capturing intent first prevents execution drift.

**Named concept:**

**Mission** — a clearly defined objective that describes what should be achieved, not how.

**Success metric:**

Newcomer can restate the canonical Mission in their own words and explain why the AI did not start coding immediately.

---

### Episode 3 — The Plan

**Level:** 3 — How does it work?

**Learning objective:**

The newcomer should understand that AI plans before it executes, and that plans require approval.

**What the newcomer experiences:**

The AI agent breaks the Mission into pieces:

```text
Expedition 1: Design the data model for missions, crew, and launch windows.
Expedition 2: Scaffold the application structure.
Expedition 3: Implement mission listing and detail views.
Expedition 4: Add crew assignment workflow.
Expedition 5: Validate with the operator.
```

Each piece has an objective, acceptance criteria, and risks. The agent gathers evidence from the existing codebase and project conventions.

A human reviews the plan and approves it.

**Explanation:**

A Mission is too large to execute in one step. SYNTH breaks it into **Expeditions** — bounded investigations or builds that move the Mission forward. Each Expedition produces **Evidence** and has clear acceptance criteria before it can become an approved **Plan**.

**Named concepts:**

- **Expedition** — a bounded investigation or build that moves a Mission forward.
- **Evidence** — what you know and how confidently you know it.
- **Plan** — the approved path forward, ready to execute.

**Success metric:**

Newcomer can list the Expeditions and explain why approval matters.

---

### Episode 4 — The AI Works

**Level:** 3 — How does it work?

**Learning objective:**

The newcomer should understand that the AI executes the approved Plan through SYNTH's CLI surface.

**What the newcomer experiences:**

The AI agent executes the approved Plan. The terminal shows progress:

```text
Executing Expedition 2: Scaffold application structure...
Creating src/missions/
Creating src/crew/
Creating src/launch-windows/
Running tests...
```

Files are created. Tests run. Documentation updates. The user watches the work happen.

**Explanation:**

The CLI is real, but it is an execution surface for the AI agent. The human approved the Plan; the agent carries it out. The human remains in control without doing the mechanical work.

**Named concept:**

**CLI as execution surface** — the command-line interface is how agents and automation execute approved Plans.

**Success metric:**

Newcomer describes the CLI as the surface where the AI executes, not as a tool they must operate manually.

---

### Episode 5 — Nothing Was Forgotten

**Level:** 3 — How does it work?

**Learning objective:**

The newcomer should understand that every action becomes an immutable record.

**What the newcomer experiences:**

After watching the AI work, the view shifts:

```text
Every one of those actions became an immutable Event.

Event 1: Expedition approved.
Event 2: File created — src/missions/Mission.ts
Event 3: Test executed — 12 passed.
Event 4: Documentation updated.
```

**Explanation:**

An **Event** is an immutable record that something happened. Events are append-only: once recorded, they cannot be changed, only superseded by later Events. This immutability makes history trustworthy.

**Named concept:**

**Event** — an immutable record that something happened.

**Success metric:**

Newcomer explains that every action is recorded permanently and cannot be altered.

---

### Episode 6 — State

**Level:** 3 — How does it work?

**Learning objective:**

The newcomer should understand that the current project picture is derived from Events, not stored independently.

**What the newcomer experiences:**

After several Events, the application exists: source files, tests, documentation. The newcomer sees the current picture of the project — and is shown that this picture comes from applying the Events.

**Explanation:**

The current picture is called **State**. In SYNTH, State is not edited directly. It is rebuilt by applying Events. This means the current picture is always provable: you can reconstruct it from the event log.

**Named concept:**

**State** — the current picture, derived from Events.

**Success metric:**

Newcomer explains that changing State requires adding Events, not editing a database.

---

### Episode 7 — Replay

**Level:** 3 — How does it work?

**Learning objective:**

The newcomer should understand that Replay proves history rather than merely displaying it.

**What the newcomer experiences:**

The newcomer steps backward through the Mission. Each Event is replayed: the original prompt, the AI reasoning, the CLI command, the outcome. The final State is rebuilt before their eyes.

**Explanation:**

**Replay** is the ability to reconstruct exactly how software was produced, step by step, from recorded evidence. Replay proves that the current State matches the event history. If the history is correct, the State is correct.

**Named concept:**

**Replay** — the ability to reconstruct exactly how software was produced from recorded evidence.

**Success metric:**

Newcomer describes Replay as reconstructing the journey from events, not just reviewing a diff or log.

---

### Episode 8 — Your Turn

**Level:** 4 — How do I use it?

**Learning objective:**

The newcomer should know the minimal steps to start using SYNTH and feel motivated to try it.

**What the newcomer experiences:**

A concise installation and first-Mission sequence:

```bash
curl -fsSL https://synth.dev/install.sh | sh
synth doctor
synth init
synth mission create --subject "Space Mission Tracker" --purpose "Track missions, crew, and launch windows."
```

The AI agent is shown taking the next step: proposing Expeditions, gathering evidence, and awaiting approval.

**Explanation:**

Using SYNTH means installing it, initializing a project, describing your intent as a Mission, and letting SYNTH guide planning, governance, and validation. The CLI is the execution surface; the AI agent is the primary interface.

**Named concept:**

**AI-native workflow** — human intent, AI planning, approved execution, immutable events, Replay verification.

**Success metric:**

Newcomer can name the three commands needed to install SYNTH and create a Mission, and wants to try it.

---

## Continue Exploring

**Level:** 5 — How is it implemented?

The core first-contact journey ends at Episode 8. Visitors who want to understand the architecture can continue here.

A simple diagram shows the flow:

```text
Human Intent
    ↓
Mission
    ↓
Expeditions + Evidence
    ↓
Approved Plan
    ↓
ExecutionGate
    ↓
Events
    ↓
State
    ↓
Replay
```

**Explanation:**

SYNTH is built around a frozen architecture that keeps the execution model invariant. Protected Assets — Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, Constitutional Baseline, and Public Vocabulary — ensure that the core behavior does not drift.

**Named concept:**

**Protected Assets** — components of SYNTH that are frozen to preserve deterministic execution.

This section is optional. It should be reachable from Episode 8 via a small link such as "Curious how it works? Explore the architecture."

---

## Concept Introduction Order

| Order | Concept | First Experienced | Explained | Named |
|---|---|---|---|---|
| 1 | Governed execution | Episode 1 | Episode 1 | Episode 1 |
| 2 | Mission | Episode 2 | Episode 2 | Episode 2 |
| 3 | Expedition | Episode 3 | Episode 3 | Episode 3 |
| 4 | Evidence | Episode 3 | Episode 3 | Episode 3 |
| 5 | Plan | Episode 3 | Episode 3 | Episode 3 |
| 6 | CLI as execution surface | Episode 4 | Episode 4 | Episode 4 |
| 7 | Event | Episode 5 | Episode 5 | Episode 5 |
| 8 | State | Episode 6 | Episode 6 | Episode 6 |
| 9 | Replay | Episode 7 | Episode 7 | Episode 7 |
| 10 | AI-native workflow | Episode 8 | Episode 8 | Episode 8 |
| 11 | Protected Assets | Continue Exploring | Continue Exploring | Continue Exploring |

---

## Success Metrics for the Full Journey

A first-time technical visitor should be able to answer, without coaching and after a single pass through the canonical experience:

1. **What is SYNTH?**
   - Acceptable: an AI-native execution platform for governed software engineering.

2. **What problem does it solve?**
   - Acceptable: the accountability gap between human intent and AI-generated changes.

3. **Why is it different?**
   - Acceptable: it records intent, governs execution against approved plans, and verifies through Replay.

4. **What role does AI play?**
   - Acceptable: AI agents translate intent into plans and execute through the CLI surface.

5. **What role does the CLI play?**
   - Acceptable: the CLI is the execution surface for agents and automation.

6. **Why do Missions exist?**
   - Acceptable: to capture human intent before execution and prevent drift.

7. **Why does Replay matter?**
   - Acceptable: it proves the current State from immutable Events.

---

## Projection Targets

This specification should be projected into the following surfaces:

| Surface | Projection |
|---|---|
| Website homepage | Episodes 1–2 above the fold; links to full journey |
| Website journey page | Episodes 1–8 as a scrollable experience |
| Documentation tutorial | Textual walkthrough with code snippets |
| Installer output | Episodes 1–2 plus "Your Turn" commands |
| Video script | Scene-by-scene adaptation of all episodes |
| Conference demo | Live execution of the canonical Mission |
| AI onboarding prompt | Condensed episode sequence for agent introduction |

---

## Canonical Recorded Journey

The companion artifact for this specification is the canonical recorded journey produced by EXP-FIRSTCONTACT-003. It contains:

- Human prompts
- AI reasoning
- CLI invocations
- Events
- Replay
- Proof
- Timeline mapped to these episodes

Once available, every projection should be traceable to a specific moment in the recorded journey.

---

## Using This Document

- **Website** should project Episodes 1–7 as an interactive narrative and Episode 8 as the call to action.
- **Documentation** should expand each episode into a tutorial chapter.
- **Installer** should reference the problem, the promise, and the first three commands.
- **Videos and talks** should follow the episode sequence without skipping levels.
- **AI onboarding** should use the episode order when introducing SYNTH to users.
- **Architecture deep-dives** should consume the Continue Exploring section, not replace Episode 8.

Changes to this specification should be proposed through EXP-PROGRAM-009 expeditions and approved before public surfaces are updated.
