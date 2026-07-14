# EXP-INSTALL-011 — Website Deployment Verification

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-006  
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

Verify that the website deployment pipeline publishes the installer and that the install script is reachable through the configured endpoint.

---

## Motivation

Publishing the installer is not enough. The deployment must be traceable, the installer URL must resolve, and the URL must match the `SYNTH_INSTALLER_BASE_URL` repository variable. This expedition closes the loop between CI, GitHub Pages, and the public install command.

---

## Deliverables

1. **Deployment traceability**
   - CI records the GitHub Pages deployment URL.
   - The published `install.sh` URL is deterministic from the repository variable.

2. **Installer availability check**
   - A post-deploy CI step fetches `install.sh` from the deployed website.
   - The script returns HTTP 200 and non-empty content.

3. **Repository variable verification**
   - The check uses `SYNTH_INSTALLER_BASE_URL` from GitHub repository variables.
   - The fetched URL matches the configured base URL.

4. **Optional UI/UX refinements**
   - If the website landing page needs updates to surface the install command, those changes are tracked here.
   - UI/UX work is optional and only undertaken if the current page does not clearly present the installer.

---

## Acceptance

After every merge to `main`, the published website serves `install.sh` at the URL defined by `SYNTH_INSTALLER_BASE_URL`, and CI confirms it.

Specifically:

- The publish workflow outputs the deployed Pages URL.
- A verification step fetches `${SYNTH_INSTALLER_BASE_URL}/install.sh`.
- The response status is 200 and the body contains the installer shebang.
- The verification step fails the build if the installer is unavailable.

---

## Phases

### Phase 1 — Deployment traceability

Add workflow output for the GitHub Pages URL and ensure `install.sh` is included in the artifact.

### Phase 2 — Availability check

Add a CI step that fetches the installer from the configured base URL.

### Phase 3 — Repository variable verification

Confirm the fetched URL matches `SYNTH_INSTALLER_BASE_URL`.

### Phase 4 — Optional UI/UX review

Evaluate whether `website/index.html` clearly presents the install command. Implement refinements only if needed.

---

## Risks

| Risk | Mitigation |
|---|---|
| GitHub Pages deployment is delayed | Poll with retry and timeout |
| Repository variable is unset | Fail fast with a clear error |
| UI/UX scope creeps | Keep refinements optional and minimal |

---

## Definition of Done

- [ ] Website deployment URL is traceable in CI.
- [ ] `install.sh` is available at `${SYNTH_INSTALLER_BASE_URL}/install.sh`.
- [ ] CI verifies installer availability after every deployment.
- [ ] Verification uses the `SYNTH_INSTALLER_BASE_URL` repository variable.
- [ ] Optional UI/UX refinements are evaluated and either implemented or explicitly deferred.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Confirm publish workflow uploads `install.sh`.
2. Add a verification job or step to the publish workflow.
3. Read `SYNTH_INSTALLER_BASE_URL` from repository variables.
4. Fetch and validate the installer.
5. Review website UI/UX and decide on refinements.
6. Build and verify.

---

## Completion Notes

Pending.
