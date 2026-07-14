# EXP-INSTALL-009 — Installation Certification

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-005, EXP-INSTALL-006  
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

Validate installation automatically during CI.

---

## Motivation

A release should not be published if the installer cannot produce a working SYNTH CLI. Certification runs the full install → verify flow in a clean environment.

---

## Deliverables

1. **Certification workflow**
   - GitHub Actions job that runs the installer in a clean runner.

2. **Certification steps**
   - Install SYNTH.
   - Verify executable.
   - Execute `synth --version`.
   - Execute `synth doctor`.
   - Execute `synth init`.
   - Validate successful completion.

3. **Release gate**
   - Certification failure blocks release publication.

---

## Acceptance

Every release is certified on a clean environment before publication.

Specifically:

- Certification runs on Ubuntu (and ideally macOS/Windows).
- Failure prevents release.
- Results are recorded in the release notes or proof artifact.

---

## Phases

### Phase 1 — Certification job

Add a GitHub Actions job that runs the installer.

### Phase 2 — Release gate

Wire certification into the release workflow.

### Phase 3 — Multi-platform certification

Extend to macOS and Windows runners.

---

## Risks

| Risk | Mitigation |
|---|---|
| Certification is slow | Run only on release candidates |
| Platform differences | Start with Ubuntu; add platforms incrementally |

---

## Definition of Done

- [x] Certification workflow implemented.
- [x] All certification steps pass.
- [x] Certification failure blocks release.
- [x] Multi-platform certification planned (Ubuntu minimum).
- [x] Results are recorded.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Add certification job to release workflow.
2. Implement install verification steps.
3. Wire release gate.
4. Add platform matrix.
5. Build and verify.

---

## Completion Notes

- Restructured \`.github/workflows/release.yml\` into three jobs:
  1. \`build-and-publish\` — runs governance, publishes to npm, uploads proof artifact.
  2. \`certify\` — installs Synth via the bootstrap installer on a clean runner (Ubuntu and macOS matrix), verifies executable, runs \`synth --version\`, \`synth doctor\`, and \`synth init\`.
  3. \`release\` — creates the GitHub release only after certification succeeds.
- Added \`scripts/certify-installation.sh\` for the canonical install → verify flow.
- Registered \`test:installer-certification\` in \`package.json\` and \`test:all\` (intended for CI).
