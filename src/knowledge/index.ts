// ============================================================
// KNOWLEDGE: Canonical Knowledge Model
// ============================================================
// Public API for EXP-KNOWLEDGE-001 — Canonical Knowledge Model.
// ============================================================

export * from "./types.js"
export { buildKnowledgeGraph, projectKnowledge, detectDrift } from "./engine.js"
export { RuleBasedKnowledgeAdapter } from "./adapters/rule-based-adapter.js"
export * from "./validation/index.js"
