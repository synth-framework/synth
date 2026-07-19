// ============================================================
// SEMANTIC MODELING: Domain Modeling
// ============================================================
// Public API for EXP-SEMANTIC-002 — Domain Modeling Engine.
// ============================================================

export * from "./types.js"
export { buildDomainModel } from "./engine.js"
export { RuleBasedDomainModelingAdapter } from "./adapters/rule-based-adapter.js"
