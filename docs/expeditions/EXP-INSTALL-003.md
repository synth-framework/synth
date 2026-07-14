# EXP-INSTALL-003 — Distribution Resolution

**Status:** Active  
**Kind:** Installation Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-001  
**Blocks:** EXP-INSTALL-004, EXP-INSTALL-007, EXP-INSTALL-008

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

Determine which distribution backend should be used for the installation.

---

## Motivation

The installer must remain backend-agnostic. For Era II the backend is npm, but the resolver should be able to target Homebrew, binary releases, or other package managers in the future without changing the public install command.

---

## Deliverables

1. **Distribution resolver**
   - Maps environment + channel to a backend.

2. **Channel resolution**
   - `latest`, `stable`, `beta`, `nightly`.
   - Unknown channels fail cleanly.

3. **Version selection**
   - Exact semver or latest in channel.

4. **Backend abstraction**
   - Common interface for npm, binary, Homebrew, etc.

For Era II the resolution chain is:

```text
latest
  ↓
npm
  ↓
@synth-framework/synth
```

---

## Acceptance

The resolver produces a Distribution Profile that the Installation Engine can execute without knowing the backend internals.

Specifically:

- Default channel is `latest`.
- Channel and version inputs are validated.
- Distribution Profile includes backend type, package identifier, and target version.

---

## Phases

### Phase 1 — Backend abstraction

Define the Distribution Profile schema.

### Phase 2 — npm backend

Implement npm resolution for Era II.

### Phase 3 — Channel and version handling

Support channel aliases and exact versions.

---

## Risks

| Risk | Mitigation |
|---|---|
| Backend abstraction is over-engineered | Keep it a simple function dispatch |
| Channel metadata drifts | Source channels from the version manifest |

---

## Definition of Done

- [ ] Distribution Profile schema defined.
- [ ] npm backend resolver implemented.
- [ ] Channel resolution implemented.
- [ ] Version selection implemented.
- [ ] Unknown channels/versions fail cleanly.
- [ ] Tests cover resolution paths.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Define Distribution Profile schema.
2. Implement npm resolver.
3. Add channel and version logic.
4. Add tests.
5. Document resolver behavior.
6. Build and verify.

---

## Completion Notes

Pending.
