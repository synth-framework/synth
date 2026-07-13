---
Title: Understanding Genesis
Domain: operator
Audience: operators
Prerequisites: 01-getting-started.md
Knowledge Establishes: How Synth systems are initialized and what happens during startup
Depends On: 01-getting-started.md
Builds Toward: 04-working-with-expeditions.md, 10-recovery.md
Version: 1.0.0
Status: stable
---

# Understanding Genesis

## What Is Genesis?

Genesis is the initialization phase of a Synth system. It creates the initial state before the system becomes operational. Think of it as the "birth" of the system.

## The Genesis Process

```
Phase 1: Infrastructure (EventStore, StateStore)
Phase 2: Policy Engine (default policies)
Phase 3: Capability Registry (default capabilities)
Phase 4: Runtime Engine (pure execution)
Phase 5: CommandBus (single mutation authority)
Phase 6: API Layer (operator interface)
Phase 7: Genesis (pre-bus initialization)
```

## What Genesis Creates

During Genesis, the system creates:

1. **SYSTEM_GENESIS event** — The first event in the log. Marks the system's birth.
2. **Initial projects** — If configured
3. **Initial work items** — If configured
4. **Capability registrations** — All default capabilities

## Genesis vs Operational

| Genesis | Operational |
|---------|-------------|
| Registry open | Registry frozen |
| Policies can be added | Policies fixed |
| Raw store writes allowed | Guarded writes enforced |
| System unsealed | System sealed |

## The Seal

After Genesis, the system is **sealed**. Seal is a one-way transition:

```javascript
ctx.seal() // Irreversible
```

Once sealed:
- The registry is frozen. No new capabilities.
- The policy engine is frozen. No new policies.
- The API surface is frozen. No new methods.
- The system enters operational mode.

## Why Seal Matters

Seal represents the system's commitment to its own architecture. It says: "These are the rules. They will not change."

This creates trust. Operators know the system will not mutate its own structure. Agents know the rules are fixed. Developers know the boundaries.

## Checking Seal Status

```javascript
ctx.isSealed // true or false
```

Double-sealing throws an error:
```javascript
ctx.seal() // OK
ctx.seal() // InvariantViolation: System is already sealed
```

## Recovery from Genesis

If Genesis fails, the system has not yet sealed. You can:
1. Fix the configuration
2. Clear the data directory
3. Restart the system

Once running, recovery follows the [Recovery](10-recovery.md) process.

## Related Documents

- [Getting Started](01-getting-started.md) — First interaction
- [Recovery](10-recovery.md) — Dealing with failures
- [Architecture: Initialization](../architecture/15-bootstrap-genesis.md) — Technical details

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |


> **Note:** Initial entities created during Genesis are execution artifacts, not planning entities. Planning entities (Missions, Expeditions) are created through the planning environment after startup.
