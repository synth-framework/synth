# EXP-FIRSTCONTACT-008 — Public Terminology

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** EXP-FIRSTCONTACT-001  
**Blocks:** EXP-FIRSTCONTACT-003, EXP-FIRSTCONTACT-004, EXP-FIRSTCONTACT-005, EXP-FIRSTCONTACT-006

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

## Purpose

Define plain-language definitions and first-use rules for every public-facing concept in SYNTH, so no visitor needs prior knowledge to understand the terminology.

---

## Motivation

The audit found that the website assumes visitors understand terms like determinism, replay, governance, evidence, and projection. Most developers do not. A public terminology system with dictionary-style definitions and progressive disclosure will lower the comprehension barrier.

---

## Deliverables

1. **Plain-language glossary**
   - Dictionary-style entries for every public concept.
   - Each entry includes: term, part of speech, plain-language definition, and "In SYNTH" clarification.

2. **First-use rules**
   - Every public page must define a term on first use or link to its glossary entry.

3. **Progressive disclosure guidelines**
   - Level 1: one-sentence definition.
   - Level 2: short paragraph.
   - Level 3: deep explanation on dedicated page.

4. **Cross-linking standard**
   - Terms in website copy link to glossary entries.

5. **Glossary page**
   - `website/glossary.html` or equivalent.

---

## Acceptance

A technically proficient developer unfamiliar with SYNTH can correctly explain every public constitutional term after reading its definition once.

---

## Phases

### Phase 1 — Term inventory

List all public terms used on the website, in CLI help, and in documentation.

### Phase 2 — Definition drafting

Write plain-language definitions for each term.

### Phase 3 — First-use audit

Review every public page and identify where terms appear without definition.

### Phase 4 — Glossary page

Create the glossary page.

### Phase 5 — Integration

Add definitions or glossary links across the website and documentation.

---

## Risks

| Risk | Mitigation |
|---|---|
| Definitions become too long | Enforce one-sentence primary definition |
| Conflicts with constitutional vocabulary | Align with `docs/reference/public-vocabulary.md` |
| Maintenance burden | Generate glossary from source definitions via projections |

---

## Definition of Done

- [ ] Public term inventory complete.
- [ ] Plain-language glossary drafted.
- [ ] First-use rules documented.
- [ ] Progressive disclosure guidelines documented.
- [ ] Glossary page created.
- [ ] First-use definitions or links added across public pages.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Inventory terms.
2. Draft definitions.
3. Audit first-use across pages.
4. Create glossary page.
5. Integrate definitions and links.
6. Verify comprehension.

---

## Completion Notes

Pending.
