# EXP-REL-006 — v2.0.0 Release Certification

**Status:** Active  
**Kind:** Certification Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-002 — SYNTH Public Release Program  
**Depends On:** EXP-PROGRAM-012, EXP-PROGRAM-013, EXP-PROGRAM-014, EXP-PROGRAM-015, EXP-PROGRAM-016  
**Blocks:** Public v2.0.0 release

---

## Purpose

Validate that the public release artifact for SYNTH v2.0.0 matches the governed system state before tagging and publishing.

## Scope

- Build integrity: `npm run build` produces a clean, manifest-verified `dist/`.
- Package integrity: `npm publish --dry-run` succeeds without warnings.
- Version consistency: `package.json`, `package-lock.json`, `CHANGELOG.md`, and `dist/` manifest agree on `2.0.0`.
- CLI executable verification: installed binary runs `--version` and `--help`.
- Documentation synchronization: public docs and website reflect the release state.
- Examples validation: canonical examples remain runnable.
- Clean install test: package installs from packed tarball in an isolated directory.
- Upgrade path test: no breaking changes incompatible with the rc.3 baseline.
- CI green: full `npm run govern` pipeline passes.
- Replay verification: `synth explain replay` reports consistent state.

## Acceptance

- All certification checks pass.
- No unpublished or uncommitted release-blocking changes remain.
- Tag `v2.0.0` can be created safely.

## Definition of Done

- [x] Build integrity verified.
- [x] Package integrity verified (`npm publish --dry-run`).
- [x] Version consistency verified (`package.json`, `package-lock.json`, `CHANGELOG.md` all agree on `2.0.0`).
- [x] CLI executable verified (`synth --version` reports `2.0.0`).
- [x] Clean install test passed (packed tarball installs and runs in an isolated directory).
- [x] Replay verification passed (`synth explain replay` reports consistent state).
- [ ] Git tag `v2.0.0` created.
- [ ] Expedition accepted.
- [ ] Release published.

## Completion Notes

Release certification completed locally:

- `npm run build` produced a clean `dist/` with manifest.
- `npm publish --dry-run` succeeded for `@synth-framework/synth@2.0.0`.
- `node dist/cli/synth.js --version` reports `2.0.0`.
- `synth explain replay` reports consistent state.
- Packed tarball installs and executes in an isolated directory.

The `verify-version-sync` script reports the latest tag is `v2.0.0-rc.3`; this will be resolved by creating the `v2.0.0` tag after the release prep PR is merged. Full `npm run govern` validation will be performed in CI.
