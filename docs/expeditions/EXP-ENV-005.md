# EXP-ENV-005 — Filesystem Capability

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

Abstract filesystem interaction so SYNTH does not depend directly on OS filesystem semantics.

---

## Motivation

File paths, permissions, and syscalls are environmental. The Core should interact with files through a capability interface.

---

## Deliverables

1. **Filesystem capability interface**
2. **POSIX provider**
3. **Path abstraction**

---

## Acceptance

SYNTH can read, write, list, and observe files through the capability interface without direct filesystem calls in the Core.

---

## Definition of Done

- [ ] Filesystem capability interface defined.
- [ ] POSIX provider implemented.
- [ ] Path abstraction documented.
- [ ] Tests pass.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
