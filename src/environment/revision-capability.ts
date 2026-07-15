// ============================================================
// ENVIRONMENT: Revision Capability
// ============================================================
// Revision capability provider interface and Git reference
// implementation. The Core must never invoke Git commands or read
// Git-specific metadata directly; all revision interaction flows
// through this capability.
// ============================================================

import type { ObservationContext } from "./types.js"

/** Remote locator */
export type Remote = {
  name: string
  url: string
}

/** Status summary for a revision working tree */
export type RevisionStatus = {
  clean: boolean
  ahead: number
  behind: number
  modified: string[]
  untracked: string[]
}

/** Description of a discovered revision system */
export type RevisionDescriptor = {
  system: string
  root: string
  present: boolean
  branch?: string
  commit?: string
  remotes: Remote[]
  clean: boolean
}

/** Revision capability provider interface */
export interface RevisionProvider {
  readonly name: string
  readonly version: string
  discover(ctx: ObservationContext): Promise<RevisionDescriptor>
  isRepository(ctx: ObservationContext, root: string): Promise<boolean>
  getCurrentBranch(ctx: ObservationContext, root: string): Promise<string | undefined>
  getCommitHash(ctx: ObservationContext, root: string): Promise<string | undefined>
  getRemotes(ctx: ObservationContext, root: string): Promise<Remote[]>
  getStatus(ctx: ObservationContext, root: string): Promise<RevisionStatus>
}

/** Git-backed revision provider */
export class GitRevisionProvider implements RevisionProvider {
  readonly name = "git-revision"
  readonly version = "1.0.0"

  async discover(ctx: ObservationContext): Promise<RevisionDescriptor> {
    const root = ctx.cwd
    const present = await this.isRepository(ctx, root)
    if (!present) {
      return { system: "git", root, present: false, remotes: [], clean: false }
    }

    const [branch, commit, remotes, status] = await Promise.all([
      this.getCurrentBranch(ctx, root),
      this.getCommitHash(ctx, root),
      this.getRemotes(ctx, root),
      this.getStatus(ctx, root),
    ])

    return {
      system: "git",
      root,
      present: true,
      branch,
      commit,
      remotes,
      clean: status.clean,
    }
  }

  async isRepository(ctx: ObservationContext, root: string): Promise<boolean> {
    return ctx.pathExists(`${root}/.git`)
  }

  async getCurrentBranch(ctx: ObservationContext, root: string): Promise<string | undefined> {
    const output = await ctx.execTool("git", ["-C", root, "rev-parse", "--abbrev-ref", "HEAD"])
    return output?.trim() || undefined
  }

  async getCommitHash(ctx: ObservationContext, root: string): Promise<string | undefined> {
    const output = await ctx.execTool("git", ["-C", root, "rev-parse", "HEAD"])
    return output?.trim() || undefined
  }

  async getRemotes(ctx: ObservationContext, root: string): Promise<Remote[]> {
    const config = await ctx.readFile(`${root}/.git/config`)
    if (!config) return []

    const remotes: Remote[] = []
    const lines = config.split("\n")
    let currentRemote: string | undefined

    for (const line of lines) {
      const sectionMatch = /^\[remote "([^"]+)"\]$/.exec(line)
      if (sectionMatch) {
        currentRemote = sectionMatch[1]
        continue
      }
      const urlMatch = /^\s*url\s*=\s*(.+)$/.exec(line)
      if (urlMatch && currentRemote) {
        remotes.push({ name: currentRemote, url: urlMatch[1].trim() })
        currentRemote = undefined
      }
    }

    return remotes
  }

  async getStatus(ctx: ObservationContext, root: string): Promise<RevisionStatus> {
    const porcelain = await ctx.execTool("git", ["-C", root, "status", "--porcelain=v1"])
    const modified: string[] = []
    const untracked: string[] = []

    if (porcelain) {
      for (const line of porcelain.split("\n")) {
        if (line.length < 4) continue
        const statusCode = line.slice(0, 2)
        const filePath = line.slice(3)
        if (statusCode === "??") {
          untracked.push(filePath)
        } else {
          modified.push(filePath)
        }
      }
    }

    let ahead = 0
    let behind = 0
    const ab = await ctx.execTool("git", ["-C", root, "rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
    if (ab) {
      const parts = ab.trim().split(/\s+/)
      if (parts.length === 2) {
        ahead = Number.parseInt(parts[0], 10) || 0
        behind = Number.parseInt(parts[1], 10) || 0
      }
    }

    return {
      clean: modified.length === 0 && untracked.length === 0,
      ahead,
      behind,
      modified,
      untracked,
    }
  }
}

export function createGitRevisionProvider(): RevisionProvider {
  return new GitRevisionProvider()
}
