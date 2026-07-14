# EXP-ENV-007 — Runtime & Package Capability

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

Abstract runtime and package management so SYNTH does not depend directly on Node.js or npm.

---

## Motivation

Runtimes and package managers are environmental. The Core should request package operations and runtime inspection through capabilities.

---

## Deliverables

1. **Runtime capability interface**
2. **Package capability interface**
3. **Node.js / npm provider**

---

## Acceptance

SYNTH can inspect available runtimes and resolve packages through the capability interface without Node.js-specific logic in the Core.

---

## Definition of Done

- [ ] Runtime capability interface defined.
- [ ] Package capability interface defined.
- [ ] Node.js / npm provider implemented.
- [ ] Tests pass.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
