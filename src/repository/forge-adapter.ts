// ============================================================
// REPOSITORY: Forge Adapter Contract
// ============================================================
// Abstract interface for hosting platforms (forges). Concrete
// adapters implement this contract for GitHub, GitLab, Bitbucket,
// Azure DevOps, Forgejo, etc.
//
// All emitted shell commands follow ADR-037.
// ============================================================

export type MergeStrategy = "merge" | "squash" | "rebase"

export type PullRequestRequest = {
  title: string
  body: string
  headBranch: string
  baseBranch: string
  draft?: boolean
  missionId?: string
  expeditionId?: string
}

export type PullRequest = {
  id: string
  url: string
  number: number
  state: "open" | "closed" | "merged"
  headBranch: string
  baseBranch: string
}

export type MergeResult = {
  success: boolean
  commit?: string
  error?: string
}

export type ReleaseRequest = {
  tag: string
  name: string
  body: string
  targetCommit: string
  prerelease?: boolean
}

export type Release = {
  id: string
  url: string
  tag: string
}

export type Check = {
  name: string
  status: "pending" | "success" | "failure" | "skipped"
  conclusion?: string
  url?: string
}

export type Comment = {
  id: string
  body: string
}

export type Review = {
  id: string
  author: string
  state: "approved" | "changes_requested" | "commented"
}

export interface ForgeAdapter {
  readonly providerName: string

  openPullRequest(request: PullRequestRequest): Promise<PullRequest>
  updatePullRequest(id: string, request: Partial<PullRequestRequest>): Promise<PullRequest>
  closePullRequest(id: string): Promise<void>
  mergePullRequest(id: string, strategy: MergeStrategy): Promise<MergeResult>
  createRelease(request: ReleaseRequest): Promise<Release>
  listChecks(id: string): Promise<Check[]>
  addComment(id: string, body: string): Promise<Comment>
  listReviews(id: string): Promise<Review[]>
}

export type ForgeAdapterFactory = (config: Record<string, unknown>) => ForgeAdapter

const registry = new Map<string, ForgeAdapterFactory>()

export function registerForgeAdapter(provider: string, factory: ForgeAdapterFactory): void {
  registry.set(provider, factory)
}

export function createForgeAdapter(provider: string, config: Record<string, unknown>): ForgeAdapter {
  const factory = registry.get(provider)
  if (!factory) {
    throw new Error(`No forge adapter registered for provider: ${provider}`)
  }
  return factory(config)
}

export function listForgeProviders(): string[] {
  return Array.from(registry.keys())
}
