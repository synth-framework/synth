---
Title: Side Quests
Domain: philosophy
Audience: everyone
Prerequisites: 00-introduction.md, 03-planning-philosophy.md
Knowledge Establishes: Engineering as exploration, why side quests are valuable and necessary
Depends On: 00-introduction.md, 03-planning-philosophy.md
Builds Toward: 07-canonical-knowledge.md, agents/handbook.md, operator/07-sidequests.md
Version: 1.0.0
Status: stable
---

# Side Quests

## Engineering Is Exploration

Linear project management assumes that engineering follows a straight path from requirement to implementation. This assumption is false. Engineering is exploration. The path is never straight.

During any expedition, engineers encounter:
- Unexpected problems that must be solved
- Interesting tangents that merit investigation
- Necessary detours that reveal better approaches
- Hidden dependencies that were not visible at the start

These are not distractions. They are the natural consequence of doing real engineering work.

## What Side Quests Are

A **side quest** is a temporary objective that emerges during an expedition. It is not part of the expedition's original objectives. It becomes necessary or valuable as work progresses.

Side quests have:
- A description (what needs to be explored)
- A parent objective (what expedition triggered it)
- A status (active, resolved, abandoned)
- A type (investigation, spike, fix, exploration)

## Why Side Quests Matter

Side quests are where significant engineering knowledge is produced. The main expedition objectives are known. The side quests reveal what was unknown.

A side quest that discovers a better architecture is more valuable than completing an original objective using a suboptimal approach.

A side quest that identifies a hidden dependency prevents future failures.

A side quest that proves an approach wrong saves the team from pursuing a dead end.

## The Discovery Pattern

Side quests follow a discovery pattern:

```
Main Expedition → Encounter Uncertainty → Spawn Side Quest → Explore → Discovery → Integrate
```

The discovery may:
- **Strengthen** the main expedition (new knowledge helps)
- **Redirect** the main expedition (better approach found)
- **Complete independently** (separate finding)
- **Fail** (negative knowledge — this path does not work)

All four outcomes are valuable. Even a failed side quest produces knowledge.

## Managing Side Quests

Synth does not prevent side quests. It tracks them.

When a side quest emerges:
1. **Record it.** Create a side quest record with description and parent.
2. **Acknowledge it.** Do not hide it. It is real work.
3. **Bound it.** Define what "done" means for the side quest.
4. **Resolve it.** Complete it, abandon it, or merge it into the main expedition.

Side quests should not multiply indefinitely. Each active side quest represents unresolved uncertainty. Too many side quests means the expedition itself may need re-evaluation.

## Side Quests vs Scope Creep

Side quests are not scope creep. The difference:

| Side Quest | Scope Creep |
|------------|-------------|
| Emerges from discovery | Imposed externally |
| Bounded and tracked | Unbounded and invisible |
| Produces knowledge | Produces work |
| Resolves uncertainty | Adds uncertainty |
| Temporary | Permanent |

A side quest that is not bounded or tracked becomes scope creep. The discipline of recording side quests prevents this.

## The Side Quest Lifecycle

```
recognize → record → explore → discover → resolve
```

1. **Recognize:** Someone identifies an unexpected problem or opportunity
2. **Record:** The side quest is formally created with description and parent
3. **Explore:** Work is done to resolve the side quest's question
4. **Discover:** Knowledge is produced
5. **Resolve:** The side quest is marked resolved, abandoned, or merged

## Related Documents

- [Planning Philosophy](03-planning-philosophy.md) — Planning as uncertainty reduction
- [Canonical Knowledge](07-canonical-knowledge.md) — Recording discoveries
- [Agent Handbook](../agents/handbook.md) — How agents handle side quests
- [Operator Guide](../../operator/07-sidequests.md) — Managing side quests in practice

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
