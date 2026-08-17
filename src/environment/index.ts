// ============================================================
// ENVIRONMENT: Compatibility Exports
// ============================================================
// This module re-exports the canonical discovery types and the
// remaining environment orchestration types. New code should import
// capability projections and evidence types from src/discovery/.
// ============================================================

export * from "./types.js"
export * from "./rules.js"
export * from "./orchestrator.js"
export * from "../discovery/node-context.js"
export * from "./providers/reference.js"
export * from "../infra/filesystem-provider.js"
export * from "./evidence.js"
