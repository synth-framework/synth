// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { cmdHelp } from "./command-help.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  // EXP-CLI-001: bare `help` used to fall through to `Unknown command` and
  // exit 1 here, while the shipped dispatcher served it as usage text. Both
  // entry points now agree: rc=0 and the same renderer.
  await cmdHelp()
}
