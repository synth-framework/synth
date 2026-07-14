# EXP-ENV-012 — Constitutional Compliance & Migration

**Status:** Proposed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-010, EXP-ENV-011  
**Blocks:** none

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

Verify that the SYNTH Core contains no direct environmental dependencies and migrate any remaining assumptions behind capability interfaces.

---

## Motivation

The program is only complete when the Core is genuinely environment-independent. This expedition performs the final audit and migration.

---

## Deliverables

1. **Compliance audit**
2. **Migration plan for remaining dependencies**
3. **Governance check**

---

## Acceptance

`npm run govern` passes with no direct environment dependencies in the Core.

---

## Definition of Done

- [ ] Compliance audit completed.
- [ ] Remaining dependencies migrated.
- [ ] Governance check passes.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
