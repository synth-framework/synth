// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { cmdStatus } from "./command-status.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdStatus()
}
