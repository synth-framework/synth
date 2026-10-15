// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printError } from "./print.js"
import { cmdMigrateDetect, cmdMigratePlan, cmdMigrateArchive, cmdMigrateImport } from "./migrate.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "detect") await cmdMigrateDetect(positional.slice(2))
  else if (sub === "plan") await cmdMigratePlan(positional.slice(2), flags)
  else if (sub === "archive") await cmdMigrateArchive(positional.slice(2), flags)
  else if (sub === "import") await cmdMigrateImport(positional.slice(2), flags)
  else
    printError(
      "Usage: synth migrate detect [path] | synth migrate plan [path] [--path archive|import] | synth migrate archive [path] [--approve] | synth migrate import [path] [--source <path>] [--approve]",
    )
}
