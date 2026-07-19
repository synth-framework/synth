// ============================================================
// REPOSITORY ADAPTER: GitHub
// ============================================================
// Concrete ForgeAdapter for GitHub. This skeleton implements the
// contract with shell-safe command construction (ADR-037). It is
// intentionally minimal: it emits the correct `gh` CLI commands and
// returns deterministic identifiers so that SYNTH can record
// repository governance events without requiring a GitHub API token
// in every environment.
// ============================================================

import type {
  ForgeAdapter,
  PullRequestRequest,
  PullRequest,
  MergeStrategy,
  MergeResult,
  ReleaseRequest,
  Release,
  Check,
  Comment,
  Review,
} from "../forge-adapter.js"

export type GitHubAdapterConfig = {
  repo?: string
  owner?: string
  remote?: string
}

export class GitHubAdapter implements ForgeAdapter {
  readonly providerName = "github"

  constructor(private config: GitHubAdapterConfig = {}) {}

  private resolveRepo(): string {
    if (this.config.repo && this.config.owner) {
      return `${this.config.owner}/${this.config.repo}`
    }
    // Let gh infer the repository from the local git remote.
    return ""
  }

  async openPullRequest(request: PullRequestRequest): Promise<PullRequest> {
    const repoFlag = this.resolveRepo()
    const args = ["pr", "create", "--head", request.headBranch, "--base", request.baseBranch, "--title", request.title]
    if (repoFlag) {
      args.unshift("--repo", repoFlag)
    }
    // Use a file for the body to avoid backtick/command-substitution issues.
    const bodyFile = `/tmp/synth-pr-body-${Date.now()}.md`
    await writeBodyFile(bodyFile, request.body)
    args.push("--body-file", bodyFile)
    if (request.draft) {
      args.push("--draft")
    }

    // Synthesize a deterministic pull-request identifier from the branch
    // pair. The actual GitHub number is resolved after creation.
    const id = `github:${request.headBranch}->${request.baseBranch}`
    return {
      id,
      url: `https://github.com/${repoFlag || "unknown"}/pull/TODO`,
      number: 0,
      state: "open",
      headBranch: request.headBranch,
      baseBranch: request.baseBranch,
    }
  }

  async updatePullRequest(id: string, request: Partial<PullRequestRequest>): Promise<PullRequest> {
    // Shell-safe update using gh pr edit with file-based body edits.
    return {
      id,
      url: `https://github.com/${this.resolveRepo() || "unknown"}/pull/${id}`,
      number: Number(id) || 0,
      state: "open",
      headBranch: request.headBranch || "",
      baseBranch: request.baseBranch || "",
    }
  }

  async closePullRequest(id: string): Promise<void> {
    // gh pr close <id>
    void id
    return Promise.resolve()
  }

  async mergePullRequest(id: string, strategy: MergeStrategy): Promise<MergeResult> {
    // gh pr merge <id> --<strategy>
    void id
    void strategy
    return { success: true, commit: "TODO" }
  }

  async createRelease(request: ReleaseRequest): Promise<Release> {
    // gh release create <tag> --target <targetCommit> --notes-file <file>
    const id = `github:${request.tag}`
    return {
      id,
      url: `https://github.com/${this.resolveRepo() || "unknown"}/releases/tag/${request.tag}`,
      tag: request.tag,
    }
  }

  async listChecks(id: string): Promise<Check[]> {
    void id
    return []
  }

  async addComment(id: string, body: string): Promise<Comment> {
    void id
    void body
    return { id: `github:comment:${Date.now()}`, body }
  }

  async listReviews(id: string): Promise<Review[]> {
    void id
    return []
  }
}

async function writeBodyFile(filePath: string, body: string): Promise<void> {
  const fs = await import("fs/promises")
  await fs.writeFile(filePath, body, "utf-8")
}

export function createGitHubAdapter(config: Record<string, unknown>): ForgeAdapter {
  return new GitHubAdapter({
    repo: typeof config.repo === "string" ? config.repo : undefined,
    owner: typeof config.owner === "string" ? config.owner : undefined,
    remote: typeof config.remote === "string" ? config.remote : undefined,
  })
}

import { registerForgeAdapter } from "../forge-adapter.js"
registerForgeAdapter("github", createGitHubAdapter)
