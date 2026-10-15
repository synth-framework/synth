// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { cmdRelease } from "./release.js"


export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdRelease(flags)
}
