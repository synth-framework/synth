# Repository Vendor Capability Matrix

> Part of **ECOSYSTEM-001 — Branch-gated execution**.
> Committed evidence for a follow-up adapter-build mission.

SYNTH reads the project's VCS/forge transparently via the repository adapter and
degrades enforcement rather than fabricating requirements. This matrix records
the discovered capabilities per vendor so future adapter work is planned against
real capability, never assumed ones (ADR-016).

## Legend

| Term | Meaning |
|---|---|
| Branch concept | The vendor exposes named branches that can be checked out and compared. |
| PR/merge request | The vendor exposes reviewable merge-request objects (pull requests / MRs). |
| Release tag | The vendor exposes semantically versioned release artifacts. |
| Capability tier | `full` = native support; `candidate` = partial/projectable; `observe` = degrade-to-observation, no enforcement; `none` = not supported. |

## Branch concept vs VCS

| Vendor | Branch concept | Branch taxonomy support | Character set notes | Enforcement tier |
|---|---|---|---|---|
| Git | Yes | `feature/`, `mission/`, `expedition/`, `chore/` are valid branch names | ASCII-safe; slash-supported | `full` (reference impl `src/adapters/repository/git.ts`) |
| Mercurial | Yes (named branches) | Projectable but branch naming/advance semantics differ | ASCII-safe | `candidate` |
| SVN | No (trunk/branches/tags dirs) | Branching is directory-based, not first-class | Slash is a path separator, not a name char | `observe` |
| Pijul | Yes (patch-based) | Branch semantics differ from checkout/commit VCS | ASCII-safe | `observe` |
| Darcs | Yes (patch-based) | No canonical checked-out branch identity | ASCII-safe | `observe` |
| Bazaar | Yes (legacy) | Projectable but effectively unmaintained | ASCII-sensitive | `observe` |
| No VCS (bare directory) | No | None | N/A | `observe` |

## Forge capabilities (for later PR/release automation)

The reference implementation is a local git repo. The following forges are
candidates for the follow-up adapter-build mission (EXP-REPO-001 forge adapter
contract in `docs/reference/forge-adapter-contract.md`).

| Forge | PR/MR | Checks | Reviews | Releases | Auth model | Tier |
|---|---|---|---|---|---|---|
| GitHub | PR | Commit status + check runs | Reviews | Releases | PAT / App | `full` |
| GitLab | MR | Pipelines | Approvals | Releases | PAT | `full` |
| Bitbucket | PR | Pipelines | Approvals | Releases | PAT | `candidate` |
| Gitea / Forgejo | PR | Status | Reviews | Releases | PAT | `candidate` |
| Codeberg | PR (Gitea) | Status | Reviews | Releases | PAT | `candidate` |
| Azure DevOps | PR | Pipelines | Approvals | Releases | PAT | `candidate` |
| SourceHut | MR (patch) | Builds | Comments | None (tags only) | OAuth/PAT | `candidate` |

## Enforcement mapping

`ExecutionGate` `EXECUTION_BRANCH_CHECK` consults
`RepositoryAdapter.validateExecutionBranch(role, context)`:

- `mission` → canonical `mission/<missionId>`
- `expedition` → canonical `expedition/<missionId>/<expeditionId>`
- `chore` → permitted on `main` only when `allowChoreOnMain` is enabled AND the
  capability is allowlisted in `choreCapabilities`
- strategy `trunk` → `main` is always canonical for governed work
- mode `off` / `observed` → never blocks

A vendor with no branch concept degrades to `observed` and records the reason
explicitly; it never silently masks a violation (`mode off` is the only
non-blocking default).

## Follow-up adapter-build mission scope

1. Mercurial repository adapter (branch concept → `candidate`).
2. GitHub + GitLab forge adapters (full PR/release automation) consuming the
   forge adapter contract.
3. Pijul/Darcs/SVN degrades-to-observation verification harness.
4. CI integration spec for auto-PR/merge on branch completion (documented as
   follow-up; not implemented in ECOSYSTEM-001).