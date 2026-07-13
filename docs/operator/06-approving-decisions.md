---
Title: Approving Decisions
Domain: operator
Audience: operators
Prerequisites: 02-your-first-expedition.md, 05-reviewing-discoveries.md
Knowledge Establishes: How the decision-making process works in Synth and how to approve or reject decisions
Depends On: 02-your-first-expedition.md, 05-reviewing-discoveries.md
Builds Toward: 04-working-with-expeditions.md, 11-best-practices.md
Version: 1.0.0
Status: stable
---

# Approving Decisions

## Decisions in Synth

A decision is a chosen architectural direction. It is not an opinion. It is not a preference. It is a commitment to a specific approach based on available knowledge.

Decisions are first-class in Synth. They are recorded, evaluated, and tracked.

## The Decision Lifecycle

```
proposed → accepted or rejected
```

Decisions start as "pending." They must be explicitly accepted or rejected.

## Recording a Decision

Decisions are created through the AcceptDecision capability:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "AcceptDecision",
  payload: {
    id: "DC-1",
    expeditionId: "E-1",
    title: "Use PostgreSQL for primary database",
    chosenAlternative: "PostgreSQL",
    alternatives: ["MySQL", "MongoDB", "PostgreSQL"],
    consequences: {
      positive: ["ACID compliance", "Rich query language", "Strong community"],
      negative: ["Operational complexity", "Scaling challenges"]
    }
  }
})
```

## Decision Quality

Good decisions have:
- **Multiple alternatives** considered
- **Consequences** evaluated (positive and negative)
- **Context** linking to discoveries
- **Clear title** describing the choice

Poor decisions have:
- Only one alternative (no real choice made)
- No consequences evaluated
- No connection to discoveries
- Vague title

## ADR Candidacy

Some decisions warrant an Architecture Decision Record (ADR). The PCE evaluates each decision:

| Is ADR Candidate? | Reason |
|-------------------|--------|
| Yes | Decision has alternatives and consequences — architectural significance |
| No | Decision is operational — record only |

When a decision is an ADR candidate, write an ADR and link it:
```javascript
// The ADR ref is stored in the decision
relatedAdr: "ADR-0042-postgresql-primary"
```

## Rejecting Decisions

Sometimes the right choice is to reject:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "RejectDecision",
  payload: { id: "DC-1" }
})
```

Rejected decisions remain in the log. They are part of the knowledge base. Future expeditions can see what was considered and rejected, not just what was accepted.

## Decision Reversibility

Some decisions are reversible. Others are not.

| Reversible | Irreversible |
|------------|--------------|
| Library choice (can swap) | Data model (migration needed) |
| UI framework | API contract (breaking change) |
| Deployment tool | Seal (one-way) |

Treat irreversible decisions with extra care. They require more discovery, more evaluation, and more explicit acceptance.

## Decision Patterns

**Technology Selection:** "Use X instead of Y"
- Evaluate: performance, maintainability, team expertise, ecosystem
- Discovery link: Performance benchmarks, prototype results

**Architecture Pattern:** "Use microservices instead of monolith"
- Evaluate: complexity, scalability, deployment, debugging
- Discovery link: Load testing, team structure analysis

**Design Choice:** "Use event sourcing for order management"
- Evaluate: audit needs, complexity, team experience
- Discovery link: Audit requirements, team capability assessment

## Related Documents

- [Reviewing Discoveries](05-reviewing-discoveries.md) — Decisions come from discoveries
- [Working with Expeditions](04-working-with-expeditions.md) — Decisions happen within expeditions
- [Architecture: ADRs](../architecture/decisions/) — Architecture Decision Records

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
