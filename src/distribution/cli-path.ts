// Resolve recursive CLI calls within this installation, never inside the
// operator's project cwd. Preserve a recognized compatibility entry point;
// library callers and unknown argv[1] values use the shipped dispatcher.
import { realpathSync } from "node:fs"
import { fileURLToPath } from "node:url"

export function resolveSynthCli(argv1: string | undefined = process.argv[1]): string {
  const shipped = fileURLToPath(new URL("../cli/entry.js", import.meta.url))
  const compatibility = fileURLToPath(new URL("../cli/synth.js", import.meta.url))
  if (argv1) {
    try {
      const resolved = realpathSync(argv1)
      if (resolved === shipped || resolved === compatibility) return resolved
    } catch {
      // An absent/foreign launcher is not evidence of a CLI in the project.
    }
  }
  return shipped
}
