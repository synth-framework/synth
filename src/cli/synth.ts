#!/usr/bin/env node
// CLI preflight and lazy namespace dispatch. Handler implementations live in commands-*.ts.
import path from "path"
import { fileURLToPath } from "url"
import { printError, setHumanMode, setQuietMode, setSummaryMode } from "./print.js"
import { initCliIdentity } from "./identity-context.js"
import { isSafeForDiscovery, assertSafeForDiscovery, classifyInvocation } from "./command-safety.js"
import { setAgentTelemetryFromFlags, parseArgs } from "./cli-args.js"
import { flushPendingCeremony } from "./auto-commit-ceremony.js"
import { setAutoCommitDisabledByFlag } from "./working-tree.js"
import { cmdHelp, cmdVersion } from "./command-help.js"
import { getNamespaceLoader, getNamespaceHelp } from "./verb-registry.js"


export async function main() {
  const rawArgs = process.argv.slice(2)

  if (rawArgs.length === 0) {
    await cmdHelp()
    return
  }

  // EXP-BROWNFIELD-001: every command namespace owns its help.
  // This must be checked before the generic --help handler.
  const namespaceHelp = getNamespaceHelp(rawArgs)
  if (namespaceHelp) {
    await namespaceHelp()
    return
  }

  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    await cmdHelp()
    return
  }

  if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
    await cmdVersion()
    return
  }

  // EXP-DISC-004: --json requests machine-clean output. Suppress diagnostic
  // INFO/WARN/DEBUG logs to stderr; ERROR logs are still emitted.
  const jsonFlag = rawArgs.includes("--json")
  if (jsonFlag) {
    process.env.SYNTH_QUIET_LOGS = "1"
  }

  // EXP-QUIET-001: global --quiet and --no-bootstrap-logs suppress bootstrap and diagnostic logs.
  const quietFlag = rawArgs.includes("--quiet") || rawArgs.includes("--no-bootstrap-logs")
  if (quietFlag) {
    setQuietMode(true)
  }

  // EXP-QUIET-001: global --summary emits a condensed status/ID/next-step summary.
  const summaryFlag = rawArgs.includes("--summary")
  if (summaryFlag) {
    setSummaryMode(true)
  }

  // EXP-BROWNFIELD-001: Discovery Safety Model flag. Treat it as a boolean
  // sentinel and remove it from parsing so it does not consume the next
  // positional argument.
  const discoveryModeFlag = rawArgs.includes("--discovery-mode")
  const filteredArgs = rawArgs.filter((arg) =>
    arg !== "--json" &&
    arg !== "--discovery-mode" &&
    arg !== "--quiet" &&
    arg !== "--no-bootstrap-logs" &&
    arg !== "--summary"
  )
  const { positional, flags } = parseArgs(["node", process.argv[1], ...filteredArgs])
  setAutoCommitDisabledByFlag(flags["no-auto-commit"] === true || flags["no-auto-commit"] === "true")

  // Propagate the global --json flag to subcommands that need to know it
  // (e.g., synth explain ... --json), while still keeping it out of the
  // positional arguments passed to delegated CLIs.
  if (jsonFlag) {
    flags.json = true
  }

  // Propagate the global --summary flag to subcommands that consume it
  // (e.g., synth explain ... --summary), while keeping it out of the
  // positional arguments passed to delegated CLIs.
  if (summaryFlag) {
    flags.summary = true
  }

  // EXP-FIRSTCONTACT-010: when running as part of an agent first-contact
  // experiment, merge telemetry (agent session and reasoning state) into
  // every JSON response so the CLI acts as an experimental sensor.
  setAgentTelemetryFromFlags(flags)

  // EXP-CLI-002: global --human flag switches CLI output to prose summaries.
  if (flags.human === true) {
    setHumanMode(true)
  }

  // EXP-IDENTITY-001: capture agent identity once at process startup.
  // Commands invoked with --approve are treated as human-approved.
  const identityOverride: Partial<import("../identity/types.js").AgentIdentity> = {}
  if (flags.approve === true || flags.approve === "true") {
    identityOverride.approvalMode = "human-approved"
  }
  initCliIdentity(identityOverride)

  const command = positional[0]

  // EXP-BROWNFIELD-001: Discovery Safety Model. When --discovery-mode is set
  // or SYNTH_DISCOVERY_MODE is active, reject mutating commands. The operator
  // may opt in to mutation with --discovery-ok (or SYNTH_DISCOVERY_OK=1).
  // Read-only introspection (status, explain, doctor, capabilities, verify,
  // certify, validate, report, help) is always permitted during Discovery.
  const discoveryMode = discoveryModeFlag || process.env.SYNTH_DISCOVERY_MODE === "1"
  if (discoveryMode) {
    const discoveryOk = flags["discovery-ok"] === true || process.env.SYNTH_DISCOVERY_OK === "1"
    if (!discoveryOk) {
      const invokedCommand = classifyInvocation(rawArgs, positional, flags)
      if (!isSafeForDiscovery(invokedCommand)) {
        assertSafeForDiscovery(invokedCommand)
      }
    }
  }

  const loader = getNamespaceLoader(command)
  if (!loader) {
    printError(`Unknown command: ${command}. Run 'synth --help' for available commands.`)
  }
  await (await loader()).run(positional, flags)

  // ADR-055 rev 2 §R2.1: no verb may end with an uncommitted ceremony. The
  // handlers that report the commit in their envelope have already flushed;
  // this is the guarantee for every other verb.
  await flushPendingCeremony()
}


// SYNTH-LOADER-001: only run when executed directly (not when imported lazily by
// the thin entrypoint). The entrypoint calls main() itself after dynamic import.
const isMainModule = (): boolean => {
  if (!process.argv[1]) return false
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}


if (isMainModule()) {
  main().catch((err) => {
    printError(err instanceof Error ? err.message : String(err))
  })
}
