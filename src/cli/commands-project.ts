// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson, printError } from "./print.js"
import { generateAgentsContract } from "./agents-contract.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdProjectHelp() {
  printJson(namespaceHelp("project", "Project-level derived artifacts", [
    { name: "synth project AGENTS.md", description: "Regenerate the AI operator contract from baseline and fragments" },
    { name: "synth project AGENTS.md --check", description: "Exit non-zero if AGENTS.md is stale" },
  ], {
    note: "AGENTS.md is a derived file. Edit source fragments or the framework baseline, not the root contract.",
  }))
}


export async function cmdProjectAgentsMd(flags: Record<string, string | boolean>) {
  const check = flags.check === true || flags.check === "true"
  const result = await generateAgentsContract({
    rootDir: process.cwd(),
    check,
  })

  if (check) {
    printJson({
      status: result.stale ? "stale" : "ok",
      stale: result.stale,
      fragmentCount: result.fragmentCount,
      nextStep: result.stale ? "Run `synth project AGENTS.md` to regenerate." : undefined,
    })
    if (result.stale) {
      process.exitCode = 1
    }
    return
  }

  printJson({
    status: "ok",
    kind: "AgentsContractGenerated",
    wrote: result.wrote,
    stale: result.stale,
    fragmentCount: result.fragmentCount,
    path: "AGENTS.md",
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "AGENTS.md") await cmdProjectAgentsMd(flags)
  else
    printError(
      "Usage: synth project AGENTS.md [--check]",
    )
}
