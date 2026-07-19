// ============================================================
// SEMANTIC MODELING: Intent Modeling
// ============================================================
// Public API for EXP-SEMANTIC-001 — Intent Modeling Engine.
// ============================================================

export * from "./types.js"
export { buildIntentModel } from "./engine.js"
export { RuleBasedIntentModelingAdapter } from "./adapters/rule-based-adapter.js"
