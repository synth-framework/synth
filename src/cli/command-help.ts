// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { printHelp } from "./usage.js"
import { printVersion } from "./version.js"
import { __dirname } from "./command-location.js"


export async function getVersion(): Promise<string> {
  try {
    const packagePath = path.resolve(__dirname, "..", "..", "package.json")
    const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
    return String(packageJson.version || "unknown")
  } catch {
    return "unknown"
  }
}


export async function cmdVersion() {
  // EXP-CLI-001: one implementation, shared with the light dispatcher. The JSON
  // envelope is canonical for every caller (operator decision 2026-10-13); the
  // documented global --human flag opts into the bare version string.
  printVersion(await getVersion(), process.argv.includes("--human"))
}


export async function cmdHelp() {
  // EXP-CLI-001: one help renderer, shared with the light dispatcher. Prose on a
  // TTY, JSON envelope when piped (operator decision 2026-10-13); --json and
  // --human override the heuristic. The piped payload is byte-identical to the
  // pre-EXP-CLI-001 output, so agent consumers see no change.
  const argv = process.argv.slice(2)
  const human = argv.includes("--json") ? false : argv.includes("--human") ? true : undefined
  printHelp(await getVersion(), human)
}

export function namespaceHelp(
  namespace: string,
  description: string,
  subcommands: Array<{ name: string; description: string; args?: string }>,
  options: { note?: string } = {},
) {
  return {
    status: "ok",
    name: "synth",
    namespace,
    description,
    usage: `synth ${namespace} <subcommand> [options]`,
    subcommands,
    note:
      options.note ??
      `Run 'synth ${namespace} <subcommand> --help' for subcommand details when available.`,
  }
}
