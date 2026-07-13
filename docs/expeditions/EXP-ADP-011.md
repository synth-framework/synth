# EXP-ADP-011 — Confidence Adapter

**Status:** Completed  
**Kind:** Intelligence Adapter  
**External System:** No  
**Priority:** High  
**Depends On:** EXP-ADP-OBS-001, EXP-ADP-010  
**Blocks:** World Model confidence scoring, Mission Studio question generation

---

## Purpose

Evaluate the confidence of a set of Observations and produce a structured confidence report.

The Confidence Adapter is an Intelligence Adapter. It does not read files or external systems. It only inspects `Observation[]` and reports how trustworthy the resulting knowledge is, what evidence is missing, what is ambiguous, and what conflicts exist.

---

## Classification

| Attribute | Value |
|-----------|-------|
| Adapter kind | Intelligence Adapter |
| External system | None |
| Kernel dependency | Observation contract |
| Primary value | Make confidence explainable and actionable |

---

## Responsibilities

- Accept `Observation[]`.
- Compute an overall confidence score.
- Identify observations with low or unknown confidence.
- Detect missing evidence references.
- Detect ambiguities (multiple names for the same concept, overlapping categories).
- Detect conflicts (contradictory observations).
- Emit `evidence` Observations containing the confidence report.
- Never read external systems directly.
- Never mutate runtime state.

---

## Input

```typescript
Observation[]
```

---

## Output

A single `evidence` Observation containing a `ConfidenceReport`:

```typescript
Observation {
  category: "evidence"
  subject: "Confidence Report"
  confidence: "high"
  evidence: [{
    description: "Confidence evaluation report",
    snippet: JSON.stringify(report)
  }]
  metadata: {
    score: 0.73
    level: "medium"
    observationCount: 12
    missingEvidence: ["..."]
    ambiguities: ["..."]
    conflicts: ["..."]
  }
}
```

---

## Scoring

| Confidence value | Score contribution |
|------------------|--------------------|
| `certain` | 1.0 |
| `high` | 0.8 |
| `medium` | 0.5 |
| `low` | 0.2 |
| `unknown` | 0.0 |

Overall score is the average contribution of all observations.

Score thresholds:

| Score range | Level |
|-------------|-------|
| 0.90 - 1.00 | certain |
| 0.70 - 0.89 | high |
| 0.40 - 0.69 | medium |
| 0.10 - 0.39 | low |
| 0.00 - 0.09 | unknown |

---

## Missing Evidence

An observation is flagged for missing evidence when:

- It has no evidence references.
- Its evidence has no description.
- Its confidence is `low` or `unknown`.

---

## Ambiguities

Ambiguities are detected when multiple observations share a subject but differ in category or confidence significantly.

---

## Conflicts

Conflicts are detected when observations of the same category have subjects that are direct opposites (e.g. "must use PostgreSQL" vs "must use MySQL"). The initial implementation flags overlapping constraints as potential conflicts.

---

## Lifecycle

Uses the canonical adapter lifecycle from EXP-ADP-000:

```
Discover → Configure → Validate → Enable → Healthy → Operational → Disable
```

`evaluate()` is available once enabled.

---

## Invariants

- Input is strictly `Observation[]`.
- Output is strictly `Observation[]` (one evidence observation containing the report).
- Scoring is deterministic for the same observations.
- No external system is accessed.
- No state is mutated.

---

## Success Criteria

- Overall score is computed from observation confidences.
- Missing evidence is reported.
- Ambiguities are reported.
- Conflicts are reported.
- Adapter passes lifecycle and health checks.
- Evaluation is deterministic.

---

## Completion Criteria

Confidence Adapter is complete when:

- `src/adapters/confidence/adapter.ts` implements the evaluation logic.
- `src/adapters/confidence/types.ts` defines the contract.
- The adapter is registered in `AdapterRegistry`.
- Tests cover score computation, missing evidence, ambiguity, and conflict detection.
