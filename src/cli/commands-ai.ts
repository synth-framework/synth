// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"
import { refreshAiMetadata } from "./ai-metadata.js"
import { printJson, printError } from "./print.js"
import * as sdk from "../sdk/index.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdAiHelp() {
  printJson(namespaceHelp("ai", "AI agent interoperability", [
    { name: "synth ai refresh", description: "Regenerate .synth/ai/ metadata from canonical state" },
  ]))
}


export async function cmdAiRefresh() {
  const synthDir = sdk.paths.synthDir(sdk.workspace.root())
  await refreshAiMetadata(synthDir, true)
  printJson({ status: "ok", message: "AI metadata refreshed", path: path.join(synthDir, "ai") })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "refresh") await cmdAiRefresh()
  else printError("Usage: synth ai refresh")
}
