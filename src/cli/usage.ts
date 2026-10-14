// ============================================================
// SYNTH v2 — canonical CLI surface (EXP-CLI-001)
// ============================================================
// ONE list of commands and ONE help renderer, reached from both entry points.
//
// Before this module the surface was forked: `dist/cli/entry.js` (the shipped
// `bin`) carried its own 30-entry COMMAND_LIST and printed prose, while
// `dist/cli/synth.js` (what 98% of the test suite spawns) carried a 33-entry
// COMMANDS and printed a JSON envelope. The fork had drifted: the shipped help
// omitted `verify`, `task`, `release` and `report` entirely, and 21 of the 29
// shared names carried different descriptions.
//
// Operator decisions, 2026-10-13:
//   * help/--help/-h emit PROSE when stdout is a TTY and the JSON envelope when
//     it is not (agents, pipes, CI). `--human` forces prose, `--json` forces
//     JSON. The TTY rule applies to help only; every other verb stays
//     JSON-by-default so agent consumers are unaffected.
//   * the command list is unified on the monolith's richer wording, so the
//     shipped help names all 33 verbs.
//
// Kept deliberately light: this module is imported by the dispatcher, so it may
// only depend on ./output.js (which pulls sdk/paths) and node builtins.
// ============================================================
import { printJson } from "./output.js"

export const COMMANDS: ReadonlyArray<{ name: string; description: string }> = [
  { name: "version", description: "Print the installed Synth version" },
  { name: "doctor", description: "Verify installation and project health" },
  { name: "checkpoint", description: "Run pre-flight checkpoint before implementation work" },
  { name: "init", description: "Initialize the current directory as a Synth project" },
  { name: "bootstrap", description: "Transform a repository into a Synth project" },
  { name: "discover", description: "Produce a read-only analysis of a repository" },
  { name: "govern", description: "Run the full governance pipeline" },
  { name: "validate", description: "Analyze changes, plan validations, and execute them (--dry-run, --full)" },
  { name: "verify", description: "Verify governance invariants, projection consistency, and event-log signatures" },
  { name: "approval", description: "Two-party approval operations (request, grant, deny, list, show)" },
  { name: "status", description: "Report the current project state" },
  { name: "report", description: "Print a global human-readable project report" },
  { name: "mission", description: "Mission Studio operations (create, approve, snapshot)" },
  { name: "program", description: "Governance program inventory (list)" },
  { name: "project", description: "Project-level derived artifacts" },
  { name: "intent", description: "Intent model operations (create)" },
  { name: "alignment", description: "Intent alignment and divergence governance (prepare)" },
  { name: "expedition", description: "Expedition lifecycle (create, approve, commit, start, complete, archive, list)" },
  { name: "docs", description: "Documentation operations (generate)" },
  { name: "explain", description: "Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)" },
  { name: "repair", description: "Repair operations (replay)" },
  { name: "release", description: "Deterministic, operator-approved release versioning" },
  { name: "certify", description: "Run failure and recovery certification scenarios" },
  { name: "capabilities", description: "List installed and missing CLI capabilities" },
  { name: "first-contact", description: "Guided onboarding entry point (greenfield, brownfield, legacy) and greenfield workflow (start, clarify, project, verify, approve, materialize, status)" },
  { name: "genesis", description: "Alias for the greenfield onboarding workflow (first-contact)" },
  { name: "ai", description: "AI agent interoperability (refresh)" },
  { name: "repo", description: "Repository and release governance operations" },
  { name: "snapshot", description: "Create, list, show, and verify git-anchored governance snapshots" },
  { name: "adapter", description: "Delegate to the adapter management CLI" },
  { name: "log", description: "Query the governance event log (read-only)" },
  { name: "task", description: "Canonical task orchestration (list, explain, graph, doctor)" },
  { name: "migrate", description: "Detect, plan, archive, and import legacy Synth state (detect, plan, archive, import)" },
]

export const PUBLIC_VOCABULARY: readonly string[] = [
  "Mission",
  "Expedition",
  "Evidence",
  "Plan",
  "Event",
  "State",
  "Replay",
]

export const GLOBAL_OPTIONS: ReadonlyArray<{ name: string; description: string }> = [
      { name: "--json", description: "Emit machine-clean JSON and suppress diagnostic logs to stderr" },
      { name: "--human", description: "Emit prose summaries instead of JSON" },
      { name: "--quiet", description: "Suppress bootstrap and diagnostic INFO/WARN/DEBUG logs" },
      { name: "--no-bootstrap-logs", description: "Alias for --quiet; suppress bootstrap and diagnostic logs" },
      { name: "--summary", description: "Emit a condensed summary: status, kind, id, and next step" },
      { name: "--discovery-mode", description: "Reject mutating commands; safe for read-only exploration" },
    ]

export const HELP_USAGE = "synth <command> [options]"
export const HELP_DESCRIPTION = "AI-native operator CLI for SYNTH v2"
export const HELP_NOTE = "All output is JSON by default for agent consumption."

/** The machine-readable help payload. Byte-identical to the pre-EXP-CLI-001 `cmdHelp` output. */
export function helpPayload() {
  return {
    status: "ok",
    name: "synth",
    description: HELP_DESCRIPTION,
    usage: HELP_USAGE,
    commands: COMMANDS,
    vocabulary: PUBLIC_VOCABULARY,
    globalOptions: GLOBAL_OPTIONS,
    note: HELP_NOTE,
  }
}

/** The operator-facing prose form, rendered from the same canonical list. */
export function renderHelpText(version: string): string {
  const lines = COMMANDS.map((c) => `  ${c.name.padEnd(14)} ${c.description}`)
  return (
    `synth v${version}\n` +
    `${HELP_DESCRIPTION}\n\n` +
    `Usage: ${HELP_USAGE}\n\n` +
    `Commands:\n${lines.join("\n")}\n\n` +
    `Run 'synth <command> --help' for command-specific usage.\n` +
    `Use 'synth status' to inspect the current mission / expedition state.\n`
  )
}

/**
 * Print help in the mode the caller asked for, defaulting to prose on a TTY.
 * `human` left undefined means "decide from stdout"; `--json` passes false and
 * `--human` passes true, so an explicit flag always beats the TTY heuristic.
 */
export function printHelp(version: string, human?: boolean): void {
  const asProse = human ?? Boolean(process.stdout.isTTY)
  if (asProse) console.log(renderHelpText(version))
  else printJson(helpPayload())
}
