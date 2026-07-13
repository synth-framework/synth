---
Title: Planning Philosophy
Domain: philosophy
Audience: everyone
Prerequisites: 00-introduction.md, 01-engineering-philosophy.md
Knowledge Establishes: Planning as the reduction of uncertainty, not the creation of schedules
Depends On: 00-introduction.md, 01-engineering-philosophy.md
Builds Toward: 06-sidequests.md, 07-canonical-knowledge.md, agents/constitution.md, agents/handbook.md
Version: 1.0.0
Status: stable
---

# Planning Philosophy

## Planning Is Not Scheduling

In conventional project management, planning means creating a schedule. Tasks are identified, estimated, sequenced, and assigned. The plan is a timeline. Progress is measured by completion percentage.

This approach fails for engineering because engineering is not predictable. The work of engineering is learning. You cannot schedule learning. You cannot estimate what you do not yet understand.

Synth treats planning differently.

**Planning is the reduction of uncertainty.**

A plan is not a timeline. A plan is a map from what is known to what must be discovered. The purpose of planning is not to predict the future. It is to understand the present.

## Uncertainty as the Central Problem

Every engineering endeavor begins with uncertainty. Some questions are known. Others are unknown unknowns. The goal of planning is to convert uncertainty into knowledge.

Synth's planning model:

```
Uncertainty → Questions → Discovery → Knowledge → Decisions → Action
```

Each stage reduces uncertainty:

1. **Uncertainty** — We do not know something
2. **Questions** — We identify what we do not know
3. **Discovery** — We learn the answer
4. **Knowledge** — We record what we learned
5. **Decisions** — We choose a direction based on knowledge
6. **Action** — We execute the decision

Traditional planning skips steps 1-4 and jumps to scheduling step 6. Synth insists on completing steps 1-5 first.

## The Planning Cognition Engine

Synth's Planning Cognition Engine (PCE) embodies this philosophy. The PCE does not create Gantt charts. It resolves uncertainty.

The PCE pipeline:

1. **Classify intent** — What kind of planning is needed?
2. **Generate questions** — What do we not know?
3. **Extract knowledge** — What do the available documents tell us?
4. **Synthesize objectives** — What outcomes should be pursued?
5. **Create permit** — Authorize the planning action
6. **Commit to ledger** — Record the planning decision canonically

Notice that scheduling does not appear. Scheduling is an output of planning, not a substitute for it.

## Intent Classification

The PCE recognizes five modes of intent:

| Mode | Description | Uncertainty Level |
|------|-------------|-------------------|
| Guided Build | Full specification available | Low |
| Intent-Only Build | Sparse requirements | High |
| Knowledge-Driven Build | Documents without goals | Medium |
| Brownfield Adoption | Existing codebase | Medium-High |
| Continuation | Previous session context | Low-Medium |

Each mode triggers different planning behavior. A Guided Build can proceed directly to objectives. An Intent-Only Build must first generate extensive questions.

## Expeditions as Planning Units

Synth organizes planning around **expeditions**. An expedition is a bounded engineering objective with:

- A goal (what we want to learn or achieve)
- Objectives (specific outcomes)
- Discoveries (what we learn along the way)
- Decisions (choices we make)
- Work items (transient implementation artifacts)

An expedition is complete when its objectives are achieved, not when its timeline expires. An expedition that fails to achieve its objectives but produces valuable discoveries is more successful than one that meets its deadline but learns nothing.

## Question Generation

The PCE generates questions before taking action. This is the most important step in the planning pipeline.

Examples:

| Context | Generated Question |
|---------|-------------------|
| Creating a mission without purpose | "What is the mission's purpose?" |
| Creating an expedition without goal | "What is the expedition's goal?" |
| Adding an objective without purpose | "What outcome does this objective achieve?" |
| Missing identifier | "What identifier should be assigned?" |

Questions are not suggestions. They are blockers. The PCE generates them to force explicit resolution of uncertainty.

## Planning Confidence

As an expedition progresses, the PCE estimates planning confidence. This is not task completion percentage. It is a measure of how much uncertainty remains.

Confidence is calculated from:
- Objective completion rate (40%)
- Discovery uncertainty factor (35%)
- Decision acceptance rate (25%)

A confidence score below 0.4 means "high uncertainty — more discovery needed." Above 0.7 means "proceed with monitoring." Above 0.9 means "high confidence."

## Side Quests: Planning in the Real World

Real engineering does not follow a straight line. During an expedition, engineers encounter unexpected problems, interesting tangents, and necessary detours. These are **side quests**.

Side quests are not distractions. They are the natural consequence of exploration. Synth recognizes them, tracks them, and resolves them.

See [Side Quests](06-sidequests.md) for the full philosophy.

## The Foundational Invariant

Synth's planning philosophy is governed by one foundational invariant:

> **No engineering knowledge becomes canonical until uncertainty has been resolved.**

This means:
- No event is written to the ledger without question generation
- No objective is synthesized without knowledge extraction
- No decision is accepted without evaluation
- No expedition is complete without discovery recording

## Related Documents

- [Engineering Philosophy](01-engineering-philosophy.md) — Engineering as knowledge
- [Side Quests](06-sidequests.md) — Engineering as exploration
- [Canonical Knowledge](07-canonical-knowledge.md) — Knowledge persists, reasoning disappears
- [Agent Constitution](../agents/constitution.md) — "Reduce uncertainty before planning"
- [Operator Guide](../../operator/04-working-with-expeditions.md) — Practical expedition management

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
