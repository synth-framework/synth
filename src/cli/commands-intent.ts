// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { printJson, printError } from "./print.js"
import * as sdk from "../sdk/index.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdIntentHelp() {
  printJson(namespaceHelp("intent", "Intent model operations", [
    { name: "synth intent create --file <path>", description: "Create an Intent Model from a JSON file" },
    { name: "synth intent refine --intent-model-id <id> --answers <path> --recommendation <recommendation> --reason <reason>", description: "Run a refinement session and produce a Refinement Report" },
    { name: "synth intent submit --intent-model-id <id>", description: "Submit a refined Intent Model for downstream Alignment Contract creation" },
    { name: "synth intent approve --report-id <id> [--decision approved_for_alignment|revision_required|rejected] [--reason <reason>]", description: "Approve or reject a Refinement Report" },
  ]))
}


export async function cmdIntentCreate(flags: Record<string, string | boolean>) {
  const filePath = typeof flags.file === "string" ? flags.file : undefined
  if (!filePath) {
    printError("Usage: synth intent create --file <path>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  let input: Record<string, unknown>
  try {
    const content = await fs.readFile(path.resolve(filePath), "utf-8")
    input = JSON.parse(content)
  } catch (err) {
    printError(`Failed to read intent model file: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateIntentModel",
    payload: { input },
  })

  if (result.status !== "ok") {
    printError(`CreateIntentModel failed: ${result.error}`)
    return
  }

  const events = await ctx.infra.eventStore.loadAll()
  const intentEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_CREATED")
  const intentModelId = (intentEvent?.payload as Record<string, any> | undefined)?.intentModelId

  printJson({
    status: "ok",
    kind: "IntentModelCreated",
    intentModelId,
    note: "Intent Model recorded. Run a refinement session before creating an Alignment Contract.",
  })
}


export async function cmdIntentRefine(flags: Record<string, string | boolean>) {
  const intentModelId = typeof flags["intent-model-id"] === "string" ? flags["intent-model-id"] : undefined
  if (!intentModelId) {
    printError("Usage: synth intent refine --intent-model-id <id> [--answers <path>] [--recommendation <recommendation>] [--reason <reason>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const events = await ctx.infra.eventStore.loadAll()
  const initialEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_CREATED" && e.payload?.intentModelId === intentModelId)
  if (!initialEvent) {
    printError(`Intent Model not found: ${intentModelId}`)
    return
  }
  const initialModel = (initialEvent.payload as Record<string, any>).intentModel

  const startResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "StartRefinementSession",
    payload: { intentModelId },
  })
  if (startResult.status !== "ok") {
    printError(`StartRefinementSession failed: ${startResult.error}`)
    return
  }

  const sessionEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "REFINEMENT_SESSION_STARTED" && e.payload?.intentModelId === intentModelId)
  const sessionId = (sessionEvent?.payload as Record<string, any> | undefined)?.sessionId
  const questions = ((sessionEvent?.payload as Record<string, any> | undefined)?.questions ?? []) as Array<{ id: string; text: string; category: string; priority: string }>

  const answersPath = typeof flags.answers === "string" ? flags.answers : undefined
  let answers: Record<string, string> = {}
  let additionalEntries: Array<{ question: { id: string; text: string; category: string; priority: string }; answer: string }> = []
  if (answersPath) {
    try {
      const content = await fs.readFile(path.resolve(answersPath), "utf-8")
      const parsed = JSON.parse(content)
      if (parsed.answers && typeof parsed.answers === "object") {
        answers = parsed.answers
      }
      if (Array.isArray(parsed.additionalEntries)) {
        additionalEntries = parsed.additionalEntries
      }
    } catch (err) {
      printError(`Failed to read answers file: ${err instanceof Error ? err.message : String(err)}`)
      return
    }
  }

  if (Object.keys(answers).length === 0 && additionalEntries.length === 0) {
    printJson({
      status: "ok",
      kind: "RefinementSessionStarted",
      sessionId,
      intentModelId,
      questions,
      note: "Provide answers in a JSON file and rerun with --answers <path>",
    })
    return
  }

  for (const question of questions) {
    const answer = answers[question.id]
    if (!answer) continue
    const answerResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "AnswerRefinementQuestion",
      payload: { sessionId, questionId: question.id, answer },
    })
    if (answerResult.status !== "ok") {
      printError(`AnswerRefinementQuestion failed for ${question.id}: ${answerResult.error}`)
      return
    }
  }

  const recommendation = typeof flags.recommendation === "string" ? flags.recommendation : "approve_for_alignment"
  const reason = typeof flags.reason === "string" ? flags.reason : "Refinement review completed via CLI"

  const reportResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateRefinementReport",
    payload: {
      sessionId,
      initialModel,
      reviewer: { kind: "human", id: "synth-cli-operator" },
      recommendation,
      reason,
      additionalEntries,
    },
  })
  if (reportResult.status !== "ok") {
    printError(`CreateRefinementReport failed: ${reportResult.error}`)
    return
  }

  const allEvents = await ctx.infra.eventStore.loadAll()
  const reportEvent = allEvents
    .slice()
    .reverse()
    .find((e: any) => e.type === "REFINEMENT_REPORT_CREATED" && e.payload?.report?.sessionId === sessionId)
  const reportId = (reportEvent?.payload as Record<string, any> | undefined)?.reportId
  const finalModelEvent = allEvents
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_REVISED" && e.payload?.intentModelId === intentModelId)
  const finalConfidence = (finalModelEvent?.payload as Record<string, any> | undefined)?.intentModel?.confidenceLevel

  printJson({
    status: "ok",
    kind: "RefinementReportCreated",
    reportId,
    sessionId,
    intentModelId,
    finalConfidence,
    recommendation,
    reason,
    note: "Refinement Report created. Submit the Intent Model when ready for Alignment Contract creation.",
  })
}


export async function cmdIntentSubmit(flags: Record<string, string | boolean>) {
  const intentModelId = typeof flags["intent-model-id"] === "string" ? flags["intent-model-id"] : undefined
  if (!intentModelId) {
    printError("Usage: synth intent submit --intent-model-id <id>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "SubmitIntentModel",
    payload: { intentModelId },
  })

  if (result.status !== "ok") {
    printError(`SubmitIntentModel failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "IntentModelSubmitted",
    intentModelId,
    note: "Intent Model submitted. Ready for Alignment Contract creation (EXP-HOME-027).",
  })
}


export async function cmdIntentApprove(flags: Record<string, string | boolean>) {
  const reportId = typeof flags["report-id"] === "string" ? flags["report-id"] : undefined
  if (!reportId) {
    printError("Usage: synth intent approve --report-id <id> [--decision approved_for_alignment|revision_required|rejected] [--reason <reason>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const decision = typeof flags.decision === "string" ? flags.decision : "approved_for_alignment"
  const reason = typeof flags.reason === "string" ? flags.reason : "Refinement report approved for alignment"

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveRefinementReport",
    payload: {
      reportId,
      decision,
      reason,
      reviewer: { kind: "human", id: "synth-cli-operator" },
    },
  })

  if (result.status !== "ok") {
    printError(`ApproveRefinementReport failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "RefinementReportApproved",
    reportId,
    decision,
    reason,
    note: decision === "approved_for_alignment"
      ? "Refinement Report approved. Intent Model is now approved for Alignment Contract creation."
      : "Refinement Report rejected. Intent Model requires revision before alignment.",
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "create") await cmdIntentCreate(flags)
  else if (sub === "refine") await cmdIntentRefine(flags)
  else if (sub === "submit") await cmdIntentSubmit(flags)
  else if (sub === "approve") await cmdIntentApprove(flags)
  else
    printError("Usage: synth intent create --file <path> | synth intent refine --intent-model-id <id> [--answers <path>] [--recommendation <recommendation>] [--reason <reason>] | synth intent submit --intent-model-id <id> | synth intent approve --report-id <id> [--decision ...] [--reason <reason>]")
}
