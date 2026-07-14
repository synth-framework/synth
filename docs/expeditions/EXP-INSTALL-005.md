# EXP-INSTALL-005 — Installation Verification

**Status:** Active  
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

- [ ] Executable availability check implemented.
- [ ] PATH resolution check implemented.
- [ ] Version verification implemented.
- [ ] `synth --version` check implemented.
- [ ] `synth doctor` check implemented.
- [ ] Installation Proof schema documented.
- [ ] `--verify-only` mode implemented.
- [ ] Tests cover verification paths.
- [ ] `npm run govern` passes.
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

Pending.
