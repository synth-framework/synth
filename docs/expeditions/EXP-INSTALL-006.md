# EXP-INSTALL-006 — Website Integration

**Status:** Active  
**Kind:** Installation Expedition  
**Priority:** High  
**Program:** EXP-PROGRAM-006 — Installation & Distribution  
**Depends On:** EXP-INSTALL-001  
**Blocks:** EXP-INSTALL-009

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

Publish the installer automatically through the website deployment pipeline.

---

## Motivation

The canonical install command references `https://synth.dev/install.sh`. Until a custom domain is acquired, the installer should be served from GitHub Pages and the URL should be configurable without rebuilding the installer or the website.

---

## Deliverables

1. **Installer placement**
   - `install.sh` is copied into the website build directory.

2. **GitHub Actions integration**
   - Publish workflow copies `install.sh` to `website/install.sh` before upload.

3. **Domain abstraction**
   - The installer and website read the public base URL from a GitHub repository variable (e.g., `SYNTH_INSTALLER_BASE_URL`) so the domain can be updated without code changes.

4. **Deployment verification**
   - CI verifies that `install.sh` is reachable after deployment.

Pipeline:

```text
Repository
        ↓
GitHub Actions
        ↓
Website Build
        ↓
install.sh
        ↓
GitHub Pages
        ↓
https://synth.dev/install.sh  (via repository variable)
```

---

## Acceptance

Merging to `main` publishes the latest installer automatically.

Specifically:

- `install.sh` is included in the GitHub Pages artifact.
- The installer URL is controlled by a repository variable.
- A post-deploy check confirms the installer is reachable.

---

## Phases

### Phase 1 — Copy installer into website build

Update publish workflow to place `install.sh` in `website/`.

### Phase 2 — Repository variable for base URL

Add `SYNTH_INSTALLER_BASE_URL` usage to installer and website.

### Phase 3 — Post-deploy check

Add a CI step that fetches the published installer.

---

## Risks

| Risk | Mitigation |
|---|---|
| Domain changes break old install commands | Use repository variable; keep old URL redirect if possible |
| GitHub Pages path changes | Test the published URL in CI |

---

## Definition of Done

- [ ] `install.sh` is copied to the website output during publish.
- [ ] Publish workflow includes the installer artifact.
- [ ] Base URL is configurable via GitHub repository variable.
- [ ] Post-deploy reachability check passes.
- [ ] Documentation references the correct URL.
- [ ] `npm run govern` passes.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Update `.github/workflows/publish.yml` to copy `install.sh`.
2. Add repository variable usage.
3. Add post-deploy verification.
4. Update documentation.
5. Build and verify.

---

## Completion Notes

Pending.
