// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"

import { printJson } from "./print.js"


export async function cmdBootstrap(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const options = {
    approve: flags.approve === true || flags.approve === "true",
    dryRun: flags["dry-run"] === true || flags["dry-run"] === "true",
    withWebsite: flags["with-website"] === true || flags["with-website"] === "true",
    withExample: flags["with-example"] === true || flags["with-example"] === "true",
    projectName: typeof flags.name === "string" ? flags.name : undefined,
    streamStages: flags["stream-stages"] === true || flags["stream-stages"] === "true",
    adapters:
      typeof flags.adapters === "string" && flags.adapters.length > 0
        ? flags.adapters.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    withoutAdapters:
      typeof flags["without-adapters"] === "string" && flags["without-adapters"].length > 0
        ? flags["without-adapters"].split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
  }

  const result = await (await import("./bootstrap-apply.js")).runBootstrap(targetDir, options)

  if (flags.human === true || flags.human === "true") {
    console.log(`Bootstrapping ${result.projectName} at ${result.targetDir}`)
    console.log("")
    if (Array.isArray(result.stages)) {
      for (const stage of result.stages) {
        const duration = stage.durationMs ? ` (${stage.durationMs}ms)` : ""
        console.log(`${stage.description}... ${stage.status}${duration}`)
      }
    }
    console.log("")
    console.log(`Status: ${result.status}`)
    if (Array.isArray(result.nextSteps) && result.nextSteps.length > 0) {
      console.log("")
      console.log("Next steps:")
      for (const step of result.nextSteps) {
        console.log(`  ${step}`)
      }
    }
  } else {
    printJson(result)
  }

  if (result.status === "error") {
    process.exit(1)
  }
}
