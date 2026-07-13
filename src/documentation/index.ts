// ============================================================
// DOCUMENTATION EXPEDITION: Public Surface
// ============================================================

export { extractMarkdownKnowledge } from "./extractors/markdown.js"
export { buildKnowledgeGraph } from "./knowledge-graph.js"
export { normalizeGraph } from "./normalizer.js"
export {
  projectToReadme,
  projectToArchitecture,
  projectToApiReference,
  projectToOperatorGuide,
  projectToDeveloperGuide,
  projectToArchitectGuide,
  projectToAiContext,
  projectAll,
} from "./projections/engine.js"
export {
  runDocumentationExpedition,
  documentFromKnowledgeBase,
  extractDirectoryKnowledge,
} from "./documentation-expedition.js"
export type {
  MarkdownKnowledge,
  Concept,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
  Projection,
} from "./types.js"
