---
Title: Reviewing Discoveries
Domain: operator
Audience: operators
Prerequisites: 02-your-first-expedition.md, 04-working-with-expeditions.md
Knowledge Establishes: How to understand, evaluate, and act on discoveries recorded during expeditions
Depends On: 02-your-first-expedition.md, 04-working-with-expeditions.md
Builds Toward: 06-approving-decisions.md, 08-progress-and-confidence.md
Version: 1.0.0
Status: stable
---

# Reviewing Discoveries

## What Is a Discovery?

A discovery is newly learned architectural knowledge. It is not a task completion. It is not a status update. It is an insight that changes understanding.

Discoveries are the most valuable output of an expedition. They represent real learning.

## Discovery Structure

Every discovery has:

| Field | Purpose |
|-------|---------|
| id | Unique identifier |
| expeditionId | Which expedition produced it |
| description | What was learned |
| context | When and where it was learned |
| impact | How significant (low, medium, high, critical) |
| affectedObjectives | Which objectives are impacted |

## Recording a Discovery

```javascript
await api.handleIntent({
  actor: "you",
  capability: "RecordDiscovery",
  payload: {
    id: "D-1",
    expeditionId: "E-1",
    description: "The database schema needs a composite index on (user_id, created_at)",
    context: "During query performance profiling",
    impact: "high"
  }
})
```

## Reviewing Discoveries

To review discoveries for an expedition:

```javascript
const events = await eventStore.loadAll()
const discoveries = events
  .filter(e => e.type === "DISCOVERY_RECORDED")
  .filter(e => e.payload.discovery.expeditionId === "E-1")
```

## Acting on Discoveries

Discoveries drive decisions. After reviewing discoveries:

1. **Accept** — The discovery is valid. Update plans accordingly.
2. **Investigate** — The discovery raises new questions. Spawn a side quest.
3. **Defer** — The discovery is valid but not urgent. Record for later.
4. **Challenge** — The discovery may be incorrect. Verify before acting.

## Impact Levels

| Level | Meaning | Action |
|-------|---------|--------|
| Low | Minor insight | Record, no immediate action |
| Medium | Worth noting | Review during expedition retrospective |
| High | Significant finding | Likely requires decision or objective change |
| Critical | Changes everything | Expedition may need replanning |

## Discovery Patterns

Common discovery patterns:

**Constraint Discovery:** "The library we chose does not support X."
- Impact: High
- Action: Evaluate alternatives, record decision

**Performance Discovery:** "Query latency exceeds threshold under load."
- Impact: Critical
- Action: Spawn side quest for optimization

**Architecture Discovery:** "The current design creates a circular dependency."
- Impact: High
- Action: Propose architectural decision

**Requirement Discovery:** "Users actually need Y, not X."
- Impact: Critical
- Action: Revisit mission objectives

## Related Documents

- [Working with Expeditions](04-working-with-expeditions.md) — Expedition management
- [Approving Decisions](06-approving-decisions.md) — Acting on discoveries
- [Side Quests](07-sidequests.md) — When discoveries spawn new work

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
