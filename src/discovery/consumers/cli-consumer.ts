// ============================================================
// DISCOVERY CONSUMER: CLI
// ============================================================
// Integration consumer that projects the fields needed by the
// bootstrap CLI from a DiscoverySession. It depends only on the
// project-model and findings projections.
// ============================================================

import type {
  DiscoveryConsumer,
  DiscoverySession,
  Finding,
  NamedConfidence,
  ProjectModel,
} from "../types.js"
import type {
  PlanningObservation,
  PlanningObservationConfidence,
  PlanningObservationType,
} from "../../planning/observation.js"

export const CLI_CONSUMER_ID = "discovery:cli-consumer"
export const CLI_CONSUMER_VERSION = "1.0.0"

export type CliConsumerOutput = {
  repositoryType: string
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasPackageManager: boolean
  fileCount: number
  observationCount: number
  discoverySessionId: string
  discoverySessionHash: string
}

export interface CliConsumerContext {
  projectName?: string
}

export type RepositoryType = "empty" | "node" | "python" | "polyglot" | "brownfield" | "unknown"

const CONFIG_LANGUAGES = new Set(["Markdown", "JSON", "YAML", "Shell"])

export function mapConfidenceLabel(
  label: NamedConfidence["confidence"]["label"],
): PlanningObservationConfidence {
  if (label === "none") return "unknown"
  return label
}

export function classifyRepository(projectModel: ProjectModel): RepositoryType {
  if (projectModel.fileCount === 0) {
    return "empty"
  }

  const ecosystems = new Set<"node" | "python">()

  const primaryLanguages = projectModel.languages
    .map((language) => language.name)
    .filter((name) => !CONFIG_LANGUAGES.has(name))

  if (primaryLanguages.some((name) => name === "JavaScript" || name === "TypeScript")) {
    ecosystems.add("node")
  }
  if (primaryLanguages.some((name) => name === "Python")) {
    ecosystems.add("python")
  }

  for (const runtime of projectModel.runtimes) {
    if (runtime.name === "Node.js") ecosystems.add("node")
  }

  if (projectModel.packageManager) {
    if (projectModel.packageManager.name === "npm") ecosystems.add("node")
    if (projectModel.packageManager.name === "pip/poetry") ecosystems.add("python")
  }

  if (ecosystems.size > 1) {
    return "polyglot"
  }

  if (primaryLanguages.length === 0 && ecosystems.size === 0 && projectModel.fileCount > 5) {
    return "brownfield"
  }

  if (ecosystems.has("node")) return "node"
  if (ecosystems.has("python")) return "python"
  return "unknown"
}

function makeObservation(
  type: PlanningObservationType,
  subject: string,
  evidenceReference: string,
  confidence: PlanningObservationConfidence,
  overrides: Record<string, unknown> = {},
): PlanningObservation {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "synth-bootstrap",
    type,
    payload: { subject, name: subject, ...overrides },
    evidenceReference,
    confidence,
    timestamp: Date.now(),
  }
}

function mapFindingType(category: Finding["category"]): PlanningObservationType {
  if (category === "unknown") return "unknown"
  return "risk"
}

export function canonicalLanguages(projectModel: ProjectModel): string[] {
  const names = new Set(projectModel.languages.map((language) => language.name))
  const languages: string[] = []

  if (names.has("JavaScript") || names.has("TypeScript")) {
    languages.push("JavaScript/TypeScript")
  }
  if (names.has("Python")) {
    languages.push("Python")
  }

  return languages
}

export function buildObservations(
  repositoryType: RepositoryType,
  projectModel: ProjectModel,
  findings: { items: Finding[] },
): PlanningObservation[] {
  const observations: PlanningObservation[] = []
  const languages = canonicalLanguages(projectModel)

  const missionSubject =
    repositoryType === "empty"
      ? "New Synth Project"
      : `${repositoryType.charAt(0).toUpperCase() + repositoryType.slice(1)} Repository Migration`

  const missionPurpose =
    repositoryType === "empty"
      ? "Initialize a deterministic Synth project from scratch."
      : `Adopt Synth governance for a ${repositoryType} repository with ${languages.join(", ") || "unknown language"}.`

  observations.push(
    makeObservation(
      "mission",
      missionSubject,
      "evidence-mission",
      mapConfidenceLabel(projectModel.lifecycleStage.confidence.label),
      {
        purpose: missionPurpose,
        lifecycleStage: projectModel.lifecycleStage.value,
      },
    ),
  )

  for (const language of languages) {
    observations.push(
      makeObservation(
        "language",
        language,
        "evidence-language",
        "high",
        { repositoryType },
      ),
    )
  }

  for (const framework of projectModel.frameworks) {
    observations.push(
      makeObservation(
        "framework",
        framework.name,
        "evidence-framework",
        mapConfidenceLabel(framework.confidence.label),
        { repositoryType },
      ),
    )
  }

  for (const capability of projectModel.capabilities) {
    observations.push(
      makeObservation(
        "capability",
        capability.name,
        "evidence-capability",
        capability.available ? "high" : "low",
        { available: capability.available, repositoryType },
      ),
    )
  }

  for (const finding of findings.items) {
    observations.push(
      makeObservation(
        mapFindingType(finding.category),
        finding.description,
        finding.id,
        mapConfidenceLabel(finding.confidence.label),
        {
          category: finding.category,
          severity: finding.severity,
          repositoryType,
        },
      ),
    )
  }

  return observations.slice(0, 20)
}

/**
 * Create the CLI bootstrap consumer.
 *
 * Projects a concise, deterministic summary of the repository from the
 * DiscoverySession. The bootstrap analyzer maps this summary back into
 * the legacy RepositoryAnalysis shape.
 */
export function createCliConsumer(): DiscoveryConsumer<CliConsumerContext, CliConsumerOutput> {
  return {
    id: CLI_CONSUMER_ID,
    version: CLI_CONSUMER_VERSION,
    kind: "integration",
    description: "Projects repository summary fields for the bootstrap CLI.",
    requiredProjections: ["project-model", "findings"],

    consume(session: DiscoverySession, _context?: CliConsumerContext): CliConsumerOutput {
      const projectModel = session.projections["project-model"] as ProjectModel | undefined
      if (!projectModel) {
        throw new Error("Discovery session did not produce a project-model projection")
      }

      const findings = (session.projections.findings as { items: Finding[] } | undefined) ?? {
        items: [],
      }

      const repositoryType = classifyRepository(projectModel)
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
        observationCount: observations.length,
        discoverySessionId: session.id,
        discoverySessionHash: session.hash,
      }
    },
  }
}
