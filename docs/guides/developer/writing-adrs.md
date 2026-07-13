---
Title: Writing ADRs
Domain: developer
Audience: developers, architects
Prerequisites: architecture/decisions/README.md
Knowledge Establishes: How to write Architecture Decision Records for Synth
Depends On: architecture/decisions/README.md
Builds Toward: none (terminal)
Version: 1.0.0
Status: stable
---

# Writing ADRs

## When to Write an ADR

Write an ADR when:
- The decision affects system architecture
- Multiple alternatives were seriously considered
- The decision is hard to reverse

## ADR Template

```markdown
# ADR-NNNN: Title

## Status
proposed | accepted | rejected | deprecated | superseded by ADR-NNNN

## Context
What is the issue? What forces are at play?

## Decision
What was decided? Be specific.

## Consequences
Positive and negative. Be honest.

## Alternatives Considered
What was rejected and why.

## Related
Links to other ADRs, discoveries, decisions.
```

## Process

1. Draft the ADR
2. Review with stakeholders
3. Record the decision in Synth (AcceptDecision with relatedAdr)
4. Store in `architecture/decisions/`
5. Update cross-references

## Related Documents

- [Architecture Decisions](../../architecture/decisions/)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
