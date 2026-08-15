# Build, Version & Release Conventions

**Scope:** How this repository standardizes CLI invocation, builds, version
bumps, and releases. These conventions unify the repo-local dev shim, the
governance cadence, `synth release`, and the tag-triggered publish workflow so
there is exactly one path for each concern.

**Status:** Active as of the "Standardize local bin usage, build-version, and
release conventions" expedition.

---

## 1. Always use the repo-local CLI (`scripts/synth`)

Contributors and repo automation must invoke this repository's build of the
CLI, never a globally installed `@synth-framework/synth`. Use the repo-local
shim:

```bash
scripts/synth <command> [options]     # e.g. scripts/synth status
```

- `scripts/synth` execs `node dist/cli/synth.js` from the repo root, so the CLI
  always matches the working tree.
- It auto-builds when `dist/cli/synth.js` is missing. Set
  `SYNTH_SHIM_NO_BUILD=1` to skip that check (e.g. in CI that already ran
  `npm run build`).
- The shim is **repo-only**: `scripts/` is excluded from the published npm
  `files`, so release installs still resolve the packaged `synth` bin
  (`dist/cli/synth.js`) via `npm install -g @synth-framework/synth`.

Do not add a global `synth` install to development instructions. The published
global bin exists only for end users who install the package.

---

## 2. Build cadence

- **Every branch that touches code produces a build.** Run `npm run build`
  (equivalently `tsc` + framework-task copy + dist manifest) before validating
  or opening a PR. The repo-local shim enforces this by auto-building on demand.
- CI builds on pull requests to `main` and on pushes to `main`
  (`proof.yml`, `docs.yml`, `publish.yml`) and on release tags (`release.yml`).
- We do **not** build on arbitrary branch pushes; PR CI is the shared gate.

---

## 3. Governance cadence (pre-PR, operator-run)

- Governance is validated **before opening a PR**, run by the operator via
  `npm run govern` (the full canonical pipeline: build, test, replay,
  adversarial audits, proof artifact).
- We do **not** run `npm run govern` on every commit — it is too expensive for a
  per-commit hook. Local iteration uses `synth validate` for fast, adaptive
  feedback; the full pipeline is the merge gate.
- CI re-runs governance on the PR so the merge gate is independent of the
  operator's local run.

---

## 4. One version bump per release, at mission close

The **single writer** of the version is `synth release`. There is no per-commit
or per-PR version bump.

- **When:** at mission close (the natural release boundary), or as a standalone
  manual trigger whenever a release is warranted.
- **What it does:** reads the current `package.json` version and the latest
  `vX.Y.Z` tag, analyses conventional commits since that tag, proposes a semver
  bump, and — on `--approve` — updates `package.json`, prepends `CHANGELOG.md`,
  commits `chore(release): vX.Y.Z`, and creates the annotated tag.

```bash
synth release --dry-run          # preview the computed bump and changelog
synth release --approve          # write version + CHANGELOG and create the tag
synth release --bump minor       # override the inferred bump level
```

`synth mission complete` surfaces `synth release` as its next step. The bump is
advisory there — completing a mission never bumps the version automatically.

Because the bump analyses **all commits since the last tag**, running it once
per release (not once per commit or PR) yields the correct semver and a clean
changelog, and avoids `package.json`/`CHANGELOG.md` conflicts between concurrent
PRs.

---

## 5. Publish is triggered only by pushing a tag

`synth release --approve` creates the `vX.Y.Z` tag but never publishes. Pushing
the tag is the **only** trigger for npm publish:

```bash
git push origin vX.Y.Z
```

The `release.yml` workflow (on `v*.*.*`) then runs: build → govern →
`npm publish` → cross-OS install certification → GitHub release with the proof
artifact attached.

This keeps three mechanisms cleanly separated by responsibility:

| Concern            | Owner                         |
|--------------------|-------------------------------|
| Version bump       | `synth release` (at mission close / manual) |
| Governance gate    | `npm run govern` (pre-PR + CI) |
| Publish            | `release.yml` (tag push only) |

---

## Quick reference

```bash
scripts/synth <cmd>          # always use the repo-local CLI
npm run build                # build on any code-touching branch
synth validate               # fast local feedback
npm run govern               # full pipeline, before opening a PR
synth release --dry-run      # preview the single release bump at mission close
synth release --approve      # write version + CHANGELOG + tag
git push origin vX.Y.Z       # the only npm publish trigger
```
