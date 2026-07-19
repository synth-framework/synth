// ============================================================
// BOOTSTRAP: Agent Context Contract
// ============================================================
// Generates .synth/context.json during the brownfield bootstrap
// classification phase. The context becomes the semantic attractor
// for every AI agent interacting with the project.
// ============================================================

import type { DiscoverySession, ProjectModel } from "../discovery/types.js"

export interface AgentContext {
  schema: "synth-agent-context-v1"
  repositoryType: string
  phase: string
  implementationState: "complete" | "partial" | "missing"
  intent: string
  sourceHistory: "AVAILABLE" | "MISSING" | "EXTERNAL" | "UNKNOWN"
  classificationConfidence: string
  generatedAt: string
  derivedFrom: {
    discoverySessionId: string
    discoverySessionHash: string
  }
}

const CONFIG_LANGUAGES = new Set(["Markdown", "JSON", "YAML", "Shell", "Text"])

function repositoryTypeFromModel(model: ProjectModel): string {
  const primaryLanguages = model.languages.filter((lang) => !CONFIG_LANGUAGES.has(lang.name))
  const languageNames = primaryLanguages.map((lang) => lang.name.toLowerCase())
  const hasNode = languageNames.some((name) => name.includes("javascript") || name.includes("typescript"))
  const hasPython = languageNames.some((name) => name.includes("python"))
  const hasMultiple = (hasNode && hasPython) || primaryLanguages.length > 1

  if (model.fileCount === 0) return "greenfield"
  if (hasMultiple) return "brownfield-polyglot"
  if (hasNode) return "brownfield-node"
  if (hasPython) return "brownfield-python"
  return "brownfield-product"
}

function phaseFromModel(model: ProjectModel): string {
  switch (model.lifecycleStage.value) {
    case "specification":
      return "specification-discovery"
    case "design":
      return "design-capture"
    case "implementation":
      return "architecture-discovery"
    case "operation":
      return "operational-baseline"
    case "maintenance":
      return "maintenance-baseline"
    default:
      return "architecture-discovery"
  }
}

function implementationStateFromModel(model: ProjectModel): AgentContext["implementationState"] {
  if (model.fileCount === 0) return "missing"
  if (model.unknowns.length > 0 || model.lifecycleStage.value === "unknown") return "partial"
  return "complete"
}

function intentFromModel(model: ProjectModel): string {
  if (model.intent.statement && model.intent.statement !== "unknown") {
    return model.intent.statement
  }
  if (model.fileCount === 0) {
    return "initialize a new system under governance"
  }
  return "transform existing system under governance"
}

function confidenceFromModel(model: ProjectModel): string {
  const label = model.lifecycleStage.confidence.label
  if (label === "certain" || label === "high") return "high"
  if (label === "medium") return "medium"
  return "low"
}

/**
 * Generate an Agent Context Contract from a DiscoverySession and ProjectModel.
 */
export function generateAgentContext(
  projectModel: ProjectModel,
  session: DiscoverySession,
  sourceHistory: AgentContext["sourceHistory"],
): AgentContext {
  return {
    schema: "synth-agent-context-v1",
    repositoryType: repositoryTypeFromModel(projectModel),
    phase: phaseFromModel(projectModel),
    implementationState: implementationStateFromModel(projectModel),
    intent: intentFromModel(projectModel),
    sourceHistory,
    classificationConfidence: confidenceFromModel(projectModel),
    generatedAt: new Date().toISOString(),
    derivedFrom: {
      discoverySessionId: session.id,
      discoverySessionHash: session.hash,
    },
  }
}
