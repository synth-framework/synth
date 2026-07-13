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
export function projectAll(graph: KnowledgeGraph): Projection[] {
  return [
    { filename: "README.md", title: "README", content: projectToReadme(graph) },
    { filename: "ARCHITECTURE.md", title: "Architecture", content: projectToArchitecture(graph) },
    { filename: "API.md", title: "API Reference", content: projectToApiReference(graph) },
    { filename: "OPERATOR_GUIDE.md", title: "Operator Guide", content: projectToOperatorGuide(graph) },
    { filename: "DEVELOPER_GUIDE.md", title: "Developer Guide", content: projectToDeveloperGuide(graph) },
    { filename: "ARCHITECT_GUIDE.md", title: "Architect Guide", content: projectToArchitectGuide(graph) },
    { filename: "AI_CONTEXT.md", title: "AI Context", content: projectToAiContext(graph) },
  ]
}
