// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import path from "path"
import { printJson, printError } from "./print.js"
import { loadGovernanceInventory, filterByValues, findProgramById, findProgramExpeditions } from "../governance/inventory.js"
import { rankPrograms } from "../governance/rank.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdProgramHelp() {
  printJson(namespaceHelp("program", "Governance program inventory", [
    { name: "synth program list", description: "List all governance programs" },
    { name: "synth program list --status <status>", description: "Filter programs by status", args: "--status Proposed | Active | Completed" },
    { name: "synth program list --priority <priority>", description: "Filter programs by priority", args: "--priority Critical | High | Medium | Low" },
    { name: "synth program show --id <program-id>", description: "Show a single program and its expeditions", args: "--id EXP-PROGRAM-044" },
    { name: "synth program rank", description: "Rank active programs by weighted open work" },
    { name: "synth program rank --next", description: "Return the single highest-priority active program" },
    { name: "synth program rank --status <status>", description: "Rank programs by status", args: "--status Proposed | Active | Completed" },
  ], { note: "Program list, show, and rank are read-only and derived from docs/expeditions/*.md." }))
}


export async function cmdProgramList(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const inventory = await loadGovernanceInventory(charterDir)

  let programs = inventory.programs
  programs = filterByValues(programs, (p) => p.status, typeof flags.status === "string" ? flags.status : undefined)
  programs = filterByValues(programs, (p) => p.priority, typeof flags.priority === "string" ? flags.priority : undefined)

  printJson({
    status: "ok",
    kind: "ProgramList",
    count: programs.length,
    programs,
  })
}


// ============================================================
// EXP-CLI-004: Weighted governance inventory ranking
// ============================================================
export async function cmdProgramRank(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const human = flags.human === true || flags.human === "true"
  const result = await rankPrograms(charterDir, {
    status: typeof flags.status === "string" ? flags.status : undefined,
    priority: typeof flags.priority === "string" ? flags.priority : undefined,
  }, {
    next: flags.next === true || flags.next === "true",
    human,
  })

  if (human && result.next) {
    const top = result.programs.find((p) => p.id === result.next)
    if (top) {
      printJson({
        status: "ok",
        kind: "ProgramRankHuman",
        next: result.next,
        text: `Next recommended program: ${result.next} (score ${top.score})\n  ${top.name}.\n  Reason: ${top.rationale}.`,
      })
      return
    }
  }

  printJson(result)
}


// ============================================================
// EXP-CLI-005: Governance entity show commands
// ============================================================
export async function cmdProgramShow(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth program show --id <program-id>", {
      code: "MissingProgramId",
      category: "validation",
      suggestion: "Run 'synth program list' to see available programs.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const program = await findProgramById(charterDir, id)
  if (!program) {
    printError(`Program ${id} not found.`, {
      code: "ProgramNotFound",
      category: "validation",
      suggestion: "Run 'synth program list' to see available programs.",
    })
    return
  }

  const expeditions = await findProgramExpeditions(charterDir, id)
  const human = flags.human === true || flags.human === "true"

  if (human) {
    const expeditionLines = expeditions.length === 0
      ? "  No expeditions chartered."
      : expeditions.map((e) => `  ${e.id}  ${e.status}  ${e.name}`).join("\n")
    console.log(
      `Program: ${program.id} — ${program.name}\n` +
      `Status: ${program.status} | Priority: ${program.priority}\n` +
      `Open expeditions: ${program.openExpeditions} | Completed: ${program.completedExpeditions}\n\n` +
      `Expeditions:\n${expeditionLines}`,
    )
    return
  }

  printJson({
    status: "ok",
    kind: "ProgramShow",
    program,
    expeditions,
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "list") await cmdProgramList(flags)
  else if (sub === "show") await cmdProgramShow(flags)
  else if (sub === "rank") await cmdProgramRank(flags)
  else
    printError(
      "Usage: synth program list [--status <status>] [--priority <priority>] | synth program show --id <program-id> | synth program rank [--next] [--status <status>] [--priority <priority>]",
    )
}
