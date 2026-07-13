---
Title: Mission Studio Guide
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md
Knowledge Establishes: How to use Mission Studio to plan and approve work
Depends On: 01-getting-started.md
Builds Toward: 02-your-first-expedition.md, 04-working-with-expeditions.md
Version: 1.0.0
Status: stable
---

# Mission Studio Guide

Mission Studio is the planning environment in Synth. It is where an idea becomes a mission, a mission becomes a set of expeditions, and expeditions become an approved plan.

Mission Studio is read-only with respect to execution. It produces plans; execution commits those plans as events.

---

## The Planning Flow

```text
Idea
  │
  ▼
Mission
  │
  ▼
Expeditions
  │
  ▼
Objectives
  │
  ▼
Approved Plan
```

---

## Chart a Mission

A mission captures the strategic goal.

```javascript
api.handleIntent({
  actor: "your-name",
  capability: "CreateMission",
  payload: {
    id: "M-1",
    name: "Customer Support Portal",
    description: "Let customers submit tickets and track status."
  }
})
```

The mission starts in `draft` status. While it is draft, you can refine it without affecting operational state.

---

## Add Evidence

Before approving a mission, gather evidence to reduce uncertainty.

```javascript
api.handleIntent({
  actor: "your-name",
  capability: "RecordDiscovery",
  payload: {
    expeditionId: "E-research",
    discoveryId: "D-001",
    content: "80% of support requests are password resets."
  }
})
```

Evidence lives inside expeditions. Strong evidence supports decisions. Weak evidence produces questions.

---

## Define Expeditions

Break the mission into bounded expeditions.

```javascript
api.handleIntent({
  actor: "your-name",
  capability: "CreateExpedition",
  payload: {
    id: "E-1",
    missionId: "M-1",
    name: "Authentication Flow",
    goal: "Design login, session, and password reset."
  }
})
```

Each expedition should have:

- A clear goal
- 2-5 objectives
- A definition of done

---

## Add Objectives

Objectives are the concrete outcomes of an expedition.

```javascript
api.handleIntent({
  actor: "your-name",
  capability: "AddObjective",
  payload: {
    expeditionId: "E-1",
    objectiveId: "O-1",
    description: "Login page accepts email and password."
  }
})
```

Objectives are immutable once added. You can complete them or add more, but you cannot rewrite them.

---

## Review Snapshot Lineage

Mission Studio keeps a history of approved mission snapshots. Each approval produces a new snapshot that references the previous one.

To review lineage:

```javascript
const lineage = await missionStudio.getSnapshotLineage("M-1")
// Returns ordered snapshots from first approval to latest
```

Lineage lets you answer:

- What did we originally approve?
- What changed between approvals?
- Why did it change?

---

## Approve a Mission

When the plan is ready, approve the mission.

```javascript
api.handleIntent({
  actor: "approver",
  capability: "ApproveMission",
  payload: { id: "M-1" }
})
```

Approval does two things:

1. It commits the approved plan as an immutable snapshot.
2. It produces an event that makes the mission active.

After approval, execution can begin.

---

## What Mission Studio Does Not Do

Mission Studio does not execute work. It only plans. Execution happens through the approved plan, where actions are checked against policy and recorded as events.

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Mission too broad | Split into multiple missions |
| Expedition has no clear goal | Rewrite the goal until it fits in one sentence |
| Too many objectives | Split the expedition |
| Approving without evidence | Add discoveries or lower confidence |

---

## Related Documents

- [Getting Started](01-getting-started.md)
- [Your First Expedition](02-your-first-expedition.md)
- [Working with Expeditions](04-working-with-expeditions.md)
- [Public Architecture](../reference/public-architecture.md)
- [Snapshot Lineage Test](../../tests/mission-studio-snapshot-lineage.test.js)
