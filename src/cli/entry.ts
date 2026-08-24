#!/usr/bin/env node
// SYNTH-LOADER-001: thin CLI entrypoint.
//
// Light commands (version / help) are served inline so they never load the
// heavy synth.js module graph (which eagerly imports core/bootstrap.js and runs
// the 13-step bootstrap on every invocation). Every other command is lazily
// imported, so the heavy machinery only loads when actually needed.
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"
import { runStatus } from "./status-light.js"
import { runExplainReplay, parseReplayFlags } from "./explain-replay-light.js"
import { parseExplainFlags } from "./explain-flags.js"

const LIGHT_COMMANDS = new Set(["version", "--version", "-v", "help", "--help", "-h", "status"])

function projectVersion(): string {
  const pkgPath = fileURLToPath(new URL("../../package.json", import.meta.url))
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }
  return pkg.version ?? "0.0.0"
}

const COMMAND_LIST: ReadonlyArray<readonly [string, string]> = [
  ["init", "Initialize a repository as a Synth project"],
  ["status", "Inspect current mission / expedition state"],
  ["explain", "Explain operations (replay, lineage, proposals, snapshots, graph)"],
  ["log", "Query the governance event log (read-only)"],
  ["doctor", "Verify installation and project health"],
  ["capabilities", "Expose what the installed CLI can and cannot do"],
  ["validate", "Analyze changes, plan, and run validations"],
  ["govern", "Run the full governance pipeline"],
  ["mission", "Mission Studio operations"],
  ["expedition", "Expedition lifecycle and inventory operations"],
  ["program", "Governance program inventory"],
  ["project", "Project-level derived artifacts (AGENTS.md)"],
  ["alignment", "Intent alignment and divergence governance"],
  ["intent", "Intent model operations"],
  ["discover", "Produce a read-only analysis of a repository"],
  ["bootstrap", "Transform a repository into a Synth project"],
  ["first-contact", "Guided onboarding entry point"],
  ["genesis", "Alias of first-contact"],
  ["adapter", "Delegate to the adapter management CLI"],
  ["ai", "AI agent interoperability"],
  ["repo", "Repository release and branch operations"],
  ["snapshot", "Git-anchored governance state snapshots"],
  ["docs", "Documentation operations"],
  ["repair", "Runtime repair operations"],
  ["certify", "Run failure and recovery certification scenarios"],
  ["approval", "Two-party approval operations"],
  ["checkpoint", "Run pre-flight checkpoint before implementation"],
  ["migrate", "Legacy migration subsystem"],
  ["help", "Show this help"],
  ["version", "Print the installed Synth version"],
]

function printHelp(): void {
  const version = projectVersion()
  const lines = COMMAND_LIST.map(([name, desc]) => `  ${name.padEnd(14)} ${desc}`)
  console.log(
    `synth v${version}\n` +
      `AI-Native Operator CLI.\n\n` +
      `Usage: synth <command> [options]\n\n` +
      `Commands:\n${lines.join("\n")}\n\n` +
      `Run 'synth <command> --help' for command-specific usage.\n` +
      `Use 'synth status' to inspect the current mission / expedition state.\n`,
  )
}

export async function run(): Promise<void> {
  const command = process.argv[2] ?? "help"

  // `explain replay` and the read-only `explain identity|resume|governance`
  // subcommands are bootstrap-free, so they are served without loading the
  // heavy synth.js graph. Other `explain` subcommands stay heavy.
  if (command === "explain") {
    const sub = process.argv[3]
    if (!sub || sub === "replay") {
      await runExplainReplay(parseReplayFlags(process.argv))
      return
    }
    if (sub === "identity") {
      const { cmdExplainIdentity } = await import("./repository-identity.js")
      await cmdExplainIdentity(parseExplainFlags(process.argv))
      return
    }
    if (sub === "resume") {
      const { cmdExplainResume } = await import("./resume-briefing.js")
      await cmdExplainResume(parseExplainFlags(process.argv))
      return
    }
    if (sub === "governance") {
      const { cmdExplainGovernance } = await import("./explain-governance.js")
      await cmdExplainGovernance(parseExplainFlags(process.argv))
      return
    }
  }

  if (LIGHT_COMMANDS.has(command)) {
    if (command === "status") {
      await runStatus()
      return
    }
    if (command === "help" || command === "--help" || command === "-h") {
      printHelp()
    } else {
      console.log(projectVersion())
    }
    return
  }

  // Heavy path: lazily load the full CLI only when actually needed.
  const { main } = await import("./synth.js")
  await main()
}

// SYNTH-LOADER-001: only auto-run when executed directly; tests import { run }.
const isMainModule = (): boolean => {
  if (!process.argv[1]) return false
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

if (isMainModule()) {
  run().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
