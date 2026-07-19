# EXP-DIST-007 — Website as Discovery Surface

> **Product expedition.** Transform the homepage into an interactive discovery surface that answers "Where can I find SYNTH?"

**Status:** Completed  
**Kind:** Product Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-029 — AI Ecosystem Distribution  
**Depends On:** EXP-DIST-001, EXP-DIST-002  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: No
```

---

## Objective

Update the SYNTH website to surface distribution channels and help visitors understand how SYNTH is available across agents, IDEs, packages, and forges.

---

## Deliverables

- New "Discover SYNTH everywhere" section on `website/index.html`.
- Cards for Agent Skills, IDE Rules, MCP Server, Packages, GitHub, and Documentation.
- Links to distribution docs and GitHub templates.
- `website-section` projection target in the projection engine.

---

## Acceptance Criteria

- [x] Homepage explains distribution as a first-class concept.
- [x] Each distribution surface answers a distinct adoption question.
- [x] Content aligns with the Canonical AI Capability Model.

---

## Evidence

- `website/index.html` includes the distribution section.
- `tests/distribution.test.js` validates the `website-section` projection.
