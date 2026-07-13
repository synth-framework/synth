# EXP-VAL-004 — Documentation Integrity

**Status:** Completed  
**Kind:** Validation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-003 — SYNTH Validation Program  
**Depends On:** EXP-VAL-003  
**Blocks:** EXP-VAL-005

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

Treat documentation as a projection. Never as hand-written truth.

---

## Goal

Continuously validate:

```text
Documentation
↔ Replay
↔ Knowledge
↔ Examples
↔ Links
↔ Versions
↔ Repositories
```

---

## Deliverables

1. **Documentation validation**
   - Verify that generated docs are produced from the current knowledge base.
   - Detect stale or manually edited generated sections.

2. **Broken-link detection**
   - Check internal markdown links.
   - Check website links.
   - Check example cross-references.

3. **Repository validation**
   - Confirm repository layout matches the public-release standard.
   - Detect obsolete directories or files.

4. **Version synchronization**
   - Ensure `package.json`, `CHANGELOG.md`, and release tags agree.
   - Detect version drift between documentation and code.

5. **Projection verification**
   - Confirm `docs/generated/` is a pure function of `docs/` sources.
   - Fail if generated docs differ from what the Documentation Expedition would produce.

6. **Knowledge consistency**
   - Verify that public vocabulary is used consistently.
   - Detect leaked internal terminology.

---

## Acceptance

Generated documentation remains synchronized with:

```text
Mission
↓
Replay
↓
Repository
↓
Release
```

Specifically:

- Every CI run validates documentation integrity.
- Broken internal links fail the build.
- Generated docs cannot be edited by hand without CI failing.
- Public vocabulary audit passes on every merge.

---

## Phases

### Phase 1 — Link Integrity

Strengthen `scripts/check-links.js` and add website link checks.

### Phase 2 — Projection Check

Add a test that compares `docs/generated/` against a fresh Documentation Expedition run.

### Phase 3 — Repository Layout Check

Ensure `npm run audit:repository` runs in CI.

### Phase 4 — Version Sync

Add validation between `package.json`, changelog, and latest release.

### Phase 5 — Vocabulary Guard

Run `npm run test:public-vocabulary-audit` in CI.

---

## Risks

| Risk | Mitigation |
|---|---|
| Validation is too noisy | Tolerate warnings for external links |
| Generated docs need emergency edits | Edit source, not generated output |
| Version checks conflict with pre-release tags | Support prerelease identifiers |

---

## Definition of Done

- [x] Documentation integrity checks run in CI.
- [x] Broken internal links fail the build.
- [x] Generated docs are verified as projections.
- [x] Repository layout is validated on every merge.
- [x] Version synchronization is validated.
- [x] Public vocabulary audit runs in CI.
- [x] Expedition is accepted.

---

## Implementation Plan

Approved plan for executing this expedition:

1. **Extend `scripts/check-links.js`** — Add scanning of `website/*.html` for internal `href` and `src` links. External links are reported as warnings but do not fail the build.
2. **Create `scripts/verify-documentation-projection.js`** — Run `synth docs generate` to a temporary directory and compare the output with the committed `docs/generated/`. Fail if generated docs differ from the committed projection.
3. **Create `scripts/verify-version-sync.js`** — Validate that `package.json`, `CHANGELOG.md` latest entry, and the latest Git tag share the same version. Support prerelease identifiers.
4. **Add npm scripts** — `docs:verify-projection` and `version:verify`. Include them in `npm run test:all`.
5. **Create `tests/documentation-integrity.test.js`** — Unit-level coverage for projection verification, version sync parsing, and link extraction.
6. **Update CI** — `.github/workflows/proof.yml` already runs `npm run govern`, so the new checks will run automatically through `test:all`.
7. **Build and verify** — Run `npm run build`, `npm run test:all`, `npm run proof`, `npm run docs:check-links`, `npm run audit:repository`.

## Completion Notes

EXP-VAL-004 completed on 2026-07-12.

### What was delivered

- **`scripts/check-links.js` extended** — Now scans `website/*.html` for internal `href` and `src` links. External links are reported as warnings (1006 internal links checked, 31 external links warned).
- **`scripts/verify-documentation-projection.js`** — Regenerates docs to a temp directory using `synth docs generate --link-prefix ..` and compares against committed `docs/generated/`. Prevents hand-edits of generated output.
- **`scripts/verify-version-sync.js`** — Validates semantic-version alignment between `package.json`, `CHANGELOG.md`, and the latest Git tag. Supports prerelease identifiers.
- **`src/cli/synth.ts` and `src/api/index.ts`** — Added `--link-prefix` support to `synth docs generate` so projections can be verified independently of the output directory path.
- **`package.json` scripts** — Added `docs:verify-projection` and `version:verify`; both are now part of `npm run test:all`.
- **`tests/documentation-integrity.test.js`** — Covers link checking, projection verification script presence, version sync script presence, and npm script registration.
- **`docs/generated/` regenerated** — Updated to reflect the latest knowledge base including the new operator guides.

### Verification results

- `npm run build` — PASS
- `npm run test:all` — PASS (all suites green)
- `npm run proof` — PASS (P1 Structural, P2 Replay, P2 Determinism, P4 Adversarial)
- `npm run docs:check-links` — PASS (1006 internal links resolve)
- `npm run docs:verify-projection` — PASS (7 files synchronized)
- `npm run version:verify` — PASS (2.0.0 synchronized)
- `npm run audit:repository` — PASS (56 passed, 0 warned, 0 failed)

### Proof artifact

- Fresh proof generated: `proof/proof-2026-07-12T23-17-58-872Z.json`

EXP-VAL-004 now unblocks EXP-VAL-005.

