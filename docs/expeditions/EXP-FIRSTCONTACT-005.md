# EXP-FIRSTCONTACT-005 — Documentation Journey

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** EXP-FIRSTCONTACT-002  
**Blocks:** none

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

Move foundational documentation onto the website and sequence it so visitors can learn SYNTH from problem to first mission without leaving the site.

---

## Motivation

The Documentation page (`docs.html`) is only a link list to GitHub markdown. The audit identified that core docs should live on the website, with GitHub reserved for deep reference. This expedition defines which docs move and how they are sequenced.

---

## Deliverables

1. **Documentation inventory**
   - List all docs in `docs/operator/`, `docs/reference/`, and `docs/guides/`.
   - Classify each as website-first or GitHub-reference-only.

2. **Learning sequence**
   - Ordered path from problem → concepts → install → first mission → governance → advanced topics.

3. **Website documentation pages**
   - Getting Started, Public Vocabulary, Public Architecture, Governance at a Glance.

4. **Projection strategy**
   - How website docs remain synchronized with source markdown under the Deterministic Projection Model.

5. **Updated docs.html**
   - On-site pages first; GitHub deep links second.

---

## Acceptance

A visitor can complete the first-contact learning journey entirely on the website, using GitHub links only for deep reference or contribution.

---

## Phases

### Phase 1 — Inventory

List and classify all documentation.

### Phase 2 — Sequence design

Define the learning path.

### Phase 3 — Migration plan

Decide which docs become website pages and which stay in GitHub.

### Phase 4 — Projection implementation

Ensure website docs are generated or synchronized from source.

### Phase 5 — Navigation update

Update `docs.html` and cross-links.

---

## Risks

| Risk | Mitigation |
|---|---|
| Duplication between site and GitHub | Use deterministic projections |
| Scope creep | Limit to first-contact docs only |
| Broken external links | Run link checker after reorganization |

---

## Definition of Done

- [ ] Documentation inventory complete.
- [ ] Learning sequence defined.
- [ ] Migration plan documented.
- [ ] Foundational docs available on website.
- [ ] `docs.html` updated.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Inventory existing docs.
2. Define learning sequence.
3. Migrate foundational docs to website pages.
4. Update projections if needed.
5. Update navigation and links.

---

## Completion Notes

Pending.
