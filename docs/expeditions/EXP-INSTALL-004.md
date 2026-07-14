# EXP-INSTALL-004 — Installation Engine

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-002, EXP-INSTALL-003  
**Blocks:** EXP-INSTALL-005, EXP-INSTALL-009

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

Implement the installation workflow.

---

## Motivation

Given an Environment Profile and a Distribution Profile, the Installation Engine must produce a working SYNTH CLI. It must be idempotent, retry transient failures, and leave the system in a clean state on failure.

---

## Deliverables

1. **Package installation**
   - Invoke the selected backend (e.g., `npm install -g @synth-framework/synth`).

2. **Retry handling**
   - Retry on network errors with backoff.

3. **Cleanup**
   - Remove partial installs on failure.

4. **Rollback**
   - Restore previous version on failed upgrade if possible.

5. **Idempotent execution**
   - Re-running the installer produces the same result.

---

## Acceptance

The installer can install SYNTH from npm on supported platforms without manual intervention.

Specifically:

- `install.sh` installs the CLI globally or via the selected backend.
- Re-running succeeds without error.
- Failed installs are cleaned up.

---

## Phases

### Phase 1 — npm install path

Implement global npm install for Era II.

### Phase 2 — Idempotency

Ensure repeated runs are safe.

### Phase 3 — Cleanup and rollback

Add failure handling.

---

## Risks

| Risk | Mitigation |
|---|---|
| Global install permission issues | Detect and warn; suggest npx or local install |
| Partial install leaves broken CLI | Validate executable after install |

---

## Definition of Done

- [x] Installation workflow implemented for npm.
- [x] Retry logic implemented.
- [x] Cleanup on failure implemented.
- [x] Idempotency verified.
- [x] Tests cover install success and failure paths.
- [x] Root `install.sh` audited and removed (it was unreferenced).
- [ ] `npm run govern` passes (verified in CI).
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Implement npm install path.
2. Add retry and cleanup.
3. Test idempotency.
4. Document install behavior.
5. Build and verify.

---

## Completion Notes

- Implemented `install_package()` in `scripts/install.sh` with npm backend invocation, exponential-backoff retry, cleanup on failure, and best-effort rollback for upgrades.
- Added `verify_installation()` to confirm `synth` is available and executable after install.
- Added internal `SYNTH_INSTALLER_NPM_PREFIX` override for testing and non-global installs.
- Created `tests/installer-engine.test.js` covering dry-run, success, retry, cleanup, idempotency, and upgrade paths.
- Registered `test:installer-engine` in `package.json` and included it in `test:all`.
- Audited root `install.sh`; it was unreferenced by tests, docs, or CI, so it was deleted to avoid confusion with the public `scripts/install.sh`.
- All installer tests and documentation integrity checks pass locally.
