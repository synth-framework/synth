# EXP-AX-001 — Universal Distribution

**Status:** Active  
**Kind:** Adoption Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-004 — First Contact Program  
**Depends On:** EXP-PROGRAM-004  
**Blocks:** EXP-AX-002, EXP-AX-003, EXP-AX-005

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

Remove repository cloning as the canonical installation method.

---

## Motivation

The README currently presents:

```bash
git clone <repository-url>
cd synth-v2
npm install
```

That is appropriate for contributors, not users. The canonical experience should become:

```bash
npm install -g @synth-framework/synth
```

or

```bash
npx @synth-framework/synth
```

with an optional convenience installer:

```bash
curl -fsSL https://install.synth.dev | sh
```

---

## Deliverables

1. **npm package**
   - Publish `@synth-framework/synth` to the npm registry.
   - Ensure `package.json` name, version, `bin` entries, and `files` whitelist are correct.

2. **Global installation validation**
   - Verify `npm install -g @synth-framework/synth` installs the CLI.
   - Verify `synth --version` works after global install.

3. **npx validation**
   - Verify `npx @synth-framework/synth --version` works without prior installation.

4. **Installation verification command**
   - `synth doctor` or equivalent command that reports installation health.

5. **Updated documentation**
   - README installation section.
   - Operator getting-started guide.
   - Agent onboarding prompts.

6. **Installation smoke tests**
   - Test that the published package can be installed and invoked in a clean environment.

---

## Acceptance

An AI agent installs SYNTH without cloning the repository and verifies it end-to-end.

Specifically:

- `npm install -g @synth-framework/synth` produces a working `synth` binary.
- `npx @synth-framework/synth --version` works in a fresh directory.
- `synth doctor` reports a healthy installation.
- The following agentic smoke test completes successfully:

  ```bash
  npm install -g @synth-framework/synth
  synth --version
  synth doctor
  mkdir demo && cd demo
  synth init --name "Demo Project"
  synth validate --dry-run
  synth mission create --subject "Demo" --purpose "Verify distribution"
  ```

- Installation completes in under five minutes on a standard connection.
- Documentation no longer presents `git clone` as the first installation step.

### Installation Matrix

| Platform       | `npm -g` | `npx` | Smoke Test |
| -------------- | -------- | ----- | ---------- |
| macOS          | ⏳        | ⏳     | ⏳          |
| Ubuntu         | ⏳        | ⏳     | ⏳          |
| Windows        | ⏳        | ⏳     | ⏳          |
| GitHub Actions | ⏳        | ⏳     | ⏳          |

---

## Phases

### Phase 1 — Package readiness

Audit `package.json`, `files`, `bin`, and build outputs.

### Phase 2 — Registry publication

Publish to npm and verify registry metadata.

### Phase 3 — Global install smoke test

Install globally in a clean environment and exercise core commands.

### Phase 4 — npx smoke test

Run `npx` without prior install.

### Phase 5 — Documentation update

Replace `git clone` installation path in README and guides.

---

## Risks

| Risk | Mitigation |
|---|---|
| Package name unavailable | Have an approved fallback name |
| Global install conflicts | Test uninstall/reinstall |
| npx caching masks failures | Test with `--no-install` and fresh cache |

---

## Definition of Done

- [x] GitHub Actions release workflow is configured to publish to npm on tag push.
- [ ] Package is published to npm (pending first semantic-versioned tag push).
- [ ] Global installation produces a working `synth` binary.
- [ ] `npx @synth-framework/synth` works without prior installation.
- [x] Installation verification command is implemented.
- [x] README and operator guides no longer lead with `git clone`.
- [ ] Installation and Quick Start docs reference `synth validate` for local iteration.
- [x] Local installation smoke tests pass (`synth doctor`, `synth init`).
- [ ] Published-package smoke test passes in a clean environment.
- [ ] Installation matrix is populated for all claimed platforms.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit `package.json` name, version, `bin`, `files`, and build outputs. ✅
2. Prepare `@synth-framework/synth` for npm publication. ✅
3. Add `synth doctor` installation verification command to `src/cli/synth.ts`. ✅
4. Update README installation section. ✅
5. Update `docs/getting-started/README.md`. ✅
6. Update agent prompts to use `npx` or global install. ✅ (already current in `AGENTS.md`)
7. Add installation smoke tests to CI or test suite. ✅
8. Build and verify via `npm run govern`. ✅
9. Configure the GitHub Actions release workflow to publish to npm on tag push. ✅
10. Push a semantic-versioned tag to trigger the first npm publish. ⏳

---

## Completion Notes

Package readiness work completed. The repository is configured for publication as `@synth-framework/synth`:

- `package.json` name updated to `@synth-framework/synth`.
- `bin` entry reduced to `synth` only; `synth-v2` alias removed.
- `files` whitelist tightened to `dist/` and root metadata.
- `publishConfig.access` set to `public`.
- `synth doctor` implemented to verify Node version, binary path, package version, and project manifest.
- `synth validate` provides adaptive local validation.
- README and Quick Start guide now lead with `npm install -g @synth-framework/synth` / `npx @synth-framework/synth`.
- CLI smoke tests include `synth doctor` and `synth validate --dry-run`.
- `.github/workflows/release.yml` is configured to publish to npm when a semantic-versioned tag is pushed, using the `NPM_TOKEN` secret.

The first npm publish will happen automatically on the next tag push. After that, the published-package smoke test and installation matrix can be populated.

**Alignment note:** The Quick Start guide (`docs/getting-started/README.md`) still describes `npm run govern` without first showing the Mission lifecycle or `synth validate`. That alignment is tracked under EXP-AX-003.
