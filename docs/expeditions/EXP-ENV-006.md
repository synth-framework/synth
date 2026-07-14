# EXP-ENV-006 — Process & Tool Capability

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

Abstract process and tool execution so SYNTH does not depend directly on shells or command-line tools.

---

## Motivation

Spawning processes, managing stdout/stderr, and invoking tools are environmental concerns. The Core should request tool execution through a capability.

---

## Deliverables

1. **Process capability interface**
2. **Tool capability interface**
3. **Local shell provider**

---

## Acceptance

SYNTH can execute a tool and capture its output through the capability interface without shell-specific logic in the Core.

---

## Definition of Done

- [ ] Process capability interface defined.
- [ ] Tool capability interface defined.
- [ ] Local shell provider implemented.
- [ ] Tests pass.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
