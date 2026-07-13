// ============================================================
// ADAPTER: GitHub — Implementation
// ============================================================
// Reference implementation of the GitHub Adapter.
// All GitHub API interaction is isolated here.
// ============================================================

import type { AdapterState, AdapterHealth, AdapterHealthState } from "../../types/index.js"
import type {
  GitHubAdapter,
  GitHubConfig,
  GitHubRepositoryStatus,
  GitHubRepositoryHealth,
  CreateIssueResult,
  CreatePullRequestResult,
  MergePullRequestResult,
  CreateReleaseResult,
} from "./types.js"
import { GitHubClient, type GitHubFetchFn } from "./client.js"

export class GitHubAdapterImpl implements GitHubAdapter {
  readonly metadata = {
    name: "github",
    version: "1.0.0",
    kind: "github" as const,
    category: "integration" as const,
    description: "GitHub integration adapter",
  }

  private _state: AdapterState = "discovered"
  private _config?: GitHubConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }
  private _client?: GitHubClient

  constructor(fetchFn?: GitHubFetchFn) {
    this._fetchFn = fetchFn
  }

  private _fetchFn?: GitHubFetchFn

  get state(): AdapterState {
    return this._state
  }

  get config(): GitHubConfig | undefined {
    return this._config
  }

  get health(): AdapterHealth {
    return this._health
  }

  private setHealth(state: AdapterHealthState, message: string, diagnostics?: Record<string, unknown>): void {
    this._health = { state, message, diagnostics }
  }

  private transition(
    transition: string,
    success: boolean,
    state: AdapterState,
    message: string,
  ): AdapterState {
    if (success) this._state = state
    else this._state = "error"
    return this._state
  }

  private client(): GitHubClient {
    if (!this._client) {
      if (!this._config) throw new Error("GITHUB_ADAPTER_NOT_CONFIGURED")
      this._client = new GitHubClient(
        { baseUrl: this._config.baseUrl, token: this._config.token },
        this._fetchFn,
      )
    }
    return this._client
  }

  private repoPath(): string {
    if (!this._config) throw new Error("GITHUB_ADAPTER_NOT_CONFIGURED")
    return `/repos/${this._config.owner}/${this._config.repo}`
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this._client = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as GitHubConfig
    this._client = undefined
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config || !this._config.owner || !this._config.repo || !this._config.token) {
      this.setHealth("unhealthy", "GitHub adapter missing owner, repo, or token")
      return this.transition("validate", false, "error", "Missing owner, repo, or token")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    this.setHealth("unknown", "Adapter enabled, awaiting health check")
    return this.transition("enable", true, "enabled", "Adapter enabled")
  }

  async disable(): Promise<AdapterState> {
    this.setHealth("disabled", "Adapter disabled")
    return this.transition("disable", true, "disabled", "Adapter disabled")
  }

  async healthCheck(): Promise<AdapterState> {
    const ghHealth = await this.checkHealth()
    const healthState: AdapterHealthState = ghHealth.healthy ? "healthy" : "unhealthy"
    this.setHealth(healthState, ghHealth.message, ghHealth.checks)
    return this.transition("healthCheck", ghHealth.healthy, ghHealth.healthy ? "healthy" : "error", ghHealth.message)
  }

  async initialize(): Promise<AdapterState> {
    return this.configure({
      owner: "",
      repo: "",
      token: "",
      defaultBranch: "main",
    })
  }

  async status(): Promise<GitHubRepositoryStatus> {
    if (!this._config) {
      return {
        owner: "unknown",
        repo: "unknown",
        defaultBranch: "unknown",
        openIssues: 0,
        openPullRequests: 0,
        adapterEnabled: false,
        state: this._state,
      }
    }

    let openIssues = 0
    let openPullRequests = 0
    try {
      const repo = (await this.client().get(this.repoPath())) as any
      openIssues = repo.open_issues_count || 0
      const prs = (await this.client().get(`${this.repoPath()}/pulls?state=open`)) as any[]
      openPullRequests = prs.length
    } catch {
      // status is best-effort
    }

    return {
      owner: this._config.owner,
      repo: this._config.repo,
      defaultBranch: this._config.defaultBranch || "main",
      openIssues,
      openPullRequests,
      adapterEnabled: this._state !== "disabled" && this._state !== "discovered",
      state: this._state,
    }
  }

  async checkHealth(): Promise<GitHubRepositoryHealth> {
    if (!this._config) {
      return {
        healthy: false,
        checks: { authenticated: false, repositoryReachable: false, defaultBranchExists: false },
        message: "Adapter not configured",
      }
    }

    let authenticated = false
    let repositoryReachable = false
    let defaultBranchExists = false

    try {
      const user = (await this.client().get("/user")) as any
      authenticated = user?.login !== undefined
    } catch {
      authenticated = false
    }

    try {
      const repo = (await this.client().get(this.repoPath())) as any
      repositoryReachable = repo?.full_name === `${this._config.owner}/${this._config.repo}`
      defaultBranchExists = repo?.default_branch === (this._config.defaultBranch || "main")
    } catch {
      repositoryReachable = false
      defaultBranchExists = false
    }

    const healthy = authenticated && repositoryReachable && defaultBranchExists
    return {
      healthy,
      checks: { authenticated, repositoryReachable, defaultBranchExists },
      message: healthy ? "GitHub adapter is healthy" : "GitHub adapter health checks failed",
    }
  }

  async createIssue(title: string, body?: string): Promise<CreateIssueResult> {
    try {
      const data = (await this.client().post(`${this.repoPath()}/issues`, { title, body })) as any
      return {
        success: true,
        issue: { number: data.number, title: data.title, state: data.state, url: data.html_url },
        message: `Created issue #${data.number}`,
      }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  async updateIssue(number: number, updates: Partial<{ title: string; state: string }>): Promise<CreateIssueResult> {
    try {
      const data = (await this.client().patch(`${this.repoPath()}/issues/${number}`, updates)) as any
      return {
        success: true,
        issue: { number: data.number, title: data.title, state: data.state, url: data.html_url },
        message: `Updated issue #${data.number}`,
      }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  async closeIssue(number: number): Promise<CreateIssueResult> {
    return this.updateIssue(number, { state: "closed" })
  }

  async createPullRequest(title: string, head: string, base: string, body?: string): Promise<CreatePullRequestResult> {
    try {
      const data = (await this.client().post(`${this.repoPath()}/pulls`, { title, head, base, body })) as any
      return {
        success: true,
        pullRequest: {
          number: data.number,
          title: data.title,
          state: data.state,
          url: data.html_url,
          head: data.head.ref,
          base: data.base.ref,
        },
        message: `Created pull request #${data.number}`,
      }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  async reviewPullRequest(
    number: number,
    event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
    body?: string,
  ): Promise<CreatePullRequestResult> {
    try {
      const data = (await this.client().post(`${this.repoPath()}/pulls/${number}/reviews`, { event, body })) as any
      return {
        success: true,
        pullRequest: {
          number,
          title: data.title || "",
          state: data.state,
          url: data.html_url || "",
          head: "",
          base: "",
        },
        message: `Reviewed pull request #${number}`,
      }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  async mergePullRequest(number: number): Promise<MergePullRequestResult> {
    try {
      const data = (await this.client().put(`${this.repoPath()}/pulls/${number}/merge`, { merge_method: "merge" })) as any
      return {
        success: true,
        mergeCommitSha: data.sha,
        message: `Merged pull request #${number}`,
      }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  async createRelease(tagName: string, name: string, body?: string): Promise<CreateReleaseResult> {
    try {
      const data = (await this.client().post(`${this.repoPath()}/releases`, { tag_name: tagName, name, body })) as any
      return {
        success: true,
        release: { id: data.id, tagName: data.tag_name, url: data.html_url },
        message: `Created release ${tagName}`,
      }
    } catch (err: any) {
      return { success: false, message: err.message }
    }
  }

  async syncRepository(): Promise<AdapterState> {
    // Best-effort sync: validate repository is reachable
    const health = await this.checkHealth()
    return this.transition("sync", health.healthy, health.healthy ? "operational" : "error", health.message)
  }
}

export function createGitHubAdapter(fetchFn?: import("./client.js").GitHubFetchFn): GitHubAdapterImpl {
  return new GitHubAdapterImpl(fetchFn)
}
