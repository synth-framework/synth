// ============================================================
// ENVIRONMENT: Git Versioning Provider
// ============================================================
// Reference implementation of the VersioningCapability contract
// using Git. Every mutating operation is executed through the
// Environment Process capability via the ObservationContext.
// ============================================================

import type {
  ObservationContext,
  VersioningCapability,
  VersioningCreateRevisionOptions,
  VersioningCreateSnapshotOptions,
  VersioningHistoryOptions,
  VersioningIntegrateRevisionOptions,
  VersioningIntegrationResult,
  VersioningPublishRevisionOptions,
  VersioningPublishResult,
  VersioningRepositoryDescriptor,
  VersioningRevisionComparison,
  VersioningRevisionDescriptor,
  VersioningRevisionEntry,
  VersioningSnapshotDescriptor,
  VersioningSwitchRevisionOptions,
  VersioningSynchronizeResult,
} from "./index.js"

/** Run a git command through the observation context. */
async function git(
  ctx: ObservationContext,
  root: string,
  args: string[],
): Promise<string | undefined> {
  return ctx.execTool("git", ["-C", root, ...args])
}

/** Parse a single-line Git commit hash into a descriptor stub. */
function parseCommit(output: string | undefined): string {
  return output?.trim() || ""
}

/** Execute git and return trimmed stdout, or empty string on failure. */
async function gitTrim(ctx: ObservationContext, root: string, args: string[]): Promise<string> {
  const output = await git(ctx, root, args)
  return output?.trim() || ""
}

/** Git-backed versioning provider */
export class GitVersioningProvider implements VersioningCapability {
  readonly name = "git-versioning"
  readonly version = "1.0.0"

  private async assertRepository(ctx: ObservationContext, root: string): Promise<void> {
    const present = await ctx.pathExists(`${root}/.git`)
    if (!present) {
      throw new Error(`Not a Git repository: ${root}`)
    }
  }

  async initializeRepository(ctx: ObservationContext, root: string): Promise<VersioningRepositoryDescriptor> {
    await git(ctx, root, ["init"])
    const commit = await gitTrim(ctx, root, ["rev-parse", "HEAD"])
    return {
      system: "git",
      root,
      present: true,
      branch: await this.currentBranch(ctx, root),
      commit: commit || undefined,
      remotes: [],
      clean: true,
    }
  }

  async createRevision(
    ctx: ObservationContext,
    root: string,
    options: VersioningCreateRevisionOptions,
  ): Promise<VersioningRevisionDescriptor> {
    await this.assertRepository(ctx, root)

    const addArgs = options.includeUntracked ? ["add", "."] : ["add", "-u"]
    await git(ctx, root, addArgs)

    const commitArgs = ["commit", "-m", options.message]
    if (options.author) {
      commitArgs.push("--author", options.author)
    }
    await git(ctx, root, commitArgs)

    return this.currentRevision(ctx, root)
  }

  async switchRevision(
    ctx: ObservationContext,
    root: string,
    options: VersioningSwitchRevisionOptions,
  ): Promise<VersioningRevisionDescriptor> {
    await this.assertRepository(ctx, root)

    const target = options.commit ?? options.branch
    if (!target) {
      throw new Error("switchRevision requires either commit or branch")
    }

    const args = ["checkout"]
    if (options.createBranch && options.branch) {
      args.push("-b", options.branch)
    } else {
      args.push(target)
    }

    await git(ctx, root, args)
    return this.currentRevision(ctx, root)
  }

  async integrateRevision(
    ctx: ObservationContext,
    root: string,
    source: string,
    target: string,
    options?: VersioningIntegrateRevisionOptions,
  ): Promise<VersioningIntegrationResult> {
    await this.assertRepository(ctx, root)

    await this.switchRevision(ctx, root, { branch: target })

    const strategy = options?.strategy ?? "merge"
    const args: string[] = []

    if (strategy === "merge") {
      args.push("merge", source)
      if (options?.message) args.push("-m", options.message)
    } else if (strategy === "rebase") {
      args.push("rebase", source)
    } else if (strategy === "fast-forward") {
      args.push("merge", "--ff-only", source)
    } else {
      throw new Error(`Unknown integration strategy: ${strategy}`)
    }

    if (options?.author) {
      args.push("--author", options.author)
    }

    const output = await git(ctx, root, args)
    const resultCommit = await gitTrim(ctx, root, ["rev-parse", "HEAD"])
    const status = await this.workingTreeStatus(ctx, root)

    return {
      success: !status.hasConflict,
      target: await this.resolveRevision(ctx, root, target),
      source: await this.resolveRevision(ctx, root, source),
      resultCommit: resultCommit || undefined,
      conflictedFiles: status.conflicted,
      reason: output?.trim(),
    }
  }

  async publishRevision(
    ctx: ObservationContext,
    root: string,
    source: string,
    options?: VersioningPublishRevisionOptions,
  ): Promise<VersioningPublishResult> {
    await this.assertRepository(ctx, root)

    const remote = options?.remote ?? "origin"
    const args = ["push", remote, source]
    if (options?.force) {
      args.push("--force")
    }

    const output = await git(ctx, root, args)
    const publishedCommit = await gitTrim(ctx, root, ["rev-parse", source])

    return {
      success: true,
      source,
      remote,
      publishedCommit: publishedCommit || undefined,
      reason: output?.trim(),
    }
  }

  async createSnapshot(
    ctx: ObservationContext,
    root: string,
    options?: VersioningCreateSnapshotOptions,
  ): Promise<VersioningSnapshotDescriptor> {
    await this.assertRepository(ctx, root)

    const args = ["stash", "push"]
    if (options?.includeUntracked) {
      args.push("-u")
    }
    if (options?.label) {
      args.push("-m", options.label)
    }

    const output = await git(ctx, root, args)
    const id = `stash@{0}`

    return {
      id,
      system: "git",
      root,
      commit: await gitTrim(ctx, root, ["rev-parse", "HEAD"]) || undefined,
      label: options?.label,
      timestamp: Date.now(),
    }
  }

  async compareRevisions(
    ctx: ObservationContext,
    root: string,
    a: string,
    b: string,
  ): Promise<VersioningRevisionComparison> {
    await this.assertRepository(ctx, root)

    const diffStat = await git(ctx, root, ["diff", "--stat", `${a}...${b}`])
    const nameStatus = await git(ctx, root, ["diff", "--name-status", `${a}...${b}`])

    const addedFiles: string[] = []
    const removedFiles: string[] = []
    const changedFiles: string[] = []

    if (nameStatus) {
      for (const line of nameStatus.split("\n")) {
        const [status, filePath] = line.split("\t")
        if (!filePath) continue
        if (status === "A") addedFiles.push(filePath)
        else if (status === "D") removedFiles.push(filePath)
        else changedFiles.push(filePath)
      }
    }

    return {
      a: await this.resolveRevision(ctx, root, a),
      b: await this.resolveRevision(ctx, root, b),
      changedFiles,
      addedFiles,
      removedFiles,
    }
  }

  async history(
    ctx: ObservationContext,
    root: string,
    options?: VersioningHistoryOptions,
  ): Promise<VersioningRevisionEntry[]> {
    await this.assertRepository(ctx, root)

    const format = "%H%x00%s%x00%an%x00%ai%x00%P"
    const args = ["log", `--pretty=format:${format}`]
    if (options?.maxCount) {
      args.push("-n", String(options.maxCount))
    }
    if (options?.path) {
      args.push("--", options.path)
    }

    const output = await git(ctx, root, args)
    if (!output) return []

    return output.split("\n").map((line) => {
      const [commit, message, author, timestamp, parents] = line.split("\x00")
      return {
        commit: commit || "",
        message: message || "",
        author,
        timestamp,
        parents: parents ? parents.split(" ").filter(Boolean) : [],
      }
    })
  }

  async synchronize(
    ctx: ObservationContext,
    root: string,
    remote?: string,
    options?: Record<string, unknown>,
  ): Promise<VersioningSynchronizeResult> {
    await this.assertRepository(ctx, root)

    const remoteName = remote ?? "origin"
    const fetchOutput = await git(ctx, root, ["fetch", remoteName])

    const branch = await this.currentBranch(ctx, root)
    const integratedCommits: string[] = []

    if (branch) {
      await git(ctx, root, ["pull", remoteName, branch])
      const logOutput = await git(ctx, root, ["log", "HEAD..@{upstream}", "--pretty=format:%H"])
      if (logOutput) {
        integratedCommits.push(...logOutput.split("\n").filter(Boolean))
      }
    }

    const divergence = await this.divergence(ctx, root)

    return {
      success: true,
      remote: remoteName,
      fetchedRefs: fetchOutput ? [remoteName] : [],
      integratedCommits,
      divergence,
    }
  }

  private async currentBranch(ctx: ObservationContext, root: string): Promise<string | undefined> {
    const output = await git(ctx, root, ["rev-parse", "--abbrev-ref", "HEAD"])
    const branch = output?.trim()
    return branch && branch !== "HEAD" ? branch : undefined
  }

  private async currentRevision(ctx: ObservationContext, root: string): Promise<VersioningRevisionDescriptor> {
    const commit = await gitTrim(ctx, root, ["rev-parse", "HEAD"])
    const message = await gitTrim(ctx, root, ["log", "-1", "--pretty=format:%s"])
    const author = await gitTrim(ctx, root, ["log", "-1", "--pretty=format:%an"])
    const timestamp = await gitTrim(ctx, root, ["log", "-1", "--pretty=format:%ai"])
    const parents = await gitTrim(ctx, root, ["log", "-1", "--pretty=format:%P"])

    return {
      system: "git",
      root,
      branch: await this.currentBranch(ctx, root),
      commit,
      message: message || undefined,
      author: author || undefined,
      timestamp: timestamp || undefined,
      parents: parents ? parents.split(" ").filter(Boolean) : [],
    }
  }

  private async resolveRevision(ctx: ObservationContext, root: string, ref: string): Promise<VersioningRevisionDescriptor> {
    const originalBranch = await this.currentBranch(ctx, root)
    await git(ctx, root, ["checkout", ref])
    const descriptor = await this.currentRevision(ctx, root)
    if (originalBranch) {
      await git(ctx, root, ["checkout", originalBranch])
    }
    return descriptor
  }

  private async workingTreeStatus(ctx: ObservationContext, root: string): Promise<{ clean: boolean; conflicted: string[]; hasConflict: boolean }> {
    const porcelain = await git(ctx, root, ["status", "--porcelain=v1"])
    const conflicted: string[] = []

    if (porcelain) {
      for (const line of porcelain.split("\n")) {
        if (line.length < 4) continue
        const code = line.slice(0, 2)
        const filePath = line.slice(3)
        if (code.includes("U") || code.includes("D") && code[1] === "D" || code[0] === "A" && code[1] === "A") {
          conflicted.push(filePath)
        }
      }
    }

    return {
      clean: !porcelain,
      conflicted,
      hasConflict: conflicted.length > 0,
    }
  }

  private async divergence(ctx: ObservationContext, root: string): Promise<{ ahead: number; behind: number; hasConflict: boolean }> {
    const ab = await git(ctx, root, ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
    if (!ab) return { ahead: 0, behind: 0, hasConflict: false }
    const parts = ab.trim().split(/\s+/)
    if (parts.length !== 2) return { ahead: 0, behind: 0, hasConflict: false }

    const ahead = Number.parseInt(parts[0], 10) || 0
    const behind = Number.parseInt(parts[1], 10) || 0
    const status = await this.workingTreeStatus(ctx, root)

    return { ahead, behind, hasConflict: status.hasConflict }
  }
}

export function createGitVersioningProvider(): VersioningCapability {
  return new GitVersioningProvider()
}
