---
Title: Canonical Knowledge
Domain: philosophy
Audience: everyone
Prerequisites: 00-introduction.md, 01-engineering-philosophy.md, 04-event-sourced-engineering.md
Knowledge Establishes: The distinction between knowledge (stable) and reasoning (transient), and why only knowledge belongs in the canonical record
Depends On: 00-introduction.md, 01-engineering-philosophy.md, 04-event-sourced-engineering.md
Builds Toward: 08-future-vision.md, agents/constitution.md, agents/handbook.md
Version: 1.0.0
Status: stable
---

# Canonical Knowledge

## Knowledge Persists. Reasoning Disappears.

When an engineer makes a decision, two things happen:

1. **Reasoning:** The thought process that led to the decision. This includes exploration, analysis, consideration of alternatives, dead ends, and tentative conclusions.
2. **Knowledge:** The stable understanding that remains after the reasoning is complete. This includes the decision itself, the constraints identified, the tradeoffs evaluated, and the conclusions reached.

Reasoning is transient. It happens once and is discarded. Knowledge is permanent. It becomes part of the canonical record.

## What Is Canonical

In Synth, **canonical knowledge** is knowledge that has been:
1. Resolved (uncertainty removed)
2. Recorded (written to the event log)
3. Attested (cryptographically verified)
4. Accepted (approved through the decision process)

Canonical knowledge is trustworthy. It has been through the pipeline. It is not opinion. It is not draft. It is the system's understanding of reality.

## What Is Not Canonical

The following are **not** canonical:
- Reasoning traces ("I considered X but chose Y")
- LLM thought processes ("Let me think about this...")
- Confidence chains ("Step 1: 0.7, Step 2: 0.8...")
- Prompts used to generate responses
- Transient analysis ("This might work because...")

These are valuable during the reasoning process. They must never enter the canonical record.

## Why This Separation Matters

Mixing reasoning with knowledge corrupts both.

**Reasoning in the canonical record:**
- Creates confusion (was this a decision or a thought?)
- Pollutes search (reasoning text matches queries it shouldn't)
- Expands storage (reasoning is verbose)
- Obscures truth (readers must separate signal from noise)

**Knowledge in the reasoning process:**
- Constrains thinking (existing knowledge limits exploration)
- Creates bias (canonical knowledge feels final)
- Prevents revision (changing canonical knowledge requires process)

The separation keeps both processes clean.

## The Reasoning Rejection Rule

Synth enforces this separation structurally. The PlanningCoordinator rejects any payload containing reasoning trace fields.

Blocked fields include:
- `_llm_reasoning`
- `_confidence_chain`
- `_prompt_used`
- `_reasoning_trace`
- `_thought_process`

This is not a suggestion. It is an invariant violation. Any attempt to write reasoning traces to the ledger is rejected.

## Knowledge as a Graph

Canonical knowledge forms a graph. Each piece of knowledge depends on other pieces. Each piece supports future knowledge.

```
Discovery D-1 → Decision DC-1 → Objective O-1 → Work Item W-1
```

This graph is navigable. You can trace from any work item back to the discovery that motivated it. You can trace from any discovery forward to the decisions and objectives it enabled.

## Knowledge vs Implementation

Canonical knowledge is implementation-independent. The knowledge that "we need encryption" is stable. The code that implements encryption changes.

This separation means:
- Knowledge survives refactoring
- Knowledge survives migration
- Knowledge survives replacement
- Knowledge accumulates indefinitely

## The Foundational Invariant

> **No engineering knowledge becomes canonical until uncertainty has been resolved.**

This invariant governs the entire knowledge pipeline. Knowledge only enters the canonical record after:
1. Questions have been asked
2. Uncertainty has been identified
3. Resolution has been attempted
4. The result has been evaluated

## Knowledge Hierarchy

Synth establishes a knowledge hierarchy:

```
Architectural Constitution
↓
Agent Constitution
↓
Architecture Decision Records
↓
... (lower documents)
```

No lower document may contradict a higher document. This ensures consistency across the knowledge base.

## Related Documents

- [Engineering Philosophy](01-engineering-philosophy.md) — Engineering as knowledge
- [Event-Sourced Engineering](04-event-sourced-engineering.md) — Immutable history
- [Planning Philosophy](03-planning-philosophy.md) — Resolving uncertainty
- [Agent Constitution](../agents/constitution.md) — "Separate reasoning from knowledge"

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
