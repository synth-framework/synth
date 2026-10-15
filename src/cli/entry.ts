#!/usr/bin/env node
// SYNTH-LOADER-001: thin CLI entrypoint.
//
// Light commands (version / help / status) are served inline so they never load
// the heavy synth.js module graph (which eagerly imports core/bootstrap.js and
// runs the 13-step bootstrap on every invocation). Every other command is lazily
// imported, so the heavy machinery only loads when actually needed.
//
// EXP-CLI-001: the light handlers no longer carry their own copy of the CLI
// surface. Version and help come from ./version.js and ./usage.js, which the
// monolith imports as well, so both entry points answer identically. Before this
// they had drifted in four measurable ways: this file printed a bare semver
// where synth.js printed a JSON envelope; it printed prose help where synth.js
// printed a JSON envelope; its 30-command list omitted `verify`, `task`,
// `release` and `report`; and it ignored the global --human / --json / --quiet /
// --summary flags entirely, so `synth status --human` answered with JSON.
import { fileURLToPath } from "url"
import path from "path"
import { resolveLightExplain, runExplainFromArgv } from "./verb-registry.js"
import { projectVersion, printVersion } from "./version.js"
import { printHelp } from "./usage.js"
import { setHumanMode, setQuietMode, setSummaryMode } from "./output.js"

const LIGHT_COMMANDS = new Set(["version", "--version", "-v", "help", "--help", "-h", "status"])

/**
 * Apply the global output flags on the light path exactly as synth.js's main()
 * applies them on the heavy path.
 *
 * Returns the caller's explicit request for prose (true) or JSON (false), or
 * undefined when they asked for neither — which lets a TTY heuristic decide for
 * help. Precedence is `--json` over `--human` over the TTY, so an explicit flag
 * always beats the heuristic and a piped invocation is always machine-readable.
 */
function applyOutputFlags(argv: readonly string[]): boolean | undefined {
  if (argv.includes("--quiet") || argv.includes("--no-bootstrap-logs")) setQuietMode(true)
  if (argv.includes("--summary")) setSummaryMode(true)

  const json = argv.includes("--json")
  const human = argv.includes("--human")
  // EXP-DISC-004: --json requests machine-clean output, so diagnostic logs are
  // suppressed on stderr. Mirrors the heavy path.
  if (json) process.env.SYNTH_QUIET_LOGS = "1"
  if (human) setHumanMode(true)

  if (json) return false
  if (human) return true
  return undefined
}

export async function run(): Promise<void> {
  const command = process.argv[2] ?? "help"
  const argv = process.argv.slice(2)
  // `explain replay` and the read-only `explain identity|resume|governance`
  // subcommands are bootstrap-free, so they are served without loading the
  // heavy synth.js graph. Other `explain` subcommands stay heavy. Which subs
  // exist, which are light, which module serves each, and how each parses its
  // flags now live in verb-registry.ts: one routing authority shared with
  // synth.ts's dispatch, instead of two hand-written if-chains that had
  // drifted (this one knew four subcommands, synth.ts knew twelve).
  // EXP-CLI-003 item 3.
  if (command === "explain") {
    const light = resolveLightExplain(process.argv[3])
    if (light) {
      await runExplainFromArgv(light, process.argv)
      return
    }
  }

  if (LIGHT_COMMANDS.has(command)) {
    const human = applyOutputFlags(argv)

    if (command === "status") {
      // status-light is imported here, not at module scope: `--version` and
      // `help` must not pay for the 33 modules / 151 KB that `status` genuinely
      // needs (the governance resolver alone is 119 modules / 820 KB behind it).
      // runStatus() renders through printJson, which honours the human/summary
      // modes set above — this is what makes `status --human` work here.
      const { runStatus } = await import("./status-light.js")
      await runStatus()
      return
    }
    if (command === "help" || command === "--help" || command === "-h") {
      // Operator decision 2026-10-13: prose on a TTY, JSON envelope when piped.
      printHelp(projectVersion(), human)
    } else {
      // Operator decision 2026-10-13: the JSON envelope is canonical for every
      // caller; --human opts into the bare string. No TTY heuristic here, so a
      // human at a terminal still gets machine-readable output by default.
      printVersion(projectVersion(), human === true)
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
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`synth: ${message}\n`)
  if (err instanceof Error && err.stack) process.stderr.write(`${err.stack}\n`)
  process.exit(1)
})
}
