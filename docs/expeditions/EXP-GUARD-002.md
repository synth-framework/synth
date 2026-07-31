# EXP-GUARD-002 — Stop Tracking Generated Documentation in Version Control

> Eliminate the merge-conflict treadmill caused by `docs/generated/*.md` being both derived and tracked.

**Status:** Proposed  
**Kind:** Governance Expedition  
**Priority:** Critical  
**Program:** EXP-PROGRAM-043 — Agent Onboarding & Operator Experience  
**Authority:** Synth Architectural Constitution, ADR-051-derived-state-protection-and-expedition-scope.md, TaskPRO migration retrospective  
**Depends On:** EXP-GUARD-001  
**Blocks:** None

---

```yaml
Impact:
  Constitutional: No
  Product: Yes
  User Facing: Yes
  Architecture Freeze: Safe
  Requires ADR: Yes
```

---

## Purpose

`docs/generated/*.md` is derived state, yet it is currently tracked in Git and required to stay byte-for-byte identical with a fresh `npm run docs:generate`. Because every projection aggregates the whole knowledge base and embeds a `computedAt` timestamp plus a `sourceStateHash`, almost any source or documentation change rewrites all seven generated files. When multiple PRs each regenerate docs, they conflict with each other and with `main` the moment any one of them merges. This produces a rebase/merge treadmill that has no user value and directly contradicts the derived-state protection introduced in EXP-GUARD-001.

## Findings Addressed

| ID | Finding | Severity | Status |
|---|---|---|---|
| G4 | Generated docs are derived state but tracked in Git | Critical | Proposed |
| G5 | Every docs regeneration creates merge conflicts on unrelated PRs | High | Proposed |
| G6 | `docs:verify-freshness` treats committed blobs as canonical | High | Proposed |

## Deliverables

### 1. Remove generated docs from version control

- Add `docs/generated/*.md` to `.gitignore`.
- Remove the existing generated files from the Git index (keep them locally so `synth docs generate` still has an output target).
- Update `docs/generated/.gitkeep` or equivalent so the directory still exists in a fresh clone.

### 2. Change the freshness check from "committed vs regenerated" to "regenerated vs deterministic"

- Update `scripts/verify-documentation-freshness.js` to:
  1. Run `npm run docs:generate` to a temporary directory.
  2. Run it a second time to a second temporary directory.
  3. Assert the two runs are byte-for-byte identical (determinism).
  4. Assert all seven required projections exist and are non-empty.
- The check must no longer compare against files committed in `docs/generated/`.

### 3. CI-generated documentation

- Add a CI job that runs `npm run docs:generate` on every push to `main` and on every PR.
- Publish the generated projections as build artifacts.
- Optionally commit the generated projections to a `docs-generated` branch or publish them to the website branch so rendered docs remain available without polluting source history.

### 4. Operator guidance

- Update `docs/AGENTS.md` and `docs/operator/01-getting-started.md` to state that `docs/generated/*.md` are CI artifacts and must not be committed.
- Update `synth docs generate` help text if necessary to clarify the output is local-only.

## Acceptance Criteria

1. `docs/generated/*.md` is not tracked by Git.
2. `npm run test:documentation-projections` passes without any committed generated docs.
3. `npm run docs:generate` still produces all seven projections locally.
4. The freshness verifier catches stale or non-deterministic generation.
5. Two unrelated PRs that both touch documentation no longer conflict solely because of regenerated blobs.
6. `npm run build` succeeds and targeted tests pass.

## Out of Scope

- Changing the content or format of the projections themselves.
- Moving non-generated documentation (source ADRs, expedition files, operator guides) out of Git.
- Website hosting infrastructure beyond making generated artifacts available.

## Governance

### Protected

- ExecutionGate as sole mutation authority.
- Event model.
- Derived-state catalog in `src/governance/derived-files.ts`.

### Not included

- New constitutional rules.

## Related Documents

- `docs/expeditions/EXP-PROGRAM-043.md`
- `docs/expeditions/EXP-GUARD-001.md`
- `docs/adr/ADR-051-derived-state-protection-and-expedition-scope.md`
