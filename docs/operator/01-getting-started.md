---
Title: Getting Started
Domain: operator
Audience: operators
Prerequisites: none
Knowledge Establishes: How to interact with a Synth system for the first time
Depends On: philosophy/00-introduction.md
Builds Toward: 02-your-first-expedition.md, 03-understanding-genesis.md
Version: 2.0.0
Status: stable
---

# Getting Started with Synth

## What You Need to Know First

Synth is a system for doing engineering work with a permanent, replayable history. You interact with it by asking for actions. A request says what you want to do. Synth checks it against the approved plan, executes it if allowed, and records what happened.

You do not edit state directly. You request actions. Synth handles the rest.

For the seven public concepts that explain Synth, see the [Public Vocabulary](../reference/public-vocabulary.md).

## Your First Interaction

When a Synth system boots, it goes through **Genesis** — the moment the initial plan is committed and the system begins recording events. After Genesis, the system is in operational mode.

Once running, you interact with Synth through its API:

```javascript
// Example: request the CreateExpedition action
api.handleIntent({
  actor: "your-name",
  capability: "CreateExpedition",
  payload: { id: "E-1", missionId: "M-1", name: "My First Expedition", goal: "Learn Synth" }
})
```

Synth responds with:

```javascript
{
  status: "ok",
  result: { /* output */ },
  traceId: "unique-transaction-id"
}
```

## Key Concepts for Operators

| Concept | What It Means |
|---------|---------------|
| **Mission** | The strategic goal you are working toward |
| **Expedition** | A bounded piece of work that moves the mission forward |
| **Evidence** | What you know and how confidently you know it |
| **Plan** | The approved path forward, including the work to do |
| **Event** | An immutable record that something happened |
| **State** | The current picture of the world, derived from events |
| **Replay** | Rebuilding state from events to prove correctness |

## Checking System Status

To see the current state:

```javascript
const state = await replayVerifier.getStats()
// Returns: event count, expedition count, plan count, state hash, etc.
```

To verify consistency:

```javascript
const check = await replayVerifier.verify()
// check.consistent === true means state is valid
```

## Common Workflows

### Create a mission

```javascript
api.handleIntent({ actor: "you", capability: "CreateMission", payload: { id: "M-1", name: "Platform Build" } })
```

### Approve a mission

```javascript
api.handleIntent({ actor: "you", capability: "ApproveMission", payload: { id: "M-1" } })
```

### Start an expedition

```javascript
api.handleIntent({ actor: "you", capability: "StartExpedition", payload: { id: "E-1" } })
```

### Complete an objective

```javascript
api.handleIntent({ actor: "you", capability: "CompleteObjective", payload: { id: "O-1" } })
```

## What Happens When Things Go Wrong

If a request is rejected:

```javascript
{
  status: "error",
  error: "[POLICY_BLOCKED] Denied by policy: completed-work-protection",
  traceId: "policy-1234567890"
}
```

Common reasons for rejection:

- **Policy blocked** — The action would violate a system rule
- **Validation failed** — The request is malformed or missing required fields
- **Invariant violation** — The action would break a structural rule

## Next Steps

Now that you understand the basics, learn to plan work through Synth:

→ [Your First Expedition](02-your-first-expedition.md)

## Related Documents

- [Operator Journey](13-operator-journey.md) — The complete end-to-end journey
- [Your First Expedition](02-your-first-expedition.md) — Planning and executing work
- [Understanding Genesis](03-understanding-genesis.md) — How systems are initialized
- [FAQ](12-faq.md) — Common questions
- [Public Vocabulary](../reference/public-vocabulary.md) — The seven public concepts

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | 2026-07-12 | Rewrote using public vocabulary |
| 1.0.0 | 2026-06-28 | Initial stable release |
