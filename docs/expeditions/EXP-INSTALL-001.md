# EXP-INSTALL-001 — Bootstrap Contract

**Status:** Active  
**Kind:** Installation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-PROGRAM-006  
**Blocks:** EXP-INSTALL-002, EXP-INSTALL-003, EXP-INSTALL-004, EXP-INSTALL-005, EXP-INSTALL-006, EXP-INSTALL-008, EXP-INSTALL-009, EXP-INSTALL-010

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

Define the permanent public installation contract for SYNTH.

---

## Motivation

The installer must present a stable public interface regardless of whether the backend is npm, Homebrew, a binary release, or a future package manager. Changing the user's one-line install command would break documentation, AI prompts, and onboarding flows.

---

## Deliverables

1. **Stable `install.sh` file structure**
   - Header and license.
   - Safety settings (`set -euo pipefail` equivalent).
   - Argument parsing.

2. **Command-line options**
   - `--upgrade`
   - `--channel <name>`
   - `--version <semver>`
   - `--dry-run`
   - `--help`

3. **Exit code contract**
   - `0` — success or successful no-op.
   - `1` — operational failure.
   - Other codes reserved for future use.

4. **Logging conventions**
   - Quiet by default; verbose with `--verbose`.
   - Errors to stderr.

5. **Error handling conventions**
   - Clear messages.
   - Suggested remediation.
   - No partial installations left behind.

---

## Acceptance

The installer public interface is documented and versioned. No installation logic is implemented yet.

Specifically:

- `install.sh` exists in the repository root or `scripts/`.
- Argument parsing handles all defined options.
- Exit codes match the contract.
- The interface is documented in the Installation Guide.

---

## Phases

### Phase 1 — Interface draft

Write the installer header, argument parser, and help text.

### Phase 2 — Contract review

Review the public interface against AI operator prompts and README install instructions.

### Phase 3 — Documentation

Document the interface in the Installation Guide.

---

## Risks

| Risk | Mitigation |
|---|---|
| Interface becomes incompatible with future backends | Keep options semantic, not backend-specific |
| Too many options | Ship only the minimal stable set |

---

## Definition of Done

- [ ] `install.sh` skeleton exists.
- [ ] Argument parser handles `--upgrade`, `--channel`, `--version`, `--dry-run`, `--help`.
- [ ] Exit code contract is implemented.
- [ ] Logging and error conventions are documented.
- [ ] Installer interface is documented in the Installation Guide.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Create `install.sh` skeleton.
2. Implement argument parsing.
3. Define exit codes.
4. Add help text.
5. Document the contract.
6. Build and verify.

---

## Completion Notes

Pending.
