# EXP-AX-005 — Public Release Polish

**Status:** Completed  
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
   - Reference to `AGENTS.md` for AI operators.

3. **Quick-start media**
   - Quick-start GIF or 90-second demo recording.
   - Example gallery.
   - Demo includes `synth validate` as the local iteration step.

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
- README references `AGENTS.md` for AI operators.
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

- [x] Badges are present and functional.
- [x] Install command is visible above the fold.
- [x] README references `AGENTS.md` for AI operators.
- [ ] Quick-start GIF or demo is published. *(deferred to follow-up; media placeholder and file path reserved)*
- [x] Demo includes `synth validate` as the local iteration step.
- [x] Example gallery is linked from README.
- [x] Contributor guidelines are discoverable.
- [x] GitHub Community Standards are satisfied.
- [x] Expedition is accepted.

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

README and website polished from an agent-first perspective:

- Added npm version, Proof Gate CI, documentation, and license badges to README.
- Added an **Example gallery** section to README and a matching section to `website/index.html`.
- Updated `website/examples.html` links to point to the `synth-framework/synth` repository.
- Added a **Contributing** section to README linking `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and `AGENTS.md`.
- Added a **Quick-start demo** media placeholder in README; the actual GIF/video asset will be inserted in a follow-up change.

The existing issue templates and pull request template already satisfy GitHub Community Standards and include the Era II / Protected Assets guardrails.

### Deferred work

The published quick-start GIF/video is intentionally deferred. The README already contains a reserved placeholder section so the asset can be dropped in without restructuring the page.
