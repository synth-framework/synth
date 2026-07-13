// ============================================================
// INFRA: Git Adapter
// ============================================================

import { execSync } from "child_process"

export interface GitAdapter {
  commit(message: string, files?: string[]): string
  rollback(commitId: string): void
  getHeadCommit(): string
  log(count?: number): string[]
}

export class GitAdapterImpl implements GitAdapter {
  private repoPath: string

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath
  }

  private execGit(args: string[]): string {
    try {
      return execSync(`git ${args.join(" ")}`, {
        cwd: this.repoPath,
        encoding: "utf-8",
      }).trim()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Git command failed: git ${args.join(" ")} — ${message}`)
    }
  }

  isRepo(): boolean {
    try {
      this.execGit(["rev-parse", "--git-dir"])
      return true
    } catch {
      return false
    }
  }

  init(): void {
    if (!this.isRepo()) {
      this.execGit(["init"])
    }
  }

  commit(message: string, files: string[] = []): string {
    this.init()
    if (files.length > 0) {
      for (const file of files) {
        this.execGit(["add", file])
      }
    } else {
      this.execGit(["add", "-A"])
    }
    try {
      this.execGit(["commit", "-m", message])
    } catch {
      // Nothing to commit
    }
    return this.getHeadCommit()
  }

  rollback(commitId: string): void {
    this.execGit(["reset", "--hard", commitId])
  }

  getHeadCommit(): string {
    return this.execGit(["rev-parse", "HEAD"])
  }

  log(count: number = 10): string[] {
    const output = this.execGit(["log", `--max-count=${count}`, "--oneline"])
    return output.split("\n").filter(Boolean)
  }
}

export class GitAdapterStub implements GitAdapter {
  private commits: Array<{ id: string; message: string }> = []

  commit(message: string, _files?: string[]): string {
    const id = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.commits.push({ id, message })
    return id
  }

  rollback(_commitId: string): void {}

  getHeadCommit(): string {
    return this.commits.length > 0
      ? this.commits[this.commits.length - 1].id
      : "stub-head"
  }

  log(count: number = 10): string[] {
    return this.commits
      .slice(-count)
      .map((c) => `${c.id.slice(0, 7)} ${c.message}`)
  }
}
