---
Title: Side Quest Management
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/discovery-evaluation.md
Knowledge Establishes: How agents recognize, track, and resolve side quests during expeditions
Depends On: agents/constitution.md (Article VII), agents/discovery-evaluation.md, philosophy/06-sidequests.md
Builds Toward: planning-confidence.md, failure-recovery.md
Version: 1.0.0
Status: stable
---

# Side Quest Management

## Purpose

Manage temporary objectives that emerge during expeditions without letting them derail the main mission.

## Recognition Signals

A side quest has emerged when:
- An unexpected blocking problem appears
- An interesting tangent with potential value appears
- A better approach is discovered mid-expedition
- Hidden dependencies are revealed
- A tool/library doesn't work as expected

## Lifecycle

```
recognize → record → bound → explore → resolve
```

## Binding Rules

Every side quest must have:
- Clear description
- Parent objective
- Definition of done
- Maximum time bound (if applicable)

## Resolution Types

| Type | When | Action |
|------|------|--------|
| Resolved | Side quest produced knowledge | Record discovery, close |
| Merged | Side quest became main path | Update main objectives |
| Abandoned | Side quest not worth completing | Record why, close |
| Escalated | Side quest too large | Create new expedition |

## Limits

| Active Count | Meaning | Action |
|-------------|---------|--------|
| 0-2 | Normal | Continue |
| 3-5 | Concerning | Review expedition scope |
| 5+ | Critical | Consider splitting expedition |

## Related Documents

- [Constitution Article VII](constitution.md#article-vii-preserve-expedition-intent)
- [Philosophy: Side Quests](../philosophy/06-sidequests.md)
- [Discovery Evaluation](discovery-evaluation.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
