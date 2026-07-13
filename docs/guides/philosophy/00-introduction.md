---
Title: Introduction to Synth
Domain: philosophy
Audience: everyone
Prerequisites: none
Knowledge Establishes: The engineering problem Synth solves and why it exists
Depends On: nothing
Builds Toward: 01-engineering-philosophy.md, 02-deterministic-engineering.md, operator/01-getting-started.md
Version: 2.0.0
Status: stable
---

# Introduction to Synth

## The Problem

Engineering knowledge is fragile. Every codebase contains not just code, but decisions, assumptions, constraints, discoveries, and dead ends. This knowledge is typically stored in human memory, scattered documentation, commit messages, and tribal culture. When the people leave, the knowledge leaves with them.

Most software systems are therefore opaque. A new contributor cannot understand *why* the system works the way it does without reverse-engineering years of decisions. An operator cannot diagnose problems without deep institutional knowledge.

Synth exists to solve this problem.

## What Synth Is

Synth is a system for doing engineering work with a permanent, replayable history.

It is built on seven public concepts:

1. **Mission** — the strategic goal you want to achieve
2. **Expedition** — a bounded investigation or build that moves the mission forward
3. **Evidence** — what you know and how confidently you know it
4. **Plan** — the approved path forward, including the work to do
5. **Event** — an immutable record that something happened
6. **State** — the current picture of the world, derived from events
7. **Replay** — rebuilding state from events to prove correctness

At its core, Synth provides:

1. **Immutable history** — every decision, discovery, and change is preserved forever
2. **Planning before action** — uncertainty is resolved before work begins
3. **Verified state** — the current picture can always be rebuilt from history
4. **Governance** — structural rules keep the work aligned with the mission

## What Synth Is Not

- Synth is not a project management tool
- Synth is not a task tracker
- Synth is not a code generator
- Synth is not an AI agent

Synth is the **foundation** upon which all of these can be built correctly.

## The Five Questions

Every Synth document answers one of five questions. No document attempts to answer all five.

| Question | Domain | Example |
|----------|--------|---------|
| WHY | Philosophy | Why keep an immutable history? |
| WHAT | Reference | What is a Plan? |
| HOW | Developer | How do I add a new action? |
| WHO | Operator | Who approves expeditions? |
| WHEN | Architecture | When should I write an ADR? |

## Origins

Synth emerged from the observation that engineering teams consistently lose knowledge. Decisions made in meetings disappear. Code written without context becomes legacy. Architecture evolves through implicit understanding rather than explicit agreement.

The solution is not better documentation in the conventional sense. The solution is to make knowledge **first-class** — as important as code, as durable as data, as discoverable as an API.

## How to Read This Knowledge Base

If you are new to Synth, begin with this document, then follow your reading path based on your role:

- **Operator** → [Operator Guide](../../operator/01-getting-started.md)
- **AI Agent** → [Agent Constitution](../agents/constitution.md)
- **Developer** → [Developer Guide](../developer/)
- **Architect** → [Architecture Handbook](../../architecture/)

## Key Concepts

These concepts appear throughout the knowledge base:

| Concept | Meaning |
|---------|---------|
| **Mission** | A strategic goal |
| **Expedition** | A bounded engineering objective |
| **Evidence** | What you know and how you know it |
| **Plan** | The approved path forward |
| **Event** | An immutable record that something happened |
| **State** | The current picture, derived from events |
| **Replay** | Rebuilding state from events to prove correctness |

For full definitions, see the [Public Vocabulary](../../reference/public-vocabulary.md).

## Landing Page Narrative

> Synth helps engineering teams preserve knowledge, plan with confidence, and prove that their systems are correct. A team defines a **Mission**, runs **Expeditions** to reduce uncertainty with **Evidence**, approves a **Plan**, and commits to execution. Every action is recorded as an **Event**, the current **State** is derived from those events, and **Replay** proves that the picture is correct.

## Related Documents

- [Engineering Philosophy](01-engineering-philosophy.md) — The deeper "why" behind Synth's approach
- [Event-Sourced Engineering](04-event-sourced-engineering.md) — Why immutable history matters
- [Planning Philosophy](03-planning-philosophy.md) — How Synth thinks about planning
- [Public Vocabulary](../../reference/public-vocabulary.md) — The seven public concepts

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-07-12 | Rewrote using public vocabulary; added landing narrative |
| 1.0.0 | 2026-06-28 | Initial stable release |
