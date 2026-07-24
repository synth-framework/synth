// ============================================================
// DISCOVERY PROVIDER: Process Git
// ============================================================
// A GitProvider backed by the local `git` executable.
//
// This provider runs read-only git commands. It never modifies the
// repository or fetches from remotes.
// ============================================================

import { execFileSync } from "child_process"
import {
  type GitBranch,
  type GitCommit,
  type GitProvider,
  type GitRemote,
  type GitRepositoryState,
  type GitTag,
  type GitWorkingTreeState,
} from "./git-provider.js"

function runGit(path: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: path,
    encoding: "utf8",
    timeout: 5000,
  })
}

function isGitRepository(path: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--git-dir"], {
      cwd: path,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    })
    return true
  } catch {
    return false
  }
}

function parseRepositoryState(path: string): GitRepositoryState {
  const gitDir = runGit(path, ["rev-parse", "--git-dir"]).trim()
  const headRef = runGit(path, ["rev-parse", "--abbrev-ref", "HEAD"]).trim()
  const headSha = runGit(path, ["rev-parse", "HEAD"]).trim()
  const isBare = runGit(path, ["rev-parse", "--is-bare-repository"]).trim() === "true"
  const isShallow = runGit(path, ["rev-parse", "--is-shallow-repository"]).trim() === "true"

  return {
    gitDir,
    headRef: headRef === "HEAD" ? undefined : headRef,
    headSha,
    isBare,
    isShallow,
  }
}

function parseRemotes(output: string): GitRemote[] {
  const remotes: GitRemote[] = []
  for (const line of output.split("\n")) {
    if (!line.trim()) continue
    const parts = line.split(/\s+/)
    if (parts.length >= 2) {
      remotes.push({ name: parts[0], url: parts[1] })
    }
  }
  return remotes
}

function parseBranches(output: string): GitBranch[] {
  const branches: GitBranch[] = []
  for (const line of output.split("\n")) {
    if (!line.trim()) continue
    const current = line.startsWith("*")
    const parts = line.replace(/^\*\s*/, "").split(/\s+/)
    const name = parts[0]
    const ref = parts[1]
    branches.push({ name, current, ref })
  }
  return branches
}

function parseTags(output: string): GitTag[] {
  const tags: GitTag[] = []
  for (const line of output.split("\n")) {
    if (!line.trim()) continue
    const parts = line.split(/\s+/)
    if (parts.length >= 2) {
      tags.push({ name: parts[0], ref: parts[1] })
    }
  }
  return tags
}

function parseCommits(output: string): GitCommit[] {
  const commits: GitCommit[] = []
  const entries = output.split("\u0000").filter((entry) => entry.trim())
  for (const entry of entries) {
    const lines = entry.split("\n")
    const sha = lines[0]
    const subject = lines[1] ?? ""
    const authorName = lines[2] ?? ""
    const authorEmail = lines[3] ?? ""
    const timestamp = parseInt(lines[4] ?? "0", 10)
    if (sha) {
      commits.push({
        sha,
        subject,
        authorName,
        authorEmail,
        timestamp: isNaN(timestamp) ? 0 : timestamp,
      })
    }
  }
  return commits
}

function parseWorkingTreeState(output: string): GitWorkingTreeState {
  const state: GitWorkingTreeState = {
    clean: output.trim().length === 0,
    modified: 0,
    added: 0,
    deleted: 0,
    untracked: 0,
  }

  for (const line of output.split("\n")) {
    if (!line.trim()) continue
    const status = line.slice(0, 2)
    const xy = status.split("")
    const x = xy[0] ?? ""
    const y = xy[1] ?? ""

    if (x === "?" || y === "?") {
      state.untracked++
    } else {
      if (x === "M" || y === "M") state.modified++
      if (x === "A" || y === "A") state.added++
      if (x === "D" || y === "D") state.deleted++
    }
  }

  return state
}

export function createProcessGitProvider(): GitProvider {
  return {
    async isGitRepository(path: string): Promise<boolean> {
      return isGitRepository(path)
    },

    async getRepositoryState(path: string): Promise<GitRepositoryState | undefined> {
      if (!isGitRepository(path)) return undefined
      return parseRepositoryState(path)
    },

    async getRemotes(path: string): Promise<GitRemote[]> {
      if (!isGitRepository(path)) return []
      const output = runGit(path, ["remote", "-v"])
      return parseRemotes(output)
    },

    async getBranches(path: string): Promise<GitBranch[]> {
      if (!isGitRepository(path)) return []
      const output = runGit(path, ["branch", "-vv"])
      return parseBranches(output)
    },

    async getTags(path: string): Promise<GitTag[]> {
      if (!isGitRepository(path)) return []
      const output = runGit(path, ["tag", "-n"])
      return parseTags(output)
    },

    async getRecentCommits(path: string, limit: number): Promise<GitCommit[]> {
      if (!isGitRepository(path)) return []
      const format = "%H%n%s%n%an%n%ae%n%at%x00"
      const output = runGit(path, ["log", `-${limit}`, `--pretty=format:${format}`])
      return parseCommits(output)
    },

    async getWorkingTreeState(path: string): Promise<GitWorkingTreeState> {
      if (!isGitRepository(path)) {
        return { clean: true, modified: 0, added: 0, deleted: 0, untracked: 0 }
      }
      const output = runGit(path, ["status", "--porcelain"])
      return parseWorkingTreeState(output)
    },
  }
}
