# EXP-INSTALL-002 — Environment Detection

**Status:** Completed  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-001  
**Blocks:** EXP-INSTALL-004, EXP-INSTALL-005, EXP-INSTALL-009

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

Create the environment discovery layer used by the installer.

---

## Motivation

The installer must understand the environment before deciding how to install. This layer isolates platform-specific assumptions and produces a normalized profile that downstream expeditions consume.

---

## Deliverables

1. **Operating system detection**
   - macOS, Linux, Windows (WSL), with fallback to unsupported.

2. **CPU architecture detection**
   - x86_64, arm64, with graceful fallback.

3. **Shell detection**
   - bash, zsh, with optional future fish support.

4. **Node.js validation**
   - Minimum supported version check (Node >= 20).

5. **npm validation**
   - Presence and version check.

6. **PATH inspection**
   - Detect global npm bin directory or equivalent.

7. **Network availability**
   - Basic connectivity to registry endpoints.

8. **Permission checks**
   - Warn if global install may require elevated permissions.

---

## Acceptance

The installer can produce a deterministic Environment Profile for supported platforms and fail clearly on unsupported ones.

Specifically:

- Environment Profile includes OS, arch, shell, Node version, npm version, PATH status, network status, and permission hints.
- Unsupported platforms exit with a clear message.
- Tests cover macOS and Linux detection paths.

---

## Phases

### Phase 1 — Detection functions

Implement OS, arch, shell, Node, npm, PATH, network, and permission checks.

### Phase 2 — Profile schema

Define the Environment Profile output format.

### Phase 3 — Error handling

Define behavior for unsupported or incomplete environments.

---

## Risks

| Risk | Mitigation |
|---|---|
| Platform detection is fragile | Use standard uname/powershell fallbacks |
| False positives on WSL | Check for WSL-specific indicators |

---

## Definition of Done

- [x] OS detection implemented.
- [x] Architecture detection implemented.
- [x] Shell detection implemented.
- [x] Node.js and npm validation implemented.
- [x] PATH inspection implemented.
- [x] Network check implemented.
- [x] Permission check implemented.
- [x] Environment Profile schema documented.
- [x] Tests cover supported platforms.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Implement detection functions in `install.sh` or a sourced module.
2. Define the Environment Profile.
3. Add tests for detection logic.
4. Document unsupported-platform behavior.
5. Build and verify.

---

## Completion Notes

Environment detection delivered in `scripts/install.sh`:

- `detect_os()` supports macOS, Linux, and WSL with unsupported-platform fallback.
- `detect_arch()` supports x86_64 and arm64.
- `detect_shell()` reads `$SHELL`.
- `check_command_version()` reports Node and npm versions.
- `check_path()` reports whether `synth` is already on PATH.
- `check_network()` verifies reachability of the installer base URL via curl.
- `check_permissions()` reports whether the npm global prefix is writable.
- `build_environment_profile()` prints a structured profile during `--dry-run`.
- `validate_environment()` fails early on unsupported OS/arch or missing Node.js.
- `tests/installer-environment.test.js` verifies the profile is printed and the current platform is detected as supported.
- Added `npm run test:installer-environment` and included it in `npm run test:all`.
