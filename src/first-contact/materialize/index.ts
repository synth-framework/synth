// ============================================================
// FIRST CONTACT: Mission Materialization
// ============================================================
// Public API for EXP-AIFC-007 — Mission Materialization Pipeline.
// ============================================================

export * from "./types.js"
export { materialize } from "./engine.js"
export { recommendAdapters, selectWorkflowTemplate, getAdapterVersion } from "./recommend.js"
export { WORKFLOW_TEMPLATES } from "./templates/index.js"
