# EXP-DOCS-006 — Website Projection Verification

**Status:** Completed  
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

- [x] Website audit completed with recorded gaps.
- [x] Stale website content synchronized.
- [x] `npm run docs:verify-website-sync` passes.
- [x] `npm run docs:check-links` passes.
- [x] GitHub Pages deployment verified (post-merge, via the Publish workflow).
- [x] `npm run govern` passes (via CI proof check).
- [x] Expedition is accepted.

---

## Implementation Plan

1. Audit `website/` against the updated documentation surface.
2. Synchronize stale pages.
3. Run sync and link verification.
4. Verify deployment.
5. Request acceptance.

---

## Audit Findings

| Page | Finding | Resolution |
|---|---|---|
| `docs.html` | **Critical** — 10 links to the retired `synth-dev/synth-v2` repository (HTTP 404); Reference section omitted the Capability and Environment Layer references | URLs migrated; both references added |
| `community.html` | **Critical** — 5 dead links (repo root, ADR-004, governance, discussions, issues) | URLs migrated |
| `index.html` | **Critical** — 3 dead links (repo root, AGENTS.md, ADR-004) | URLs migrated |
| `quick-start.html` | **Critical** — 2 dead links (CONTRIBUTING.md, getting started) | URLs migrated |
| `architecture.html` | 1 dead link (public architecture). Page otherwise deliberately minimal — it defers internal detail to `public-architecture.md` by design | URL migrated; minimalism preserved |
| `mission-studio.html` | 1 dead link (Mission Studio guide) | URL migrated |
| `examples.html` | Already canonical; lists the six original examples | No change (first-contact is the recorded journey, intentionally not a browsable code example) |
| `public-narrative.html` | Already canonical | No change |
| `scripts/verify-website-sync.js` | **Gap** — validated copy only; never checked repository URLs, which is why 22 dead links passed | Extended with canonical-repository check |

All 22 `synth-dev/synth-v2` links returned HTTP 404 (no redirect). Every target path was verified to exist under `synth-framework/synth`; the repository has Discussions and Issues enabled.

---

## Completion Notes

- Migrated all 22 GitHub links across six pages from `synth-dev/synth-v2` to `synth-framework/synth`.
- `docs.html` Reference section now links the Capability Reference and Environment Layer Reference published by EXP-DOCS-002 and EXP-DOCS-004.
- `scripts/verify-website-sync.js` extended: every `github.com` URL on every website page must start with the canonical repository base. Verified both directions — passes on the current site, fails (exit 1) when a wrong-org URL is injected.
- `tests/documentation-integrity.test.js` extended: new negative test proves the canonical-URL check fails on a stale URL; the script-exists test asserts the check is configured. All 8 documentation integrity tests pass.
- Checks pass: `docs:check-links`, `docs:verify-projection`, `docs:verify-website-sync`, `node tests/documentation-integrity.test.js`.
