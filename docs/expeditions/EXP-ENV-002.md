# EXP-ENV-002 — Capability Graph Model

**Status:** Proposed  
**Kind:** Constitutional Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-007 — Environment Independence Program  
**Depends On:** EXP-ENV-001  
**Blocks:** EXP-ENV-003, EXP-ENV-004, EXP-ENV-005, EXP-ENV-006, EXP-ENV-007, EXP-ENV-008, EXP-ENV-009

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

Define the canonical model through which SYNTH represents capabilities and their providers.

---

## Motivation

Capabilities describe what an environment can do. Implementations describe how. A canonical graph model lets SYNTH reason about capabilities independently of providers.

---

## Deliverables

1. **Capability node schema**
2. **Provider edge schema**
3. **Resolution algorithm**
4. **Graph serialization format**

---

## Acceptance

SYNTH can build a capability graph from a discovery artifact and resolve a provider for any requested capability.

---

## Definition of Done

- [ ] Capability schema defined.
- [ ] Provider schema defined.
- [ ] Resolution algorithm documented.
- [ ] Tests verify graph construction and resolution.
- [ ] ADR approved.
- [ ] Expedition is accepted.

---

## Completion Notes

Pending.
