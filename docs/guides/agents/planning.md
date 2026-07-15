---
Title: Planning
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/handbook.md, agents/reasoning.md
Knowledge Establishes: How agents plan expeditions using the PCE pipeline
Depends On: agents/constitution.md (Article I), agents/reasoning.md, philosophy/03-planning-philosophy.md
Builds Toward: question-generation.md, knowledge-extraction.md, planning-confidence.md
Version: 1.0.0
Status: stable
---

# Planning

## The Planning Pipeline

Agent planning follows the PCE (Planning Cognition Engine) pipeline:

```
Intent → Classify → Question → Extract Knowledge → Synthesize → Permit → Commit
```

## Stage 0: Environment Discovery

Before classifying intent, run environment discovery and read the Capability Report:

```bash
node scripts/generate-capability-report.js
```

Plan against discovered capabilities, never assumed ones. Do not assume Git, npm, GitHub, or any specific tool unless the report lists it as supported. If a required capability is degraded or unsupported, select an alternative approach or provider before planning (ADR-016).

## Stage 1: Intent Classification

Classify the operator's request:

| Mode | Signal | Behavior |
|------|--------|----------|
| Guided Build | Full spec, clear goals | Validate completeness, decompose |
| Intent-Only Build | Sparse request, <100 words | Generate extensive questions |
| Knowledge-Driven Build | Documents without explicit goals | Extract knowledge, infer goals |
| Brownfield Adoption | Existing codebase | Analyze first, plan second |
| Continuation | Previous session ID | Review state, continue |

## Stage 2: Question Generation

Generate questions to resolve uncertainty. See [Question Generation](question-generation.md).

## Stage 3: Knowledge Extraction

Extract knowledge from available documents. See [Knowledge Extraction](knowledge-extraction.md).

## Stage 4: Objective Synthesis

Convert knowledge into objectives:

```
Knowledge: "System shall support 1000 concurrent users"
→ Objective: "Implement load testing for 1000 concurrent users"
→ Objective: "Design architecture to support 1000 concurrent users"
```

## Stage 5: Planning Permit

Create a PlanningPermit through the PlanningCoordinator. The permit:
- Is signed with HMAC-SHA256
- Proves uncertainty has been resolved
- Authorizes ledger write
- Contains no reasoning traces

## Stage 6: Commit to Ledger

Dispatch through the CommandBus. The single mutation authority records the event.

## Planning Rules

1. No plan without questions answered
2. No objectives without knowledge extracted
3. No expedition without clear goal
4. No commitment without permit
5. No plan step against an unsupported or unverified capability

## Anti-Patterns

- **Premature Planning:** Creating expeditions before understanding the problem
- **Scope Inflation:** Adding objectives beyond the expedition's goal
- **Discovery Avoidance:** Planning without extracting available knowledge
- **Permit Bypass:** Attempting to write without a valid permit

## Related Documents

- [Question Generation](question-generation.md)
- [Knowledge Extraction](knowledge-extraction.md)
- [Planning Confidence](planning-confidence.md)
- [Constitution Article I](constitution.md#article-i-reduce-uncertainty-before-planning)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
| 1.1.0 | 2026-07-15 | Stage 0 Environment Discovery and capability planning rule (ADR-016) |
