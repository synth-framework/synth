// ============================================================
// ENVIRONMENT: Forge Capability
// ============================================================
// Forge capability provider interface and GitHub reference
// implementation. The provider composes the Tool capability
// (ADR-011) via the gh CLI; it handles no credentials itself.
// The Core must never invoke forge APIs or CLIs directly.
// ============================================================

import type { ToolProvider } from "./process-capability.js"
import { LocalShellProvider } from "./process-capability.js"

/** Forge-agnostic repository metadata */
export interface ForgeRepository {
  readonly name: string
  readonly owner?: string
  readonly url?: string
  readonly defaultBranch?: string
  readonly description?: string
}

/** Forge-agnostic issue */
export interface ForgeIssue {
  readonly number: number
  readonly title: string
  readonly state: string
  readonly labels: string[]
  readonly url?: string
}

/** Forge-agnostic pull request */
export interface ForgePullRequest {
  readonly number: number
  readonly title: string
  readonly state: string
  readonly headBranch?: string
  readonly baseBranch?: string
  readonly url?: string
}

/** Forge-agnostic release */
export interface ForgeRelease {
  readonly tag: string
  readonly name?: string
  readonly isDraft?: boolean
  readonly isPrerelease?: boolean
  readonly url?: string
}

/** Options for forge list operations */
export interface ForgeListOptions {
  readonly limit?: number
  readonly state?: string
}

/** Options for creating a pull request */
export interface ForgePullRequestCreateOptions {
  readonly title: string
  readonly body?: string
  readonly headBranch: string
  readonly baseBranch: string
  readonly draft?: boolean
}

/** Options for merging a pull request */
export interface ForgePullRequestMergeOptions {
  readonly number: number
  readonly strategy?: "merge" | "squash" | "rebase"
  readonly deleteBranch?: boolean
}

/** Options for forking a repository */
export interface ForgeForkOptions {
  readonly owner?: string
  readonly name?: string
  readonly defaultBranchOnly?: boolean
}

/** Forge capability provider interface */
export interface ForgeProvider {
  readonly name: string
  readonly version: string
  getRepository(): Promise<ForgeRepository | undefined>
  listIssues(options?: ForgeListOptions): Promise<ForgeIssue[]>
  listPullRequests(options?: ForgeListOptions): Promise<ForgePullRequest[]>
  listReleases(options?: ForgeListOptions): Promise<ForgeRelease[]>
  createPullRequest(options: ForgePullRequestCreateOptions): Promise<ForgePullRequest | undefined>
  mergePullRequest(options: ForgePullRequestMergeOptions): Promise<ForgePullRequest | undefined>
  forkRepository(options?: ForgeForkOptions): Promise<ForgeRepository | undefined>
}

const DEFAULT_LIMIT = 30

function parseJson(stdout: string): unknown {
  try {
    return JSON.parse(stdout)
  } catch {
    return undefined
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is Record<string, unknown> => asRecord(entry) !== undefined)
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined
}

function num(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined
}

/**
 * GitHub forge provider implemented through the Tool capability
 * via the gh CLI. Authentication is delegated to gh; this
 * provider never handles tokens or credentials.
 */
export class GitHubForgeProvider implements ForgeProvider {
  readonly name = "github-forge"
  readonly version = "1.0.0"
  private readonly tools: ToolProvider
  private readonly cwd?: string

  constructor(tools: ToolProvider = new LocalShellProvider(), cwd?: string) {
    this.tools = tools
    this.cwd = cwd
  }

  private async ghJson(args: string[]): Promise<unknown> {
    const result = await this.tools.runTool("gh", args, { cwd: this.cwd, timeoutMs: 30000 })
    if (result.exitCode !== 0) return undefined
    return parseJson(result.stdout)
  }

  async getRepository(): Promise<ForgeRepository | undefined> {
    const data = asRecord(await this.ghJson([
      "repo", "view",
      "--json", "name,owner,url,defaultBranchRef,description",
    ]))
    if (!data) return undefined
    const name = str(data.name)
    if (!name) return undefined
    const owner = asRecord(data.owner)
    const defaultBranchRef = asRecord(data.defaultBranchRef)
    return {
      name,
      owner: str(owner?.login),
      url: str(data.url),
      defaultBranch: str(defaultBranchRef?.name),
      description: str(data.description),
    }
  }

  async listIssues(options?: ForgeListOptions): Promise<ForgeIssue[]> {
    const args = [
      "issue", "list",
      "--json", "number,title,state,labels,url",
      "--limit", String(options?.limit ?? DEFAULT_LIMIT),
    ]
    if (options?.state) args.push("--state", options.state)
    const entries = asArray(await this.ghJson(args))
    const issues: ForgeIssue[] = []
    for (const entry of entries) {
      const number = num(entry.number)
      const title = str(entry.title)
      const state = str(entry.state)
      if (number === undefined || !title || !state) continue
      const labels = asArray(entry.labels)
        .map((label) => str(label.name))
        .filter((label): label is string => label !== undefined)
      issues.push({ number, title, state, labels, url: str(entry.url) })
    }
    return issues
  }

  async listPullRequests(options?: ForgeListOptions): Promise<ForgePullRequest[]> {
    const args = [
      "pr", "list",
      "--json", "number,title,state,headRefName,baseRefName,url",
      "--limit", String(options?.limit ?? DEFAULT_LIMIT),
    ]
    if (options?.state) args.push("--state", options.state)
    const entries = asArray(await this.ghJson(args))
    const pullRequests: ForgePullRequest[] = []
    for (const entry of entries) {
      const number = num(entry.number)
      const title = str(entry.title)
      const state = str(entry.state)
      if (number === undefined || !title || !state) continue
      pullRequests.push({
        number,
        title,
        state,
        headBranch: str(entry.headRefName),
        baseBranch: str(entry.baseRefName),
        url: str(entry.url),
      })
    }
    return pullRequests
  }

  async listReleases(options?: ForgeListOptions): Promise<ForgeRelease[]> {
    const entries = asArray(await this.ghJson([
      "release", "list",
      "--json", "tagName,name,isDraft,isPrerelease",
      "--limit", String(options?.limit ?? DEFAULT_LIMIT),
    ]))
    const releases: ForgeRelease[] = []
    for (const entry of entries) {
      const tag = str(entry.tagName)
      if (!tag) continue
      releases.push({
        tag,
        name: str(entry.name),
        isDraft: bool(entry.isDraft),
        isPrerelease: bool(entry.isPrerelease),
        url: str(entry.url),
      })
    }
    return releases
  }

  async createPullRequest(options: ForgePullRequestCreateOptions): Promise<ForgePullRequest | undefined> {
    const args = [
      "pr", "create",
      "--title", options.title,
      "--head", options.headBranch,
      "--base", options.baseBranch,
      "--json", "number,title,state,headRefName,baseRefName,url",
    ]
    if (options.body) args.push("--body", options.body)
    if (options.draft) args.push("--draft")

    const data = asRecord(await this.ghJson(args))
    if (!data) return undefined
    return this.parsePullRequest(data)
  }

  async mergePullRequest(options: ForgePullRequestMergeOptions): Promise<ForgePullRequest | undefined> {
    const args = ["pr", "merge", String(options.number), "--json", "number,title,state,headRefName,baseRefName,url"]
    if (options.strategy) args.push(`--${options.strategy}`)
    if (options.deleteBranch) args.push("--delete-branch")

    const data = asRecord(await this.ghJson(args))
    if (!data) return undefined
    return this.parsePullRequest(data)
  }

  async forkRepository(options?: ForgeForkOptions): Promise<ForgeRepository | undefined> {
    const args = ["repo", "fork"]
    if (options?.defaultBranchOnly) args.push("--default-branch-only")

    const result = await this.tools.runTool("gh", args, { cwd: this.cwd, timeoutMs: 60000 })
    if (result.exitCode !== 0) return undefined

    // After forking, read the forked repository metadata.
    const data = asRecord(await this.ghJson([
      "repo", "view",
      "--json", "name,owner,url,defaultBranchRef,description",
    ]))
    if (!data) return undefined
    const name = str(data.name)
    if (!name) return undefined
    const owner = asRecord(data.owner)
    const defaultBranchRef = asRecord(data.defaultBranchRef)
    return {
      name,
      owner: str(owner?.login),
      url: str(data.url),
      defaultBranch: str(defaultBranchRef?.name),
      description: str(data.description),
    }
  }

  private parsePullRequest(data: Record<string, unknown>): ForgePullRequest | undefined {
    const number = num(data.number)
    const title = str(data.title)
    const state = str(data.state)
    if (number === undefined || !title || !state) return undefined
    return {
      number,
      title,
      state,
      headBranch: str(data.headRefName),
      baseBranch: str(data.baseRefName),
      url: str(data.url),
    }
  }
}

export function createGitHubForgeProvider(tools?: ToolProvider, cwd?: string): ForgeProvider {
  return new GitHubForgeProvider(tools, cwd)
}
