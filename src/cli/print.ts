// ============================================================
// SYNTH v2 — CLI Print Compatibility Layer
// ============================================================
// Re-exports the output-mode API from ./output.ts.
// New code should import from ./output.ts directly.
// ============================================================

export {
  setAgentTelemetry,
  setHumanMode,
  setQuietMode,
  setSummaryMode,
  printJson,
  printError,
  type ErrorDetails,
} from "./output.js"
