# EXP-AX-005 — Public Release Polish

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-AX-003, EXP-AX-004  
**Blocks:** EXP-PROGRAM-004 completion

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

Prepare the repository for external users.

---

## Motivation

Before launching external outreach, the repository must immediately communicate what SYNTH is, how to install it, how to use it, where to learn more, and how to contribute.

---

## Deliverables

1. **Badges**
   - npm version badge.
   - GitHub Actions CI badge.
   - Documentation badge.
   - License badge.

2. **Installation status**
   - Clear install command.
   - Verified install instructions for npm, npx, and shell installer.

3. **Quick-start media**
   - Quick-start GIF or 90-second demo recording.
   - Example gallery.

4. **Contributor onboarding**
   - First-time contributor checklist.
   - Links to `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SECURITY.md`.

5. **External readiness checklist**
   - Issue templates configured.
   - Pull request template configured.
   - GitHub Community Standards satisfied.

---

## Acceptance

The repository immediately communicates:

- what SYNTH is,
- how to install it,
- how to use it,
- where to learn more,
- and how to contribute.

Specifically:

- README contains badges and install command above the fold.
- A demo or example gallery is one click away.
- Contribution guidelines are discoverable.
- GitHub Community Standards show no missing items.

---

## Phases

### Phase 1 — Badge setup

Add npm, CI, docs, and license badges to README.

### Phase 2 — Demo media

Create GIF or video of the 60-second demo.

### Phase 3 — Example gallery

Link to certified examples with expected results.

### Phase 4 — Contributor polish

Review issue templates, PR template, and community files.

### Phase 5 — Community standards audit

Run GitHub's community standards check and close gaps.

---

## Risks

| Risk | Mitigation |
|---|---|
| Badges break after rename | Test badge URLs |
| Demo becomes stale | Regenerate on every release |
| Example repositories drift | Pin examples to released versions |

---

## Definition of Done

- [ ] Badges are present and functional.
- [ ] Install command is visible above the fold.
- [ ] Quick-start GIF or demo is published.
- [ ] Example gallery is linked from README.
- [ ] Contributor guidelines are discoverable.
- [ ] GitHub Community Standards are satisfied.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Add badges to `README.md`.
2. Create quick-start GIF or video.
3. Add example gallery section to README and website.
4. Verify `.github/ISSUE_TEMPLATE/` and `pull_request_template.md`.
5. Run repository community standards audit.
6. Build and verify.

---

## Completion Notes

Pending.
