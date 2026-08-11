// ============================================================
// Adapter auto-detection for onboarding
// ============================================================
// Detects which integration adapters should be enabled for a project
// based on the local environment (.git, remotes, .github/workflows,
// GITHUB_TOKEN, gh CLI). Allows operator override via --adapters and
// --without-adapters. Returns selected adapter IDs and a minimal config
// map that can be persisted in .synth/manifest.json.
//
// This is the first step toward catalog-driven adapter selection.
// Future work will move the environment rules into AdapterDescriptor.
// ============================================================

import { createDefaultAdapterCatalog } from "../adapters/adapter-catalog.js"
import { execSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"

export interface AdapterSelectionOptions {
  /** Project root to inspect. */
  targetDir: string
  /** Explicitly requested adapter IDs (comma-separated from --adapters). */
  explicitAdapters?: string[]
  /** Explicitly excluded adapter IDs (comma-separated from --without-adapters). */
  excludedAdapters?: string[]
}

export interface AdapterSelectionResult {
  /** Adapter IDs to persist in manifest.adapters.selected. */
  selected: string[]
  /** Per-adapter configuration snippets. */
  config: Record<string, Record<string, unknown>>
  /** Human-readable detection notes. */
  diagnostics: string[]
}

function isGitHubRemote(url: string): boolean {
  return /github\.com/i.test(url)
}

async function hasGitRepo(targetDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(targetDir, ".git"))
    return true
  } catch {
    return false
  }
}

async function hasGitHubWorkflows(targetDir: string): Promise<boolean> {
  try {
    await fs.access(path.join(targetDir, ".github", "workflows"))
    return true
  } catch {
    return false
  }
}

function hasGhCli(): boolean {
  try {
    execSync("gh --version", { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function getDefaultBranch(targetDir: string): string {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: targetDir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return branch || "main"
  } catch {
    return "main"
  }
}

function getRemoteUrl(targetDir: string): string | undefined {
  try {
    return execSync("git remote get-url origin", {
      cwd: targetDir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return undefined
  }
}

function isAdapterIdAllowed(id: string, catalog: ReturnType<typeof createDefaultAdapterCatalog>): boolean {
  return catalog.resolve(id) !== undefined
}

export async function detectRecommendedAdapters(
  options: AdapterSelectionOptions,
): Promise<AdapterSelectionResult> {
  const { targetDir, explicitAdapters, excludedAdapters } = options
  const catalog = createDefaultAdapterCatalog()
  const diagnostics: string[] = []
  const selected = new Set<string>()
  const config: Record<string, Record<string, unknown>> = {}

  const gitPresent = await hasGitRepo(targetDir)
  const remoteUrl = gitPresent ? getRemoteUrl(targetDir) : undefined
  const githubWorkflows = await hasGitHubWorkflows(targetDir)
  const ghCli = hasGhCli()
  const githubToken = Boolean(process.env.GITHUB_TOKEN)

  if (gitPresent) {
    diagnostics.push("Detected local git repository")
    selected.add("integration:repository")
    config["integration:repository"] = {
      path: targetDir,
      defaultBranch: getDefaultBranch(targetDir),
      remote: remoteUrl ? "origin" : undefined,
      remoteUrl,
    }
  } else {
    diagnostics.push("No local git repository detected")
  }

  const githubLikely =
    (remoteUrl && isGitHubRemote(remoteUrl)) ||
    githubWorkflows ||
    ghCli ||
    githubToken

  if (githubLikely && selected.has("integration:repository")) {
    diagnostics.push(
      githubWorkflows
        ? "Detected .github/workflows"
        : remoteUrl && isGitHubRemote(remoteUrl)
          ? "Detected GitHub remote"
          : ghCli
            ? "Detected gh CLI"
            : "Detected GITHUB_TOKEN",
    )
    selected.add("integration:github")
    config["integration:github"] = {
      provider: "github",
      remoteUrl,
      hasToken: githubToken,
      hasCli: ghCli,
    }
  } else {
    diagnostics.push(
      githubLikely
        ? "GitHub integration signals detected, but no local git repository"
        : "No GitHub integration signals detected",
    )
  }

  // Operator override: --adapters adds explicit IDs after validating them.
  if (explicitAdapters && explicitAdapters.length > 0) {
    for (const id of explicitAdapters) {
      if (isAdapterIdAllowed(id, catalog)) {
        selected.add(id)
        diagnostics.push(`Explicitly requested adapter: ${id}`)
      } else {
        diagnostics.push(`Unknown adapter requested: ${id}`)
      }
    }
  }

  // Operator override: --without-adapters removes IDs.
  if (excludedAdapters && excludedAdapters.length > 0) {
    for (const id of excludedAdapters) {
      if (selected.has(id)) {
        selected.delete(id)
        diagnostics.push(`Explicitly excluded adapter: ${id}`)
      }
    }
  }

  return {
    selected: [...selected].sort(),
    config,
    diagnostics,
  }
}
