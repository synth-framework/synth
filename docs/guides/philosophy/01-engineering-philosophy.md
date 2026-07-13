---
Title: Engineering Philosophy
Domain: philosophy
Audience: everyone
Prerequisites: 00-introduction.md
Knowledge Establishes: Engineering as a discipline of knowledge, not just implementation
Depends On: 00-introduction.md
Builds Toward: 02-deterministic-engineering.md, 03-planning-philosophy.md, agents/constitution.md
Version: 1.0.0
Status: stable
---

# Engineering Philosophy

## Engineering as Knowledge

Traditional software development treats engineering as the production of code. Code is the output. Features are the measure of progress. Ship velocity is the metric of success.

This view is incomplete.

Code is the *artifact* of engineering. Engineering itself is the *discipline of creating knowledge*. Every line of code embodies decisions, constraints, discoveries, tradeoffs, and assumptions. The code is merely the frozen expression of a living knowledge process.

Synth inverts the conventional relationship. In Synth:

- **Knowledge is primary.** Code is secondary.
- **History is sacred.** State is derived.
- **Decisions are recorded.** Assumptions are challenged.
- **Discovery is celebrated.** Uncertainty is confronted.

## Knowledge vs Implementation

Knowledge and implementation are not the same thing. They are related, but distinct:

| Knowledge | Implementation |
|-----------|---------------|
| We need encryption | `encrypt(data, key)` |
| Users authenticate before accessing data | `if (!authenticated) redirect('/login')` |
| Performance degrades with large datasets | Pagination, caching, indexing |
| Event sourcing provides audit trail | EventStore, replay functions |

Knowledge persists. Implementation changes. The knowledge that "users must authenticate" is stable. The code that enforces it will evolve.

Synth preserves knowledge independently from implementation. This separation means:

1. **Knowledge survives refactoring.** When code changes, the reasoning remains.
2. **Knowledge can be questioned.** A decision can be revisited without breaking the system.
3. **Knowledge accumulates.** Each expedition adds to the total understanding.
4. **Knowledge can be audited.** Anyone can trace from current state to original reasoning.

## The Three Pillars

Synth's philosophy rests on three pillars:

### 1. Determinism

Given the same sequence of events, Synth always produces the same state. This is not a feature. It is a guarantee.

Determinism means:
- State can be reconstructed from history at any time
- Testing is reproducible
- Debugging is systematic
- Replay is a first-class operation

### 2. Immutability

History never changes. Events are appended, never modified, never deleted. The past is fixed. The future is open.

Immutability means:
- Audit is complete, not sampled
- Recovery is always possible
- Knowledge accumulates monotonically
- Nothing is lost

### 3. Uncertainty Reduction

Planning is not scheduling. Planning is the systematic reduction of uncertainty. A plan is not a timeline. It is a map from what is known to what must be discovered.

Uncertainty reduction means:
- Questions are asked before actions are taken
- Discoveries are recorded when made
- Decisions are made with known information
- Ambiguity is treated as a risk, not a default

## Planning Is Artifact-Independent

The planner does not produce tickets. It produces engineering intent. Execution artifacts are projections of that intent.

This mirrors event sourcing at the planning layer:

```
Mission
  ↓
Expedition
  ↓
Objective
  ↓
Work Item
  ↓
Projection Layer
        ├── GitHub Issue
        ├── Jira Ticket
        ├── Markdown Checklist
        ├── CLI Queue
        ├── Kanban Board
        └── Calendar
```

**Tickets are projections. Not canonical objects.**

This means:
- The planning model (Mission → Expedition → Objective → Work Item) is independent of any tool
- Work items can be projected onto GitHub Issues, Jira, Linear, or any other system
- Changing the projection tool does not change the plan
- The canonical knowledge is the intent, not the artifact

### The Separation

| Canonical (Planning) | Projection (Execution) |
|---------------------|----------------------|
| Mission | Product Roadmap |
| Expedition | Sprint, Phase |
| Objective | Epic, Story |
| Work Item | GitHub Issue, Jira Ticket |
| Discovery | Learnings Document |
| Decision | ADR, RFC |

### Why This Matters

Tool-dependence is fragility. When planning is tied to a specific tool (Jira, Linear, GitHub Issues), the plan cannot survive tool migration. When planning is artifact-independent, the plan survives any tool change.

The Planning Cognition Engine produces intent. The projection layer renders that intent onto whatever tools the team uses. This separation is structural, not merely conceptual.

## Engineering as Exploration

Synth treats engineering as a process of exploration. An expedition is not a project. It is a journey into uncertainty with the goal of producing knowledge.

Some expeditions succeed. Some fail. All produce discoveries. Failed expeditions often produce more valuable knowledge than successful ones, because failure reveals boundary conditions.

This perspective means:
- **Dead ends are valuable.** They are recorded as discoveries.
- **Changes of direction are expected.** They are captured as decisions.
- **Uncertainty is honest.** It is named, not hidden.
- **Assumptions are temporary.** They become knowledge or they are discarded.

## The Cost of Lost Knowledge

Every engineering team has experienced this: a key person leaves, and critical knowledge leaves with them. The system still runs, but no one knows why it works the way it does. Future changes become risky because the reasoning behind existing design is unknown.

Synth's answer: **make knowledge canonical.** If knowledge is not written down, it does not exist. If it is not in the event log, it did not happen.

This is strict. It is also the only way to ensure knowledge survives.

## Synth's Compact

Synth makes a compact with every participant:

1. **If you record your reasoning, it will be preserved.**
2. **If you ask questions, uncertainty will be reduced.**
3. **If you make decisions, they will be auditable.**
4. **If you explore, your discoveries will be valued.**

In return, Synth demands:

1. **No implicit knowledge.** Everything must be explicit.
2. **No untracked changes.** Everything must be an event.
3. **No unexplained decisions.** Every decision needs reasoning.
4. **No ignored uncertainty.** Every question must be answered or acknowledged.

## Related Documents

- [Introduction](00-introduction.md) — Why Synth exists
- [Deterministic Engineering](02-deterministic-engineering.md) — Determinism in depth
- [Planning Philosophy](03-planning-philosophy.md) — Planning as uncertainty reduction
- [Canonical Knowledge](07-canonical-knowledge.md) — Knowledge persists, reasoning disappears
- [Agent Constitution](../agents/constitution.md) — Behavioral rules derived from this philosophy

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
