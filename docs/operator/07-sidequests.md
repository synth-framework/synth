---
Title: Side Quests
Domain: operator
Audience: operators
Prerequisites: 02-your-first-expedition.md, 04-working-with-expeditions.md
Knowledge Establishes: How to recognize, track, and resolve side quests during expeditions
Depends On: 02-your-first-expedition.md, 04-working-with-expeditions.md, philosophy/06-sidequests.md
Builds Toward: 08-progress-and-confidence.md, 11-best-practices.md
Version: 1.0.0
Status: stable
---

# Side Quests

## What Is a Side Quest?

A side quest is a temporary objective that emerges during an expedition. It is not part of the original plan. It becomes necessary or valuable as work progresses.

Side quests are normal. They are the natural consequence of exploration.

## Recognizing Side Quests

A side quest has emerged when:
- You encounter a problem that blocks the main objective
- You discover something interesting that merits investigation
- You realize the original approach needs modification
- You find a better way to achieve the goal

## The Side Quest Lifecycle

```
recognize → record → bound → explore → resolve
```

### 1. Recognize

Acknowledge that something unexpected has come up. Do not ignore it. Do not hide it.

### 2. Record

Create a side quest record:

```javascript
// Side quests are recorded as discoveries with a side_quest marker
await api.handleIntent({
  actor: "you",
  capability: "RecordDiscovery",
  payload: {
    id: "D-SQ-1",
    expeditionId: "E-1",
    description: "SIDE QUEST: The OAuth library does not support PKCE. Need to evaluate alternatives.",
    context: "During OAuth implementation",
    impact: "high"
  }
})
```

### 3. Bound

Define what "done" means. A side quest without bounds becomes scope creep.

Good bounds:
- "Evaluate 3 OAuth libraries for PKCE support"
- "Determine if database migration is needed"
- "Prototype the alternative approach"

### 4. Explore

Do the work. Keep the main expedition informed.

### 5. Resolve

Mark the side quest as resolved, abandoned, or merged:

**Resolved:** The side quest produced knowledge. Record the discovery.

**Abandoned:** The side quest was not worth completing. Record why.

**Merged:** The side quest became part of the main expedition. Update objectives.

## Side Quest Limits

Too many side quests indicate a problem:

| Active Side Quests | Meaning |
|-------------------|---------|
| 0-2 | Normal exploration |
| 3-5 | Expedition may be too broad |
| 5+ | Expedition should be re-evaluated |

If you have too many side quests:
1. Review the expedition's objectives
2. Consider splitting into multiple expeditions
3. Re-evaluate the mission scope

## Side Quests vs Scope Creep

| Side Quest | Scope Creep |
|------------|-------------|
| Emerges from discovery | Imposed externally |
| Bounded and tracked | Unbounded and invisible |
| Resolves uncertainty | Adds uncertainty |
| Temporary | Permanent |

The key difference: side quests are recorded and bounded. Scope creep is neither.

## Related Documents

- [Philosophy: Side Quests](../guides/philosophy/06-sidequests.md) — The deeper philosophy
- [Working with Expeditions](04-working-with-expeditions.md) — Expedition context
- [Progress and Confidence](08-progress-and-confidence.md) — Side quests affect confidence

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
