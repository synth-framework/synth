> **Canonical Source — SYNTH Public Identity**
>
> This document is the authoritative source for SYNTH's public identity. Public-facing projections — website copy, onboarding flows, documentation, presentations, tutorials, installer output, and other communication artifacts — should derive from this document. Changes should be evaluated for consistency with the established public narrative.
>
> It is a living source artifact governed by EXP-PROGRAM-009 — First Contact & Public Identity. Under the Deterministic Projection Model established in EXP-PROGRAM-008, derived public content should be produced as projections from this document and its successors, not authored independently.

# SYNTH Public Narrative

## Structure

This document separates public communication into layers that evolve at different rates:

```text
Public Narrative
│
├── Identity          (most stable: what SYNTH is and promises)
├── Mental Model      (how SYNTH fits into software engineering)
├── Narrative Ladder  (five levels of public explanation)
├── Vocabulary        (plain-language definitions)
├── Confused Concepts (distinctions from familiar ideas)
├── Style Guide       (copy conventions)
└── Canonical Statements (one-sentence descriptions)
```

---

## Identity

### What SYNTH Is

SYNTH is the **AI-native execution platform for governed software engineering**.

It turns human intent into approved plans, records every action as an immutable event, and lets anyone replay the history to prove the current state is correct.

In SYNTH, work is organized around **Missions** — strategic goals described in plain language. Each Mission is decomposed into **Expeditions**: bounded investigations or builds that move the Mission forward. Every Expedition produces **Evidence**, is approved as a **Plan**, and is executed through **Events** that update the **State**. **Replay** rebuilds that State from the event history to verify correctness.

The same workflow works whether a human, an AI agent, or a team of both is driving the work.

### The SYNTH Promise

> **Every decision is recorded, every action is governed, and every state is provable.**

If an action cannot be explained from approved intent and replayed from immutable evidence, it does not happen in SYNTH.

### What SYNTH Is Not

To avoid the wrong mental model:

- **SYNTH is not an AI model.** It does not generate code. It governs and records the execution of work proposed by humans or AI agents.
- **SYNTH is not a replacement for Git.** Git records what changed. SYNTH records why it changed, how it was approved, and that the result matches the approved intent.
- **SYNTH is not a CI/CD platform.** CI/CD validates output after the fact. SYNTH governs execution before and during the work and verifies it through Replay.
- **SYNTH is not a project management tool.** Missions and Expeditions may resemble tasks, but SYNTH is concerned with execution evidence and deterministic state, not scheduling or resource allocation.
- **SYNTH is not a coding assistant.** Coding assistants generate changes. SYNTH makes those changes accountable, replayable, and governable.

---

## Mental Model

### The Problem

Modern software development increasingly relies on AI, but the reasoning, approvals, and execution history behind generated changes are fragmented across chats, pull requests, terminals, and human memory. As AI capabilities grow, trust cannot depend on reviewing every line of generated code.

Today, when an AI agent changes a codebase, we rely on:

- **Pull requests** to capture intent — but they describe *what changed*, not *why*.
- **CI/CD** to validate output — but it checks only the final artifact, not the reasoning that produced it.
- **Chat threads** to record decisions — but they are fragmented, mutable, and disappear into history.
- **Code review** to enforce judgment — but it cannot scale when AI generates changes faster than humans can read them.

The result is a growing gap between *what we meant*, *what was done*, and *what we can prove*.

SYNTH closes that gap by making intent, approval, execution, and evidence part of a single deterministic system.

### Why SYNTH Is Different

SYNTH is not a better CI/CD tool, a smarter IDE plugin, or another AI coding assistant. It is a different category: an **execution platform** that makes human-AI collaboration observable, deterministic, and governable.

| Dimension | CI/CD | AI Coding Assistant | Git | SYNTH |
|---|---|---|---|---|
| **Captures intent** | No | Partial (prompts) | No | Yes — Missions and Plans |
| **Records reasoning** | No | No (chat history is ephemeral) | No | Yes — Evidence and Events |
| **Verifies execution** | Output-only tests | Output-only diffs | Diff history | Replay from events |
| **Governed by approved plan** | No | No | No (after-the-fact review) | Yes — ExecutionGate |
| **Designed for AI agents** | No | Yes, but stateless | No | Yes — CLI as execution surface |
| **Deterministic outcomes** | Sometimes | No | No | Yes — same events, same state |

CI/CD checks whether the code compiles. Git records what changed. AI assistants generate changes. SYNTH proves *why* the change was made, *how* it was approved, and *that* the result matches the approved intent.

### The AI-Native Workflow

SYNTH assumes that AI agents are first-class participants in software engineering, not accessories to human work.

The intended workflow is:

1. **Human describes intent** — "Refactor the authentication module to use capability providers."
2. **AI gathers evidence** — scans the codebase, identifies boundaries, proposes Expeditions.
3. **Human reviews and approves** — the Plan becomes authoritative.
4. **AI executes through SYNTH** — the CLI is an execution surface for agents, not a manual tool.
5. **Every action becomes an Event** — appended to the immutable event log.
6. **Replay verifies the State** — anyone can reconstruct what was done and why.

The CLI is real, but it is not the primary interface. The primary interface is natural-language intent transformed into deterministic execution.

---

## The Narrative Ladder

All public SYNTH communication should progress through these five levels. Skipping a level creates confusion.

### Level 1 — What problem exists?

AI agents can now write and change software faster than humans can review, but our tools for intent, reasoning, and proof have not kept pace. Trust cannot depend on reading every generated line. The gap between *what we meant* and *what was done* is widening.

### Level 2 — Why does SYNTH solve it?

SYNTH makes human-AI collaboration accountable. It records intent, governs execution against approved plans, and lets anyone replay the history to verify the current state.

### Level 3 — How does it work?

Intent becomes a Mission. A Mission becomes Expeditions. Expeditions produce Evidence and approved Plans. Execution happens through Events that update State. Replay verifies State from Events.

### Level 4 — How do I use it?

Install SYNTH, initialize a project, create a Mission Draft, approve it, and let SYNTH guide validation and governance. AI agents can drive the same CLI surface.

### Level 5 — How is it implemented?

SYNTH is built around a frozen architecture: API → ExecutionGate → Runtime → Domain → EventStore. Protected Assets — Mission Studio, Genesis, Replay, ExecutionGate, Event Model, Capability Model, Constitutional Baseline, and Public Vocabulary — ensure the execution model remains invariant.

---

## Vocabulary

Every public term should be introduced with a definition in this form:

```text
Definition      → what the word means
In SYNTH        → how the concept behaves in the system
Why it matters  → why the reader should care
```

### Mission

> **mission** — *noun*
>
> **Definition:** A clearly defined objective that describes **what** should be achieved, not **how** it should be implemented.
>
> **In SYNTH:** A Mission is the starting point for any significant work. It answers the question, "What are we trying to accomplish?"
>
> **Why it matters:** Without a stated mission, AI-generated work drifts toward local optima. A Mission keeps execution aligned with human intent.

### Expedition

> **expedition** — *noun*
>
> **Definition:** A bounded investigation or build that moves a Mission forward.
>
> **In SYNTH:** Expeditions have objectives, acceptance criteria, risks, and a definition of done. They are the unit of planned work.
>
> **Why it matters:** Breaking work into expeditions makes approval, execution, and replay tractable. Each expedition is small enough to reason about and large enough to matter.

### Evidence

> **evidence** — *noun*
>
> **Definition:** What you know and how confidently you know it.
>
> **In SYNTH:** Evidence is gathered before decisions are made. It makes approval explicit rather than assumed.
>
> **Why it matters:** AI can generate plausible plans quickly, but plans without evidence are guesses. Evidence makes approval responsible.

### Plan

> **plan** — *noun*
>
> **Definition:** The approved path forward, ready to execute.
>
> **In SYNTH:** A Plan is authoritative. Work that does not match the Plan is rejected by the ExecutionGate.
>
> **Why it matters:** The Plan is the contract between human judgment and execution. It is what governance checks against.

### Event

> **event** — *noun*
>
> **Definition:** An immutable record that something happened.
>
> **In SYNTH:** Events are append-only. Once recorded, they cannot be changed, only superseded by later Events.
>
> **Why it matters:** Immutability makes history trustworthy. If events can be edited, replay becomes meaningless.

### State

> **state** — *noun*
>
> **Definition:** The current picture, derived from Events.
>
> **In SYNTH:** State is not edited directly. It is rebuilt by applying Events.
>
> **Why it matters:** Deriving State from Events means the current picture is always provable. You do not have to trust a database; you can replay the log.

### Replay

> **replay** — *noun*
>
> **Definition:** The ability to reconstruct exactly how software was produced, step by step, from recorded evidence.
>
> **In SYNTH:** Replay proves that the current State matches the event history. If the history is correct, the State is correct.
>
> **Why it matters:** Replay turns accountability from a claim into a procedure. Anyone can verify what was done and why.

### Determinism

> **determinism** — *noun*
>
> **Definition:** The property that the same approved Plan, executed under the same conditions, always produces the same observable result.
>
> **In SYNTH:** Missions execute through deterministic governance and replay.
>
> **Why it matters:** Teams can trust AI-generated software because the process is explainable and reproducible, not dependent on hidden decisions or manual intervention.

### Governance

> **governance** — *noun*
>
> **Definition:** The rules that determine whether proposed work is acceptable before it becomes part of the system.
>
> **In SYNTH:** Governance checks actions against the approved Plan before they are recorded as Events.
>
> **Why it matters:** Governance is what prevents execution drift. It ensures that only work matching the approved intent becomes history.

### Projection

> **projection** — *noun*
>
> **Definition:** A deterministic transformation from one or more authoritative sources into another representation.
>
> **In SYNTH:** README, documentation, website content, and API references are projections of the same constitutional sources. They are build artifacts, not authoritative state.
>
> **Why it matters:** Projections keep public content consistent. When the source changes, every derived surface updates together.

---

## Frequently Confused Concepts

Visitors will map SYNTH's vocabulary onto familiar ideas. These distinctions prevent the wrong mental model.

| SYNTH Concept | Not The Same As | Why |
|---|---|---|
| **Mission** | Issue / Ticket | A Mission is a strategic objective, not a work item to be closed. |
| **Expedition** | Sprint / Task | An Expedition is a bounded piece of work with evidence and acceptance, not a timebox. |
| **Evidence** | Logs / Notes | Evidence is gathered *before* approval to inform decisions, not recorded afterward. |
| **Plan** | Spec / Design Doc | A Plan is authoritative and governs execution, not merely advisory. |
| **Event** | Log Entry | Events are immutable, structured, and define State. Logs are diagnostic and mutable. |
| **State** | Database | State is derived from Events; it can be rebuilt, not just queried. |
| **Replay** | Git History | Git history shows what changed. Replay proves the current State from the event history. |
| **Governance** | Code Review | Governance checks against the approved Plan before execution. Code review happens after the change. |
| **Determinism** | Repeatability | Determinism means the same approved Plan produces the same result, including governance decisions. |
| **Projection** | Documentation | A projection is a deterministic build artifact. Documentation may be authored directly. |

---

## Style Guide

### Tone

- **Direct.** Say what SYNTH is and does without hedging.
- **Concrete.** Anchor every claim in an engineering outcome.
- **Respectful.** Assume the reader is competent; do not talk down.
- **Determined.** SYNTH has opinions. State them clearly.

### Perspective

- Lead with the **problem**, not the mechanism.
- Describe SYNTH from the user's point of view, not the implementer's.
- Use active voice: "SYNTH records every action," not "Every action is recorded by SYNTH."

### Forbidden phrases

Avoid:

- "SYNTH is a platform that helps you..." — be specific.
- "With SYNTH, you can..." — lead with value, not capability listing.
- "Revolutionary," "game-changing," "effortless" — let the mechanism speak.
- "Simply," "just," "easily" — the reader decides what is simple.

### Canonical statements

When describing SYNTH in one sentence, prefer:

> "SYNTH is the AI-native execution platform for governed software engineering."

When describing the value, prefer:

> "Every decision is recorded, every action is governed, and every state is provable."

When describing the workflow, prefer:

> "Human intent becomes an approved Mission, decomposed into Expeditions, executed through Events, and verified by Replay."

---

## Using This Document

- **Website copy** should project the Problem, Promise, and Narrative Ladder.
- **Documentation** should use the Vocabulary definitions on first introduction of each term.
- **Examples** should demonstrate the AI-Native Workflow.
- **CLI help** should align with the Style Guide and Canonical Statements.
- **Installer output** should reference the Promise and one-sentence identity.
- **Future media** (videos, talks, blog posts) should start from Level 1 and progress through the ladder.

This narrative is intended to become a canonical source for all public-facing projections. Changes should be proposed through EXP-PROGRAM-009 expeditions and approved before public surfaces are updated.
