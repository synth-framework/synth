---
Title: Progress and Confidence
Domain: operator
Audience: operators
Prerequisites: 02-your-first-expedition.md, 04-working-with-expeditions.md
Knowledge Establishes: How to read and interpret Synth's planning confidence estimates
Depends On: 02-your-first-expedition.md, 04-working-with-expeditions.md, philosophy/03-planning-philosophy.md
Builds Toward: 11-best-practices.md
Version: 1.0.0
Status: stable
---

# Progress and Confidence

## Two Different Metrics

Synth provides two ways to understand expedition status:

**Progress:** How many objectives are completed? This is simple completion percentage.

**Confidence:** How certain is the system that the expedition will succeed? This is a more sophisticated measure.

## Planning Confidence

Confidence is calculated from three factors:

| Factor | Weight | Meaning |
|--------|--------|---------|
| Completion Rate | 40% | Percentage of objectives completed |
| Uncertainty Factor | 35% | Ratio of high-impact discoveries to objectives |
| Decision Factor | 25% | Percentage of decisions accepted |

```
confidence = (completion × 0.4) + ((1 - uncertainty) × 0.35) + (decisions × 0.25)
```

## Confidence Levels

| Score | Level | Recommendation |
|-------|-------|----------------|
| 0.0 - 0.4 | Low | High uncertainty — more discovery needed |
| 0.4 - 0.7 | Medium | Moderate confidence — continue monitoring |
| 0.7 - 0.95 | High | High confidence — proceed |

## Why Confidence Matters

Progress can be misleading. You can complete 90% of objectives and still have high uncertainty about whether the solution is correct.

Confidence captures this. It says: "Yes, you completed the objectives, but you have many unresolved high-impact discoveries."

## Interpreting Confidence

### High Progress, Low Confidence

Many objectives done, but many high-impact discoveries recorded. This means:
- The work is proceeding
- But significant risks remain
- Action: Prioritize discovery resolution

### Low Progress, High Confidence

Few objectives done, but low uncertainty. This means:
- The work is well-understood
- The remaining work is execution, not exploration
- Action: Proceed with confidence

### Low Progress, Low Confidence

Few objectives done, high uncertainty. This means:
- The expedition is in early exploration phase
- Much is still unknown
- Action: Focus on discovery, not completion

### High Progress, High Confidence

Many objectives done, low uncertainty. This means:
- The expedition is succeeding
- Ready to complete

## Using Confidence for Decisions

Confidence should inform operational decisions:

- **Confidence < 0.4:** Do not complete the expedition. More work needed.
- **Confidence 0.4-0.7:** Continue, but watch discoveries closely.
- **Confidence > 0.7:** Consider completing if objectives are done.

## Related Documents

- [Working with Expeditions](04-working-with-expeditions.md) — Managing expeditions
- [Reviewing Discoveries](05-reviewing-discoveries.md) — Discoveries affect confidence
- [Planning Philosophy](../guides/philosophy/03-planning-philosophy.md) — The theory behind confidence

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
