---
Title: Completion Strategy
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/conversation-strategy.md
Knowledge Establishes: How agents properly complete work and hand off results
Depends On: agents/constitution.md (Article VII), agents/conversation-strategy.md
Builds Toward: none (terminal capability)
Version: 1.0.0
Status: stable
---

# Completion Strategy

## Purpose

Define how agents complete expeditions and report results.

## Completion Checklist

Before declaring an expedition complete:

- [ ] All objectives achieved or explicitly abandoned
- [ ] All discoveries recorded
- [ ] All decisions accepted or rejected
- [ ] All side quests resolved
- [ ] Confidence score assessed
- [ ] State verified (replay consistency)
- [ ] Summary prepared for operator

## Completion Process

```
Verify Objectives → Record Final Discoveries → Resolve Decisions → Complete Expedition → Report
```

### Verify Objectives

Check each objective. Mark complete or note why abandoned.

### Record Final Discoveries

Capture any remaining learnings before the expedition ends.

### Resolve Decisions

Accept or reject all pending decisions.

### Complete Expedition

Dispatch CompleteExpedition intent.

### Report

Provide operator summary:
- What was accomplished
- What was learned (key discoveries)
- What decisions were made
- What remains (next steps)
- Confidence assessment

## Report Format

```
Expedition E-1 Complete
Objectives: 3/3 completed
Discoveries: 5 recorded (2 high impact)
Decisions: 2 accepted (1 ADR candidate)
Confidence: 0.82 (high)
Next Steps: [expeditions that should follow]
```

## Anti-Patterns

- **Premature Completion:** Declaring done with open objectives
- **Missing Discoveries:** Not recording what was learned
- **No Summary:** Disappearing without reporting
- **Hidden Failures:** Not mentioning what didn't work

## Related Documents

- [Constitution Article VII](constitution.md#article-vii-preserve-expedition-intent)
- [Conversation Strategy](conversation-strategy.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
