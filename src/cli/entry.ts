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

const LIGHT_COMMANDS = new Set(["version", "--version", "-v", "help", "--help", "-h"])

function projectVersion(): string {
  const pkgPath = fileURLToPath(new URL("../../package.json", import.meta.url))
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string }
  return pkg.version ?? "0.0.0"
}

function printHelp(): void {
  const version = projectVersion()
  process.stdout.write(
    `synth v${version}\n` +
      `AI-Native Operator CLI.\n\n` +
      `Usage: synth <command> [options]\n\n` +
      `Run 'synth <command> --help' for command-specific usage.\n` +
      `Use 'synth status' to inspect the current mission / expedition state.\n`,
  )
}

export async function run(): Promise<void> {
  const command = process.argv[2] ?? "help"

  if (LIGHT_COMMANDS.has(command)) {
    if (command === "help" || command === "--help" || command === "-h") {
      printHelp()
    } else {
      process.stdout.write(`${projectVersion()}\n`)
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
    process.stderr.write(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
