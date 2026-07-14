# EXP-ENV-008 — Forge Capability

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

Abstract forge/platform interaction so SYNTH is not coupled to GitHub.

---

## Motivation

Forges are environmental. The Core should interact with platforms through a capability interface.

---

## Deliverables

1. **Forge capability interface**
2. **GitHub provider**
3. **Issue/PR/release abstractions**

---

## Acceptance

SYNTH can read repository metadata, issues, and releases through the capability interface without GitHub-specific logic in the Core.

---

## Definition of Done

- [ ] Forge capability interface defined.
- [ ] GitHub provider implemented.
- [ ] Abstractions documented.
- [ ] Tests pass.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
