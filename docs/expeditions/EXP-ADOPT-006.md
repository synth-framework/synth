# EXP-ADOPT-006 — Examples Library

**Status:** Proposed  
**Kind:** Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth  
**Phase:** II — Launch Assets  
**Authority:** Synth Architectural Constitution

---

## Goal

Provide runnable, deterministic examples that demonstrate SYNTH's value across common scenarios.

---

## Purpose

Examples convert documentation into evidence. Users should be able to clone, run, and adapt examples without undocumented steps.

---

## Deliverables

1. **Minimum five examples**: todo, blog, CRM, monolith, and polyglot (reuse `examples/` where possible).
2. **Each example** includes a README, install steps, run command, and expected output.
3. **Example CI harness** that verifies each example runs deterministically.
4. **Example discovery index** on the docs site.
5. **Contribution template** for new examples.

---

## Acceptance Criteria

- Every example runs from a clean clone without undocumented steps.
- CI passes for every example on every release.
- Each example maps to a concrete user problem statement.
- The examples index is discoverable from docs and the homepage.
- At least one example demonstrates the full Mission/Expedition lifecycle.

---

## Out of Scope

- Production-grade starter templates.
- Examples requiring external paid services.
- Rewriting existing examples outside the SYNTH model.

---

## Related

- EXP-PROGRAM-037 — Ecosystem Adoption & Community Growth
- EXP-ADOPT-003 — Documentation Hub
- EXP-ADOPT-008 — Documentation Articles
- EXP-ADOPT-007 — Video Library
