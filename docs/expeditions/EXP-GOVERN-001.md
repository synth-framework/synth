# EXP-GOVERN-001 — Governance Profiling

> **Architecture expedition.** Instrument every governance check and establish a performance baseline so future incrementality work is driven by measured data rather than assumptions.

**Status:** Completed  
**Kind:** Architecture Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-021 — Incremental Governance  
**Depends On:** EXP-CLI-001 (CLI UX and Diagnostics Hardening)

---

```yaml
Impact:
  Constitutional: No
  Product: No
  User Facing: Yes (summary output)
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Before optimizing governance, understand exactly where time is spent. This expedition delivers a performance model, not faster execution.

The model must answer:

- Which checks consume the most wall-clock time?
- Which checks are I/O bound, CPU bound, or dependency bound?
- How many files, events, and concepts does each check touch?
- Which checks are independent and which overlap?

---

## Origin Evidence

Current `npm run govern` runs the full validation pipeline on every invocation. In large repositories this takes twenty minutes or more, even for trivial changes. Without instrumentation, optimization efforts risk targeting the wrong checks or adding caching where it provides no benefit.

---

## Required Change

### 1.1 Instrument every governance check

Wrap every check invoked by the governance pipeline with:

```text
checkId
startTime
endTime
durationMs
inputs[]
outputs[]
filesTouched[]
dependencies[]
cpuTimeMs (where measurable)
ioTimeMs (where measurable)
cacheability: "unknown" | "deterministic" | "contextual" | "non-deterministic"
```

### 1.2 Produce a Govern Summary report

At the end of every `npm run govern` invocation, emit a structured summary:

```json
{
  "kind": "GovernSummary",
  "totalDurationMs": 1214000,
  "checks": [
    { "checkId": "replay-verification", "durationMs": 312000, "percentage": 25.7 },
    { "checkId": "documentation-generation", "durationMs": 281000, "percentage": 23.1 },
    { "checkId": "contract-validation", "durationMs": 138000, "percentage": 11.4 }
  ]
}
```

### 1.3 Establish performance baselines

Record baseline timings in a committed artifact (e.g., `proof/govern-baseline.json`) updated by the proof generation step. This baseline:

- is produced by a full cold run.
- is versioned with the repository.
- serves as the reference for future incrementality work.

---

## Deliverables

1. **Governance check instrumentation** wrapping every check in the pipeline.
2. **GovernSummary output** emitted after every `npm run govern` invocation.
3. **Performance baseline artifact** committed under `proof/`.
4. **Documentation** explaining how to read the summary and update the baseline.

---

## Acceptance Criteria

- `npm run govern` produces a `GovernSummary` with per-check timing.
- The summary lists every check that ran, not just the slowest ones.
- The baseline artifact is deterministic: two cold runs on the same commit produce equivalent summaries.
- The instrumentation overhead is negligible compared to check execution.

---

## Out of Scope

- Caching or skipping checks.
- Dependency declaration.
- Parallel execution.
- Changing the set of checks.

---

## Success Criteria

The expedition succeeds when the team can confidently answer: "If we could make one check instantaneous, which one would improve govern the most?"
