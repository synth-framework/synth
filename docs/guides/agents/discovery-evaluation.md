---
Title: Discovery Evaluation
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/knowledge-extraction.md
Knowledge Establishes: How agents evaluate discoveries for impact and action
Depends On: agents/constitution.md (Article VI), agents/knowledge-extraction.md
Builds Toward: side-quest-management.md, planning-confidence.md
Version: 1.0.0
Status: stable
---

# Discovery Evaluation

## Purpose

Evaluate recorded discoveries to determine their impact and required action.

## Impact Assessment

| Level | Criteria | Action Required |
|-------|----------|----------------|
| Critical | Changes fundamental approach | Immediate decision needed, expedition may need replanning |
| High | Significantly affects objectives | Decision or objective update needed |
| Medium | Worth noting | Review during expedition retrospective |
| Low | Minor insight | Record, no immediate action |

## Evaluation Dimensions

1. **Scope Impact:** Does this discovery affect the current expedition only, or broader scope?
2. **Objective Impact:** Does this require adding, modifying, or removing objectives?
3. **Decision Impact:** Does this discovery support or challenge pending decisions?
4. **Risk Impact:** Does this discovery introduce new risks?

## Action Mapping

```
Discovery Recorded → Evaluate Impact → Determine Action → Execute
```

| Discovery Type | Typical Impact | Typical Action |
|----------------|---------------|----------------|
| Constraint | High | Update approach, may need decision |
| Performance | Critical | Spawn side quest, may need architecture change |
| Architecture | High | ADR candidate |
| Requirement | Medium-High | Update objectives |
| Negative Result | Medium | Record (prevents future attempts) |

## Recording

Every evaluation should be recorded:

```
Discovery D-7: "Database does not support JSON indexing"
  Impact: High
  Affected Objectives: O-3 (data model), O-5 (query optimization)
  Suggested Action: Decision needed — migrate data or change approach
```

## Related Documents

- [Constitution Article VI](constitution.md#article-vi-record-engineering-knowledge)
- [Side Quest Management](side-quest-management.md)
- [Planning Confidence](planning-confidence.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
