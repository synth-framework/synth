// Node ESM loader hook, used only by check-cli-load-budget.js. Synchronous trace
// writes avoid losing the final records when the CLI calls process.exit().
// Loader overhead is NOT used as a startup timing measurement.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = process.env.SYNTH_LOAD_TRACE_ROOT
const output = process.env.SYNTH_LOAD_TRACE_FILE
if (!root || !output) throw new Error("CLI load tracer requires explicit trace root and output")

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context)
  if (url.startsWith("file:")) {
    const file = fileURLToPath(url)
    const relative = path.relative(root, file).split(path.sep).join("/")
    if (relative.startsWith("dist/") && relative.endsWith(".js")) {
      fs.appendFileSync(output, JSON.stringify(relative) + "\n")
    }
  }
  return result
}
