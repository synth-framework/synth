// ============================================================
// ENVIRONMENT: Reference Capability Providers
// ============================================================
// These providers bridge existing SYNTH adapters to the Environment
// Layer capability model. They demonstrate how concrete environmental
// implementations satisfy abstract capability families without
// requiring the Core to know their details.
//
// These providers are reference implementations. Future expeditions
// may introduce additional providers for Mercurial, Pijul, GitLab,
// Docker, Kubernetes, cloud identity systems, and so on.
// ============================================================

import type { CapabilityProvider, DiscoveryEvidence, ObservationContext, ProviderSuitability } from "../types.js"

export const gitRevisionProvider: CapabilityProvider = {
  name: "git-revision",
  version: "1.0.0",
  capabilities: [
    { family: "Revision", priority: 100, confidence: "high" },
  ],
  evaluate: async (ctx: ObservationContext): Promise<ProviderSuitability> => {
    const hasGit = await ctx.pathExists(".git")
    const gitVersion = await ctx.execTool("git", ["--version"])
    return {
      family: "Revision",
      providerName: "git-revision",
      available: hasGit && gitVersion !== undefined,
      confidence: hasGit && gitVersion ? "high" : "none",
      reason: hasGit && gitVersion
        ? "Git repository and git executable detected"
        : "Git repository or executable not detected",
      metadata: { hasGit, gitVersion: gitVersion?.trim().split("\n")[0] },
    }
  },
}

export const nodeFilesystemProvider: CapabilityProvider = {
  name: "node-filesystem",
  version: "1.0.0",
  capabilities: [
    { family: "Filesystem", priority: 100, confidence: "certain" },
  ],
  evaluate: async (ctx: ObservationContext): Promise<ProviderSuitability> => {
    const entries = await ctx.listDirectory(ctx.cwd)
    return {
      family: "Filesystem",
      providerName: "node-filesystem",
      available: entries.length >= 0,
      confidence: "certain",
      reason: "Filesystem access is available through the observation context",
      metadata: { entryCount: entries.length },
    }
  },
}

export const npmPackageProvider: CapabilityProvider = {
  name: "npm-package",
  version: "1.0.0",
  capabilities: [
    { family: "Package", priority: 100, confidence: "high" },
  ],
  evaluate: async (ctx: ObservationContext, evidence: DiscoveryEvidence): Promise<ProviderSuitability> => {
    const packageObservation = evidence.observations.find((o) => o.name === "packageManager")
    const value = (packageObservation?.value as { detected?: string[]; declared?: string }) || {}
    const detected = value.detected || []
    const declared = value.declared
    const available = detected.includes("npm") || declared === "npm"
    const npmVersion = await ctx.execTool("npm", ["--version"])
    return {
      family: "Package",
      providerName: "npm-package",
      available: available && npmVersion !== undefined,
      confidence: available && npmVersion ? "high" : "low",
      reason: available && npmVersion
        ? "npm lockfile or packageManager field detected and npm executable available"
        : "npm not detected as primary package manager",
      metadata: { detected, declared, npmVersion: npmVersion?.trim() },
    }
  },
}

export const nodeRuntimeProvider: CapabilityProvider = {
  name: "node-runtime",
  version: "1.0.0",
  capabilities: [
    { family: "Runtime", priority: 100, confidence: "high" },
    { family: "Process", priority: 100, confidence: "high" },
  ],
  evaluate: async (ctx: ObservationContext): Promise<ProviderSuitability> => {
    const version = await ctx.execTool("node", ["--version"])
    return {
      family: "Runtime",
      providerName: "node-runtime",
      available: version !== undefined,
      confidence: version ? "high" : "none",
      reason: version
        ? `Node.js runtime available: ${version.trim()}`
        : "Node.js runtime not available",
      metadata: { version: version?.trim() },
    }
  },
}

export const githubForgeProvider: CapabilityProvider = {
  name: "github-forge",
  version: "1.0.0",
  capabilities: [
    { family: "Forge", priority: 100, confidence: "high" },
  ],
  evaluate: async (ctx: ObservationContext, evidence: DiscoveryEvidence): Promise<ProviderSuitability> => {
    const forgeObservation = evidence.observations.find((o) => o.name === "forge")
    const forges = (forgeObservation?.value as string[]) || []
    const available = forges.includes("github")
    return {
      family: "Forge",
      providerName: "github-forge",
      available,
      confidence: available ? "high" : "low",
      reason: available
        ? "GitHub remote detected"
        : "No GitHub remote detected",
      metadata: { detectedForges: forges },
    }
  },
}

export const gitVersioningProvider: CapabilityProvider = {
  name: "git-versioning",
  version: "1.0.0",
  capabilities: [
    { family: "Versioning", priority: 100, confidence: "high" },
  ],
  evaluate: async (ctx: ObservationContext): Promise<ProviderSuitability> => {
    const hasGit = await ctx.pathExists(".git")
    const gitVersion = await ctx.execTool("git", ["--version"])
    return {
      family: "Versioning",
      providerName: "git-versioning",
      available: hasGit && gitVersion !== undefined,
      confidence: hasGit && gitVersion ? "high" : "none",
      reason: hasGit && gitVersion
        ? "Git repository and git executable detected"
        : "Git repository or executable not detected",
      metadata: { hasGit, gitVersion: gitVersion?.trim().split("\n")[0] },
    }
  },
}

/** Reference provider set for the default SYNTH environment */
export function createReferenceProviders(): CapabilityProvider[] {
  return [
    gitRevisionProvider,
    nodeFilesystemProvider,
    npmPackageProvider,
    nodeRuntimeProvider,
    githubForgeProvider,
    gitVersioningProvider,
  ]
}
