---
Title: Planning Permits
Domain: reference
Audience: developers, architects
Prerequisites: none
Knowledge Establishes: PlanningPermit schema, creation, and verification
Depends On: none
Builds Toward: none (terminal reference)
Version: 1.0.0
Status: stable
---

# Planning Permits

## Purpose

PlanningPermits authorize planning actions. They are cryptographically signed by the PlanningEngine and verified by the PlanningCoordinator.

## Schema

```javascript
{
  txId: string,           // Transaction ID
  planningIntent: {       // The authorized intent
    actor: string,
    capability: string,
    payload: object,
    context: object
  },
  timestamp: number,      // Unix timestamp
  signature: string       // HMAC-SHA256 signature
}
```

## Creation

```javascript
const permit = PlanningPermit.create(txId, intent, planningKey)
// Signature: HMAC-SHA256(`${txId}:${capability}:${actor}:${timestamp}`, planningKey)
```

## Verification

```javascript
const valid = PlanningPermit.verify(permit, planningKey)
// Returns true if signature matches
```

## Reasoning Trace Rejection

Payloads containing these fields are rejected:
- `_llm_reasoning`
- `_confidence_chain`
- `_prompt_used`
- `_reasoning_trace`
- `_thought_process`

## Relationship to InvocationPermit

| | PlanningPermit | InvocationPermit |
|---|---|---|
| Purpose | Authorize planning | Authorize execution |
| Created by | PlanningEngine | CommandBus |
| Verified by | PlanningCoordinator | ExecutionCoordinator |
| Signs | Planning intents | Execution intents |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
