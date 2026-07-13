---
Title: Architecture Review
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/decision-evaluation.md
Knowledge Establishes: How agents review and evaluate system architecture
Depends On: agents/constitution.md (Article III), agents/decision-evaluation.md
Builds Toward: adr-proposal.md
Version: 1.0.0
Status: stable
---

# Architecture Review

## Purpose

Guide agents in reviewing system architecture against Synth principles and proposing improvements.

## Review Dimensions

| Dimension | Question | Check |
|-----------|----------|-------|
| Determinism | Is state derived from events? | Replay verification |
| Immutability | Are events append-only? | Chain verification |
| Governance | Are invariants enforced? | Seal status, policy checks |
| Separation | Is reasoning separate from knowledge? | Payload inspection |
| Completeness | Are discoveries recorded? | Event log analysis |
| Consistency | Does state match replay? | Replay verification |

## Review Process

```
Understand State → Replay Events → Check Invariants → Identify Issues → Propose Improvements
```

### Step 1: Understand Current State

Load the event log, rebuild state. Understand what exists.

### Step 2: Replay Events

Verify replay produces consistent state.

### Step 3: Check Invariants

Verify:
- Seal status
- Registry frozen
- Policy engine frozen
- No direct EventStore access
- Chain integrity

### Step 4: Identify Issues

Find deviations from principles. Record as discoveries.

### Step 5: Propose Improvements

For each issue, propose a fix. Link to ADR if architectural.

## Output

Architecture review produces:
- List of issues (as discoveries)
- Proposed improvements (as decisions)
- ADRs for significant changes

## Related Documents

- [Constitution Article III](constitution.md#article-iii-explain-architectural-decisions)
- [ADR Proposal](adr-proposal.md)
- [Decision Evaluation](decision-evaluation.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
