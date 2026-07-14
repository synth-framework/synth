# EXP-ENV-001 — Environment Discovery Framework

**Status:** Proposed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-PROGRAM-007  
**Blocks:** EXP-ENV-002, EXP-ENV-003, EXP-ENV-004, EXP-ENV-005, EXP-ENV-006, EXP-ENV-007, EXP-ENV-008, EXP-ENV-009, EXP-ENV-010, EXP-ENV-011, EXP-ENV-012

---

```yaml
Impact:
  Constitutional: Yes
  Product: No
  User Facing: No
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

Establish autonomous environment discovery as the first step of every SYNTH execution.

---

## Motivation

Before SYNTH can execute a Mission, it must understand the environment in which it operates. Today this knowledge is implicit and hardcoded. This expedition makes discovery explicit, autonomous, and evidence-producing.

---

## Deliverables

1. **Discovery orchestrator**
   - Runs before execution planning.
   - Produces a canonical environment description.

2. **Discovery rules**
   - What to observe.
   - How to observe without mutation.

3. **Evidence artifact**
   - Machine-readable discovery record.

---

## Acceptance

SYNTH can discover a fresh environment and produce a replayable evidence artifact without human configuration.

---

## Definition of Done

- [ ] Discovery orchestrator defined.
- [ ] Discovery rules documented.
- [ ] Evidence artifact schema defined.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
