// ============================================================
// CLI: telemetry / args
// ============================================================
// Extracted from src/cli/synth.ts by EXP-CLI-003 item 3.
//
// The goal names this as one of the four helper clusters that must be extracted
// ONCE into a module of its own, so that when the 97 cmd* handlers move out of
// the 9120-line dispatcher into a verb -> loader registry they import these from
// one home instead of duplicating them. Duplication is exactly how entry.ts and
// synth.ts drifted apart in the first place.
//
// Behaviour is unchanged: the same code, the same module-scope state, moved.
// Anything that was module-private in synth.ts and is only used here stays
// private here; anything a caller in synth.ts still needs is exported.
// ============================================================

// Wraps shared setAgentTelemetry to parse CLI flags into telemetry data.
import { setAgentTelemetry, printJson, printError, setHumanMode, setQuietMode, setSummaryMode } from "./print.js"

export function setAgentTelemetryFromFlags(flags: Record<string, string | boolean>) {
  const telemetry: Record<string, unknown> = {}
  if (typeof flags["agent-session"] === "string" && flags["agent-session"].length > 0) {
    telemetry.agentSession = flags["agent-session"]
  }
  if (
    typeof flags["agent-reasoning-state"] === "string" &&
    flags["agent-reasoning-state"].length > 0
  ) {
    try {
      telemetry.agentReasoningState = JSON.parse(flags["agent-reasoning-state"])
    } catch {
      telemetry.agentReasoningState = { parseError: flags["agent-reasoning-state"] }
    }
  }
  setAgentTelemetry(telemetry)
}

export function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  function appendFlagValue(name: string, value: string | boolean) {
    // Repeated --scope and --task flags are combined into a comma-separated
    // list so command handlers can split them without changing the flags type.
    if ((name === "scope" || name === "task") && typeof value === "string" && typeof flags[name] === "string") {
      flags[name] = `${flags[name]},${value}`
    } else {
      flags[name] = value
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const [key, value] = arg.split("=")
      const name = key.slice(2)
      if (value !== undefined) {
        appendFlagValue(name, value)
      } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        appendFlagValue(name, args[i + 1])
        i++
      } else {
        flags[name] = true
      }
    } else if (arg.startsWith("-")) {
      const name = arg.slice(1)
      flags[name] = true
    } else {
      positional.push(arg)
    }
  }

  return { positional, flags }
}

