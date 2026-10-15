// EXP-CLI-003 acceptance limits. Measurements are derived afresh, never read
// from a baseline report. Extraction increased the current module count; it
// MUST NOT increase the original 348 * 40% = 139 ordinary-invocation ceiling.
export const ORIGINAL_MODULES = 348
export const ORDINARY_LIMIT = Math.floor(ORIGINAL_MODULES * 0.4)
export const ENTRY_BUDGETS = {
  "dist/cli/entry.js": { modules: 25, bytes: 150 * 1024 },
  "dist/cli/synth.js": { modules: 40, bytes: 180 * 1024 },
  // The one small, canonical planning-adapter name module is shared by the
  // runtime registry and read-only projections. The 348-module denominator
  // and 139-module ordinary ceiling do not change.
  "dist/main.js": { modules: 172, bytes: 1110 * 1024 },
  "dist/distribution/mcp-server.js": { modules: 1, bytes: 11 * 1024 },
  // Direct SDK leaf imports keep the light status entry off unrelated SDK
  // event-store/identity barrels. Pin the smaller eager graph, not 33 modules.
  "dist/cli/status-light.js": { modules: 23, bytes: 130 * 1024 },
}

// Exceptions are invocation-specific, bounded, and tied to work actually
// observed in the trace/output. Checkpoint loads the new canonical runtime
// capability-name module when composing its real briefing (+1 only); its
// replay and execution-branch validation requirements are unchanged.
// Merely loading bootstrap is NOT justification.
// In particular, repo status has no exemption: it is a state projection.
export const PROBES = [
  { id: "version", args: ["--version"], modules: 25, bytes: 150 * 1024, field: "version" },
  { id: "help", args: ["help"], modules: 25, bytes: 150 * 1024, field: "commands" },
  { id: "status", args: ["status"], kind: "OperatorBriefing" },
  { id: "replay", args: ["explain", "replay"], field: "consistent" },
  { id: "missions", args: ["mission", "list"], kind: "MissionList" },
  { id: "expeditions", args: ["expedition", "list"], kind: "ExpeditionList" },
  { id: "first-contact", args: ["first-contact", "--dry-run"], kind: "FirstContactOnboardPlan", statuses: ["pending-approval"] },
  { id: "tasks", args: ["task", "list"], kind: "TaskList" },
  { id: "repository", args: ["repo", "status"], kind: "RepositoryStatus" },
  { id: "adapters", args: ["adapter", "list"], kind: "AdapterList" },
  { id: "log", args: ["log", "--limit", "1"], kind: "EventLogQuery" },
  { id: "validate", args: ["validate", "--diff", ""], kind: "ValidationPlan" },
  {
    id: "doctor", args: ["doctor"], modules: 193, statuses: ["ok", "warning"],
    exception: "Verify persisted state by replaying the real event store through the configured runtime infrastructure; also verify dist, event chain and ledger. Empty-log/skipped replay is not accepted as this measurement.",
    replayPath: ["checks", "replay"],
  },
  {
    id: "checkpoint", args: ["checkpoint"], modules: 207, kind: "AgentCheckpoint", statuses: ["ok", "blocked"],
    exception: "Compose operator briefing, actual persisted replay verification, and repository-adapter execution-branch validation. A lifecycle/branch refusal is valid coverage, but failed or skipped replay is not.",
    replayPath: ["steps", "replay"],
  },
  {
    id: "bootstrap-plan", args: ["bootstrap", ".", "--dry-run"], modules: 220, kind: "BootstrapPlan", statuses: ["pending-approval"],
    exception: "Analyze the repository and generate mission/expedition proposals through the in-memory bootstrap planning engine (bootstrap-apply.generateProposals). Dry-run does real planning, not a help response; it does not apply those proposals.",
  },
]
