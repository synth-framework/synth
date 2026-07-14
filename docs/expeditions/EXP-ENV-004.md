# EXP-ENV-004 — Revision Capability

**Status:** Proposed  
**Kind:** Constitutional Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-002  
**Blocks:** EXP-ENV-010

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

Abstract revision system interaction so SYNTH is not coupled to Git.

---

## Motivation

Revision systems are environmental. The Core should reason about revisions as capabilities, not as Git commands.

---

## Deliverables

1. **Revision capability interface**
2. **Git provider**
3. **Revision discovery rules**

---

## Acceptance

SYNTH can create, inspect, and traverse revisions through the capability interface. The Core contains no direct Git commands.

---

## Definition of Done

- [ ] Revision capability interface defined.
- [ ] Git provider implemented.
- [ ] Discovery rules documented.
- [ ] Tests pass.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
