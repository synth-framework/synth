# EXP-INSTALL-008 — Upgrade Engine

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-004, EXP-INSTALL-007  
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

Provide deterministic upgrade behavior.

---

## Motivation

Users should be able to upgrade SYNTH using the same installer command they used to install it. The upgrade mechanism must remain independent of the distribution backend.

---

## Deliverables

1. **`--upgrade` flag**
   - Re-runs installation targeting the latest version in the current channel.

2. **`--channel` flag**
   - Switch channels during install or upgrade.

3. **`--version` flag**
   - Install or upgrade to an exact version.

Supported workflows:

```bash
install.sh --upgrade
install.sh --channel latest
install.sh --version 2.1.0
```

---

## Acceptance

Upgrades are deterministic and do not leave multiple versions in conflicting states.

Specifically:

- `--upgrade` installs the latest version in the current channel.
- `--version` installs the exact requested version.
- `--channel` changes the channel for future upgrades.
- Failed upgrades roll back to the previously installed version when possible.

---

## Phases

### Phase 1 — Version comparison

Detect currently installed version.

### Phase 2 — Upgrade path

Implement upgrade for npm backend.

### Phase 3 — Rollback

Add rollback on failure.

---

## Risks

| Risk | Mitigation |
|---|---|
| Downgrades unsupported | Document limitation; block or warn |
| Channel switch loses version pinning | Store channel separately from installed version |

---

## Definition of Done

- [ ] `--upgrade` implemented.
- [ ] `--channel` implemented.
- [ ] `--version` implemented.
- [ ] Current version detection implemented.
- [ ] Rollback on failure implemented.
- [ ] Tests cover upgrade paths.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Detect current installed version.
2. Implement upgrade logic.
3. Implement channel/version selection.
4. Add rollback.
5. Add tests.
6. Build and verify.

---

## Completion Notes

Pending.
