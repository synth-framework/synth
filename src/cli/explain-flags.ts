// SYNTH-LOADER-004: shared flag parser for light explain subcommands.
//
// Mirrors the CLI's raw-arg parser (synth.ts parseArgs) for the flags these
// read-only explain handlers consume (`--json`, `--log[=path]`). Positionals
// are ignored because the handlers receive only the `flags` record.
export function parseExplainFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("--")) {
      const [key, value] = arg.split("=")
      const name = key.slice(2)
      if (value !== undefined) {
        flags[name] = value
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        flags[name] = argv[i + 1]
        i++
      } else {
        flags[name] = true
      }
    } else if (arg.startsWith("-")) {
      flags[arg.slice(1)] = true
    }
  }
  return flags
}
