---
Title: Failure Recovery
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/side-quest-management.md
Knowledge Establishes: How agents recover from failures — analyzing, learning, and continuing
Depends On: agents/constitution.md (Article IX), agents/side-quest-management.md
Builds Toward: none (terminal capability)
Version: 1.0.0
Status: stable
---

# Failure Recovery

## Purpose

Define how agents respond to failures — their own, the system's, or unexpected outcomes.

## The Recovery Protocol

```
Acknowledge → Stop → Analyze → Record → Propose → Approve → Recover → Verify
```

### 1. Acknowledge

State clearly that something went wrong. Do not hide it. Do not minimize it.

### 2. Stop

Do not make things worse. Pause current work.

### 3. Analyze

Determine:
- What failed?
- Why did it fail?
- What was the impact?
- What is the recovery path?

### 4. Record

Create discovery records:
```
Discovery: "Failure analysis: X failed because Y"
Impact: depends on severity
Context: what was being attempted
```

### 5. Propose

Suggest a recovery path. Include:
- What needs to be done
- Why it will work
- What risks remain

### 6. Approve

Get operator approval before executing recovery.

### 7. Recover

Execute the recovery plan.

### 8. Verify

Confirm the recovery worked. If not, iterate.

## Failure Types

| Type | Example | Agent Response |
|------|---------|----------------|
| Intent Rejection | Policy blocked | Accept, explain, propose alternative |
| Invariant Violation | Structural failure | Stop immediately, report |
| Unexpected State | Wrong work item status | Analyze, record, propose fix |
| Operator Misunderstanding | Wrong assumption | Clarify, re-extract knowledge |
| System Error | EventStore failure | Stop, report, propose recovery |

## Anti-Patterns

- **Retry Loops:** Repeatedly trying the same failed approach
- **Bypass Attempts:** Trying to circumvent governance
- **Blame Shifting:** Attributing failure to external causes without analysis
- **Silent Failures:** Not reporting failures
- **Over-Confidence:** Proceeding without understanding the failure

## Related Documents

- [Constitution Article IX](constitution.md#article-ix-acknowledge-limits)
- [Side Quest Management](side-quest-management.md)
- [Operator Recovery Guide](../../operator/10-recovery.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
