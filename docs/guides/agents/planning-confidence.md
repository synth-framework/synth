---
Title: Planning Confidence
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/planning.md
Knowledge Establishes: How agents estimate and interpret planning confidence scores
Depends On: agents/constitution.md (Article I), agents/planning.md, philosophy/03-planning-philosophy.md
Builds Toward: none (terminal capability)
Version: 1.0.0
Status: stable
---

# Planning Confidence

## Purpose

Estimate how certain the system is that an expedition will succeed. This is not completion percentage. It is a measure of remaining uncertainty.

## Formula

```
confidence = (completionRate × 0.4) + ((1 - uncertaintyFactor) × 0.35) + (decisionFactor × 0.25)
```

| Factor | Weight | Source |
|--------|--------|--------|
| Completion Rate | 40% | Objectives completed / total |
| Uncertainty Factor | 35% | High-impact discoveries / total objectives |
| Decision Factor | 25% | Accepted decisions / total decisions |

## Interpretation

| Score | Level | Agent Action |
|-------|-------|--------------|
| 0.0 - 0.4 | Low | More discovery needed. Do not complete. |
| 0.4 - 0.7 | Medium | Continue, monitor closely. |
| 0.7 - 0.95 | High | Proceed. Consider completing if objectives done. |

## High Progress + Low Confidence

Many objectives done but many high-impact discoveries = risk remains.

**Action:** Prioritize discovery resolution before completing.

## Low Progress + High Confidence

Few objectives done but low uncertainty = remaining work is execution.

**Action:** Proceed with confidence.

## Related Documents

- [Planning](planning.md)
- [Philosophy: Planning](../philosophy/03-planning-philosophy.md)
- [Discovery Evaluation](discovery-evaluation.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
