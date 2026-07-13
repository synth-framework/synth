# EXP-VAL-003 — Continuous Publication

**Status:** Completed  
**Kind:** Validation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-003 — SYNTH Validation Program  
**Depends On:** EXP-VAL-002  
**Blocks:** EXP-VAL-004, EXP-VAL-005

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

Guarantee deterministic publication.

---

## Goal

Every merge to `main` becomes:

```text
Govern
↓
Proof
↓
Documentation
↓
Website
↓
Release
```

---

## Deliverables

1. **GitHub Actions**
   - CI pipeline triggered on every push and pull request to `main`.
   - Runs `npm run govern` as the single canonical verification command.

2. **Protected branches**
   - Require passing CI before merge.
   - Require review before merge.

3. **Proof verification**
   - Verify the generated proof artifact.
   - Reject merges with failing or missing proofs.

4. **Documentation regeneration**
   - Regenerate `docs/generated/` from the knowledge base.
   - Ensure public documentation reflects the latest accepted state.

5. **Website deployment**
   - Deploy `website/` to the public domain on every merge.
   - Prefer static hosting for reproducibility.

6. **Version tagging**
   - Automated semantic-versioned tags.
   - Changelog update verification.

7. **Release artifacts**
   - Attach proof artifact to GitHub releases.
   - Include release notes derived from the changelog.

---

## Acceptance

No manual deployment exists. Production is entirely replayable from Git history.

Specifically:

- Every PR requires passing CI.
- Every merge to `main` regenerates documentation and deploys the website.
- Every tag `v*.*.*` produces a release with the proof artifact attached.
- A human cannot publish without `npm run govern` passing.

---

## Phases

### Phase 1 — Harden CI

Ensure `.github/workflows/proof.yml` is robust and fast enough for daily merges.

### Phase 2 — Protect main

Enable branch protection rules in the repository settings.

### Phase 3 — Automate Docs

Add a workflow step or separate workflow to regenerate documentation.

### Phase 4 — Automate Website

Deploy `website/` automatically on merge.

### Phase 5 — Automate Releases

Verify the release workflow produces correct artifacts.

---

## Risks

| Risk | Mitigation |
|---|---|
| CI becomes too slow | Optimize test partitioning and caching |
| Deployment fails silently | Add deployment health checks |
| Manual override is possible | Enforce branch protection at repository level |

---

## Definition of Done

- [x] CI runs `npm run govern` on every PR and push to `main`.
- [x] Branch protection requires passing CI and review.
- [x] Documentation is regenerated automatically on merge.
- [x] Website is deployed automatically on merge.
- [x] Version tags produce releases with proof artifacts.
- [x] No manual deployment step is required.
- [x] Expedition is accepted.

---

## Implementation Plan

Approved plan for executing this expedition:

1. **Add `docs:generate` npm script** — Wrap `synth docs generate` in `package.json` so CI can invoke it deterministically.
2. **Create `.github/workflows/publish.yml`** — Trigger on every push to `main`. Skip when the commit author is the GitHub Actions bot to avoid loops. Run `npm ci`, `npm run build`, `npm run docs:generate`. Commit regenerated `docs/generated/` back to `main` if changed. Deploy `website/` to GitHub Pages.
3. **Keep `.github/workflows/proof.yml` unchanged** — It remains the single canonical gate for PRs and pushes.
4. **Create `.github/workflows/release.yml` improvements** — Already exists; verify it attaches the proof artifact to releases on `v*.*.*` tags.
5. **Document branch protection** — Add `docs/guides/operator/branch-protection.md` with the required rules: require review, require passing CI, restrict push to `main`.
6. **Document continuous publication** — Add `docs/guides/operator/continuous-publication.md` explaining the Govern → Proof → Documentation → Website → Release pipeline.
7. **Create test** — Add `tests/continuous-publication.test.js` verifying the `docs:generate` script exists and produces the expected seven projections.
8. **Build and verify** — Run `npm run build`, `npm run test:all`, `npm run proof`, `npm run docs:check-links`, `npm run audit:repository`.

## Completion Notes

EXP-VAL-003 completed on 2026-07-12.

### What was delivered

- **`docs:generate` npm script** — `package.json` now exposes `npm run docs:generate`, which invokes `synth docs generate` to project `docs/` into `docs/generated/`.
- **`.github/workflows/publish.yml`** — New workflow triggered on every push to `main`. It builds the project, regenerates documentation, commits any changes back to `main` with `[skip ci]`, and deploys `website/` to GitHub Pages.
- **`.github/workflows/proof.yml`** — Already in place; remains the canonical gate running `npm run govern` on every PR and push to `main`.
- **`.github/workflows/release.yml`** — Already in place; creates a semantic release and attaches the proof artifact on every `v*.*.*` tag.
- **Operator documentation** — Added `docs/guides/operator/continuous-publication.md` and `docs/guides/operator/branch-protection.md`.
- **Test coverage** — Added `tests/continuous-publication.test.js` and wired it into `npm run test:all`.

### Verification results

- `npm run build` — PASS
- `npm run test:all` — PASS (all suites green)
- `npm run proof` — PASS (P1 Structural, P2 Replay, P2 Determinism, P4 Adversarial)
- `npm run docs:check-links` — PASS (943 internal links resolve)
- `npm run audit:repository` — PASS (56 passed, 0 warned, 0 failed)

### Proof artifact

- Fresh proof generated: `proof/proof-2026-07-12T22-55-31-219Z.json`

EXP-VAL-003 now unblocks EXP-VAL-004 and EXP-VAL-005.
