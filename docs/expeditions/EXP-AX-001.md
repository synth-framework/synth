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

An AI agent installs SYNTH without cloning the repository.

Specifically:

- `npm install -g @synth-framework/synth` produces a working `synth` binary.
- `npx @synth-framework/synth --version` works in a fresh directory.
- Installation completes in under five minutes on a standard connection.
- Documentation no longer presents `git clone` as the first installation step.

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

- [ ] Package is published to npm.
- [ ] Global installation produces a working `synth` binary.
- [ ] `npx @synth-framework/synth` works without prior installation.
- [ ] Installation verification command is implemented.
- [ ] README and operator guides no longer lead with `git clone`.
- [ ] Installation smoke tests pass in CI.
- [ ] Expedition is accepted.

---

## Implementation Plan

1. Audit `package.json` name, version, `bin`, `files`, and build outputs.
2. Publish `@synth-framework/synth` to npm.
3. Add `synth doctor` installation verification command to `src/cli/synth.ts`.
4. Update README installation section.
5. Update `docs/guides/operator/01-getting-started.md`.
6. Update agent prompts to use `npx` or global install.
7. Add installation smoke tests to CI or test suite.
8. Build and verify.

---

## Completion Notes

Pending.
