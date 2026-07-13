---
Title: Public Architecture Overview
Domain: reference
Audience: everyone
Prerequisites: philosophy/00-introduction.md
Knowledge Establishes: The high-level public flow through Synth
Depends On: philosophy/00-introduction.md
Builds Toward: operator guides, architecture handbook
Version: 1.0.0
Status: stable
---

# Public Architecture Overview

This document describes Synth using only the seven public concepts. No internal components are shown unless an operator must interact with them.

## The Public Flow

```text
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  Idea   │────▶│ Mission │────▶│ Planning │────▶│ Approval │
└─────────┘     └─────────┘     └──────────┘     └──────────┘
                                                        │
                                                        ▼
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌────────┐
│  Replay │◀────│   State  │◀────│  Events │◀────│ Commit │
└─────────┘     └──────────┘     └─────────┘     └────────┘
                              ▲                         │
                              └─────────────────────────┘
                                    Execution produces
                                    Events; Replay verifies
```

## Step by Step

1. **Idea** — Someone describes what they want to achieve.
2. **Mission** — The idea becomes a strategic goal.
3. **Planning** — Evidence is gathered, expeditions are defined, and a plan is built.
4. **Approval** — The plan is reviewed and approved.
5. **Commit** — The approved plan is committed to execution.
6. **Execution** — Actions are requested and, if allowed, recorded as events.
7. **Events** — Every action is appended as an immutable record.
8. **State** — The current picture is derived from all events.
9. **Replay** — The event log is replayed to prove the state is correct.

## What Each Concept Does

| Concept | Role in the Flow |
|---------|------------------|
| **Mission** | Captures the strategic goal |
| **Expedition** | Breaks the mission into bounded pieces of work |
| **Evidence** | Reduces uncertainty before decisions are made |
| **Plan** | The approved path forward, ready to execute |
| **Event** | The permanent history of every action |
| **State** | The live picture derived from events |
| **Replay** | The verification that state matches history |

## What Is Not Shown

Internal components like the execution gate, capability registry, event store, and adapters are intentionally omitted. They are implementation details. Operators do not need to know them to use Synth correctly.

## Relationship to the Operator Journey

The operator journey maps directly onto this flow:

| Journey Step | Architecture Step |
|---|---|
| Idea | Idea |
| Mission | Mission |
| Planning | Planning |
| Approval | Approval |
| Commit | Commit |
| Execution | Execution / Events |
| Replay | Replay |
| Documentation | Derived from State + Evidence |
| Done | Mission complete, State verified |

## Related Documents

- [Public Vocabulary](public-vocabulary.md) — Definitions of the seven public concepts
- [Operator Journey](../operator/13-operator-journey.md) — Step-by-step operator script
- [Introduction to Synth](../guides/philosophy/00-introduction.md) — Why Synth exists

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-07-12 | Initial public architecture overview |
