// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"

import { printJson, printError } from "./print.js"
import { verifyDraftIntegrity, writeDraftIntegrityRecord } from "../mission-studio/draft-integrity.js"
import { appendDecision, latestDecision, listDecisions } from "../mission-studio/decision-log.js"

import * as sdk from "../sdk/index.js"
import { loadGovernanceInventory, filterByValues } from "../governance/inventory.js"

import type { PlanningObservation } from "../planning/observation.js"
import type { MissionNode, PlanningSession } from "../mission-studio/types.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"

import { namespaceHelp } from "./command-help.js"
import type { DeclaredBranchInfo } from "./command-lifecycle.js"
import { commitDraftCeremony, makeObservation, serializePlanningSession } from "./command-planning.js"
import { inferMissionProgram } from "./command-program-inference.js"
import { approvalActionForDraft, blockingExpeditionForMission } from "./mission-approval-target.js"


export async function cmdMissionHelp() {
  printJson(namespaceHelp("mission", "Mission Studio operations", [
    { name: "synth mission create --subject <subject> --purpose <purpose> [--intent <tokens>] [--scope <tokens>]", description: "Create a Mission proposal; --intent/--scope add explicit tokens for duplicate-aware advisory matching against existing missions" },
    { name: "synth mission project --alignment-contract-id <id>", description: "Project a Mission from an approved Alignment Contract (EXP-REFINE-014)" },
    { name: "synth mission approve --draft-id <id> --alignment-contract-id <contract-id>", description: "Approve a Mission draft" },
    { name: "synth mission evidence add --draft-id <id> --subject <subject> [--purpose <purpose>] [--confidence <level>]", description: "Add evidence to a Mission draft" },
    { name: "synth mission list [--status <status>] [--program <program-id>]", description: "List missions with optional filters" },
    { name: "synth mission show --id <mission-id>", description: "Show a single mission and its expeditions", args: "--id 74c3a70571facb87" },
    { name: "synth mission verify-charter --file <path>", description: "Verify a Mission charter file before approval" },
    { name: "synth mission decisions [--draft-id <id>]", description: "List Mission decisions" },
    { name: "synth mission snapshot [<snapshot-id> | list]", description: "Inspect or list Mission snapshots" },
    { name: "synth mission report --id <mission-id>", description: "Show mission status and its expeditions", args: "--id 74c3a70571facb87" },
    { name: "synth mission complete --id <mission-id>", description: "Complete an active Mission", args: "--id 74c3a70571facb87" },
    { name: "synth mission delete --id <mission-id> [--reason <text>] [--dry-run]", description: "Delete an empty Mission that hosts no Expeditions", args: "--id 74c3a70571facb87" },
  ]))
}


export async function cmdMissionApproveHelp() {
  printJson({
    status: "ok",
    name: "synth",
    namespace: "mission",
    subcommand: "approve",
    description: "Approve a Mission draft and bind it to an Alignment Contract.",
    usage: "synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id>",
    required: [
      { name: "--draft-id <draft-id>", description: "Id of the Mission draft to approve (returned by synth mission create)" },
      { name: "--alignment-contract-id <contract-id>", description: "Id of the approved Alignment Contract that governs the Mission" },
    ],
    optional: [
      { name: "--human", description: "Emit a human-readable summary instead of JSON" },
      { name: "--summary", description: "Emit a condensed status/ID/next-step summary" },
      { name: "--quiet", description: "Suppress bootstrap and diagnostic logs" },
      { name: "--no-bootstrap-logs", description: "Alias for --quiet" },
    ],
    examples: [
      "synth mission approve --draft-id 74c3a70571facb87 --alignment-contract-id alignment-contract-msjisgwg-v05a18",
    ],
    note: "Approval is gated by Mission Studio confidence and the Alignment Contract.",
  })
}


export function deserializePlanningSession(data: any): PlanningSession {
  return {
    ...data,
    evidence: {
      evidence: data.evidence.evidence,
      byObservationId: new Map(data.evidence.byObservationId),
    },
    worldModel: {
      ...data.worldModel,
      nodes: new Map(data.worldModel.nodes),
      evidence: {
        evidence: data.worldModel.evidence.evidence,
        byObservationId: new Map(data.worldModel.evidence.byObservationId),
      },
    },
  }
}


export async function materializeApprovedMission(
  gateCtx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  snapshot: import("../mission-studio/types.js").ApprovedMissionModelSnapshot,
  alignmentContractId?: string,
  beforeApproval?: () => Promise<void>,
): Promise<{ missionId: string; name: string; purpose: string; created: boolean; approved: boolean }> {
  const state = await gateCtx.runtime.getState()
  const missionNode = Array.from(snapshot.worldModel.nodes.values()).find(
    (n: import("../mission-studio/types.js").WorldModelNode): n is MissionNode => n.kind === "mission",
  )
  if (!missionNode) {
    throw new Error("Approved snapshot contains no mission node")
  }

  let created = false
  let approved = false
  const existingMission = state.missions[missionNode.id]

  if (!existingMission) {
    const createMissionResult = await gateCtx.api.handleIntent({
      actor: "synth-cli",
      capability: "CreateMission",
      payload: { id: missionNode.id, name: missionNode.name, purpose: missionNode.purpose },
    })
    if (createMissionResult.status !== "ok") {
      throw new Error(`Failed to create runtime mission: ${createMissionResult.error || JSON.stringify(createMissionResult)}`)
    }
    created = true
  }

  if (!existingMission || existingMission.status === "draft") {
    // A declared mission branch must be recorded after the mission exists but
    // before ApproveMission reaches the ExecutionGate. Otherwise an
    // operator-owned branch passes the CLI preflight yet the gate only sees
    // the taxonomy-derived branch and rejects the approval.
    if (beforeApproval) {
      await beforeApproval()
    }

    const approvePayload: Record<string, unknown> = { id: missionNode.id }
    if (alignmentContractId) {
      approvePayload.alignmentContractId = alignmentContractId
    }
    const approveMissionResult = await gateCtx.api.handleIntent({
      actor: "synth-cli",
      capability: "ApproveMission",
      payload: approvePayload,
    })
    if (approveMissionResult.status !== "ok") {
      throw new Error(`Failed to approve runtime mission: ${approveMissionResult.error || JSON.stringify(approveMissionResult)}`)
    }
    approved = true
  }

  return {
    missionId: missionNode.id,
    name: missionNode.name,
    purpose: missionNode.purpose,
    created,
    approved,
  }
}


export async function cmdMissionApprove(flags: Record<string, string | boolean>) {
  const { gateDecision, printGateBlock } = await import("./gate-reporting.js")
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  const declaredBranchFlag = typeof flags.branch === "string" && flags.branch.length > 0 ? flags.branch : undefined
  const noCreateFlag = flags["no-create"] === true || flags["no-create"] === "true"
  if (noCreateFlag && !declaredBranchFlag) printError("--no-create requires --branch")
  if (!draftId) printError("--draft-id is required")

  // An unrelated approved contract is not evidence that this draft is aligned.
  // Require the operator to select the actual contract rather than silently
  // inferring the most recent approved contract in non-strict contexts.
  const alignmentContractId = typeof flags["alignment-contract-id"] === "string" ? flags["alignment-contract-id"] : undefined
  if (!alignmentContractId) {
    // EXP-REUSE-001: surface approved alignment contracts so operators can reuse
    // an existing baseline instead of creating a new one for every mission.
    const lookupCtx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const events = await lookupCtx.runtime.loadEvents()
    const derived = (await import("../state/derived/index.js")).buildDerivedState(events)
    const approvedContracts = Object.values(derived.alignmentContracts).filter(
      (c) => c.status === "approved"
    )

    let suggestion: string
    if (approvedContracts.length > 0) {
      const list = approvedContracts
        .map((c) => `  - ${c.id}: ${c.intentSummary || "(no summary)"}`)
        .join("\n")
      suggestion = `Approved alignment contracts available for reuse (check that one actually covers this Mission):\n${list}\n\nSelect the relevant reviewed contract explicitly:\n  synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id>`
    } else {
      suggestion = "No approved alignment contracts found. Ground a new contract in this Mission's evidence and obtain actual review before approving it. The demonstration 'alignment prepare' baseline is not Mission evidence."
    }

    printError(
      "Mission approval requires --alignment-contract-id; it cannot infer a relevant contract from recency.",
      {
        code: "MissingAlignmentContractId",
        category: "governance",
        suggestion,
      },
    )
  }

  // Validate the draft exists before running the approval gate. This gives the
  // operator a clear input-validation error (Draft not found) before any
  // lifecycle gate messaging, which is easier to recover from.
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}`)
  }

  // Verify the draft before using its Mission ID as the intake target. Without
  // that ID the gate defaults to the unrelated active Mission and can suggest
  // closing its executing Expedition.
  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    await appendDecision(dataDir, {
      type: "MISSION_DRAFT_INTEGRITY_REJECTED",
      draftId,
      reason: integrity.message,
    })
    printError(integrity.message)
  }
  const session = deserializePlanningSession(draftData)
  let approvalAction: ReturnType<typeof approvalActionForDraft>
  try { approvalAction = approvalActionForDraft(session) }
  catch (error) { printError(error instanceof Error ? error.message : "Invalid Mission draft") }

  // Resolve the project's actual governance state for this draft's Mission.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision(approvalAction, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    // E (a+b): an explicit --complete-first closes the blocking executing
    // expedition in the same mission, then re-evaluates the approval gate.
    const completeFirst = flags["complete-first"] === true || flags["complete-first"] === "true"
    if (completeFirst) {
      const blocking = blockingExpeditionForMission(state, approvalAction.missionId)
      if (blocking) {
        console.error(
          `[mission approve --complete-first] closing executing expedition ${blocking.id} (${blocking.name}) before approving the mission.`,
        )
        await (await import("./command-lifecycle.js")).cmdExpeditionComplete({
          id: blocking.id,
          force: true,
          reason: "closed automatically via mission approve --complete-first",
        })
        const gateCtx2 = await bootstrapWithCapabilities({
          skipGenesis: true,
          infra: { persistence: "file" },
        })
        const state2 = await gateCtx2.runtime.getState()
        const intake2 = await gateDecision(approvalAction, state2, gateCtx2.runtime)
        if (intake2.decision === "BLOCK") {
          printGateBlock(intake2)
        }
      } else {
        printGateBlock(intake)
      }
    } else {
      printGateBlock(intake)
    }
  }

  // ECOSYSTEM-001: fail fast when the current branch does not satisfy the
  // declared mission branch policy. The ExecutionGate enforces the same
  // policy inside handleIntent during materialization.
  const missionNode = Array.from(session.worldModel.nodes.values()).find(
    (n: import("../mission-studio/types.js").WorldModelNode): n is MissionNode => n.kind === "mission",
  )
  let declaredMissionBranch: DeclaredBranchInfo | undefined
  if (missionNode) {
    if (declaredBranchFlag) {
      // ADR-056 §2.2: the operator declares the execution branch; the CLI
      // materializes or checks it out before the mission is approved.
      declaredMissionBranch = await (await import("./command-lifecycle.js")).declareExecutionBranch("mission", {
        branch: declaredBranchFlag,
        noCreate: noCreateFlag,
        entityId: missionNode.id,
        missionId: missionNode.id,
        missionName: missionNode.name,
      })
      if (!declaredMissionBranch.ok) {
        printError(declaredMissionBranch.error || "The declared execution branch is not usable", {
          code: declaredMissionBranch.code,
          category: "governance",
          ...(declaredMissionBranch.suggestion ? { suggestion: declaredMissionBranch.suggestion } : {}),
        })
      }
    }
    await (await import("./command-lifecycle.js")).assertExecutionBranch("ApproveMission", "mission", { missionId: missionNode.id }, declaredBranchFlag)
  }

  const ctx = await (await import("../core/bootstrap.js")).bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })
  const timestamp = Date.now()

  // Approval state derives from the decision record, never from the
  // editable approvalState field (EXP-TRUST-004): re-approval is
  // idempotent and prescriptive.
  const priorApproval = await latestDecision(dataDir, draftId, "MISSION_APPROVAL_APPROVED")

  const approveResult = (await ctx.api.missionStudioOperation({
    operation: "approveModel",
    params: { session, timestamp },
  })) as {
    status: string
    decision?: { approved: boolean; reason?: string; confidence?: number }
    result?: {
      success?: boolean
      error?: string
      session?: PlanningSession
      data?: import("../mission-studio/types.js").ApprovedMissionModelSnapshot
    }
    proposals?: unknown
    error?: string
  }

  if (approveResult.status !== "ok") {
    printError(`Mission approval operation failed: ${approveResult.error || JSON.stringify(approveResult)}`)
  }

  const decision = approveResult.decision
  if (!decision?.approved) {
    const reason = decision?.reason || "Approval denied by Mission Studio"
    await appendDecision(dataDir, {
      type: "MISSION_APPROVAL_REJECTED",
      draftId,
      reason,
      confidence: decision?.confidence ?? session.confidence.overall,
    })
    printJson({
      status: "ok",
      kind: "MissionApprovalDecision",
      decision: {
        approved: false,
        reason,
        confidence: decision?.confidence ?? session.confidence.overall,
      },
      draftId,
      decisionRecorded: true,
      proposals: approveResult.proposals ?? [],
      nextStep: `synth mission evidence add --draft-id ${draftId} --subject <subject> [--purpose <purpose>] [--confidence <level>] to create a successor draft with more evidence, then synth mission approve --draft-id <new-id>`,
    })
    return
  }

  const approvedData = approveResult.result?.data
  if (!approvedData) {
    printError("Mission Studio approved the model but produced no snapshot data")
  }

  // ADR-056 §2.5: a mission needs to exist before it can receive a replayable
  // branch binding, but the binding must exist before ApproveMission crosses
  // the ExecutionGate. Keep the callback idempotent because re-approving a
  // legacy mission is also the supported way to declare its branch.
  let missionBranchBindingRecorded = false
  const recordDeclaredMissionBranch = async () => {
    if (!declaredMissionBranch?.ok || !missionNode || missionBranchBindingRecorded) return
    const latestState = await gateCtx.runtime.getState()
    if (latestState.missions[missionNode.id]?.executionBranch !== declaredMissionBranch.branch) {
      await (await import("./command-lifecycle.js")).recordExecutionBranchBinding(gateCtx, "mission", missionNode.id, declaredMissionBranch)
    }
    missionBranchBindingRecorded = true
  }

  // EXP-RUNTIME-001: Runtime events must precede snapshot persistence.
  // If the runtime mission cannot be materialized, the snapshot must not be
  // certified and the decision must not be recorded. This keeps planning and
  // runtime state atomic: a certified snapshot always implies corresponding
  // runtime events.
  let runtimeResult: Awaited<ReturnType<typeof materializeApprovedMission>>
  try {
    runtimeResult = await materializeApprovedMission(
      gateCtx,
      approvedData,
      alignmentContractId,
      recordDeclaredMissionBranch,
    )
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err))
  }

  // An already-active legacy mission has no approval transition to hook, so
  // bind it after materialization. New and draft missions are bound by the
  // callback above before their approval reaches the gate.
  await recordDeclaredMissionBranch()

  // Persist the approved snapshot as an immutable, certified artifact.
  let snapshotPersisted = false
  let snapshotNote: string | undefined
  try {
    await ctx.api.missionStudioOperation({
      operation: "saveSnapshot",
      params: { snapshot: approvedData, session: approveResult.result?.session ?? session },
    })
    snapshotPersisted = true
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      snapshotNote = "snapshot already persisted"
    } else {
      throw err
    }
  }

  // Record the approval decision only after runtime state and snapshot are
  // durable. On re-approval, this is idempotent: the decision already exists.
  if (!priorApproval) {
    await appendDecision(dataDir, {
      type: "MISSION_APPROVAL_APPROVED",
      draftId,
      confidence: decision?.confidence ?? session.confidence.overall,
      ...(approvedData.id ? { snapshotId: approvedData.id } : {}),
    })
  }

  printJson({
    status: "ok",
    kind: "MissionApprovalDecision",
    decision: {
      approved: true,
      confidence: decision?.confidence ?? session.confidence.overall,
    },
    draftId,
    decisionRecorded: true,
    snapshotId: approvedData.id,
    snapshotPersisted,
    ...(priorApproval
      ? { note: "draft is already approved" }
      : snapshotNote
        ? { note: snapshotNote }
        : {}),
    runtime: {
      missionId: runtimeResult.missionId,
      created: runtimeResult.created,
      approved: runtimeResult.approved,
    },
    ...(declaredMissionBranch?.ok
      ? {
          executionBranch: {
            branch: declaredMissionBranch.branch,
            created: declaredMissionBranch.created,
            ...(declaredMissionBranch.warning ? { warning: declaredMissionBranch.warning } : {}),
          },
        }
      : {}),
    proposals: approvedData.proposals,
    nextStep: `synth mission snapshot ${approvedData.id} to inspect the persisted snapshot`,
  })
}


export async function cmdMissionProject(flags: Record<string, string | boolean>) {
  const alignmentContractId = typeof flags["alignment-contract-id"] === "string" ? flags["alignment-contract-id"] : undefined
  if (!alignmentContractId) {
    printError("Usage: synth mission project --alignment-contract-id <id>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ProjectMission",
    payload: { alignmentContractId },
  })

  if (result.status !== "ok") {
    printError(`ProjectMission failed: ${result.error}`)
    return
  }

  const output = (result as any).result ?? {}
  const certification = output.certification ?? {}
  const passed = certification.result === "passed"
  const mission = output.mission ?? {}

  printJson({
    status: "ok",
    kind: passed ? "MissionProjectedAndCertified" : "MissionProjectionFailed",
    projectionId: output.projectionId,
    certificationId: certification.certificationId,
    missionId: mission.id,
    missionFingerprint: output.missionFingerprint,
    contractId: alignmentContractId,
    certification: passed
      ? { result: "passed", checks: certification.checks }
      : { result: "failed", reason: certification.checks?.filter((c: any) => !c.passed).map((c: any) => c.reason).join("; ") },
    note: passed
      ? "Mission projected, certified, and created. Ready for Mission Approval."
      : "Mission projection failed certification. Alignment Contract must be revised.",
  })
}


export async function cmdMissionComplete(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : ""
  if (!id) {
    printError("Usage: synth mission complete --id <mission-id>", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth status' to see active missions.",
    })
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CompleteMission",
    payload: { id },
  })

  if (result.status !== "ok") {
    printError(result.error || `Failed to complete mission ${id}`, {
      code: "MissionCompleteFailed",
      category: "lifecycle",
      suggestion: "Ensure the mission is active and all its expeditions are completed or cancelled.",
    })
    return
  }

  printJson({
    status: "ok",
    kind: "MissionCompleted",
    missionId: id,
    result: result.result,
    // Mission close is the natural release boundary: a single version bump
    // per release is produced by `synth release`, which analyses commits
    // since the last tag, updates package.json + CHANGELOG.md, and creates
    // the vX.Y.Z tag. It is advisory here (also usable as a standalone
    // manual trigger) and never publishes — pushing the tag triggers CI.
    nextStep: "synth release --dry-run",
    releaseGuidance:
      "Mission complete. Cut the release with `synth release` (bumps version + CHANGELOG and tags vX.Y.Z from commits since the last tag). Preview with `synth release --dry-run`, then `synth release --approve`. Pushing the tag triggers the npm publish workflow.",
  })
}


export async function cmdMissionDelete(flags: Record<string, string | boolean>) {
  const { gateDecision, printGateBlock } = await import("./gate-reporting.js")
  const id = typeof flags.id === "string" ? flags.id : ""
  if (!id) {
    printError("Usage: synth mission delete --id <mission-id> [--reason <text>]", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth mission list' to see available missions.",
    })
    return
  }

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const intake = await gateDecision({ kind: "mission.delete", missionId: id }, state, ctx.runtime)
    if (intake.decision === "BLOCK") {
      printGateBlock(intake)
    }
    printJson({
      status: "ok",
      kind: "LifecycleDryRun",
      wouldAppend: {
        type: "MISSION_DELETED",
        payload: { id },
      },
      verifyResult: { pass: 0, fail: 0, warn: 0, skipped: 0 },
      stateDelta: `mission ${id} removed from governance state`,
    })
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "mission.delete", missionId: id }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const payload: Record<string, unknown> = { id }
  const reason = typeof flags.reason === "string" ? flags.reason : undefined
  if (reason) payload.reason = reason

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "DeleteMission",
    payload,
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "MissionDeleteFailed")
  }

  const ledger = await commitDraftCeremony("mission-delete", id)

  printJson({
    status: "ok",
    kind: "MissionDeleted",
    missionId: id,
    result: result.result,
    ...(ledger ? { ledger } : {}),
  })
}


export const EVIDENCE_CONFIDENCE_LEVELS = ["unknown", "low", "medium", "high", "certain"]


export async function cmdMissionDecisions(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : undefined
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const { records, chainValid } = await listDecisions(dataDir, draftId)
  if (!chainValid) {
    printError(
      "Mission decision record chain is broken: a recorded decision is missing, altered, or duplicated. " +
        "Inspect .synth/data/decisions.jsonl; the record is tamper-evident by design.",
    )
  }
  printJson({
    status: "ok",
    kind: "MissionDecisions",
    decisions: records,
    ...(draftId ? { draftId } : {}),
  })
}


export async function cmdMissionEvidenceAdd(flags: Record<string, string | boolean>) {
  const { gateDecision, printGateBlock } = await import("./gate-reporting.js")
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  if (!draftId) printError("--draft-id is required")
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  if (!subject) printError("--subject is required")

  // Resolve the project's actual governance state before allowing evidence add.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision({ kind: "mission.evidence.add" }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }
  const purpose = typeof flags.purpose === "string" ? flags.purpose : undefined
  const confidence = typeof flags.confidence === "string" ? flags.confidence : "high"
  if (!EVIDENCE_CONFIDENCE_LEVELS.includes(confidence)) {
    const isNumeric = /^\d+(\.\d+)?$/.test(confidence)
    printError(
      `Unknown confidence level: "${confidence}". Valid levels: ${EVIDENCE_CONFIDENCE_LEVELS.join(", ")}`,
      {
        code: "InvalidConfidenceLevel",
        category: "cli",
        suggestion: `Use a named confidence level: ${EVIDENCE_CONFIDENCE_LEVELS.join(", ")}.${isNumeric ? " Numeric values like \"0.9\" are not accepted." : ""}`,
      },
    )
  }

  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}. Run synth mission create --subject <subject> --purpose <purpose> to create a Mission Draft.`)
  }

  // Drafts are certified artifacts; a tampered draft cannot be extended (EXP-TRUST-002).
  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    printError(integrity.message)
  }

  const timestamp = Date.now()

  // Drafts are immutable: adding evidence creates a successor draft (EXP-TRUST-003).
  const observation = makeObservation("evidence", subject, timestamp, {
    description: purpose ?? subject,
    ...(purpose ? { purpose } : {}),
  })
  observation.confidence = confidence as PlanningObservation["confidence"]

  const existing = Array.isArray(draftData.observations) ? (draftData.observations as PlanningObservation[]) : []
  const dedupKey = `${observation.id}-${observation.sourceAdapter}-${observation.type}`
  if (existing.some((obs) => `${obs.id}-${obs.sourceAdapter}-${obs.type}` === dedupKey)) {
    printError(`This evidence is already present in draft "${draftId}"; nothing to add. Approve the draft, or add different evidence.`)
  }

  const ctx = await (await import("../core/bootstrap.js")).bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations: [...existing, observation], timestamp },
  })) as { status: string; session?: PlanningSession; error?: string }

  if (sessionResult.status !== "ok" || !sessionResult.session) {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const session = sessionResult.session
  const serialized = serializePlanningSession(session)
  const successorPath = path.join(draftsDir, `${session.id}.json`)
  await fs.writeFile(successorPath, JSON.stringify(serialized, null, 2), "utf-8")
  await writeDraftIntegrityRecord(draftsDir, session.id, serialized)

  const ledger = await commitDraftCeremony("mission-evidence", session.id)

  printJson({
    status: "ok",
    kind: "MissionDraft",
    draftId: session.id,
    draftPath: successorPath,
    supersedes: draftId,
    integrity: "certified",
    confidence: session.confidence,
    unknowns: session.unknowns,
    questions: session.questions,
    ...(ledger ? { ledger } : {}),
    nextStep: `synth mission approve --draft-id ${session.id}`,
  })
}


export async function cmdMissionList(flags: Record<string, string | boolean>) {
  const { resolveGovernanceContext, isGovernanceResolutionFailure } = await import("../runtime/governance-resolver.js")
  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const missions = Object.values(resolved.authoritative.replayedState.missions)

  let missionsWithProgram = await Promise.all(
    missions.map(async (m) => {
      const program = await inferMissionProgram(charterDir, m.id, resolved)
      return {
        id: m.id,
        name: m.name,
        status: m.status,
        purpose: m.purpose,
        program: program || undefined,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    }),
  )

  missionsWithProgram = filterByValues(
    missionsWithProgram,
    (m) => m.status,
    typeof flags.status === "string" ? flags.status : undefined,
  )

  const programFilter = typeof flags.program === "string" ? flags.program : undefined
  if (programFilter && programFilter.trim() !== "") {
    const allowed = new Set(programFilter.split(",").map((s) => s.trim()).filter(Boolean))
    missionsWithProgram = missionsWithProgram.filter((m) => m.program && allowed.has(m.program.id))
  }

  printJson({
    status: "ok",
    kind: "MissionList",
    count: missionsWithProgram.length,
    missions: missionsWithProgram,
  })
}


export async function cmdMissionShow(flags: Record<string, string | boolean>) {
  const { resolveGovernanceContext, isGovernanceResolutionFailure } = await import("../runtime/governance-resolver.js")
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth mission show --id <mission-id>", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth mission list' to see available missions.",
    })
    return
  }

  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  const mission = resolved.authoritative.replayedState.missions[id]
  if (!mission) {
    printError(`Mission ${id} not found.`, {
      code: "MissionNotFound",
      category: "validation",
      suggestion: "Run 'synth mission list' to see available missions.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const program = await inferMissionProgram(charterDir, id, resolved)

  const expeditionRecords = Object.values(resolved.authoritative.replayedState.expeditions)
    .filter((e) => e.missionId === id)
    .map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      goal: e.goal,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  printJson({
    status: "ok",
    kind: "MissionShow",
    mission: {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      purpose: mission.purpose,
      program: program || undefined,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    },
    expeditions: expeditionRecords,
  })
}


export async function cmdMissionReport(flags: Record<string, string | boolean>) {
  const { resolveGovernanceContext, isGovernanceResolutionFailure } = await import("../runtime/governance-resolver.js")
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth mission report --id <mission-id>", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth status' to see active missions.",
    })
    return
  }

  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  const mission = resolved.authoritative.replayedState.missions[id]
  if (!mission) {
    printError(`Mission ${id} not found.`, {
      code: "MissionNotFound",
      category: "validation",
      suggestion: "Run 'synth status' to see active missions.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const inventory = await loadGovernanceInventory(charterDir)
  const program = await inferMissionProgram(charterDir, id, resolved)

  const expeditionRecords = Object.values(resolved.authoritative.replayedState.expeditions)
    .filter((e) => e.missionId === id)
    .map((e) => {
      const charter = inventory.expeditions.find((ce) => ce.id === e.id)
      return {
        id: e.id,
        name: e.name,
        status: e.status,
        priority: charter?.priority || "Unknown",
        program: charter?.program || "",
        goal: e.goal,
      }
    })

  const human = flags.human === true || flags.human === "true"
  if (human) {
    const expeditionLines =
      expeditionRecords.length === 0
        ? "  No expeditions."
        : expeditionRecords.map((e) => `  ${e.id}  ${e.status.padEnd(10)} ${e.name}`).join("\n")
    console.log(
      `Mission: ${id} — ${mission.name}\n` +
      `Status: ${mission.status}${program ? `\nProgram: ${program.id} — ${program.name}` : ""}\n` +
      `Purpose:\n  ${mission.purpose}\n\n` +
      `Expeditions:\n${expeditionLines}`,
    )
    return
  }

  printJson({
    status: "ok",
    kind: "MissionReport",
    mission: {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      purpose: mission.purpose,
      program: program || undefined,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    },
    expeditions: expeditionRecords,
  })
}


export async function cmdMissionSnapshot(args: string[], flags: Record<string, string | boolean>) {
  const snapshotId =
    args[0] && args[0] !== "list" ? args[0] : typeof flags.id === "string" ? flags.id : ""

  const ctx = await (await import("../core/bootstrap.js")).bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  if (!snapshotId) {
    let listResult: { status: string; snapshots?: Array<Record<string, any>>; error?: string }
    try {
      listResult = (await ctx.api.missionStudioOperation({
        operation: "listSnapshots",
        params: {},
      })) as typeof listResult
    } catch (err) {
      // The snapshot store certifies on load: a throw means a stored
      // snapshot is tampered or malformed.
      printError(
        err instanceof Error ? err.message : String(err),
        {
          code: "MissionSnapshotListFailed",
          category: "integrity",
          suggestion: "Run 'synth explain snapshots' to inspect stored snapshots, or restore from a known-good backup.",
          documentation: "docs/reference/snapshots.md",
        },
      )
    }

    if (listResult.status !== "ok") {
      printError(`Snapshot listing failed: ${listResult.error || JSON.stringify(listResult)}`)
    }

    printJson({
      status: "ok",
      kind: "MissionSnapshotList",
      count: listResult.snapshots?.length ?? 0,
      snapshots: (listResult.snapshots ?? []).map((s) => ({
        snapshotId: s.id,
        version: s.version,
        sessionId: s.sessionId,
        lineageId: s.lineage?.lineageId,
        lineageVersion: s.lineage?.version,
        parentId: s.lineage?.parentId,
        approvedAt: s.lineage?.approvedAt,
        approvedBy: s.lineage?.approvedBy,
      })),
    })
    return
  }

  let getResult: { status: string; snapshot?: Record<string, any>; error?: string }
  try {
    getResult = (await ctx.api.missionStudioOperation({
      operation: "getSnapshot",
      params: { snapshotId },
    })) as typeof getResult
  } catch (err) {
    // The snapshot store certifies on load: a throw means the
    // snapshot failed signature or structural verification.
    printError(
      err instanceof Error ? err.message : String(err),
      {
        code: "MissionSnapshotInspectionFailed",
        category: "integrity",
        suggestion: "Run 'synth explain snapshots' to inspect the snapshot chain, or restore from a known-good backup.",
        documentation: "docs/reference/snapshots.md",
        snapshotId,
        signatureValid: false,
      },
    )
  }

  if (getResult.status !== "ok" || !getResult.snapshot) {
    printError(getResult.error || `snapshot not found: ${snapshotId}`)
  }

  const snapshot = getResult.snapshot
  printJson({
    status: "ok",
    kind: "MissionSnapshotInspection",
    snapshotId: snapshot.id,
    version: snapshot.version,
    sessionId: snapshot.sessionId,
    timestamp: snapshot.timestamp,
    lineage: snapshot.lineage ?? null,
    proposals: Array.isArray(snapshot.proposals) ? snapshot.proposals.length : 0,
    signatureValid: true,
    certification: { violations: [] },
  })
}


// ============================================================
// EXP-REFINE-015: Charter verification command
// ============================================================
export async function cmdMissionVerifyCharter(flags: Record<string, string | boolean>) {
  const filePath = typeof flags.file === "string" ? flags.file : ""
  if (!filePath) {
    printError(
      "--file is required",
      {
        code: "CharterFileRequired",
        category: "validation",
        suggestion: "Provide the path to an expedition charter with --file <path>.",
        documentation: "docs/reference/charter-format.md",
      },
    )
  }

  let content: string
  try {
    content = await fs.readFile(path.resolve(filePath), "utf-8")
  } catch {
    printError(
      `Cannot read file: ${filePath}`,
      {
        code: "CharterFileUnreadable",
        category: "io",
        suggestion: "Verify the file path exists and is readable.",
        documentation: "docs/reference/charter-format.md",
      },
    )
  }

  const checks: { name: string; passed: boolean; detail: string }[] = []

  // Check required headers
  checks.push({ name: "has-title", passed: /^#\s+.+$/m.test(content), detail: "Title (H1) present" })
  checks.push({ name: "has-status", passed: /^\*\*Status:\*\*\s+.+$/m.test(content), detail: "Status header present" })
  checks.push({ name: "has-objective", passed: /^##\s+(Objective|Purpose|Thesis)/m.test(content), detail: "Objective/Purpose/Thesis section present" })

  // Check dependency headers
  const { parseDependencyRecord } = await import("../governance/dependency-graph.js")
  const record = parseDependencyRecord("charter", content)

  checks.push({ name: "depends-on-valid", passed: true, detail: `Depends On: ${record.dependsOn.length > 0 ? record.dependsOn.join(", ") : "none"}` })
  checks.push({ name: "blocks-valid", passed: true, detail: `Blocks: ${record.blocks.length > 0 ? record.blocks.join(", ") : "none"}` })

  // Check for required sections
  const sections = ["Deliverables", "Acceptance Criteria", "Out of Scope", "Relationship to Other Work"]
  for (const section of sections) {
    const pattern = new RegExp(`^##\\s+${section}`, "m")
    checks.push({ name: `has-section-${section.toLowerCase().replace(/\s+/g, "-")}`, passed: pattern.test(content), detail: `${section} section present` })
  }

  const failed = checks.filter((c) => !c.passed)

  printJson({
    status: failed.length === 0 ? "ok" : "warning",
    kind: "CharterVerification",
    file: filePath,
    totalChecks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: failed.length,
    checks,
    valid: failed.length === 0,
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "create") await (await import("./command-mission-create.js")).cmdMissionCreate(flags)
  else if (sub === "project") await cmdMissionProject(flags)
  else if (sub === "approve") await cmdMissionApprove(flags)
  else if (sub === "evidence" && positional[2] === "add") await cmdMissionEvidenceAdd(flags)
  else if (sub === "list") await cmdMissionList(flags)
  else if (sub === "show") await cmdMissionShow(flags)
  else if (sub === "verify-charter") await cmdMissionVerifyCharter(flags)
  else if (sub === "decisions") await cmdMissionDecisions(flags)
  else if (sub === "snapshot") await cmdMissionSnapshot(positional.slice(2), flags)
  else if (sub === "report") await cmdMissionReport(flags)
  else if (sub === "complete") await cmdMissionComplete(flags)
  else if (sub === "delete") await cmdMissionDelete(flags)
  else if (sub === "certify") {
    printError(
      "synth mission certify does not exist. Missions are closed with synth mission complete --id <mission-id>.",
      {
        code: "UnknownMissionSubcommand",
        category: "cli",
        suggestion: "Close the mission with:\n  synth mission complete --id <mission-id>",
      },
    )
  }
  else
    printError(
      "Usage: synth mission create --subject <subject> --purpose <purpose> [--evidence-file <path>] | synth mission project --alignment-contract-id <id> | synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id> | synth mission evidence add --draft-id <draft-id> --subject <subject> [--purpose <purpose>] [--confidence <level>] | synth mission list [--status <status>] [--program <program-id>] | synth mission show --id <mission-id> | synth mission verify-charter --file <path> | synth mission decisions [--draft-id <draft-id>] | synth mission snapshot [<snapshot-id> | list] | synth mission report --id <mission-id> | synth mission complete --id <mission-id> | synth mission delete --id <mission-id>",
    )
}
