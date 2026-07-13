> **Note:** Policy examples below reference execution artifact capabilities. These policies protect the projection layer. The planning layer has its own governance through the Planning Cognition Engine. See [Artifact Independence](../guides/philosophy/01-engineering-philosophy.md).

# Policy Reference

## Built-in Policies

### System Protection Policy

| Attribute | Value |
|-----------|-------|
| id | `system-protection` |
| name | System Protection |
| effect | DENY |
| severity | critical |
| scope | DeleteSystem, ResetState, WipeData |
| condition | Always matches |

**Purpose:** Blocks destructive system operations unconditionally.

**Applies to:** Any intent with capability DeleteSystem, ResetState, or WipeData.

**Result:** Always DENY. No actor can execute these capabilities.

### Completed Work Protection Policy

| Attribute | Value |
|-----------|-------|
| id | `completed-work-protection` |
| name | Completed Work Protection |
| effect | DENY |
| severity | high |
| scope | StartTicket, BlockTicket, ResetTicket |
| condition | Ticket status is "complete" |

**Purpose:** Prevents modification of completed tickets.

**Applies to:** Any intent to StartTicket, BlockTicket, or ResetTicket where the target ticket has status "complete".

**Result:** DENY with reason "Denied by policy: completed-work-protection".

## Policy Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| id | Yes | Unique identifier |
| name | Yes | Human-readable name |
| scope.capabilities | No | List of capability names this policy applies to |
| scope.excludeActors | No | List of actor IDs this policy does not apply to |
| condition | Yes | Function (intent, state) → boolean |
| effect | Yes | DENY or ALLOW |
| severity | Yes | critical, high, medium, low, informational |
| enabled | Yes | Boolean |

## Policy Effects

| Effect | Behavior |
|--------|----------|
| DENY | Prevents execution; highest severity DENY wins |
| ALLOW | Permits execution (default when no policy denies) |

## Policy Severity Order

| Severity | Priority |
|----------|----------|
| critical | 5 (highest) |
| high | 4 |
| medium | 3 |
| low | 2 |
| informational | 1 |

When multiple policies match, results are sorted by severity and the highest-severity DENY determines the outcome.

## Adding Custom Policies

Register policies during bootstrap (before seal):

```
policyEngine.register({
    id: "my-policy",
    name: "My Policy",
    scope: { capabilities: ["StartTicket"] },
    condition: (intent, state) => state.tickets[intent.payload.id]?.status === "blocked",
    effect: "DENY",
    severity: "high",
    enabled: true
})
```

## Related Documents

- [08 - Governance](../architecture/08-governance.md) -- How policies work
- [17 - Runtime Invariants](../architecture/17-runtime-invariants.md) -- Policy-related invariants
