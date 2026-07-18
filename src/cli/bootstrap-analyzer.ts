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
import {
  canonicalLanguages,
  buildObservations,
  type CliConsumerOutput,
} from "../discovery/consumers/cli-consumer.js"

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

function createAnalyzerRegistry() {
  const registry = createConsumerRegistry()
  registry.register(createCliConsumer())
  return registry
}

export async function analyzeRepository(targetDir: string): Promise<RepositoryAnalysis> {
  const provider = createDefaultDiscoverySessionProvider()
  const session = await provider.discover({ targetDir })

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
    discoverySessionId: session.id,
    discoverySessionHash: session.hash,
  }
}
