# EXP-FIRSTCONTACT-002 — Website Information Architecture

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-009 — First Contact & Public Identity  
**Depends On:** EXP-FIRSTCONTACT-001  
**Blocks:** EXP-FIRSTCONTACT-003, EXP-FIRSTCONTACT-005

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

Restructure the website navigation and page flow so that visitors progress naturally through the Narrative Ladder without dead ends or forced departures to GitHub.

---

## Motivation

The current site has seven pages linked from a single header, and the Documentation page is only a link list to GitHub markdown. Most interior pages end with a single external link. This creates dead ends and pushes visitors away from the site before they understand SYNTH.

---

## Deliverables

1. **Revised site map**
   - Pages organized by visitor intent and Narrative Ladder level.

2. **Navigation design**
   - Primary header nav.
   - Secondary navigation or next-step links on each page.
   - Breadcrumbs if warranted.

3. **Page-type classification**
   - Marketing, tutorial, explanation, reference, how-to.

4. **Internal linking strategy**
   - Each page links to the logical next page in the journey.

5. **Documentation integration plan**
   - Which docs stay on GitHub deep reference and which move to the website.

---

## Acceptance

A visitor can move from "What is SYNTH?" to "How do I install it?" to "How do I run my first mission?" entirely within the website, without guessing where to go next.

---

## Phases

### Phase 1 — Audit current IA

Map all pages, links, and exit points.

### Phase 2 — Define target IA

Propose a new site map aligned with the public narrative.

### Phase 3 — Navigation design

Design header, footer, and in-page next-step links.

### Phase 4 — Implementation plan

List pages to create, modify, or remove.

---

## Risks

| Risk | Mitigation |
|---|---|
| Over-engineering navigation | Keep primary nav to 5–7 items |
| Breaking existing links | Run `npm run docs:check-links` after changes |
| Docs duplication | Prefer projections from source docs |

---

## Definition of Done

- [ ] Revised site map documented.
- [ ] Navigation design documented.
- [ ] Page-type classification complete.
- [ ] Internal linking strategy defined.
- [ ] Documentation integration plan documented.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Map current website structure.
2. Define target structure based on EXP-FIRSTCONTACT-001 narrative.
3. Design navigation and next-step links.
4. Create implementation tickets for subsequent expeditions.

---

## Completion Notes

Pending.
