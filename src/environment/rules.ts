// ============================================================
// ENVIRONMENT: Built-in Discovery Rules
// ============================================================
// These rules observe the environment without mutating it. They depend only
// on the ObservationContext abstraction, making them testable with in-memory
// contexts and usable with real Node.js, browser, or container contexts.
// ============================================================

import type {
  CapabilityFamily,
  DiscoveryObservation,
  DiscoveryRule,
  ObservationContext,
} from "./types.js"

function obs(
  id: string,
  ruleId: string,
  family: CapabilityFamily,
  name: string,
  value: unknown,
  confidence: DiscoveryObservation["confidence"],
  metadata?: Record<string, unknown>,
): DiscoveryObservation {
  return {
    id,
    ruleId,
    family,
    name,
    value,
    confidence,
    timestamp: Date.now(),
    metadata,
  }
}

export const workspaceRule: DiscoveryRule = {
  id: "env.workspace.detect",
  family: "Workspace",
  description: "Detect whether the current directory is a project workspace",
  observe: async (ctx: ObservationContext) => {
    const entries = await ctx.listDirectory(ctx.cwd)
    const hasPackageJson = entries.includes("package.json")
    const hasSynthManifest = entries.includes(".synth")
    const hasReadme = entries.includes("README.md") || entries.includes("readme.md")

    return obs(
      "obs-workspace-detect",
      "env.workspace.detect",
      "Workspace",
      "workspaceStructure",
      {
        hasPackageJson,
        hasSynthManifest,
        hasReadme,
        entries: entries.slice(0, 50),
      },
      hasSynthManifest ? "high" : hasPackageJson ? "medium" : "low",
      { cwd: ctx.cwd },
    )
  },
}

export const revisionRule: DiscoveryRule = {
  id: "env.revision.detect",
  family: "Revision",
  description: "Detect whether a revision control system is present",
  observe: async (ctx: ObservationContext) => {
    const hasGit = await ctx.pathExists(".git")
    const hasHg = await ctx.pathExists(".hg")
    const hasPijul = await ctx.pathExists(".pijul")

    const detectedSystems: string[] = []
    if (hasGit) detectedSystems.push("git")
    if (hasHg) detectedSystems.push("mercurial")
    if (hasPijul) detectedSystems.push("pijul")

    return obs(
      "obs-revision-detect",
      "env.revision.detect",
      "Revision",
      "revisionSystem",
      detectedSystems,
      detectedSystems.length > 0 ? "high" : "medium",
      { hasGit, hasHg, hasPijul },
    )
  },
}

export const filesystemRule: DiscoveryRule = {
  id: "env.filesystem.detect",
  family: "Filesystem",
  description: "Detect filesystem capabilities by observing the workspace",
  observe: async (ctx: ObservationContext) => {
    const entries = await ctx.listDirectory(ctx.cwd)
    return obs(
      "obs-filesystem-detect",
      "env.filesystem.detect",
      "Filesystem",
      "filesystemAccessible",
      entries.length > 0,
      "certain",
      { entryCount: entries.length },
    )
  },
}

export const packageRule: DiscoveryRule = {
  id: "env.package.detect",
  family: "Package",
  description: "Detect package manager by reading lockfiles and manifest",
  observe: async (ctx: ObservationContext) => {
    const entries = await ctx.listDirectory(ctx.cwd)
    const managers: string[] = []
    if (entries.includes("package-lock.json")) managers.push("npm")
    if (entries.includes("pnpm-lock.yaml")) managers.push("pnpm")
    if (entries.includes("yarn.lock")) managers.push("yarn")
    if (entries.includes("bun.lockb")) managers.push("bun")

    const packageJson = await ctx.readFile("package.json")
    let packageManager: string | undefined
    if (packageJson) {
      try {
        const parsed = JSON.parse(packageJson) as Record<string, unknown>
        if (typeof parsed.packageManager === "string") {
          packageManager = parsed.packageManager.split("@")[0]
        }
      } catch {
        // ignore malformed package.json
      }
    }

    return obs(
      "obs-package-detect",
      "env.package.detect",
      "Package",
      "packageManager",
      {
        detected: managers,
        declared: packageManager,
      },
      managers.length > 0 || packageManager ? "high" : "low",
      { lockfilesPresent: managers },
    )
  },
}

export const runtimeRule: DiscoveryRule = {
  id: "env.runtime.detect",
  family: "Runtime",
  description: "Detect available language runtimes",
  observe: async (ctx: ObservationContext) => {
    const runtimes: Array<{ name: string; version?: string }> = []

    const nodeVersion = await ctx.execTool("node", ["--version"])
    if (nodeVersion) {
      runtimes.push({ name: "node", version: nodeVersion.trim() })
    }

    const pythonVersion = await ctx.execTool("python3", ["--version"])
    if (pythonVersion) {
      runtimes.push({ name: "python", version: pythonVersion.trim() })
    }

    const denoVersion = await ctx.execTool("deno", ["--version"])
    if (denoVersion) {
      runtimes.push({ name: "deno", version: denoVersion.trim().split("\n")[0] })
    }

    return obs(
      "obs-runtime-detect",
      "env.runtime.detect",
      "Runtime",
      "runtimes",
      runtimes,
      runtimes.length > 0 ? "high" : "low",
      { runtimeCount: runtimes.length },
    )
  },
}

export const forgeRule: DiscoveryRule = {
  id: "env.forge.detect",
  family: "Forge",
  description: "Detect forge configuration from revision remotes",
  observe: async (ctx: ObservationContext) => {
    const remotes: string[] = []
    const gitConfig = await ctx.readFile(".git/config")
    if (gitConfig) {
      const lines = gitConfig.split("\n")
      for (const line of lines) {
        const match = /^\s*url\s*=\s*(.+)$/.exec(line)
        if (match && match[1]) {
          remotes.push(match[1].trim())
        }
      }
    }

    const forges = remotes
      .map((url) => {
        if (url.includes("github.com")) return "github"
        if (url.includes("gitlab.com")) return "gitlab"
        if (url.includes("bitbucket.org")) return "bitbucket"
        return "unknown"
      })
      .filter((f, i, arr) => arr.indexOf(f) === i)

    return obs(
      "obs-forge-detect",
      "env.forge.detect",
      "Forge",
      "forge",
      forges,
      forges.length > 0 ? "high" : "low",
      { remoteCount: remotes.length, remotes },
    )
  },
}

export const toolRule: DiscoveryRule = {
  id: "env.tool.detect",
  family: "Tool",
  description: "Detect common external tools required by engineering workflows",
  observe: async (ctx: ObservationContext) => {
    const tools = [
      { name: "git", args: ["--version"] },
      { name: "npm", args: ["--version"] },
      { name: "npx", args: ["--version"] },
      { name: "gh", args: ["--version"] },
      { name: "docker", args: ["--version"] },
    ]

    const detected = await Promise.all(
      tools.map(async (tool) => {
        const output = await ctx.execTool(tool.name, tool.args)
        return {
          name: tool.name,
          available: output !== undefined,
          version: output ? output.trim().split("\n")[0] : undefined,
        }
      }),
    )

    return obs(
      "obs-tool-detect",
      "env.tool.detect",
      "Tool",
      "tools",
      detected,
      "high",
      { availableCount: detected.filter((t) => t.available).length },
    )
  },
}

export const processRule: DiscoveryRule = {
  id: "env.process.detect",
  family: "Process",
  description: "Detect process execution capability",
  observe: async (ctx: ObservationContext) => {
    const nodeVersion = await ctx.execTool("node", ["--version"])
    return obs(
      "obs-process-detect",
      "env.process.detect",
      "Process",
      "processExecution",
      nodeVersion !== undefined,
      nodeVersion !== undefined ? "high" : "low",
      { canSpawn: nodeVersion !== undefined },
    )
  },
}

export const environmentRule: DiscoveryRule = {
  id: "env.environment.classify",
  family: "Environment",
  description: "Classify the execution environment",
  observe: async (ctx: ObservationContext) => {
    const ciIndicators = [
      "CI",
      "GITHUB_ACTIONS",
      "GITLAB_CI",
      "CIRCLECI",
      "TRAVIS",
      "BUILDKITE",
    ]
    const detectedCi = ciIndicators
      .filter((name) => ctx.readEnv(name) !== undefined)
      .map((name) => name.toLowerCase())

    const envType = detectedCi.length > 0 ? "ci" : "project"

    return obs(
      "obs-environment-classify",
      "env.environment.classify",
      "Environment",
      "environmentType",
      {
        type: envType,
        ciIndicators: detectedCi,
      },
      detectedCi.length > 0 ? "certain" : "medium",
      { envType },
    )
  },
}

export const versioningRule: DiscoveryRule = {
  id: "env.versioning.detect",
  family: "Versioning",
  description: "Detect repository versioning state from Git and optional forge observations",
  observe: async (ctx: ObservationContext): Promise<DiscoveryObservation | DiscoveryObservation[]> => {
    const hasGit = await ctx.pathExists(".git")
    if (!hasGit) {
      return obs(
        "obs-versioning-detect",
        "env.versioning.detect",
        "Versioning",
        "versioning.repository",
        {
          system: "git",
          root: ctx.cwd,
          present: false,
          remotes: [],
          clean: false,
        },
        "medium",
        { hasGit },
      )
    }

    const branchOutput = await ctx.execTool("git", ["rev-parse", "--abbrev-ref", "HEAD"])
    const branch = branchOutput?.trim() || undefined
    const commitOutput = await ctx.execTool("git", ["rev-parse", "HEAD"])
    const commit = commitOutput?.trim() || ""
    const messageOutput = await ctx.execTool("git", ["log", "-1", "--pretty=format:%s"])
    const authorOutput = await ctx.execTool("git", ["log", "-1", "--pretty=format:%an"])
    const timestampOutput = await ctx.execTool("git", ["log", "-1", "--pretty=format:%ai"])

    const porcelain = await ctx.execTool("git", ["status", "--porcelain=v1"])
    const clean = !porcelain

    const gitConfig = await ctx.readFile(".git/config")
    const remotes: Array<{ name: string; url: string; access: "read" | "write" | "none" }> = []
    if (gitConfig) {
      const lines = gitConfig.split("\n")
      let currentRemote: string | undefined
      for (const line of lines) {
        const sectionMatch = /^\[remote "([^"]+)"\]$/.exec(line)
        if (sectionMatch) {
          currentRemote = sectionMatch[1]
          continue
        }
        const urlMatch = /^\s*url\s*=\s*(.+)$/.exec(line)
        if (urlMatch && currentRemote) {
          remotes.push({ name: currentRemote, url: urlMatch[1].trim(), access: "write" })
          currentRemote = undefined
        }
      }
    }

    const ab = await ctx.execTool("git", ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"])
    let ahead = 0
    let behind = 0
    if (ab) {
      const parts = ab.trim().split(/\s+/)
      if (parts.length === 2) {
        ahead = Number.parseInt(parts[0], 10) || 0
        behind = Number.parseInt(parts[1], 10) || 0
      }
    }

    const observations: DiscoveryObservation[] = []

    observations.push(obs(
      "obs-versioning-repository",
      "env.versioning.detect",
      "Versioning",
      "versioning.repository",
      {
        system: "git",
        root: ctx.cwd,
        present: true,
        branch,
        commit,
        remotes: remotes.map((r) => ({ name: r.name, url: r.url })),
        clean,
      },
      "high",
      { hasGit, remoteCount: remotes.length },
    ))

    if (branch) {
      observations.push(obs(
        "obs-versioning-branch",
        "env.versioning.detect",
        "Versioning",
        "versioning.branch",
        {
          current: branch,
          others: [],
          divergence: { ahead, behind, hasConflict: false },
        },
        "high",
        { branch },
      ))
    }

    if (commit) {
      observations.push(obs(
        "obs-versioning-commit",
        "env.versioning.detect",
        "Versioning",
        "versioning.commit",
        {
          system: "git",
          root: ctx.cwd,
          branch,
          commit,
          message: messageOutput?.trim() || undefined,
          author: authorOutput?.trim() || undefined,
          timestamp: timestampOutput?.trim() || undefined,
          parents: [],
        },
        "high",
        { commit },
      ))
    }

    for (const remote of remotes) {
      observations.push(obs(
        `obs-versioning-remote-${remote.name}`,
        "env.versioning.detect",
        "Versioning",
        "versioning.remote",
        remote,
        "high",
        { remoteName: remote.name },
      ))
    }

    observations.push(obs(
      "obs-versioning-divergence",
      "env.versioning.detect",
      "Versioning",
      "versioning.divergence",
      { ahead, behind, hasConflict: false },
      "medium",
      { hasUpstream: remotes.length > 0 },
    ))

    // Optionally discover open pull requests through gh if available.
    const ghPrs = await ctx.execTool("gh", ["pr", "list", "--json", "number,title,state,headRefName,baseRefName,url", "--limit", "10"])
    if (ghPrs) {
      try {
        const prs = JSON.parse(ghPrs) as Array<Record<string, unknown>>
        if (Array.isArray(prs)) {
          for (const pr of prs) {
            const number = typeof pr.number === "number" ? pr.number : undefined
            const title = typeof pr.title === "string" ? pr.title : undefined
            const state = typeof pr.state === "string" ? pr.state : undefined
            if (number === undefined || !title || !state) continue
            observations.push(obs(
              `obs-versioning-pr-${number}`,
              "env.versioning.detect",
              "Versioning",
              "versioning.pullRequest",
              {
                number,
                title,
                state,
                source: typeof pr.headRefName === "string" ? pr.headRefName : undefined,
                target: typeof pr.baseRefName === "string" ? pr.baseRefName : undefined,
              },
              "high",
              { number },
            ))
          }
        }
      } catch {
        // Ignore malformed gh output.
      }
    }

    return observations
  },
}

/** Default rule set executed by the discovery orchestrator */
export function createDefaultDiscoveryRules(): DiscoveryRule[] {
  return [
    environmentRule,
    workspaceRule,
    filesystemRule,
    revisionRule,
    packageRule,
    runtimeRule,
    processRule,
    toolRule,
    forgeRule,
    versioningRule,
  ]
}
