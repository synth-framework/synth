# EXP-DOCS-006 — Website Projection Verification

**Status:** Proposed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-008 — Documentation & Projections  
**Depends On:** EXP-DOCS-002, EXP-DOCS-003, EXP-DOCS-004, EXP-DOCS-005  
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

Verify that the public website reflects the documentation surface produced by EXP-DOCS-002 through EXP-DOCS-005, and close any gap between the website and the current architecture documentation.

---

## Motivation

The website is a projection consumer: it presents the public documentation to first-time visitors. When the documentation surface changes — new capability reference, Environment Layer reference, updated agent guides, synchronized examples — the website must reflect it. Today the website's architecture and docs pages predate the Environment Layer, so the public face of the project describes an older system than the repository contains.

---

## Deliverables

1. **Website audit**
   - Compare each page in `website/` against the current documentation surface.
   - Record gaps: missing documents, stale architecture descriptions, broken or outdated links.

2. **Website synchronization**
   - Update website pages that reference superseded architecture or omit the Environment Layer and capability documentation.

3. **Sync verification**
   - Confirm `npm run docs:verify-website-sync` and `npm run docs:check-links` cover the updated pages and pass.

---

## Acceptance

- Website pages accurately reference the capability reference, Environment Layer reference, and updated guides.
- `npm run docs:verify-website-sync` passes.
- `npm run docs:check-links` passes.
- The GitHub Pages deployment succeeds with the updated site.

---

## Phases

### Phase 1 — Audit

Compare website pages against the documentation surface and record gaps.

### Phase 2 — Synchronize

Update stale website content.

### Phase 3 — Verify

Run website sync and link checks.

### Phase 4 — Deploy

Confirm the Publish workflow deploys the updated site.

---

## Risks

| Risk | Mitigation |
|---|---|
| Website drift recurs with every docs change | Keep website content derived from or explicitly synced with documentation sources |
| Audit misses pages | Enumerate pages from the repository, not from navigation |
| Deployment verification flakes | Reuse the polling verification established by EXP-INSTALL-011 |

---

## Definition of Done

- [ ] Website audit completed with recorded gaps.
- [ ] Stale website content synchronized.
- [ ] `npm run docs:verify-website-sync` passes.
- [ ] `npm run docs:check-links` passes.
- [ ] GitHub Pages deployment verified.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit `website/` against the updated documentation surface.
2. Synchronize stale pages.
3. Run sync and link verification.
4. Verify deployment.
5. Request acceptance.

---

## Completion Notes

Pending.
