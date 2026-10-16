// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { printJson, printError } from "./print.js"
import * as sdk from "../sdk/index.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { namespaceHelp } from "./command-help.js"
import { AlignmentPrepareResult, prepareAlignmentContract } from "./command-alignment.js"
import { inspectAlignmentScopeEvidence } from "./alignment-scope-evidence.js"


export async function cmdAlignmentHelp() {
  printJson(namespaceHelp("alignment", "Intent alignment and divergence governance", [
    { name: "synth alignment create --intent-model-id <id>", description: "Derive an Alignment Contract from an approved Intent Model" },
    { name: "synth alignment create --dry-run --review-pr <number> --comment-id <id> --reviewed-commit <sha> --packet <path> --expected-account <login>", description: "Inspect account-attributed scope evidence without creating or approving any runtime artifact" },
    { name: "synth alignment submit --contract-id <id>", description: "Submit an Alignment Contract for review" },
    { name: "synth alignment approve --contract-id <id>", description: "Approve an Alignment Contract, authorizing Mission creation" },
    { name: "synth alignment prepare", description: "Create a minimal aligned contract and output its id" },
  ]))
}


export async function cmdAlignmentCreate(flags: Record<string, string | boolean>) {
  const scopeFlags = ["dry-run", "review-pr", "comment-id", "reviewed-commit", "packet", "expected-account"]
  if (scopeFlags.some(flag => flags[flag] !== undefined)) {
    if (flags["dry-run"] !== true || typeof flags["review-pr"] !== "string" || typeof flags["comment-id"] !== "string" ||
        typeof flags["reviewed-commit"] !== "string" || typeof flags.packet !== "string" ||
        typeof flags["expected-account"] !== "string" || flags["intent-model-id"] !== undefined) {
      printError("Scope evidence inspection requires --dry-run --review-pr <number> --comment-id <id> --reviewed-commit <sha> --packet <path> --expected-account <login>. No runtime artifact is written by this route.")
    }
    const integer = (value: string) => /^(?:[1-9][0-9]*)$/.test(value) ? Number(value) : NaN
    try {
      const evidence = inspectAlignmentScopeEvidence(process.cwd(), {
        pr: integer(flags["review-pr"] as string), commentId: integer(flags["comment-id"] as string),
        reviewedCommit: flags["reviewed-commit"] as string, packetPath: flags.packet as string,
        expectedAccount: flags["expected-account"] as string,
      })
      printJson({ ...evidence, status: "ok", kind: "AlignmentScopeEvidencePreview" })
    } catch (error) {
      printError(`Alignment scope evidence unavailable: ${error instanceof Error ? error.message : String(error)}`)
    }
    return
  }
  const intentModelId = typeof flags["intent-model-id"] === "string" ? flags["intent-model-id"] : undefined
  if (!intentModelId) {
    printError("Usage: synth alignment create --intent-model-id <id> [--evidence <path>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const events = await ctx.infra.eventStore.loadAll()
  const approvedEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "REFINEMENT_REPORT_APPROVED" && e.payload?.intentModelId === intentModelId)
  if (!approvedEvent) {
    printError(`Intent Model ${intentModelId} has not been approved for alignment. Run 'synth intent approve' first.`)
    return
  }

  const intentEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_CREATED" && e.payload?.intentModelId === intentModelId)
  if (!intentEvent) {
    printError(`Intent Model not found: ${intentModelId}`)
    return
  }
  const intentModel = (intentEvent.payload as Record<string, any>).intentModel

  async function lastEvent(type: string, predicate: (e: any) => boolean = () => true) {
    const allEvents = await ctx.infra.eventStore.loadAll()
    const matches = allEvents.filter((e: any) => e.type === type && predicate(e))
    return matches.length > 0 ? matches[matches.length - 1] : undefined
  }

  // Create reference evidence entries from an optional evidence file or from a default canonical set.
  const evidencePath = typeof flags.evidence === "string" ? flags.evidence : undefined
  let evidenceEntries: Array<{ uri: string; description: string; kind?: string; mimeType?: string }> = []
  if (evidencePath) {
    try {
      const content = await fs.readFile(path.resolve(evidencePath), "utf-8")
      const parsed = JSON.parse(content)
      evidenceEntries = Array.isArray(parsed) ? parsed : parsed.entries ?? []
    } catch (err) {
      printError(`Failed to read evidence file: ${err instanceof Error ? err.message : String(err)}`)
      return
    }
  } else {
    evidenceEntries = [
      { uri: "file://docs/design/lds-002.md", description: "Mission Studio Design System (LDS-002) — canonical tokens and visual principles", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-PROGRAM-027.md", description: "Program 027 charter — Mission Studio Homepage scope and constraints", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-001.md", description: "Mission Studio Design Language — canonical visual language", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-002.md", description: "Mission Studio Component Catalog — reusable workspace components", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-025.md", description: "Mission Studio Design Governance — anti-drift rules", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-026.md", description: "Homepage Intent Model — approved refined intent", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/governance/program-027/refinement-report.json", description: "Refinement Report — evidence of refinement review and approval", kind: "document", mimeType: "application/json" },
    ]
  }

  const evidenceIds: string[] = []
  for (const entry of evidenceEntries) {
    const evidenceResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "CreateReferenceEvidence",
      payload: {
        input: {
          kind: entry.kind || "document",
          uri: entry.uri,
          hash: "sha256:00000000",
          mimeType: entry.mimeType || "text/markdown",
          description: entry.description,
        },
      },
    })
    if (evidenceResult.status !== "ok") {
      printError(`CreateReferenceEvidence failed: ${evidenceResult.error}`)
      return
    }
    const evidenceEvent = await lastEvent("REFERENCE_EVIDENCE_CREATED", (e: any) =>
      e.payload.evidence?.uri === entry.uri
    )
    const evidenceId = (evidenceEvent?.payload as Record<string, any> | undefined)?.evidenceId
    if (evidenceId) evidenceIds.push(evidenceId)
  }

  if (evidenceIds.length === 0) {
    printError("No reference evidence could be created. Alignment Contract requires at least one evidence binding.")
    return
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: intentModel.explicitObjectives.join("; "),
        expectedExperience: intentModel.desiredOutcome ?? "Not specified",
        requiredProperties: intentModel.allowedInterpretations,
        forbiddenProperties: intentModel.forbiddenInterpretations,
        requiredBehaviors: ["Workspace persists while phases change", "Supporting content appears after Mission Studio releases"],
        forbiddenInterpretation: intentModel.forbiddenInterpretations,
        forbiddenDrift: intentModel.forbiddenInterpretations,
        successCriteria: intentModel.desiredOutcome ? [intentModel.desiredOutcome] : [],
        referenceEvidenceIds: evidenceIds,
        dimensions: [
          { name: "Intent", score: 0.98, reason: "Explicit and implicit objectives documented and reviewed" },
          { name: "Experience", score: 0.95, reason: "Desired outcome and experience contract captured" },
          { name: "Visual", score: 0.97, reason: "Visual references and design system identified" },
          { name: "Interaction", score: 0.94, reason: "Scroll contract and workspace persistence captured" },
          { name: "Governance", score: 1.0, reason: "Refinement approval recorded" },
          { name: "Evidence", score: 1.0, reason: "All objectives bound to reference evidence" },
        ],
        objectiveCoverage: intentModel.explicitObjectives.map((objective: string) => ({
          objective,
          evidenceIds,
          aligned: true,
          notes: "Derived from approved Intent Model",
        })),
        implicitObjectiveStatus: intentModel.implicitObjectives.map((objective: string) => ({
          objective,
          status: "accepted",
          reason: "Accepted as part of refined intent",
        })),
        forbiddenInterpretations: intentModel.forbiddenInterpretations.map((interpretation: string) => ({
          interpretation,
          reason: "Explicitly forbidden in approved Intent Model",
          evidenceIds,
        })),
        confidenceExplanation: {
          score: 0.97,
          reason: "Computed from 6 alignment dimensions. Residual ambiguity is documented as known unknowns.",
        },
        residualDivergence: intentModel.knownUnknowns.map((unknown: string) => ({
          description: unknown,
          acceptedBy: { kind: "human", id: "synth-cli-operator" },
          reason: "Known unknown accepted for first release",
          risk: "low",
        })),
      },
    },
  })

  if (result.status !== "ok") {
    printError(`CreateAlignmentContract failed: ${result.error}`)
    return
  }

  const allEvents = await ctx.infra.eventStore.loadAll()
  const contractEvent = allEvents
    .slice()
    .reverse()
    .find((e: any) => e.type === "ALIGNMENT_CONTRACT_CREATED")
  const contractId = (contractEvent?.payload as Record<string, any> | undefined)?.contractId

  printJson({
    status: "ok",
    kind: "AlignmentContractCreated",
    contractId,
    intentModelId,
    note: "Alignment Contract created. Submit it for review and approval before Mission creation.",
  })
}


export async function cmdAlignmentSubmit(flags: Record<string, string | boolean>) {
  const contractId = typeof flags["contract-id"] === "string" ? flags["contract-id"] : undefined
  if (!contractId) {
    printError("Usage: synth alignment submit --contract-id <id>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "SubmitAlignmentContract",
    payload: { contractId },
  })

  if (result.status !== "ok") {
    printError(`SubmitAlignmentContract failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "AlignmentContractSubmitted",
    contractId,
    note: "Alignment Contract submitted for review.",
  })
}


export async function cmdAlignmentApprove(flags: Record<string, string | boolean>) {
  const contractId = typeof flags["contract-id"] === "string" ? flags["contract-id"] : undefined
  if (!contractId) {
    printError("Usage: synth alignment approve --contract-id <id> [--reason <reason>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const reason = typeof flags.reason === "string" ? flags.reason : "Alignment Contract approved"

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveAlignmentContract",
    payload: {
      contractId,
      reviewer: { kind: "human", id: "synth-cli-operator" },
    },
  })

  if (result.status !== "ok") {
    printError(`ApproveAlignmentContract failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "AlignmentContractApproved",
    contractId,
    reason,
    note: "Alignment Contract approved. Mission creation is now authorized under Governance Architecture v1.0.",
  })
}


export async function cmdAlignmentPrepare() {
  // Phase 2 CLI workflow: create the minimal governance artifacts required
  // for Mission approval when the operator has not yet run a full refinement
  // session. This is a convenience wrapper around the public capabilities;
  // ApproveMission still validates the contract through the ExecutionGate.
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  let result: AlignmentPrepareResult
  try {
    result = await prepareAlignmentContract(ctx)
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err))
  }

  printJson({
    status: "ok",
    kind: "AlignmentPrepared",
    contractId: result!.contractId,
    intentModelId: result!.intentModelId,
    gateId: result!.gateId,
    note: "This is a minimal aligned contract for CLI workflows. Production missions should run a full refinement session.",
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "create") await cmdAlignmentCreate(flags)
  else if (sub === "submit") await cmdAlignmentSubmit(flags)
  else if (sub === "approve") await cmdAlignmentApprove(flags)
  else if (sub === "prepare") await cmdAlignmentPrepare()
  else
    printError("Usage: synth alignment create --intent-model-id <id> | synth alignment submit --contract-id <id> | synth alignment approve --contract-id <id> | synth alignment prepare")
}
