# EXP-ENV-011 — AI Environment Planning

**Status:** Proposed  
**Kind:** Constitutional Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-010  
**Blocks:** EXP-ENV-012

---

```yaml
Impact:
  Constitutional: Yes
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Requires ADR
  Requires ADR: Yes
```

---

## Purpose

Enable AI agents to plan execution across environments using capability information rather than implicit assumptions.

---

## Motivation

AI agents need to know what an environment can do before they plan. This expedition exposes capability information in an agent-consumable form.

---

## Deliverables

1. **Agent-facing capability report**
2. **Planning prompts updated**
3. **AGENTS.md guidance**

---

## Acceptance

An AI agent can read the capability report and plan a Mission without assuming Git, npm, GitHub, or any specific environment.

---

## Definition of Done

- [ ] Capability report format defined.
- [ ] Planning prompts updated.
- [ ] AGENTS.md references capability planning.
- [ ] Tests pass.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
