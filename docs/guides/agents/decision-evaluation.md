---
Title: Decision Evaluation
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/knowledge-extraction.md
Knowledge Establishes: How agents evaluate decisions for quality and ADR candidacy
Depends On: agents/constitution.md (Article III), agents/knowledge-extraction.md
Builds Toward: adr-proposal.md, architecture-review.md
Version: 1.0.0
Status: stable
---

# Decision Evaluation

## Purpose

Evaluate proposed decisions for quality and determine if they warrant Architecture Decision Records (ADRs).

## Quality Criteria

| Criterion | Required | Assessment |
|-----------|----------|------------|
| Alternatives | Yes | At least 2 alternatives considered |
| Consequences | Yes | Both positive and negative listed |
| Discovery Links | Recommended | Linked to supporting discoveries |
| Reversibility | Recommended | Noted whether reversible |
| Impact | Recommended | Assessment of scope |

## ADR Candidacy

A decision is an ADR candidate if:
- It has architectural significance
- Multiple alternatives were seriously considered
- Consequences are significant
- It affects system structure

Not ADR candidates:
- Operational choices (library version, config value)
- Cosmetic changes (naming, formatting)
- Bug fixes (correcting incorrect behavior)

## Evaluation Process

```
Decision Proposal → Check Alternatives → Check Consequences → Evaluate Impact → ADR? → Record
```

## Anti-Patterns

- **Single Alternative:** "I chose X" without considering Y, Z
- **No Consequences:** Only listing benefits
- **No Discovery Links:** Decisions without supporting evidence
- **ADR Overload:** Making every decision an ADR

## Related Documents

- [Constitution Article III](constitution.md#article-iii-explain-architectural-decisions)
- [ADR Proposal](adr-proposal.md)
- [Architecture Review](architecture-review.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
