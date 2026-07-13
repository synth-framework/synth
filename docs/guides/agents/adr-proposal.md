---
Title: ADR Proposal
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/architecture-review.md, agents/decision-evaluation.md
Knowledge Establishes: How agents propose Architecture Decision Records
Depends On: agents/constitution.md (Article III), agents/decision-evaluation.md, agents/architecture-review.md
Builds Toward: none (terminal capability)
Version: 1.0.0
Status: stable
---

# ADR Proposal

## Purpose

Guide agents in creating Architecture Decision Records (ADRs) for significant architectural decisions.

## When to Write an ADR

Write an ADR when:
- The decision has architectural significance
- Multiple alternatives were seriously considered
- Consequences affect system structure
- The decision is difficult to reverse

Do not write an ADR for:
- Library version updates
- Configuration changes
- Bug fixes
- Cosmetic changes

## ADR Structure

```markdown
# ADR-NNNN: Title

## Status
proposed | accepted | rejected | deprecated

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing or have agreed to?

## Consequences
What becomes easier or more difficult to do and any risks introduced
by the change that will need to be managed.

## Alternatives Considered
What other approaches were evaluated and why they were not chosen.

## Related Decisions
Links to related ADRs and discoveries.
```

## Process

```
Identify Need → Research → Draft → Review → Record in Synth → Link
```

1. **Identify:** Decision evaluation determines ADR candidacy
2. **Research:** Gather context, alternatives, consequences
3. **Draft:** Write the ADR
4. **Review:** Get operator review
5. **Record:** AcceptDecision with relatedAdr link
6. **Link:** Store ADR in architecture/decisions/

## Anti-Patterns

- **ADR Everything:** Writing ADRs for trivial decisions
- **No Alternatives:** ADR with only one option
- **No Consequences:** ADR listing only benefits
- **Orphan ADRs:** ADRs not linked to decisions in Synth

## Related Documents

- [Decision Evaluation](decision-evaluation.md)
- [Architecture Review](architecture-review.md)
- [Constitution Article III](constitution.md#article-iii-explain-architectural-decisions)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
