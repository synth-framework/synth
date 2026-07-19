// ============================================================
// DOCUMENTATION EXPEDITION: Projection Engine
// ============================================================
// Renders a knowledge graph into each target documentation format.
// ============================================================

import type { KnowledgeGraph, Projection } from "../types.js"
import {
  readmeTemplate,
  architectureTemplate,
  apiReferenceTemplate,
  operatorGuideTemplate,
  developerGuideTemplate,
  architectGuideTemplate,
  aiContextTemplate,
} from "./templates.js"

export function projectToReadme(graph: KnowledgeGraph): string {
  return readmeTemplate(graph)
}

export function projectToArchitecture(graph: KnowledgeGraph): string {
  return architectureTemplate(graph)
}

export function projectToApiReference(graph: KnowledgeGraph): string {
  return apiReferenceTemplate(graph)
}

export function projectToOperatorGuide(graph: KnowledgeGraph): string {
  return operatorGuideTemplate(graph)
}

export function projectToDeveloperGuide(graph: KnowledgeGraph): string {
  return developerGuideTemplate(graph)
}

export function projectToArchitectGuide(graph: KnowledgeGraph): string {
  return architectGuideTemplate(graph)
}

export function projectToAiContext(graph: KnowledgeGraph): string {
  return aiContextTemplate(graph)
}

/**
 * Project a knowledge graph into the full documentation set.
 */
export const DOCUMENTATION_CAPABILITIES = [
  { id: "readme", title: "README", filename: "README.md", description: "Project overview and key concepts" },
  { id: "architecture", title: "Architecture", filename: "ARCHITECTURE.md", description: "System architecture and design decisions" },
  { id: "api-reference", title: "API Reference", filename: "API.md", description: "Public API and interface reference" },
  { id: "operator-guide", title: "Operator Guide", filename: "OPERATOR_GUIDE.md", description: "Day-to-day operator workflows" },
  { id: "developer-guide", title: "Developer Guide", filename: "DEVELOPER_GUIDE.md", description: "Developer onboarding and conventions" },
  { id: "architect-guide", title: "Architect Guide", filename: "ARCHITECT_GUIDE.md", description: "Architectural rationale and trade-offs" },
  { id: "ai-context", title: "AI Context", filename: "AI_CONTEXT.md", description: "Context optimized for AI assistants" },
]

/**
 * Project a knowledge graph into the full documentation set.
 */
export function projectAll(graph: KnowledgeGraph): Projection[] {
  return DOCUMENTATION_CAPABILITIES.map((cap) => {
    switch (cap.id) {
      case "readme":
        return { filename: cap.filename, title: cap.title, content: projectToReadme(graph) }
      case "architecture":
        return { filename: cap.filename, title: cap.title, content: projectToArchitecture(graph) }
      case "api-reference":
        return { filename: cap.filename, title: cap.title, content: projectToApiReference(graph) }
      case "operator-guide":
        return { filename: cap.filename, title: cap.title, content: projectToOperatorGuide(graph) }
      case "developer-guide":
        return { filename: cap.filename, title: cap.title, content: projectToDeveloperGuide(graph) }
      case "architect-guide":
        return { filename: cap.filename, title: cap.title, content: projectToArchitectGuide(graph) }
      case "ai-context":
        return { filename: cap.filename, title: cap.title, content: projectToAiContext(graph) }
      default:
        throw new Error(`Unknown documentation capability: ${cap.id}`)
    }
  })
}
