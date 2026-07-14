# EXP-INSTALL-005 — Installation Verification

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-004  
**Blocks:** EXP-INSTALL-009

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

Verify that the installation completed successfully.

---

## Motivation

Installation is not complete until the user can run `synth --version`. This expedition produces an Installation Proof that the installer and CI can consume.

---

## Deliverables

1. **Executable availability**
   - `synth` is found on PATH.

2. **PATH resolution**
   - The resolved binary matches the intended installation location.

3. **Version verification**
   - Installed version matches the requested version.

4. **`synth --version`**
   - Command returns a structured version.

5. **`synth doctor`**
   - Command reports healthy installation.

6. **Installation integrity**
   - Required files are present.

---

## Acceptance

The installer refuses to report success unless all verification checks pass.

Specifically:

- Verification runs automatically after install.
- `--verify-only` mode exists for CI.
- Failure produces actionable diagnostics.

---

## Phases

### Phase 1 — Verification checks

Implement executable, PATH, version, doctor, and integrity checks.

### Phase 2 — Installation Proof output

Define and emit the Installation Proof artifact.

### Phase 3 — CI mode

Add `--verify-only` for certification pipelines.

---

## Risks

| Risk | Mitigation |
|---|---|
| PATH not refreshed in current shell | Document need to open new shell or source profile |
| `synth doctor` depends on project state | Run doctor in a temp directory |

---

## Definition of Done

- [x] Executable availability check implemented.
- [x] PATH resolution check implemented.
- [x] Version verification implemented.
- [x] `synth --version` check implemented.
- [x] `synth doctor` check implemented.
- [x] Installation Proof schema documented.
- [x] `--verify-only` mode implemented.
- [x] Tests cover verification paths.
- [ ] `npm run govern` passes (verified in CI).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Implement verification functions.
2. Define Installation Proof.
3. Add `--verify-only`.
4. Add tests.
5. Document verification behavior.
6. Build and verify.

---

## Completion Notes

- Enhanced `verify_installation()` in `scripts/install.sh` to perform executable availability, PATH resolution, version matching, `synth --version`, and `synth doctor` checks.
- Added `emit_installation_proof()` to produce a structured Installation Proof artifact.
- Added `--verify-only` mode for CI certification pipelines.
- Ensured verification uses the prefix-installed binary when `SYNTH_INSTALLER_NPM_PREFIX` is set.
- Created `tests/installer-verify.test.js` covering missing synth, successful verify-only, version mismatch, proof emission, and unhealthy doctor scenarios.
- Registered `test:installer-verify` in `package.json` and included it in `test:all`.
- Updated `tests/installer-contract.test.js` to recognize the new `--verify-only` option.
