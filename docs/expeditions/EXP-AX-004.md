# EXP-AX-004 — Documentation Synchronization

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-AX-003  
**Blocks:** EXP-AX-005

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

Make the repository the single source of truth for documentation and website content.

---

## Motivation

Public-facing documentation and the website should not drift from the repository. The synchronization chain must become:

```text
Repository
↓
Documentation Projection
↓
Website Projection
↓
Published Site
```

No duplicated content. No manually maintained website pages that contradict the repository.

---

## Deliverables

1. **Projection audit**
   - Verify that `docs/generated/` is produced from `docs/` sources.
   - Verify that website pages can be regenerated from docs.

2. **Link audit**
   - Ensure internal links between README, docs, and website resolve.
   - Fail the build on broken internal links.

3. **Content consistency audit**
   - Ensure `synth validate`, `AGENTS.md`, and the AI-native workflow are described consistently across README, operator docs, agent guides, and website.

4. **Website synchronization verification**
   - Add a check that `website/` content matches the latest docs projection.
   - Or generate website pages from docs automatically.

5. **Documentation freshness verification**
   - Ensure generated docs are up to date on every merge.
   - Reject hand-edits to generated output.

---

## Acceptance

Generated documentation remains synchronized with the repository.

Specifically:

- `docs/generated/` is a pure function of `docs/`.
- Website landing content matches README narrative.
- `synth validate`, `AGENTS.md`, and AI-native workflow are described consistently across surfaces.
- Broken internal links fail the build.
- No manual edits to generated docs are required.

---

## Phases

### Phase 1 — Audit current state

Identify duplicated or manually maintained content.

### Phase 2 — Projection pipeline

Extend the Documentation Expedition to project website-ready content.

### Phase 3 — Synchronization test

Add a test that fails when website content drifts from docs.

### Phase 4 — CI enforcement

Ensure the publication workflow runs the synchronization check.

---

## Risks

| Risk | Mitigation |
|---|---|
| Full website generation is complex | Start with copy synchronization, not full layout generation |
| Generated HTML lacks styling | Keep human-written CSS; generate content only |
| False positives in drift detection | Exclude expected dynamic content |

---

## Definition of Done

- [ ] `docs/generated/` is verified as a projection of `docs/`.
- [ ] Website content is synchronized with docs.
- [ ] `synth validate`, `AGENTS.md`, and AI-native workflow are consistent across README, docs, agent guides, and website.
- [ ] Broken internal links fail the build.
- [ ] A drift-detection test exists and passes.
- [ ] CI enforces documentation freshness.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit `website/` for content that duplicates docs.
2. Extend `scripts/verify-documentation-projection.js` to compare website content if applicable.
3. Add or update a test for website/docs synchronization.
4. Update `.github/workflows/publish.yml` to run the new check.
5. Build and verify.

---

## Completion Notes

Link checking and documentation projection verification already exist (`npm run docs:check-links`, `npm run docs:verify-projection`). The remaining work is to close content drift between the README, `docs/getting-started/`, agent guides, and the static website, especially after the `synth validate` and `AGENTS.md` additions.
