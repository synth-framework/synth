---
Title: Risk Analysis
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/planning-confidence.md
Knowledge Establishes: How agents identify, assess, and mitigate risks during expeditions
Depends On: agents/constitution.md (Article I), agents/planning-confidence.md
Builds Toward: failure-recovery.md
Version: 1.0.0
Status: stable
---

# Risk Analysis

## Purpose

Identify and assess risks during expeditions. Risk analysis is part of uncertainty reduction.

## Risk Categories

| Category | Description | Example |
|----------|-------------|---------|
| Technical | Implementation challenges | "Library does not support required feature" |
| Architectural | Design limitations | "Current design cannot scale" |
| Dependency | External blockers | "Waiting for API from other team" |
| Knowledge | Unknown unknowns | "We don't know the performance characteristics" |
| Operational | Deployment/monitoring | "No rollback mechanism" |

## Risk Assessment

| Level | Likelihood | Impact | Action |
|-------|------------|--------|--------|
| Low | Unlikely | Minimal | Monitor |
| Medium | Possible | Significant | Mitigation plan |
| High | Likely | Severe | Block expedition until resolved |
| Critical | Very likely | Catastrophic | Escalate immediately |

## Risk Recording

Risks are recorded as discoveries:

```javascript
{
  id: "D-RISK-1",
  expeditionId: "E-1",
  description: "Risk: Database migration has no rollback mechanism",
  context: "Evaluating migration approach",
  impact: "high"
}
```

## Risk Mitigation

For each risk, define:
- Mitigation strategy (how to reduce likelihood or impact)
- Contingency (what to do if risk materializes)
- Trigger (when to activate contingency)

## Related Documents

- [Constitution Article I](constitution.md#article-i-reduce-uncertainty-before-planning)
- [Failure Recovery](failure-recovery.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
