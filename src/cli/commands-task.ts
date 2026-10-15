// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { cmdTask } from "./task.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdTask(positional.slice(1), flags)
}
