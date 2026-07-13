---
Title: Your First Expedition
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md
Knowledge Establishes: How to plan, execute, and complete a Synth expedition
Depends On: 01-getting-started.md, philosophy/03-planning-philosophy.md
Builds Toward: 04-working-with-expeditions.md, 05-reviewing-discoveries.md, 06-approving-decisions.md
Version: 1.0.0
Status: stable
---

# Your First Expedition

## What Is an Expedition?

An expedition is a bounded engineering objective. It is not a project. It is not a task list. It is a journey into uncertainty with the goal of producing knowledge.

Think of an expedition as a research mission. You start with a goal, you explore, you discover, you decide, and you complete.

## The Expedition Lifecycle

```
proposed → approved → executing → completed
            ↓           ↓
         cancelled    (discoveries,
                      decisions,
                      objectives)
```

## Step-by-Step: Your First Expedition

### Step 1: Create a Mission

Every expedition belongs to a mission. A mission is long-term direction.

```javascript
// Create the mission
await api.handleIntent({
  actor: "you",
  capability: "CreateMission",
  payload: {
    id: "M-FIRST",
    name: "Build User Authentication",
    purpose: "Enable secure user login"
  }
})
```

### Step 2: Approve the Mission

Missions start as "proposed." They must be approved to become active.

```javascript
await api.handleIntent({
  actor: "you",
  capability: "ApproveMission",
  payload: { id: "M-FIRST" }
})
```

### Step 3: Create an Expedition

Now create an expedition under the mission:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "CreateExpedition",
  payload: {
    id: "E-FIRST",
    missionId: "M-FIRST",
    name: "OAuth Integration",
    goal: "Integrate OAuth 2.0 authentication"
  }
})
```

The expedition status is now "planning."

### Step 4: Add Objectives

Objectives define what the expedition will achieve:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "AddObjective",
  payload: {
    id: "O-1",
    expeditionId: "E-FIRST",
    title: "Implement OAuth flow",
    purpose: "Users can log in via Google"
  }
})

await api.handleIntent({
  actor: "you",
  capability: "AddObjective",
  payload: {
    id: "O-2",
    expeditionId: "E-FIRST",
    title: "Store user tokens securely",
    purpose: "Tokens are encrypted at rest"
  }
})
```

### Step 5: Approve the Expedition

```javascript
await api.handleIntent({
  actor: "you",
  capability: "ApproveExpedition",
  payload: { id: "E-FIRST" }
})
```

Status: "approved"

### Step 6: Start the Expedition

```javascript
await api.handleIntent({
  actor: "you",
  capability: "StartExpedition",
  payload: { id: "E-FIRST" }
})
```

Status: "executing"

### Step 7: Record Discoveries

As work progresses, you will learn things. Record them:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "RecordDiscovery",
  payload: {
    id: "D-1",
    expeditionId: "E-FIRST",
    description: "Google requires HTTPS redirect URIs in production",
    context: "During OAuth setup",
    impact: "high"
  }
})
```

### Step 8: Make Decisions

When you choose an approach, record the decision:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "AcceptDecision",
  payload: {
    id: "DC-1",
    expeditionId: "E-FIRST",
    title: "Use JWT for session tokens",
    chosenAlternative: "JWT"
  }
})
```

### Step 9: Complete Objectives

As objectives are achieved:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "CompleteObjective",
  payload: { id: "O-1" }
})
```

### Step 10: Complete the Expedition

When all objectives are done:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "CompleteExpedition",
  payload: { id: "E-FIRST" }
})
```

### Step 11: Complete the Mission

When all expeditions are done:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "CompleteMission",
  payload: { id: "M-FIRST" }
})
```

## What You Have Accomplished

You have:
1. Created a mission with purpose
2. Charted an expedition with objectives
3. Recorded discoveries as you learned
4. Made decisions with reasoning
5. Completed everything systematically

All of this is in the event log. Forever. Immutable. Auditable.

## Reviewing Your Expedition

To see what happened:
```javascript
const events = await eventStore.loadAll()
const expeditionEvents = events.filter(e =>
  e.payload?.expedition?.id === "E-FIRST" ||
  e.payload?.id?.startsWith("E-FIRST")
)
```

## Related Documents

- [Working with Expeditions](04-working-with-expeditions.md) — Advanced expedition management
- [Reviewing Discoveries](05-reviewing-discoveries.md) — Understanding what was learned
- [Approving Decisions](06-approving-decisions.md) — The decision process
- [Side Quests](07-sidequests.md) — Handling unexpected work

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
