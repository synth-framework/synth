# ADR-018 — npm Package Publication Through PR and Tag

**Status:** Accepted  
**Date:** 2026-07-18  
**Author:** Synth Architecture  
**Deciders:** Synth Architecture

---

## Context

The `@synth-framework/synth` package is published to npm as part of the Release workflow (`.github/workflows/release.yml`). Previously, the release process allowed version bumps and tag pushes to happen directly on `main`, which created two risks:

1. A release could bypass the pull-request review boundary that protects `main`.
2. A tag could be pushed before `npm run govern` had passed, potentially publishing a package that had not been validated.

Every published version must be reproducible, governed, and traceable to an approved change in the repository history.

## Decision

### 1. All npm publications require a pull request

A version bump — changes to `package.json`, `package-lock.json`, and `CHANGELOG.md` — must be introduced through a pull request and merged into `main` before any publication step runs.

Direct pushes of version bumps to `main` are prohibited by branch protection rules.

### 2. Publication is triggered only by a version tag

After the version-bump pull request is merged, an annotated git tag matching `v*.*.*` is pushed. The tag must point to a commit on `main` that already contains the bumped version.

Pushing the tag is the only human action that triggers publication.

### 3. CI runs the full governance pipeline before publishing

The Release workflow performs the following steps in order:

1. Check out the tagged commit.
2. Install dependencies with `npm ci`.
3. Run `npm run govern` (build, full test suite, proof generation).
4. Publish to npm with `npm publish` only if governance passes.
5. Upload the proof artifact.
6. Run installer certification on Ubuntu and macOS.
7. Create a GitHub release with the proof artifact attached.

No package may reach npm unless `npm run govern` succeeds on the exact commit referenced by the tag.

### 4. No manual `npm publish`

No operator or agent may run `npm publish` from a local machine. The `NPM_TOKEN` secret is available only to the Release workflow, making CI the sole publication authority.

### 5. Tag movement is allowed only to recover from non-code failures

If a release fails for a non-code reason (for example, npm registry propagation delay during installer certification), the tag may be force-moved to a corrected commit and the workflow re-run. The corrected commit must still pass `npm run govern`.

If the failure is caused by a code or governance issue, the version-bump pull request must be amended or a new pull request opened; the tag must not be force-moved to bypass governance.

## Consequences

- **Easier:** Every published version is guaranteed to have passed the full governance pipeline.
- **Easier:** Releases are traceable through pull request history, commit SHA, tag, and GitHub release.
- **Easier:** The `main` branch protection rules enforce review before any version change.
- **Harder:** Emergency releases require the same PR and CI path as normal releases; there is no shortcut.
- **Harder:** Tag force-movement requires human judgment about whether the failure is code-related or environmental.

## Proof Impact

- **P1 Structural:** Strengthened — publication is gated by the same structural audit that runs on every commit.
- **P2 Behavioral:** Strengthened — the published artifact is produced from a commit that passed behavioral replay.
- **P3 Historical:** Strengthened — the release is tied to an immutable tag and GitHub release record.
- **P4 Adversarial:** Unchanged.
- **P5 Reproducibility:** Strengthened — the exact commit, CI logs, and proof artifact are preserved for each version.

## Kernel Impact

None. This ADR governs the release process, not the SYNTH runtime kernel.

## Constitutional Baseline Impact

No version numbers change. This ADR is added to the active ADR list in `docs/adr/README.md`.

## Related

- `.github/workflows/release.yml`
- `docs/expeditions/EXP-PROGRAM-006.md`
- `docs/adr/ADR-012-runtime-package-capability.md`
