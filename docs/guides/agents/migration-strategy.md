---
Title: Migration Strategy
Domain: agents
Audience: agents
Prerequisites: agents/constitution.md, agents/brownfield-adoption.md, agents/risk-analysis.md
Knowledge Establishes: How agents plan and execute migrations of existing systems
Depends On: agents/constitution.md, agents/brownfield-adoption.md, agents/risk-analysis.md
Builds Toward: adr-proposal.md
Version: 1.0.0
Status: stable
---

# Migration Strategy

## Purpose

Plan and execute migrations — moving from one state to another with minimal risk.

## Migration Principles

1. **Incremental:** Migrate in small steps, not big bangs
2. **Reversible:** Each step must be reversible
3. **Observable:** Monitor each step's impact
4. **Recorded:** Every migration step is an event

## Migration Process

```
Analyze Current → Define Target → Identify Risks → Plan Steps → Execute → Verify
```

### Step 1: Analyze Current

Use repository and documentation analysis. Record everything as discoveries.

### Step 2: Define Target

What does the migrated state look like? Record as objectives.

### Step 3: Identify Risks

What could go wrong? Record as discoveries with risk category.

### Step 4: Plan Steps

Break migration into small, reversible steps. Each step is a work item.

### Step 5: Execute

Execute one step at a time. Verify before proceeding.

### Step 6: Verify

After each step: verify state, check consistency, confirm no regression.

## Recording

Each migration step creates events:
- DECISION_ACCEPTED (approach chosen)
- DISCOVERY_RECORDED (risk or finding)
- WORK_ITEM_GENERATED (step to execute)
- WORK_ITEM_COMPLETED (step done)

## Anti-Patterns

- **Big Bang:** Migrating everything at once
- **No Rollback:** No plan for reversing a step
- **No Monitoring:** Not checking if migration worked
- **No Recording:** Not documenting what was done

## Related Documents

- [Brownfield Adoption](brownfield-adoption.md)
- [Risk Analysis](risk-analysis.md)
- [ADR Proposal](adr-proposal.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-28 | Initial stable release |
