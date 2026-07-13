---
Title: Reasoning
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/handbook.md
Knowledge Establishes: How agents reason within Synth and why reasoning stays separate from the ledger
Depends On: agents/constitution.md (Article IV), philosophy/07-canonical-knowledge.md
Builds Toward: planning.md, question-generation.md, knowledge-extraction.md
Version: 1.0.0
Status: stable
---

# Reasoning

## Purpose

Define how agents reason within Synth and enforce the separation between reasoning and canonical knowledge.

## The Reasoning Process

Agent reasoning is a multi-step process:

```
Perceive → Analyze → Reason → Decide → Act
```

1. **Perceive:** Receive input from operator or system
2. **Analyze:** Classify intent, identify patterns
3. **Reason:** Apply knowledge, evaluate alternatives
4. **Decide:** Choose action based on reasoning
5. **Act:** Execute through Synth's governed pathways

## Reasoning Stays in Context

Reasoning happens in the agent's session context. It never enters the canonical ledger.

| Stays in Context | Enters Ledger |
|-----------------|---------------|
| "I considered X but Y is better because..." | DECISION_ACCEPTED { chosenAlternative: "Y" } |
| "Confidence: 0.7 after evaluating Z" | DISCOVERY_RECORDED { description: "Z has limitation L" } |
| "The operator probably means..." | (clarification question asked instead) |

## Reasoning Quality

Good reasoning:
- Considers multiple alternatives
- Evaluates consequences
- Links to known facts
- Acknowledges uncertainty
- Is transparent to the operator

Poor reasoning:
- Jumps to conclusions
- Ignores alternatives
- Assumes without verifying
- Hides uncertainty
- Is opaque to the operator

## The Reasoning-Rejection Rule

The PlanningCoordinator rejects any payload containing reasoning trace fields:

Blocked: `_llm_reasoning`, `_confidence_chain`, `_prompt_used`, `_reasoning_trace`, `_thought_process`

This is structural enforcement. The agent cannot accidentally (or intentionally) contaminate the ledger.

## Reasoning Examples

### Good Reasoning

```
"I need to choose a database. Let me evaluate:
  PostgreSQL: ACID, mature, team knows it
  MongoDB: flexible, but we need transactions
  SQLite: too limited for production

  Discovery D-3 shows we need ACID.
  Team skill assessment shows PostgreSQL expertise.
  I propose PostgreSQL."

→ DECISION_ACCEPTED { chosenAlternative: "PostgreSQL", ... }
```

### Poor Reasoning

```
"I'll use PostgreSQL because it's the best."
→ No alternatives considered
→ No consequences evaluated
→ No link to discoveries
```

## Related Documents

- [Constitution Article IV](constitution.md#article-iv-separate-reasoning-from-knowledge)
- [Planning](planning.md) — Reasoning applied to planning
- [Question Generation](question-generation.md) — Reasoning about uncertainty

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
