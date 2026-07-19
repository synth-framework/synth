> Part of **EXP-REPO-001 — Repository Governance Model**.

# Forge Adapter Contract

This document defines the common interface that every hosting platform (forge) must implement to interoperate with SYNTH repository governance.

---

## Interface

```ts
interface ForgeAdapter {
  openPullRequest(request: PullRequestRequest): Promise<PullRequest>
  updatePullRequest(id: string, request: Partial<PullRequestRequest>): Promise<PullRequest>
  closePullRequest(id: string): Promise<void>
  mergePullRequest(id: string, strategy: MergeStrategy): Promise<MergeResult>
  createRelease(request: ReleaseRequest): Promise<Release>
  listChecks(id: string): Promise<Check[]>
  addComment(id: string, body: string): Promise<Comment>
  listReviews(id: string): Promise<Review[]>
}
```

## Types

### PullRequestRequest

```ts
{
  title: string
  body: string
  headBranch: string
  baseBranch: string
  draft?: boolean
  missionId?: string
  expeditionId?: string
}
```

### PullRequest

```ts
{
  id: string
  url: string
  number: number
  state: "open" | "closed" | "merged"
  headBranch: string
  baseBranch: string
}
```

### MergeStrategy

```ts
"merge" | "squash" | "rebase"
```

### ReleaseRequest

```ts
{
  tag: string
  name: string
  body: string
  targetCommit: string
  prerelease?: boolean
}
```

## Implementations

- GitHub
- GitLab
- Bitbucket
- Azure DevOps
- Forgejo

## Compliance

A forge adapter is compliant when:

1. It implements all interface methods.
2. It does not mutate repository state outside SYNTH governance.
3. It returns stable identifiers for created artifacts.
4. It respects ADR-037 for all emitted shell commands.
