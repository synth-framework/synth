// ============================================================
// BOOTSTRAP: Repository Analyzer
// ============================================================
// Translates a DiscoverySession into the legacy RepositoryAnalysis
// shape consumed by Mission Studio and Genesis.
//
// This module does not read the filesystem directly and does not
// perform language/framework/test detection. All project understanding
// comes from the Discovery compiler via a DiscoverySessionProvider.
//
// The analysis now flows through the Discovery Consumption Layer: a
// DiscoverySession is produced by the default provider, consumed by the
// CLI consumer, and mapped back into the RepositoryAnalysis contract.
// ============================================================

import fs from "fs/promises"
import path from "path"
import {
  createConsumerRegistry,
  createDefaultDiscoverySessionProvider,
  createCliConsumer,
  CLI_CONSUMER_ID,
  type DiscoverySession,
} from "../discovery/index.js"
import type {
  Finding,
  ProjectModel,
} from "../discovery/types.js"
import type {
  PlanningObservation,
} from "../planning/observation.js"
import type { AgentContext } from "./bootstrap-context.js"
import {
  canonicalLanguages,
  buildObservations,
  type CliConsumerOutput,
} from "../discovery/consumers/cli-consumer.js"
import { generateAgentContext } from "./bootstrap-context.js"

export type RepositoryType = "empty" | "node" | "python" | "polyglot" | "brownfield" | "unknown"

export type RepositoryAnalysis = {
  repositoryType: RepositoryType
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasPackageManager: boolean
  fileCount: number
  observations: PlanningObservation[]
  adapterErrors: string[]
  /** Source history classification for the target repository. */
  sourceHistory: AgentContext["sourceHistory"]
  /** Agent Context Contract derived from Discovery output. */
  agentContext?: AgentContext
  /** Discovery session provenance carried into Genesis for lineage. */
  discoverySessionId?: string
  discoverySessionHash?: string
}

function collectAdapterErrors(session: DiscoverySession): string[] {
  const errors: string[] = []
  for (const stage of Object.values(session.pipeline)) {
    errors.push(...stage.warnings)
  }
  return errors
}

const SOURCE_HISTORY_SEARCH_DEPTH = 3

/**
 * Classify whether version-control history is available in the target
 * repository, missing, or lives in an external (parent) repository.
 */
export async function classifySourceHistory(targetDir: string): Promise<AgentContext["sourceHistory"]> {
  try {
    const gitPath = path.join(targetDir, ".git")
    const stat = await fs.stat(gitPath)
    if (stat.isDirectory()) {
      // Verify the Git directory is readable by looking for HEAD.
      try {
        await fs.access(path.join(gitPath, "HEAD"))
        return "AVAILABLE"
      } catch {
        return "UNKNOWN"
      }
    }
  } catch {
    // .git does not exist in targetDir; check parent directories.
  }

  let current = targetDir
  for (let depth = 0; depth < SOURCE_HISTORY_SEARCH_DEPTH; depth++) {
    const parent = path.dirname(current)
    if (parent === current) break
    try {
      const parentGit = path.join(parent, ".git")
      const stat = await fs.stat(parentGit)
      if (stat.isDirectory()) {
        try {
          await fs.access(path.join(parentGit, "HEAD"))
          return "EXTERNAL"
        } catch {
          return "UNKNOWN"
        }
      }
    } catch {
      // continue searching upward
    }
    current = parent
  }

  return "MISSING"
}

function createAnalyzerRegistry() {
  const registry = createConsumerRegistry()
  registry.register(createCliConsumer())
  return registry
}

export async function analyzeRepository(targetDir: string): Promise<RepositoryAnalysis> {
  const provider = createDefaultDiscoverySessionProvider()
  const session = await provider.discover({ targetDir })
  const sourceHistory = await classifySourceHistory(targetDir)

  const projectModel = session.projections["project-model"] as ProjectModel | undefined
  if (!projectModel) {
    return {
      repositoryType: "unknown",
      languages: [],
      frameworks: [],
      hasTests: false,
      hasPackageManager: false,
      fileCount: 0,
      observations: [],
      adapterErrors: ["Discovery session did not produce a ProjectModel projection"],
      sourceHistory,
    }
  }

  const registry = createAnalyzerRegistry()
  const result = registry.execute<unknown, CliConsumerOutput>(CLI_CONSUMER_ID, session)
  const consumerOutput = result.output

  const findings = (session.projections.findings as { items: Finding[] } | undefined) ?? {
    items: [],
  }

  const repositoryType = consumerOutput.repositoryType as RepositoryType
  const observations = buildObservations(repositoryType, projectModel, findings)

  const agentContext = generateAgentContext(projectModel, session, sourceHistory)

  return {
    repositoryType,
    languages: canonicalLanguages(projectModel),
    frameworks: projectModel.frameworks.map((framework) => framework.name),
    hasTests: projectModel.capabilities.some(
      (capability) => capability.name === "testing" && capability.available,
    ),
    hasPackageManager: projectModel.packageManager !== undefined,
    fileCount: projectModel.fileCount,
    observations,
    adapterErrors: collectAdapterErrors(session),
    sourceHistory,
    agentContext,
    discoverySessionId: session.id,
    discoverySessionHash: session.hash,
  }
}
