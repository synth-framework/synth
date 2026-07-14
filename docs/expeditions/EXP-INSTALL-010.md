# EXP-INSTALL-010 — Documentation & Onboarding

**Status:** Active  
**Kind:** Installation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-004, EXP-INSTALL-005  
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

Deliver installation documentation synchronized with the installer implementation.

---

## Motivation

The installation experience is only as good as its documentation. README, Quick Start, and operator guides must reference the same install command, verification step, and troubleshooting path.

---

## Deliverables

1. **Installation Guide**
   - One-line install command.
   - Manual install options.
   - Platform requirements.

2. **Quick Start**
   - Install → `synth doctor` → `synth init`.

3. **Troubleshooting**
   - Common install failures and remediation.

4. **CI examples**
   - How to install SYNTH in GitHub Actions.

5. **First-run documentation**
   - What to do after installation.

Primary onboarding flow:

```bash
curl -fsSL https://synth.dev/install.sh | sh

synth doctor

synth init
```

---

## Acceptance

Documentation matches the installed behavior and is verified by the documentation governance pipeline.

Specifically:

- README install section references the canonical installer.
- `docs/getting-started/README.md` reflects the install flow.
- `AGENTS.md` references the installer for AI operators.
- Documentation projection tests pass.

---

## Phases

### Phase 1 — Update README

Replace npm-only install instructions with the bootstrap installer.

### Phase 2 — Update operator docs

Update Quick Start and Getting Started.

### Phase 3 — Add troubleshooting

Document common failures.

### Phase 4 — Add CI examples

Provide GitHub Actions snippets.

---

## Risks

| Risk | Mitigation |
|---|---|
| Documentation drifts from installer | Enforce via website sync checks |
| Platform-specific instructions become outdated | Keep examples minimal |

---

## Definition of Done

- [ ] README references the canonical installer.
- [ ] `docs/getting-started/README.md` reflects the install flow.
- [ ] `AGENTS.md` references the installer.
- [ ] Troubleshooting guide added.
- [ ] CI examples added.
- [ ] Documentation projection tests pass.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Update README install section.
2. Update operator docs.
3. Add troubleshooting.
4. Add CI examples.
5. Run documentation integrity tests.
6. Build and verify.

---

## Completion Notes

Pending.
