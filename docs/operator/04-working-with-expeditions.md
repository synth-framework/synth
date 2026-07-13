---
Title: Working with Expeditions
Domain: operator
Audience: operators
Prerequisites: 02-your-first-expedition.md, 03-understanding-genesis.md
Knowledge Establishes: Advanced expedition management — lifecycle, best practices, patterns
Depends On: 02-your-first-expedition.md, 03-understanding-genesis.md
Builds Toward: 05-reviewing-discoveries.md, 06-approving-decisions.md, 07-sidequests.md
Version: 1.0.0
Status: stable
---

# Working with Expeditions

## Expedition Lifecycle

An expedition moves through states:

```
planning → approved → executing → completed
   ↓          ↓
cancelled   (can return to planning)
```

## Expedition Kinds

Every expedition is one of three kinds. The kind determines what the expedition is allowed to change and how it is evaluated.

| Kind | Purpose | Examples |
|---|---|---|
| **Discovery Expedition** | Find truth. | Architecture Review, Repository Analysis, Migration Assessment |
| **Implementation Expedition** | Build capability. | Mission Studio, Replay, Genesis, Adapters |
| **Certification Expedition** | Prove capability. | Freeze, Replay, Documentation, Operator Journey |

The kind is declared in the expedition header and does not change during execution.

## Impact Declaration

Every expedition must declare its impact before implementation begins. The Impact block forces the author to state what layer of SYNTH the expedition is allowed to change.

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

Fields:

- `Constitutional` — Does the expedition change the Architectural Constitution or constitutional baselines?
- `Product` — Does the expedition change user-visible behavior or product guarantees?
- `User Facing` — Does the expedition change public documentation, CLI output, or operator experience?
- `Architecture Freeze` — Is the change safe to make under the current architecture freeze?
- `Requires ADR` — Does the expedition require an Architectural Decision Record?

If `Constitutional` is `Yes` or `Requires ADR` is `Yes`, the expedition cannot be approved until the ADR process is complete.

## When to Create an Expedition

Create an expedition when:
- You have a bounded engineering objective
- The work requires exploration (not just execution)
- The outcome is uncertain
- You need to track discoveries and decisions

Do not create an expedition for:
- Routine maintenance (use work items)
- Well-understood tasks (use work items)
- Administrative work (use work items)

## Expedition Granularity

An expedition should be:
- **Small enough** to complete in days or weeks, not months
- **Large enough** to produce meaningful discoveries
- **Bounded enough** to have clear completion criteria

If an expedition grows too large, split it. Create a new expedition for the remaining work.

## Managing Multiple Expeditions

A mission can have multiple expeditions. They can execute in parallel:

```
Mission: "Build Platform"
├── Expedition: "Authentication"
├── Expedition: "Database Migration"
└── Expedition: "API Design"
```

Each expedition has its own objectives, discoveries, and decisions.

## Cancelling an Expedition

Sometimes an expedition must be cancelled:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "CompleteExpedition",
  payload: { id: "E-1" }
  // Note: There is no explicit CancelExpedition capability.
  // Cancellation is a decision recorded as an event.
})
```

Cancelled expeditions remain in the log. Their discoveries are still valuable. Their decisions still inform future work.

## Objective Management

Objectives are the heart of an expedition. They define what success looks like.

### Good Objectives

| Good | Bad |
|------|-----|
| "Implement OAuth 2.0 authorization code flow" | "Do auth" |
| "Encrypt all user tokens at rest using AES-256" | "Make it secure" |
| "Support 1000 concurrent sessions" | "Handle load" |

### Completing Objectives

Complete objectives as they are achieved:

```javascript
await api.handleIntent({
  actor: "you",
  capability: "CompleteObjective",
  payload: { id: "O-1" }
})
```

An expedition can be completed even if not all objectives are done. The remaining objectives inform future expeditions.

## Expedition Review

Regularly review expeditions:

1. **Are objectives still relevant?** Discoveries may change priorities.
2. **Are there too many side quests?** This may indicate the expedition is too broad.
3. **Is confidence increasing?** If not, more discovery may be needed.

## Related Documents

- [Your First Expedition](02-your-first-expedition.md) — Basic expedition creation
- [Reviewing Discoveries](05-reviewing-discoveries.md) — Understanding what was learned
- [Approving Decisions](06-approving-decisions.md) — The decision process
- [Side Quests](07-sidequests.md) — Handling unexpected work
- [Progress and Confidence](08-progress-and-confidence.md) — Reading system assessment

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
