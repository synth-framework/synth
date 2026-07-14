# EXP-INSTALL-009 — Installation Certification

**Status:** Active  
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

- [ ] Certification workflow implemented.
- [ ] All certification steps pass.
- [ ] Certification failure blocks release.
- [ ] Multi-platform certification planned (Ubuntu minimum).
- [ ] Results are recorded.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add certification job to release workflow.
2. Implement install verification steps.
3. Wire release gate.
4. Add platform matrix.
5. Build and verify.

---

## Completion Notes

Pending.
