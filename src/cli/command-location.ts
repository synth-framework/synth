// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"
import { fileURLToPath } from "url"


export const __dirname = path.dirname(fileURLToPath(import.meta.url))
