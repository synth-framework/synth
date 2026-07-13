---
Title: Confidence Model
Domain: reference
Audience: everyone
Prerequisites: none
Knowledge Establishes: The mathematical model for planning confidence estimation
Depends On: none
Builds Toward: none (terminal reference)
Version: 1.0.0
Status: stable
---

# Confidence Model

## Formula

```
confidence = (completionRate x 0.4) + ((1 - uncertaintyFactor) x 0.35) + (decisionFactor x 0.25)
```

## Components

### Completion Rate
```
completionRate = completedObjectives / totalObjectives
```
Weight: 40%

### Uncertainty Factor
```
uncertaintyFactor = highImpactDiscoveries / totalObjectives
```
Weight: 35% (inverted: higher discovery rate = lower confidence)

### Decision Factor
```
decisionFactor = acceptedDecisions / totalDecisions
```
Weight: 25% (default: 0.5 if no decisions)

## Bounds

```
confidence = max(0.1, min(0.95, rawConfidence))
```

Minimum: 0.1 (never zero)
Maximum: 0.95 (never 1.0 — always room for uncertainty)

## Levels

| Score | Level | Color |
|-------|-------|-------|
| 0.0 - 0.4 | Low | Red |
| 0.4 - 0.7 | Medium | Yellow |
| 0.7 - 0.95 | High | Green |

## Recommendations

| Level | Recommendation |
|-------|----------------|
| Low | "High uncertainty — more discovery needed" |
| Medium | "Moderate confidence — continue monitoring" |
| High | "High confidence — proceed" |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
