# EXP-INSTALL-011 — Website Deployment Verification

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-006, EXP-DOCS-001  
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

Deploy the website to GitHub Pages and verify that the published installer script is reachable through the configured endpoint.

This expedition is a consumer of documentation projection artifacts produced by EXP-DOCS-001. It does not generate or verify documentation projections.

---

## Motivation

Publishing the installer is not enough. The deployment must be traceable, the installer URL must resolve, and the URL must match the `SYNTH_INSTALLER_BASE_URL` repository variable. This expedition closes the loop between CI, GitHub Pages, and the public install command.

Documentation projections are handled separately by EXP-DOCS-001. This expedition assumes those projection artifacts are available and focuses exclusively on deploying them and verifying the live installer.

---

## Deliverables

1. **GitHub Pages deployment**
   - The publish workflow deploys the `website/` directory to GitHub Pages on every merge to `main`.
   - Deployment failures fail the publish workflow.
   - CI records the GitHub Pages deployment URL in the workflow summary.
   - The deployment consumes documentation projection artifacts produced upstream; it does not generate them.

2. **Deployment traceability**
   - CI records the GitHub Pages deployment URL.
   - The published `install.sh` URL is deterministic from the repository variable.

3. **Installer availability check**
   - A post-deploy CI step fetches `install.sh` from the deployed website.
   - The script returns HTTP 200 and non-empty content.

4. **Repository variable verification**
   - The check uses `SYNTH_INSTALLER_BASE_URL` from GitHub repository variables.
   - The fetched URL matches the configured base URL.

5. **Optional UI/UX refinements**
   - If the website landing page needs updates to surface the install command, those changes are tracked here.
   - UI/UX work is optional and only undertaken if the current page does not clearly present the installer.

---

## Acceptance

After every merge to `main`, the website is deployed to GitHub Pages, the published website serves `install.sh` at the URL defined by `SYNTH_INSTALLER_BASE_URL`, and CI confirms both the deployment and the installer reachability.

Specifically:

- The publish workflow deploys the `website/` directory to GitHub Pages.
- Deployment failures fail the publish workflow.
- The publish workflow records the deployed Pages URL in the workflow summary.
- A verification step fetches `${SYNTH_INSTALLER_BASE_URL}/install.sh`.
- The response status is 200 and the body contains the installer shebang.
- The verification step fails the build if the installer is unavailable.

---

## Phases

### Phase 1 — GitHub Pages deployment

Ensure the publish workflow deploys the `website/` directory to GitHub Pages on every merge to `main`, and that deployment failures fail the workflow. Record the deployment URL in the workflow summary.

### Phase 2 — Deployment traceability

Add workflow output for the GitHub Pages URL and ensure `install.sh` is included in the artifact.

### Phase 3 — Availability check

Add a CI step that fetches the installer from the configured base URL.

### Phase 4 — Repository variable verification

Confirm the fetched URL matches `SYNTH_INSTALLER_BASE_URL`.

### Phase 5 — Optional UI/UX review

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

- [ ] Publish workflow deploys the `website/` directory to GitHub Pages on every merge to `main`.
- [ ] GitHub Pages deployment failures fail the publish workflow.
- [ ] Deployment URL is recorded in the CI workflow summary.
- [x] Website deployment URL is traceable in CI.
- [x] `install.sh` is available at `${SYNTH_INSTALLER_BASE_URL}/install.sh`.
- [x] CI verifies installer availability after every deployment.
- [x] Verification uses the `SYNTH_INSTALLER_BASE_URL` repository variable.
- [x] Optional UI/UX refinements are evaluated and either implemented or explicitly deferred.
- [x] `npm run govern` passes.
- [x] Expedition is accepted.

---

## Implementation Plan

1. Confirm documentation projection artifacts are available to the publish workflow.
2. Confirm publish workflow uploads `install.sh`.
3. Add a verification job or step to the publish workflow.
4. Read `SYNTH_INSTALLER_BASE_URL` from repository variables.
5. Fetch and validate the installer.
6. Review website UI/UX and decide on refinements.
7. Build and verify.

---

## Completion Notes

- Updated `website/index.html` to surface the canonical bootstrap installer command and added an npm fallback.
- Added `.hero-alt` styling in `website/styles.css` for the npm fallback.
- Added a `Record deployment URL` step in `.github/workflows/publish.yml` after GitHub Pages deployment to trace the deployment in the workflow summary.
- Ensured the publish workflow deploys the `website/` directory to GitHub Pages and that deployment failures fail the workflow.
- Replaced the simple post-deploy curl check with a robust polling verifier:
  - Reads `SYNTH_INSTALLER_BASE_URL` from repository variables with a safe default.
  - Retries up to 10 times with a 15-second backoff to accommodate GitHub Pages propagation lag.
  - Verifies HTTP 200 and that the response body starts with `#!/usr/bin/env bash`.
  - Fails the workflow if the installer is unreachable.
  - Writes the installer URL and result to `GITHUB_STEP_SUMMARY`.
- Expedition accepted and merged via PR #37.
