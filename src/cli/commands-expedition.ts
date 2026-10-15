// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { spawn, execSync } from "child_process"
import { sha256 } from "../sdk/hashing/index.js"
import { printJson, printError } from "./print.js"
import { deliveryState, handoffState } from "../ledger/delivery.js"
import { verifyDraftIntegrity, writeDraftIntegrityRecord, retireDraftArtifacts } from "../mission-studio/draft-integrity.js"
import { findSimilarExpeditions } from "../mission-studio/duplicate-detection.js"
import { resolveGovernanceContext, isGovernanceResolutionFailure } from "../runtime/governance-resolver.js"
import { branchNameCandidates, validateDeclaredBranchName } from "../repository/branch-taxonomy.js"
import { analyzeEventLogLineage } from "./event-log-lineage.js"
import { enrichExecutionBranchContext, loadBranchPolicyConfig } from "../repository/branch-policy.js"
import * as sdk from "../sdk/index.js"
import { loadGovernanceInventory, filterByValues, findProgramById, findExpeditionById, findUpstreamExpeditions, findDownstreamExpeditions } from "../governance/inventory.js"
import { loadExpeditionCharterDetails } from "../governance/charter-report.js"
import { rankExpeditions, rankExpeditionRecords } from "../governance/rank.js"
import { validateEvaluationResult, formatEvaluationErrors } from "../domain/evaluation.js"
import { generateConvergenceEvaluation } from "../governance/convergence-certification/auto-evaluation.js"
import { isStrictContext, echoResolution, resolveInferredMissionId, resolveInferredDraftId } from "./context.js"
import { findExpeditionTemplate, EXPEDITION_TEMPLATES } from "../governance/expedition-templates.js"
import type { PlanningSession } from "../mission-studio/types.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { gateDecision, printGateBlock } from "./gate-reporting.js"
import { isWorkingTreeDirty, runGitSpawn, getUntrackedSourcePaths, isAutoCommitEnabled } from "./working-tree.js"
import { namespaceHelp } from "./command-help.js"
import { parseTokenList, makeObservation, ensureDraftsDir, serializePlanningSession, commitDraftCeremony } from "./command-planning.js"
import { runLifecycleDryRun, DeclaredBranchInfo, declareExecutionBranch, recordExecutionBranchBinding, assertExecutionBranch, autoCommitDerivedState, resolveExpeditionId, completeExpedition, cmdExpeditionComplete } from "./command-lifecycle.js"


export async function cmdExpeditionHelp() {
  printJson(namespaceHelp("expedition", "Expedition lifecycle and inventory operations", [
    { name: "synth expedition create --mission <mission> --subject <subject> --goal <goal> [--scope <glob>] [--intent <tokens>] [--dry-run]", description: "Create an Expedition proposal (Draft) with an optional file-scope boundary; --intent adds explicit tokens for duplicate-aware advisory matching against existing expeditions" },
    { name: "synth expedition new --subject <subject> --goal <goal> [--mission <mission>] [--scope <glob>]", description: "Create an Expedition draft, inferring the active mission when --mission is omitted" },
    { name: "synth expedition create --mission <mission> --template <id> [--subject <subject>] [--dry-run]", description: "Create an Expedition from a named template (ci, deployment, observability, documentation)" },
    { name: "synth expedition approve --draft-id <id> [--dry-run]", description: "Approve an Expedition draft (Draft → Approved)" },
    { name: "synth expedition approve --all-drafts --mission <id> [--dry-run]", description: "Approve all draft Expeditions for a Mission" },
    { name: "synth expedition commit --proposal-id <id> [--dry-run]", description: "Commit approved Expedition to runtime (Approved → Committed)" },
    { name: "synth expedition commit --all-approved --mission <id> [--dry-run]", description: "Commit all approved Expeditions for a Mission" },
    { name: "synth expedition start --id <id> [--no-auto-commit] [--dry-run]", description: "Begin executing a committed Expedition (Committed → Executing); derived state is auto-committed by default" },
    { name: "synth expedition start --all-committed --mission <id> [--no-auto-commit] [--dry-run]", description: "Start all committed Expeditions for a Mission" },
    { name: "synth expedition complete --id <id> [--evidence <path>] [--force --reason <text>] [--no-auto-commit] [--dry-run]", description: "Complete an executing Expedition (Executing → Completed); requires passing verification and attached evidence" },
    { name: "synth expedition finish --id <id> [--note <text>] [--force --reason <text>] [--no-auto-commit] [--dry-run]", description: "Atomically attach git-diff evidence, certify convergence, and complete an executing Expedition" },
    { name: "synth expedition cancel --id <id> --reason <reason> [--dry-run]", description: "Cancel an Expedition as a safe fallback (Executing → Cancelled)" },
    { name: "synth expedition archive --id <id> --reason <reason> [--dry-run]", description: "Archive an Expedition (Executing | Cancelled → Archived)" },
    { name: "synth expedition delete --id <id> [--reason <text>] [--dry-run]", description: "Delete an empty Expedition that has no objectives" },
    { name: "synth expedition move --id <id> --to-mission <mission-id> [--reason <text>] [--approved] [--dry-run]", description: "Re-parent an Expedition to another Mission under scope-and-intent verification; use --approved to override a misaligned move with operator approval" },
    { name: "synth expedition evidence --id <id> [--git-diff] [--baseline <commit>] [--test-results <path>] [--attach <path>[,...]] [--note <text>] [--no-auto-commit] [--dry-run]", description: "Capture and attach evidence artifacts to an executing Expedition" },
    { name: "synth expedition refine --id <id> --note <text> [--depends-on <id>[,<id>...]] [--no-auto-commit] [--dry-run]", description: "Record a charter refinement on a non-terminal Expedition; status does not change" },
    { name: "synth expedition certify --id <id> [--evaluation <path>] [--evidence <path>] [--no-auto-commit] [--dry-run]", description: "Certify convergence for an executing or completed Expedition; auto-generates evaluation when omitted" },
    { name: "synth expedition list", description: "List governance expeditions" },
    { name: "synth expedition list --mission <mission-id> [--ranked]", description: "List a single mission's expeditions; add --ranked to order them by priority, status, and downstream impact so operators see what is ahead within the mission", args: "--mission 2644f4a2c0ad2ad7 --ranked" },
    { name: "synth expedition list --status <status>", description: "Filter expeditions by status", args: "--status Draft | Proposed | Executing | Completed" },
    { name: "synth expedition list --priority <priority>", description: "Filter expeditions by priority", args: "--priority Critical | High | Medium | Low" },
    { name: "synth expedition list --program <program-id>", description: "Filter expeditions by program", args: "--program EXP-PROGRAM-043" },
    { name: "synth expedition show --id <expedition-id>", description: "Show a single expedition with upstream/downstream context", args: "--id EXP-CLI-005" },
    { name: "synth expedition report --id <expedition-id>", description: "Show a rich report with charter intent, evidence, and expected output", args: "--id EXP-CLI-005" },
    { name: "synth expedition rank", description: "Rank open expeditions by priority, status, and downstream impact" },
    { name: "synth expedition rank --next", description: "Return the single highest-priority open expedition" },
    { name: "synth expedition rank --status <status>", description: "Rank expeditions by status", args: "--status Draft | Proposed | Executing | Completed" },
    { name: "synth expedition rank --program <program-id>", description: "Rank expeditions within a program", args: "--program EXP-PROGRAM-043" },
  ], { note: "expedition list, show, report, and rank are read-only and derived from docs/expeditions/*.md. Mutating subcommands support --dry-run." }))
}


export async function cmdExpeditionApproveHelp() {
  printJson({
    status: "ok",
    name: "synth",
    namespace: "expedition",
    subcommand: "approve",
    description: "Approve an Expedition draft so it can be committed and started, or approve all drafts for a Mission.",
    usage: "synth expedition approve --draft-id <draft-id> | synth expedition approve --all-drafts --mission <mission-id>",
    required: [
      { name: "--draft-id <draft-id>", description: "Id of the Expedition draft to approve (returned by synth expedition create)" },
      { name: "--all-drafts --mission <mission-id>", description: "Approve every Expedition in draft status for the given Mission" },
    ],
    optional: [
      { name: "--dry-run", description: "Preview which drafts would be approved without mutating state" },
      { name: "--human", description: "Emit a human-readable summary instead of JSON" },
      { name: "--summary", description: "Emit a condensed status/ID/next-step summary" },
      { name: "--quiet", description: "Suppress bootstrap and diagnostic logs" },
      { name: "--no-bootstrap-logs", description: "Alias for --quiet" },
    ],
    examples: [
      "synth expedition approve --draft-id 0b15edbbb74e4701",
      "synth expedition approve --all-drafts --mission 0c3c95e581c0fd75",
    ],
    note: "Approval advances the Expedition from Draft to Approved. Batch mode skips expeditions that are no longer in draft state.",
  })
}


// ============================================================
// EXP-CLI-003: Governance inventory list commands
// ============================================================

// Merge charter metadata with the authoritative runtime expedition state.
// Runtime status is authoritative; charter data enriches name, kind, priority,
// program, and dependency fields. CLI-created expeditions with no charter are
// still included, so list/show never return "not found" for a real expedition.
export type MergedExpeditionRecord = import("../governance/inventory.js").ExpeditionRecord & {
  missionId?: string
}


export async function buildMergedExpeditionMap(
  charterDir: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<Map<string, MergedExpeditionRecord>> {
  const inventory = await loadGovernanceInventory(charterDir)
  const charterMap = new Map(inventory.expeditions.map((e) => [e.id, e]))
  const runtimeExpeditions = !isGovernanceResolutionFailure(resolved)
    ? resolved.authoritative.replayedState.expeditions
    : {}

  const allIds = new Set([...charterMap.keys(), ...Object.keys(runtimeExpeditions)])
  const merged = new Map<string, MergedExpeditionRecord>()
  for (const id of allIds) {
    const charter = charterMap.get(id)
    const runtime = runtimeExpeditions[id]
    merged.set(id, {
      id,
      name: charter?.name || runtime?.name || id,
      kind: charter?.kind || "Unknown",
      status: runtime?.status || charter?.status || "Unknown",
      priority: charter?.priority || "Unknown",
      program: charter?.program || "",
      dependsOn: charter?.dependsOn || runtime?.dependsOn || [],
      blocks: charter?.blocks || [],
      missionId: runtime?.missionId,
    })
  }
  return merged
}


export async function buildMergedExpeditionList(
  charterDir: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<MergedExpeditionRecord[]> {
  const map = await buildMergedExpeditionMap(charterDir, resolved)
  return Array.from(map.values())
}


export async function findMergedExpeditionById(
  charterDir: string,
  id: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<MergedExpeditionRecord | undefined> {
  const map = await buildMergedExpeditionMap(charterDir, resolved)
  return map.get(id)
}


export async function cmdExpeditionList(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const resolved = await resolveGovernanceContext(process.cwd())
  let expeditions = await buildMergedExpeditionList(charterDir, resolved)

  expeditions = filterByValues(expeditions, (e) => e.status, typeof flags.status === "string" ? flags.status : undefined)
  expeditions = filterByValues(expeditions, (e) => e.priority, typeof flags.priority === "string" ? flags.priority : undefined)

  const programFilter = typeof flags.program === "string" ? flags.program : undefined
  if (programFilter && programFilter.trim() !== "") {
    const allowed = new Set(programFilter.split(",").map((s) => s.trim()).filter(Boolean))
    expeditions = expeditions.filter((e) => allowed.has(e.program))
  }

  // Mission-scoped listing: filter the merged inventory to a single mission
  // using the runtime missionId association (charter records carry no mission
  // binding). CLI-created expeditions without charters are still included via
  // runtime state.
  const missionFilter = typeof flags.mission === "string" ? flags.mission : undefined
  if (missionFilter && missionFilter.trim() !== "") {
    expeditions = expeditions.filter((e) => e.missionId === missionFilter)
  }

  // Ranked view: order the (optionally mission-scoped) expeditions by the
  // canonical weighted score reusing the rankExpeditions machinery. Completed
  // expeditions are excluded so operators see only the work still ahead.
  const ranked = flags.ranked === true || flags.ranked === "true"
  if (ranked) {
    const inventory = await loadGovernanceInventory(charterDir)
    const programById = new Map(inventory.programs.map((p) => [p.id, p]))
    const rankedExpeditions = rankExpeditionRecords(expeditions, programById)
    printJson({
      status: "ok",
      kind: "ExpeditionRank",
      count: rankedExpeditions.length,
      ...(missionFilter ? { missionId: missionFilter } : {}),
      expeditions: rankedExpeditions,
      next: rankedExpeditions.length > 0 ? rankedExpeditions[0].id : undefined,
      warnings: [],
    })
    return
  }

  // Remove runtime-only fields from the list response to keep the public shape stable.
  const publicExpeditions = expeditions.map(({ missionId: _missionId, ...rest }) => rest)

  printJson({
    status: "ok",
    kind: "ExpeditionList",
    count: publicExpeditions.length,
    ...(missionFilter ? { missionId: missionFilter } : {}),
    expeditions: publicExpeditions,
  })
}


export async function cmdExpeditionRank(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const human = flags.human === true || flags.human === "true"
  const result = await rankExpeditions(charterDir, {
    status: typeof flags.status === "string" ? flags.status : undefined,
    priority: typeof flags.priority === "string" ? flags.priority : undefined,
    program: typeof flags.program === "string" ? flags.program : undefined,
  }, {
    next: flags.next === true || flags.next === "true",
    human,
  })

  if (human && result.next) {
    const top = result.expeditions.find((e) => e.id === result.next)
    if (top) {
      printJson({
        status: "ok",
        kind: "ExpeditionRankHuman",
        next: result.next,
        text: `Next recommended expedition: ${result.next} (score ${top.score})\n  ${top.name}.\n  Reason: ${top.rationale}.`,
      })
      return
    }
  }

  printJson(result)
}


export async function cmdExpeditionShow(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth expedition show --id <expedition-id>", {
      code: "MissingExpeditionId",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const resolved = await resolveGovernanceContext(process.cwd())
  const expedition = await findMergedExpeditionById(charterDir, id, resolved)
  if (!expedition) {
    printError(`Expedition ${id} not found.`, {
      code: "ExpeditionNotFound",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  const [programRecord, upstream, downstream] = await Promise.all([
    expedition.program ? findProgramById(charterDir, expedition.program) : Promise.resolve(undefined),
    expedition.program ? findUpstreamExpeditions(charterDir, expedition as import("../governance/inventory.js").ExpeditionRecord) : Promise.resolve([]),
    expedition.program ? findDownstreamExpeditions(charterDir, expedition as import("../governance/inventory.js").ExpeditionRecord) : Promise.resolve([]),
  ])

  const program = programRecord
    ? { id: programRecord.id, name: programRecord.name }
    : { id: expedition.program, name: expedition.program }

  const human = flags.human === true || flags.human === "true"

  if (human) {
    const upstreamText = upstream.length === 0
      ? "None"
      : upstream.map((e) => `${e.id} (${e.status})`).join(", ")
    const downstreamText = downstream.length === 0
      ? "None"
      : downstream.map((e) => `${e.id} (${e.status})`).join(", ")
    console.log(
      `Expedition: ${expedition.id} — ${expedition.name}\n` +
      `Status: ${expedition.status} | Priority: ${expedition.priority}\n` +
      `Program: ${program.id ? `${program.id} — ${program.name}` : "Unknown"}${expedition.missionId ? `\nMission: ${expedition.missionId}` : ""}\n` +
      `Depends on: ${expedition.dependsOn.length === 0 ? "None" : expedition.dependsOn.join(", ")}\n` +
      `Blocks: ${expedition.blocks.length === 0 ? "None" : expedition.blocks.join(", ")}\n` +
      `Upstream: ${upstreamText}\n` +
      `Downstream: ${downstreamText}`,
    )
    return
  }

  const { missionId, ...publicExpedition } = expedition
  const runtimeResolved = await resolveGovernanceContext(process.cwd())
  const runtimeExpedition = !isGovernanceResolutionFailure(runtimeResolved)
    ? runtimeResolved.authoritative.replayedState.expeditions[id]
    : undefined
  const record = (runtimeExpedition ?? expedition) as { status?: string; metadata?: Record<string, unknown> }
  const delivery = deliveryState(record)
  const handoff = handoffState(record)
  printJson({
    status: "ok",
    kind: "ExpeditionShow",
    expedition: publicExpedition,
    program: program.id ? program : undefined,
    missionId,
    upstream,
    downstream,
    delivery: {
      delivered: delivery.delivered,
      integrated: delivery.integrated,
      deliveryPending: delivery.deliveryPending,
      ...(delivery.delivery ? { record: delivery.delivery } : {}),
      ...(delivery.integration ? { integration: delivery.integration } : {}),
    },
    ...(handoff ? { handoff } : {}),
  })
}


// ============================================================
// Human-readable governance reports
// ============================================================
export async function cmdExpeditionReport(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth expedition report --id <expedition-id>", {
      code: "MissingExpeditionId",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  // Resolve runtime state first so we can fall back to CLI-created expeditions
  // that have no docs/expeditions charter file.
  const resolved = await resolveGovernanceContext(process.cwd())
  const runtimeExpedition = !isGovernanceResolutionFailure(resolved)
    ? resolved.authoritative.replayedState.expeditions[id]
    : undefined

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const charterRecord = await findExpeditionById(charterDir, id)

  if (!charterRecord && !runtimeExpedition) {
    printError(`Expedition ${id} not found.`, {
      code: "ExpeditionNotFound",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  // Build a unified expedition record. Charter docs win for priority/kind/program;
  // runtime state provides the authoritative status, mission id, attachments, and goal.
  const expeditionRecord: import("../governance/inventory.js").ExpeditionRecord = charterRecord || {
    id: runtimeExpedition!.id,
    name: runtimeExpedition!.name,
    kind: "Unknown",
    status: runtimeExpedition!.status,
    priority: "Unknown",
    program: "",
    dependsOn: runtimeExpedition!.dependsOn || [],
    blocks: [],
  }

  const charterDetails = (await loadExpeditionCharterDetails(charterDir, id)) || {
    purpose: runtimeExpedition?.goal || "",
    goal: runtimeExpedition?.goal || "",
    deliverables: [],
    acceptanceCriteria: [],
    evidence: [],
    outOfScope: [],
    relatedDocuments: [],
    expectedOutput: "",
  }

  const [programRecord, upstream, downstream] = await Promise.all([
    findProgramById(charterDir, expeditionRecord.program),
    charterRecord ? findUpstreamExpeditions(charterDir, charterRecord) : Promise.resolve([]),
    charterRecord ? findDownstreamExpeditions(charterDir, charterRecord) : Promise.resolve([]),
  ])

  const program = programRecord
    ? { id: programRecord.id, name: programRecord.name }
    : { id: expeditionRecord.program, name: expeditionRecord.program }

  const runtimeStatus = runtimeExpedition?.status || expeditionRecord.status
  const missionId = runtimeExpedition?.missionId || ""
  const forceCompleted = runtimeExpedition?.force === true
  const forceReason = runtimeExpedition?.forceReason
  const attachments: Array<{ kind: string; path: string; hash?: string; note?: string }> = runtimeExpedition
    ? (runtimeExpedition.attachments || []).map((a) => ({
        kind: a.kind,
        path: a.path,
        hash: a.hash,
        note: a.note,
      }))
    : []

  const human = flags.human === true || flags.human === "true"
  if (human) {
    const deliverablesText =
      charterDetails.deliverables.length === 0
        ? "  (none documented)"
        : charterDetails.deliverables.map((d) => `  • ${d}`).join("\n")
    const criteriaText =
      charterDetails.acceptanceCriteria.length === 0
        ? "  (none documented)"
        : charterDetails.acceptanceCriteria.map((c) => `  • ${c}`).join("\n")
    const evidenceText =
      attachments.length === 0 && charterDetails.evidence.length === 0
        ? "  (none attached)"
        : [
            ...attachments.map((a) => `  • [${a.kind}] ${a.path}${a.note ? ` — ${a.note}` : ""}`),
            ...charterDetails.evidence.map((e) => `  • ${e}`),
          ].join("\n")
    const scopeText =
      charterDetails.outOfScope.length === 0
        ? "  (none documented)"
        : charterDetails.outOfScope.map((s) => `  • ${s}`).join("\n")
    const relatedText =
      charterDetails.relatedDocuments.length === 0
        ? "  (none documented)"
        : charterDetails.relatedDocuments.map((r) => `  • ${r}`).join("\n")
    const upstreamText = upstream.length === 0 ? "None" : upstream.map((e) => `${e.id} (${e.status})`).join(", ")
    const downstreamText = downstream.length === 0 ? "None" : downstream.map((e) => `${e.id} (${e.status})`).join(", ")

    const forceText = forceCompleted
      ? `\nForce completed: yes${forceReason ? `\nForce reason: ${forceReason}` : ""}`
      : ""

    console.log(
      `Expedition: ${id} — ${expeditionRecord.name}\n` +
      `Status: ${runtimeStatus} | Priority: ${expeditionRecord.priority}\n` +
      `Program: ${program.id ? `${program.id} — ${program.name}` : "Unknown"}${missionId ? `\nMission: ${missionId}` : ""}${forceText}\n\n` +
      `Purpose:\n  ${charterDetails.purpose || "(not documented)"}\n\n` +
      `Deliverables:\n${deliverablesText}\n\n` +
      `Definition of done / Acceptance criteria:\n${criteriaText}\n\n` +
      `Evidence:\n${evidenceText}\n\n` +
      `Out of scope:\n${scopeText}\n\n` +
      `Related documents:\n${relatedText}\n\n` +
      `Depends on: ${expeditionRecord.dependsOn.length === 0 ? "None" : expeditionRecord.dependsOn.join(", ")}\n` +
      `Blocks: ${expeditionRecord.blocks.length === 0 ? "None" : expeditionRecord.blocks.join(", ")}\n` +
      `Upstream: ${upstreamText}\n` +
      `Downstream: ${downstreamText}`,
    )
    return
  }

  const expeditionOutput: Record<string, unknown> = {
    id,
    name: expeditionRecord.name,
    status: runtimeStatus,
    priority: expeditionRecord.priority,
    kind: expeditionRecord.kind,
    program: program.id ? program : undefined,
    missionId: missionId || undefined,
    dependsOn: expeditionRecord.dependsOn,
    blocks: expeditionRecord.blocks,
    upstream,
    downstream,
  }
  if (forceCompleted) {
    expeditionOutput.force = true
    if (forceReason) expeditionOutput.forceReason = forceReason
  }

  printJson({
    status: "ok",
    kind: "ExpeditionReport",
    expedition: expeditionOutput,
    charter: charterDetails,
    attachments,
  })
}


export async function cmdExpeditionCreate(flags: Record<string, string | boolean>) {
  let missionSubject = typeof flags.mission === "string" ? flags.mission : ""
  let subject = typeof flags.subject === "string" ? flags.subject : ""
  let goal = typeof flags.goal === "string" ? flags.goal : ""
  let scope: string[] = []

  const templateId = typeof flags.template === "string" ? flags.template : ""
  if (templateId) {
    const template = findExpeditionTemplate(templateId)
    if (!template) {
      printError(
        `Unknown expedition template: ${templateId}`,
        {
          code: "UnknownExpeditionTemplate",
          category: "configuration",
          suggestion: `Available templates: ${EXPEDITION_TEMPLATES.map((t) => t.id).join(", ")}`,
        },
      )
    }
    if (!subject) subject = template.name
    if (!goal) goal = template.goal
    scope = template.defaultScope ? [...template.defaultScope] : []
  }

  const rawScope = typeof flags.scope === "string" ? flags.scope : ""
  const explicitScope = rawScope
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (explicitScope.length > 0) {
    scope = explicitScope
  }

  // Resolve governance state early so we can infer --mission from the executing
  // expedition / active mission when it is not supplied (context inference).
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()

  if (!missionSubject && !isStrictContext()) {
    const inferred = resolveInferredMissionId(state)
    if (inferred) {
      missionSubject = inferred
      echoResolution("mission", inferred, "executing expedition / active mission")
    }
  }

  if (!missionSubject || !subject) printError("--mission and --subject are required (or use --template)")

  // EXP-CLI-00x: --mission may be an existing mission id or name. Resolve it
  // before planning so Mission Studio does not fabricate a duplicate mission.
  const existingMission = Object.values(state.missions || {}).find(
    (m) => m.id === missionSubject || m.name === missionSubject,
  )
  const resolvedMissionId = existingMission ? existingMission.id : missionSubject
  const resolvedMissionName = existingMission ? existingMission.name : missionSubject

  const intake = await gateDecision({ kind: "expedition.create", missionId: resolvedMissionId }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  // EXP-DUP-001: duplicate-aware creation. Compare the candidate expedition
  // (subject + goal + scope + intent tokens) against existing expeditions
  // and the parent mission to surface near-duplicates as an advisory.
  const scopeTokens = parseTokenList(flags.scope)
  const intentTokens = parseTokenList(flags.intent)
  const similar = findSimilarExpeditions(
    { subject, goal, scopeTokens, intentTokens },
    Object.values(state.expeditions || {}).map((e: any) => ({
      id: e.id,
      name: e.name,
      goal: e.goal,
      metadata: e.metadata,
    })),
  )

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const timestamp = Date.now()

  const observations = [
    existingMission
      ? makeObservation("mission", resolvedMissionName, timestamp, { id: resolvedMissionId, purpose: "Referenced existing mission" })
      : makeObservation("mission", missionSubject, timestamp, { purpose: "Auto-created from CLI" }),
    makeObservation("expedition", subject, timestamp, { goal, missionSubject: resolvedMissionId }),
  ]
  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations, timestamp },
  })) as { status: string; session?: PlanningSession; error?: string }

  if (sessionResult.status !== "ok" || !sessionResult.session) {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const session = sessionResult.session
  const proposalsResult = (await ctx.api.missionStudioOperation({
    operation: "proposeExpeditions",
    params: { observations, timestamp },
  })) as { status: string; proposals?: unknown; error?: string }

  // Dry-run (draft lifecycle integrity): planning is observed, nothing is
  // persisted — no draft files, no integrity record, no runtime entity.
  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    printJson({
      status: "ok",
      kind: "ExpeditionDraftDryRun",
      draftId: session.id,
      wouldCreate: {
        missionId: resolvedMissionId,
        missionName: resolvedMissionName,
        name: subject,
        goal,
        metadata: scope.length > 0 ? { scope } : {},
      },
      similar,
      proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : undefined,
      note: "No draft files written and no runtime entity created",
      nextStep: `synth expedition create --mission ${missionSubject} --subject "${subject}" --goal "${goal}"`,
    })
    return
  }

  // Persist the expedition draft and create a runtime entity in draft state.
  const draftsDir = await ensureDraftsDir()
  const draftPath = path.join(draftsDir, `${session.id}.json`)
  const serialized = serializePlanningSession(session)
  await fs.writeFile(draftPath, JSON.stringify(serialized, null, 2), "utf-8")
  await writeDraftIntegrityRecord(draftsDir, session.id, serialized)

  const expeditionId = session.id
  const createResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateExpedition",
    payload: {
      id: expeditionId,
      missionId: resolvedMissionId,
      name: subject,
      goal,
      metadata: scope.length > 0 ? { scope } : {},
    },
  })

  // The draft + integrity record join the ceremony commit (the CreateExpedition
  // capability may already have committed the runtime entity; the draft files
  // were written by this verb, so this verb commits them).
  const draftLedger = await commitDraftCeremony("expedition-draft", expeditionId)

  if (createResult.status !== "ok") {
    printError(`Failed to create expedition runtime entity: ${createResult.error || JSON.stringify(createResult)}`)
  }

  printJson({
    status: proposalsResult.status,
    kind: "ExpeditionDraft",
    draftId: expeditionId,
    draftPath,
    integrity: "certified",
    missionSubject: existingMission ? `${resolvedMissionName} (${resolvedMissionId})` : missionSubject,
    expeditionSubject: subject,
    goal,
    similar,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : undefined,
    ...(draftLedger ? { ledger: draftLedger } : {}),
    nextStep: `synth expedition approve --draft-id ${expeditionId}`,
  })
}


export function findExpeditionIdsByMissionAndStatus(
  state: import("../types/index.js").CanonicalState,
  missionId: string,
  status: string,
): string[] {
  return Object.values(state.expeditions)
    .filter((e: any) => e.missionId === missionId && e.status === status)
    .map((e: any) => e.id)
    .sort()
}


export async function approveOneExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  draftId: string,
  dryRun: boolean,
): Promise<Record<string, unknown>> {
  if (dryRun) {
    return runLifecycleDryRun(ctx, {
      capability: "ApproveExpedition",
      payload: { id: draftId },
      eventType: "EXPEDITION_APPROVED",
      expeditionId: draftId,
      targetStatus: "approved",
    })
  }

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.approve", expeditionId: draftId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    return {
      status: "error",
      draftId,
      code: "LifecycleBlocked",
      error: intake.reason,
      requiredAction: intake.requiredAction,
    }
  }

  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    return { status: "error", draftId, code: "DraftNotFound", error: `Draft not found: ${draftPath}` }
  }

  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    return { status: "error", draftId, code: "DraftIntegrityFailed", error: integrity.message }
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveExpedition",
    payload: { id: draftId },
  })

  if (result.status !== "ok") {
    return { status: "error", draftId, code: "ExpeditionApproveFailed", error: result.error || "Unknown execution gate error" }
  }

  return {
    status: "ok",
    kind: "ExpeditionApproved",
    draftId,
    proposalId: draftId,
    result: result.result,
    nextStep: `synth expedition commit --proposal-id ${draftId}`,
  }
}


export async function cmdExpeditionNew(flags: Record<string, string | boolean>) {
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  if (!flags.mission && !isStrictContext()) {
    const inferred = resolveInferredMissionId(state)
    if (inferred) {
      flags.mission = inferred
      echoResolution("mission", inferred, "executing expedition / active mission")
    } else {
      printError(
        "expedition new requires --mission (no executing expedition or active mission to infer from)",
        {
          code: "MissingMissionForExpeditionNew",
          category: "cli",
          suggestion: "Pass --mission <id> or start an expedition with 'synth expedition start --id <id>'.",
        },
      )
      return
    }
  }
  return cmdExpeditionCreate(flags)
}


export async function cmdExpeditionApprove(flags: Record<string, string | boolean>) {
  let draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const allDrafts = flags["all-drafts"] === true || flags["all-drafts"] === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"

  if (allDrafts) {
    if (!missionId) printError("--all-drafts requires --mission")
    if (draftId) printError("Cannot use --draft-id with --all-drafts")

    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const ids = findExpeditionIdsByMissionAndStatus(state, missionId, "draft")

    if (dryRun) {
      const previews = []
      for (const id of ids) {
        previews.push(await approveOneExpedition(ctx, id, true))
      }
      printJson({
        status: "ok",
        kind: "ExpeditionBatchApproveDryRun",
        missionId,
        wouldApprove: ids,
        previews,
      })
      return
    }

    const results = []
    for (const id of ids) {
      results.push(await approveOneExpedition(ctx, id, false))
    }
    const errors = results.filter((r) => r.status === "error")
    printJson({
      status: errors.length === 0 ? "ok" : "error",
      kind: "ExpeditionBatchApproved",
      missionId,
      processed: results.filter((r) => r.status === "ok").length,
      failed: errors.length,
      results,
      nextStep: errors.length === 0 ? `synth expedition commit --all-approved --mission ${missionId}` : undefined,
    })
    if (errors.length > 0) process.exit(1)
    return
  }

  if (!draftId && !isStrictContext()) {
    const ctx = await bootstrapWithCapabilities({ skipGenesis: true, infra: { persistence: "file" } })
    const state = await ctx.runtime.getState()
    const inferred = resolveInferredDraftId(state, missionId)
    if (inferred) {
      draftId = inferred
      echoResolution("draft-id", inferred, missionId ? `drafts in mission ${missionId}` : "all drafts")
    }
  }
  if (!draftId) printError("--draft-id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const result = await approveOneExpedition(ctx, draftId, dryRun)
  printJson(result)
  if (result.status === "error") process.exit(1)
}


export async function commitOneExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  proposalId: string,
  dryRun: boolean,
  declaredBranch?: string,
  noCreate = false,
): Promise<Record<string, unknown>> {
  if (dryRun) {
    const preview = await runLifecycleDryRun(ctx, {
      capability: "CommitExpedition",
      payload: { id: proposalId },
      eventType: "EXPEDITION_COMMITTED",
      expeditionId: proposalId,
      targetStatus: "committed",
    })
    if (declaredBranch) {
      const nameCheck = validateDeclaredBranchName(declaredBranch)
      return {
        ...preview,
        declaredBranch: { branch: declaredBranch, valid: nameCheck.valid, errors: nameCheck.errors },
      }
    }
    return preview
  }

  const state = await ctx.runtime.getState()
  let declared: DeclaredBranchInfo | undefined
  if (declaredBranch) {
    const record = state.expeditions?.[proposalId]
    if (!record) {
      return { status: "error", proposalId, code: "ExpeditionNotFound", error: `Expedition ${proposalId} is not in the ledger` }
    }
    declared = await declareExecutionBranch("expedition", {
      branch: declaredBranch,
      noCreate,
      entityId: proposalId,
      missionId: record.missionId,
      missionName: record.missionId ? state.missions?.[record.missionId]?.name : undefined,
      expeditionName: record.name,
    })
    if (!declared.ok) {
      return {
        status: "error",
        proposalId,
        code: declared.code,
        error: declared.error,
        ...(declared.suggestion ? { suggestion: declared.suggestion } : {}),
      }
    }
  }

  const intake = await gateDecision({ kind: "expedition.commit", expeditionId: proposalId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    return {
      status: "error",
      proposalId,
      code: "LifecycleBlocked",
      error: intake.reason,
      requiredAction: intake.requiredAction,
    }
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CommitExpedition",
    payload: { id: proposalId },
  })

  if (result.status !== "ok") {
    return { status: "error", proposalId, code: "ExpeditionCommitFailed", error: result.error || "Unknown execution gate error" }
  }

  // Draft lifecycle integrity: once committed, the execution gate owns the
  // record — the loose planning artifact retires instead of lingering.
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  let draftRetired: Awaited<ReturnType<typeof retireDraftArtifacts>> | undefined
  let draftRetirementError: string | undefined
  try {
    draftRetired = await retireDraftArtifacts(path.join(dataDir, "drafts"), proposalId)
  } catch (err) {
    draftRetirementError = err instanceof Error ? err.message : String(err)
  }

  if (declared?.ok) {
    await recordExecutionBranchBinding(ctx, "expedition", proposalId, declared)
  }

  return {
    status: "ok",
    kind: "ExpeditionCommitted",
    proposalId,
    result: result.result,
    ...(declared?.ok
      ? {
          executionBranch: {
            branch: declared.branch,
            created: declared.created,
            ...(declared.warning ? { warning: declared.warning } : {}),
          },
        }
      : {}),
    ...(draftRetired ? { draftRetired } : {}),
    ...(draftRetirementError ? { draftRetirementError } : {}),
    nextStep: `synth expedition start --id ${proposalId}`,
  }
}


export async function cmdExpeditionCommit(flags: Record<string, string | boolean>) {
  const proposalId = typeof flags["proposal-id"] === "string" ? flags["proposal-id"] : ""
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const allApproved = flags["all-approved"] === true || flags["all-approved"] === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const declaredBranch = typeof flags.branch === "string" && flags.branch.length > 0 ? flags.branch : undefined
  const noCreate = flags["no-create"] === true || flags["no-create"] === "true"
  if (noCreate && !declaredBranch) printError("--no-create requires --branch")
  // Two expeditions cannot share one branch (ADR-056 §2.3), so a batch commit
  // cannot carry a single declaration.
  if (allApproved && declaredBranch) printError("--branch cannot be combined with --all-approved")

  if (allApproved) {
    if (!missionId) printError("--all-approved requires --mission")
    if (proposalId) printError("Cannot use --proposal-id with --all-approved")

    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const ids = findExpeditionIdsByMissionAndStatus(state, missionId, "approved")

    if (dryRun) {
      const previews = []
      for (const id of ids) {
        previews.push(await commitOneExpedition(ctx, id, true))
      }
      printJson({
        status: "ok",
        kind: "ExpeditionBatchCommitDryRun",
        missionId,
        wouldCommit: ids,
        previews,
      })
      return
    }

    const results = []
    for (const id of ids) {
      results.push(await commitOneExpedition(ctx, id, false))
    }
    const errors = results.filter((r) => r.status === "error")
    printJson({
      status: errors.length === 0 ? "ok" : "error",
      kind: "ExpeditionBatchCommitted",
      missionId,
      processed: results.filter((r) => r.status === "ok").length,
      failed: errors.length,
      results,
      nextStep: errors.length === 0 ? `synth expedition start --all-committed --mission ${missionId}` : undefined,
    })
    if (errors.length > 0) process.exit(1)
    return
  }

  if (!proposalId) printError("--proposal-id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const result = await commitOneExpedition(ctx, proposalId, dryRun, declaredBranch, noCreate)
  printJson(result)
  if (result.status === "error") process.exit(1)
}


export function getCurrentGitCommit(): string | undefined {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: process.cwd(),
      encoding: "utf-8",
      stdio: "pipe",
    }).trim()
  } catch {
    return undefined
  }
}


// Auto-create the canonical expedition branch at start (ECOSYSTEM-001).
// Only runs when the declared policy is enforce + featured and the VCS has a
// branch concept. When it runs, it switches to the canonical branch so the
// subsequent assertExecutionBranch and the ExecutionGate both pass. A
// CreateExpeditionBranch intent is recorded through the gate so the event log
// captures the canonical-branch decision before the expedition starts.
export async function ensureExpeditionBranch(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  missionId: string,
): Promise<{ branch: string; created: boolean }> {
  const policy = loadBranchPolicyConfig(process.cwd())
  if (policy.mode !== "enforce" || policy.strategy !== "featured") {
    return { branch: "", created: false }
  }
  const state = await ctx.runtime.getState()
  const { createGitRepositoryAdapter } = await import("../adapters/repository/git.js")
  const adapter = createGitRepositoryAdapter({ path: process.cwd() })
  const status = await adapter.status()
  if (!status.initialized) {
    return { branch: "", created: false }
  }
  const roleContext = enrichExecutionBranchContext("expedition", expeditionId, state, { missionId })
  const candidates = branchNameCandidates("expedition", {
    mission: { id: missionId, name: roleContext.missionName },
    expedition: { id: expeditionId, name: roleContext.expeditionName },
  })
  const canonical = candidates[0]
  if (candidates.includes(status.branch)) {
    return { branch: status.branch, created: false }
  }
  const baseCommit = getCurrentGitCommit()
  const exists = typeof adapter.branchExists === "function" ? await adapter.branchExists(canonical) : false
  if (exists) {
    await adapter.checkout(canonical)
  } else {
    await adapter.createBranch(canonical)
  }
  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateExpeditionBranch",
    payload: { expeditionId, branch: canonical, baseCommit: baseCommit || "" },
  })
  if (result.status !== "ok") {
    printError(`Failed to record canonical expedition branch ${canonical}: ${result.error || JSON.stringify(result)}`)
  }
  return { branch: canonical, created: true }
}


export async function startOneExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  dryRun: boolean,
  autoCommit = false,
  declaredBranch?: string,
  noCreate = false,
): Promise<Record<string, unknown>> {
  const baselineCommit = getCurrentGitCommit()
  const startPayload: Record<string, unknown> = { id: expeditionId }
  if (baselineCommit) startPayload.baselineCommit = baselineCommit

  if (dryRun) {
    const preview = await runLifecycleDryRun(ctx, {
      capability: "StartExpedition",
      payload: startPayload,
      eventType: "EXPEDITION_STARTED",
      expeditionId,
      targetStatus: "executing",
    })
    if (declaredBranch) {
      const nameCheck = validateDeclaredBranchName(declaredBranch)
      return {
        ...preview,
        declaredBranch: { branch: declaredBranch, valid: nameCheck.valid, errors: nameCheck.errors },
      }
    }
    return preview
  }

  const initialState = await ctx.runtime.getState()
  const initialRecord = initialState.expeditions?.[expeditionId]
  let currentStatus = initialRecord?.status

  if (!currentStatus) {
    const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
    const draftsDir = path.join(dataDir, "drafts")
    const draftPath = path.join(draftsDir, `${expeditionId}.json`)
    const draftExists = await fs.access(draftPath).then(() => true).catch(() => false)
    if (draftExists) {
      currentStatus = "draft"
    }
  }

  if (currentStatus === "draft") {
    const approveResult = await approveOneExpedition(ctx, expeditionId, dryRun)
    if (approveResult.status !== "ok") {
      return approveResult
    }
    currentStatus = "approved"
  }

  let declaredInfo: DeclaredBranchInfo | undefined
  if (currentStatus === "approved") {
    const commitResult = await commitOneExpedition(ctx, expeditionId, dryRun, declaredBranch, noCreate)
    if (commitResult.status !== "ok") {
      return commitResult
    }
    // The commit-time declaration already checked out the branch and recorded
    // the binding; reuse it so start does not declare twice.
    if (commitResult.executionBranch) {
      declaredInfo = {
        ok: true,
        branch: String((commitResult.executionBranch as Record<string, unknown>).branch),
        created: (commitResult.executionBranch as Record<string, unknown>).created === true,
        baseCommit: "",
      }
    }
    currentStatus = "committed"
  }

  const state = await ctx.runtime.getState()
  // ECOSYSTEM-001: auto-create the canonical expedition branch at start when
  // the declared policy is enforce + featured. This runs before the fail-fast
  // guard so the canonical branch is established (or the operator is staying
  // on the plan branch) before any lifecycle gate.
  const expeditionRecord = state.expeditions?.[expeditionId]
  let autoCreatedBranch: { branch: string; created: boolean } | undefined
  if (expeditionRecord?.missionId) {
    if (declaredBranch && !declaredInfo) {
      // The expedition was already committed: declare now, before the guard.
      declaredInfo = await declareExecutionBranch("expedition", {
        branch: declaredBranch,
        noCreate,
        entityId: expeditionId,
        missionId: expeditionRecord.missionId,
        missionName: state.missions?.[expeditionRecord.missionId]?.name,
        expeditionName: expeditionRecord.name,
      })
      if (!declaredInfo.ok) {
        return {
          status: "error",
          expeditionId,
          code: declaredInfo.code,
          error: declaredInfo.error,
          ...(declaredInfo.suggestion ? { suggestion: declaredInfo.suggestion } : {}),
        }
      }
      await recordExecutionBranchBinding(ctx, "expedition", expeditionId, declaredInfo)
    }
    if (!declaredInfo) {
      const branchInfo = await ensureExpeditionBranch(ctx, expeditionId, expeditionRecord.missionId)
      if (branchInfo.created) autoCreatedBranch = branchInfo
    }
    // ECOSYSTEM-001: fail fast when the current branch cannot host this
    // expedition's execution. The ExecutionGate re-enforces inside handleIntent.
    await assertExecutionBranch(
      "StartExpedition",
      "expedition",
      {
        expeditionId,
        missionId: expeditionRecord.missionId,
      },
      declaredInfo?.ok ? declaredInfo.branch : declaredBranch,
    )
  }
  const intake = await gateDecision({ kind: "expedition.start", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    return {
      status: "error",
      expeditionId,
      code: "LifecycleBlocked",
      error: intake.reason,
      requiredAction: intake.requiredAction,
    }
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "StartExpedition",
    payload: startPayload,
  })

  if (result.status !== "ok") {
    return { status: "error", expeditionId, code: "ExpeditionStartFailed", error: result.error || "Unknown execution gate error" }
  }

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "ExpeditionStarted",
    expeditionId,
    result: result.result,
    nextStep: `synth expedition complete --id ${expeditionId}`,
  }
  if (declaredInfo?.ok) {
    response.executionBranch = {
      branch: declaredInfo.branch,
      created: declaredInfo.created,
      declared: true,
      ...(declaredInfo.warning ? { warning: declaredInfo.warning } : {}),
    }
  } else if (autoCreatedBranch) {
    response.executionBranch = {
      branch: autoCreatedBranch.branch,
      created: true,
    }
  }

  if (autoCommit) {
    const commit = await autoCommitDerivedState(process.cwd(), "expedition-start", expeditionId)
    response.autoCommit = {
      committed: commit.committed,
      commitHash: commit.commitHash,
      message: commit.message,
      files: commit.files,
      reason: commit.reason,
    }
  }

  return response
}


export async function cmdExpeditionStart(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const allCommitted = flags["all-committed"] === true || flags["all-committed"] === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const autoCommit = isAutoCommitEnabled(flags)
  const declaredBranch = typeof flags.branch === "string" && flags.branch.length > 0 ? flags.branch : undefined
  const noCreate = flags["no-create"] === true || flags["no-create"] === "true"
  if (noCreate && !declaredBranch) printError("--no-create requires --branch")
  if (allCommitted && declaredBranch) printError("--branch cannot be combined with --all-committed")

  if (allCommitted) {
    if (!missionId) printError("--all-committed requires --mission")
    if (expeditionId) printError("Cannot use --id with --all-committed")

    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const ids = findExpeditionIdsByMissionAndStatus(state, missionId, "committed")

    if (dryRun) {
      const previews = []
      for (const id of ids) {
        previews.push(await startOneExpedition(ctx, id, true, false))
      }
      printJson({
        status: "ok",
        kind: "ExpeditionBatchStartDryRun",
        missionId,
        wouldStart: ids,
        previews,
      })
      return
    }

    const results = []
    for (const id of ids) {
      results.push(await startOneExpedition(ctx, id, false, autoCommit))
    }
    const errors = results.filter((r) => r.status === "error")
    printJson({
      status: errors.length === 0 ? "ok" : "error",
      kind: "ExpeditionBatchStarted",
      missionId,
      processed: results.filter((r) => r.status === "ok").length,
      failed: errors.length,
      results,
    })
    if (errors.length > 0) process.exit(1)
    return
  }

  if (!expeditionId) printError("--id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const result = await startOneExpedition(ctx, expeditionId, dryRun, autoCommit, declaredBranch, noCreate)
  printJson(result)
  if (result.status === "error") process.exit(1)
}


export async function cmdExpeditionPause(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "PauseExpedition",
      payload: { id: expeditionId },
      eventType: "EXPEDITION_PAUSED",
      expeditionId,
      targetStatus: "paused",
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.pause", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "PauseExpedition",
    payload: { id: expeditionId },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionPauseFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionPaused",
    expeditionId,
    result: result.result,
    nextStep: `synth expedition start --id ${expeditionId}`,
  })
}


export async function cmdExpeditionCancel(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const reason = typeof flags.reason === "string" ? flags.reason : ""
  if (!reason) printError("--reason is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "CancelExpedition",
      payload: { id: expeditionId, reason },
      eventType: "EXPEDITION_CANCELLED",
      expeditionId,
      targetStatus: "cancelled",
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.cancel", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CancelExpedition",
    payload: { id: expeditionId, reason },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionCancelFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionCancelled",
    expeditionId,
    reason,
    result: result.result,
    nextStep: `synth expedition start --id ${expeditionId}`,
  })
}


// Event-log lineage pre-flight guard (expedition e617ccd0ac6d60b8): block
// lifecycle mutations that would fork the derived event log across branches.
// The current working-tree log is compared against every ref's committed log;
// we accept strict prefixes (stale-but-safe) and supersets (ahead), and block
// when another ref carries events this log lacks. CLI-layer only — the
// ExecutionGate stays untouched.
export async function guardEventLogLineage(flags: Record<string, string | boolean>) {
  if (flags["no-lineage-check"] === true || flags["no-lineage-check"] === "true") return
  const cwd = process.cwd()
  let fsMod: typeof import("fs")
  let pathMod: typeof import("path")
  let cp: typeof import("child_process")
  try {
    fsMod = await import("fs")
    pathMod = await import("path")
    cp = await import("child_process")
  } catch {
    return
  }
  const streamRel = pathMod.join(".synth", "data", "event-stream")
  // Current branch: read through the SDK's read-only event accessor
  // (never the raw file — SDK state/events are the sanctioned read path).
  let currentLines: string[]
  try {
    const events = await sdk.events.readEvents(cwd)
    // Canonicalize on the logical event only: the event-stream stores
    // partitioned metadata (partition/offset/partitionKey) that must not
    // participate in lineage comparison.
    currentLines = events.map((e) => {
      const { partition, offset, partitionKey, ...rest } = e as Record<string, unknown>
      return JSON.stringify(rest)
    })
  } catch {
    return
  }
  // Scope the comparison to the SAME expedition's lifecycle branches only.
  // Branch naming embeds the expedition short-id:
  //   expedition/<mission-slug>-<missionId>/<subject-slug>-<expeditionId>
  // Comparing against the entire ref space (esp. hundreds of remote branches)
  // both false-blocks on unrelated branches and is pathologically slow. We
  // only compare sibling branches that carry this expedition's id.
  let currentRef: string
  let shortId = ""
  try {
    currentRef = cp.execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf-8" }).trim()
  } catch {
    return
  }
  if (currentRef === "HEAD") return
  const lastSeg = (currentRef.split("/").pop() || "").split("-").pop() || ""
  if (/^[0-9a-f]{7,}$/.test(lastSeg)) shortId = lastSeg
  if (!shortId) return
  const currentFull = currentRef.startsWith("refs/heads/") ? currentRef : `refs/heads/${currentRef}`
  let refs: string[]
  try {
    refs = cp.execFileSync("git", ["for-each-ref", "--format=%(refname)", "refs/heads"], { cwd, encoding: "utf-8" })
      .trim().split("\n").filter(Boolean)
      .filter((r) => r !== currentFull && r.includes(shortId))
  } catch {
    return
  }
  if (refs.length === 0) return
  const refLogs: Record<string, string[]> = {}
  for (const ref of refs) {
    try {
      // The event log is an event-stream directory (partitioned segments),
      // so read every committed segment file under it and canonicalize.
      const files = cp
        .execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "--", streamRel], { cwd, encoding: "utf-8" })
        .trim()
        .split("\n")
        .filter(Boolean)
      const lines: string[] = []
      for (const f of files) {
        const blob = cp.execFileSync("git", ["show", `${ref}:${f}`], { cwd, encoding: "utf-8" })
        for (const l of blob.split("\n")) {
          const t = l.trim()
          if (!t) continue
          try {
            const outer = JSON.parse(t) as Record<string, unknown>
            // The event-stream stores an envelope `{ event, partition, offset,
            // partitionKey, ... }`; readEvents returns the inner `event`, so we
            // canonicalize the same way here.
            const inner = (outer.event ?? outer) as Record<string, unknown>
            const { partition, offset, partitionKey, ...rest } = inner
            lines.push(JSON.stringify(rest))
          } catch {
            // skip malformed line
          }
        }
      }
      refLogs[ref] = lines
    } catch {
      // Ref does not track the derived state file yet, or cannot be read.
    }
  }
  const analysis = analyzeEventLogLineage(currentLines, refLogs)
  if (analysis.diverged) {
    printError(`EVENT_LOG_DIVERGENCE: ${analysis.guidance}`, {
      code: "EventLogDivergence",
      category: "governance",
      suggestion: analysis.guidance,
    })
  }
}


// ============================================================
// EXP-ATOMIC-FINISH-001: Atomic expedition finish command
// ============================================================
// Combines evidence capture, convergence certification, and expedition
// completion into a single atomic CLI operation. This removes the most
// common source of agent friction: forgetting to commit state before
// completing an expedition.
// ============================================================
export async function cmdExpeditionFinish(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const note = typeof flags.note === "string" ? flags.note : "Auto-attached by synth expedition finish"
  const force = flags.force === true || flags.force === "true"
  const forceReason = typeof flags.reason === "string" ? flags.reason : undefined
  if (force && !forceReason) {
    printError("--force requires --reason to record why the verification gates were bypassed")
  }

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "CompleteExpedition",
      payload: { id: expeditionId, force, forceReason },
      eventType: "EXPEDITION_COMPLETED",
      expeditionId,
      targetStatus: "completed",
    })
    printJson({ ...dryRun, kind: "ExpeditionFinishDryRun", note: "Finish runs evidence + certify + complete; dry-run only previews complete gate." })
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  // 1. Attach git-diff evidence automatically.
  const { attachments, warnings, manifestPath } = await attachExpeditionEvidence(ctx, expeditionId, {
    gitDiff: true,
    note,
  })

  // 2. Certify convergence with an auto-generated evaluation.
  const certification = await certifyExpedition(ctx, expeditionId)
  if (certification.decision !== "converged") {
    printError(
      `Expedition ${expeditionId} convergence certification diverged.`,
      {
        code: "ConvergenceDivergedBlocksFinish",
        category: "governance",
        decision: certification.decision,
        confidence: certification.confidence,
        result: certification.result,
      },
    )
  }

  // 3. Complete the expedition, reusing the same gate checks as `complete`.
  // The dirty-tree check is skipped because finish already captured the diff
  // as evidence in step 1.
  const { result: completeResult } = await completeExpedition(ctx, expeditionId, {
    force,
    forceReason,
    skipDirtyCheck: true,
  })

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "expedition-finish", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "ExpeditionFinished",
    expeditionId,
    missionId: certification.missionId,
    alignmentContractId: certification.alignmentContractId,
    certificationId: certification.certificationId,
    attachments,
    manifestPath: path.relative(process.cwd(), manifestPath),
    result: completeResult,
    steps: ["evidence-attached", "convergence-certified", "expedition-completed"],
  }
  // ADR-055 §2.6 / AC12: finishing locally is not delivering. Say so.
  const pendingAfter = deliveryState((await ctx.runtime.getState()).expeditions[expeditionId])
  response.deliveryPending = pendingAfter.deliveryPending
  if (pendingAfter.deliveryPending) {
    response.nextStep = `synth expedition deliver --id ${expeditionId}   (then seal --merge-commit <sha> once the merge lands)`
  }
  if (warnings.length > 0) {
    response.warnings = warnings
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}


export async function cmdExpeditionArchive(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const reason = typeof flags.reason === "string" ? flags.reason : ""
  if (!reason) printError("--reason is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "ArchiveExpedition",
      payload: { id: expeditionId, reason },
      eventType: "EXPEDITION_ARCHIVED",
      expeditionId,
      targetStatus: "archived",
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.archive", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ArchiveExpedition",
    payload: { id: expeditionId, reason },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionArchiveFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionArchived",
    expeditionId,
    reason,
    result: result.result,
    nextStep: "synth status",
  })
}


export async function cmdExpeditionDelete(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const reason = typeof flags.reason === "string" ? flags.reason : undefined

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const intake = await gateDecision({ kind: "expedition.delete", expeditionId }, state, ctx.runtime)
    if (intake.decision === "BLOCK") {
      printGateBlock(intake)
    }
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "DeleteExpedition",
      payload: { id: expeditionId, ...(reason ? { reason } : {}) },
      eventType: "EXPEDITION_DELETED",
      expeditionId,
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.delete", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const payload: Record<string, unknown> = { id: expeditionId }
  if (reason) payload.reason = reason

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "DeleteExpedition",
    payload,
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionDeleteFailed")
  }

  // Draft lifecycle integrity: deletion cleans up the draft json and its
  // integrity record in the same command as the state mutation. Records
  // chained to by live successors are retained (chain-safe) and reported.
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  let draftRetired: Awaited<ReturnType<typeof retireDraftArtifacts>> | undefined
  let draftRetirementError: string | undefined
  try {
    draftRetired = await retireDraftArtifacts(path.join(dataDir, "drafts"), expeditionId)
  } catch (err) {
    draftRetirementError = err instanceof Error ? err.message : String(err)
  }

  const ledger = await commitDraftCeremony("draft-retire", expeditionId)

  printJson({
    status: "ok",
    kind: "ExpeditionDeleted",
    expeditionId,
    result: result.result,
    ...(draftRetired ? { draftRetired } : {}),
    ...(draftRetirementError ? { draftRetirementError } : {}),
    ...(ledger ? { ledger } : {}),
  })
}


export async function cmdExpeditionMove(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const toMissionId =
    typeof flags["to-mission"] === "string"
      ? flags["to-mission"]
      : typeof flags["toMission"] === "string"
        ? flags["toMission"]
        : ""
  if (!toMissionId) printError("--to-mission <mission-id> is required")

  const reason = typeof flags.reason === "string" ? flags.reason : undefined
  const approved = flags.approved === true || flags.approved === "true"

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const intake = await gateDecision(
      { kind: "expedition.move", expeditionId, toMissionId },
      state,
      ctx.runtime,
    )
    if (intake.decision === "BLOCK") {
      printGateBlock(intake)
    }
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "MoveExpedition",
      payload: { id: expeditionId, toMissionId },
      eventType: "EXPEDITION_MOVED",
      expeditionId,
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision(
    { kind: "expedition.move", expeditionId, toMissionId },
    state,
    ctx.runtime,
  )
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const payload: Record<string, unknown> = { id: expeditionId, toMissionId }
  if (reason) payload.reason = reason
  if (approved) payload.approved = true

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "MoveExpedition",
    payload,
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionMoveFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionMoved",
    expeditionId,
    toMissionId,
    verification: (result.result as { metadata?: { moveVerification?: string } } | undefined)?.metadata?.moveVerification,
    result: result.result,
  })
}


export type EvidenceAttachment = { kind: string; path: string; hash: string }


export type EvidenceManifest = {
  expeditionId: string
  capturedAt: number
  note?: string
  attachments: EvidenceAttachment[]
}


export function evidenceAttachmentKey(attachment: EvidenceAttachment): string {
  return `${attachment.kind}:${attachment.path}:${attachment.hash}`
}


export function validateManifestAttachment(value: unknown, manifestPath: string): EvidenceAttachment {
  if (!value || typeof value !== "object") {
    throw new Error(`Evidence manifest contains an invalid attachment: ${manifestPath}`)
  }
  const record = value as Record<string, unknown>
  if (typeof record.kind !== "string" || typeof record.path !== "string" || typeof record.hash !== "string") {
    throw new Error(`Evidence manifest contains an invalid attachment: ${manifestPath}`)
  }
  return { kind: record.kind, path: record.path, hash: record.hash }
}


export async function readManifestAttachments(manifestPath: string, expeditionId: string): Promise<EvidenceAttachment[]> {
  let raw: string
  try {
    raw = await fs.readFile(manifestPath, "utf-8")
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
    throw err
  }

  let manifest: Partial<EvidenceManifest>
  try {
    manifest = JSON.parse(raw) as Partial<EvidenceManifest>
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`Evidence manifest is invalid JSON and cannot be merged: ${manifestPath}: ${detail}`)
  }
  if (manifest.expeditionId !== expeditionId) {
    throw new Error(`Evidence manifest belongs to a different expedition and cannot be merged: ${manifestPath}`)
  }
  if (!Array.isArray(manifest.attachments)) {
    throw new Error(`Evidence manifest has no valid attachments array and cannot be merged: ${manifestPath}`)
  }
  return manifest.attachments.map((attachment) => validateManifestAttachment(attachment, manifestPath))
}


export function mergeEvidenceAttachments(existing: EvidenceAttachment[], captured: EvidenceAttachment[]): EvidenceAttachment[] {
  const merged: EvidenceAttachment[] = []
  const seen = new Set<string>()
  for (const attachment of [...existing, ...captured]) {
    const key = evidenceAttachmentKey(attachment)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(attachment)
  }
  return merged
}


export async function attachExpeditionEvidence(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  options: {
    gitDiff?: boolean
    testResultsPath?: string
    attachPaths?: string[]
    note?: string
    baseline?: string
  } = {},
): Promise<{ attachments: EvidenceAttachment[]; warnings: string[]; manifestPath: string }> {
  const baseDir = path.join(process.cwd(), "proof", "expeditions", expeditionId)
  await fs.mkdir(baseDir, { recursive: true })
  const attachmentsDir = path.join(baseDir, "attachments")
  await fs.mkdir(attachmentsDir, { recursive: true })

  const { gitDiff = false, testResultsPath, attachPaths = [], note, baseline: baselineFlag } = options
  const warnings: string[] = []
  const captured: EvidenceAttachment[] = []

  async function captureFile(kind: string, sourcePath: string, destName: string) {
    const resolvedSource = path.resolve(sourcePath)
    const content = await fs.readFile(resolvedSource)
    const destPath = path.join(kind === "attachment" ? attachmentsDir : baseDir, destName)
    await fs.writeFile(destPath, content)
    captured.push({ kind, path: path.relative(process.cwd(), destPath), hash: sha256(content) })
  }

  if (gitDiff) {
    const dirty = await isWorkingTreeDirty()
    let baselineCommit = baselineFlag
    if (!baselineCommit && !dirty) {
      const state = await ctx.runtime.getState()
      const expedition = state.expeditions[expeditionId]
      const storedBaseline = expedition?.metadata?.baselineCommit
      if (typeof storedBaseline === "string") {
        baselineCommit = storedBaseline
      }
    }

    const diffArgs = dirty
      ? ["diff", "HEAD"]
      : baselineCommit
      ? ["diff", `${baselineCommit}..HEAD`]
      : ["diff", "HEAD"]

    if (!dirty && baselineCommit) {
      warnings.push(`Working tree is clean; diffing from baseline ${baselineCommit}`)
    } else if (!dirty) {
      warnings.push("Working tree is clean and no baseline commit was recorded; git-diff may be empty")
    }

    // Untracked source files never appear in `git diff`. Flag them as
    // intent-to-add so their content is included in the patch, then restore
    // the index afterwards.
    const untrackedSourcePaths = await getUntrackedSourcePaths()
    let intentToAddApplied = false
    if (untrackedSourcePaths.length > 0) {
      try {
        await runGitSpawn(["add", "-N", "--", ...untrackedSourcePaths])
        intentToAddApplied = true
      } catch (err) {
        warnings.push(`Failed to flag untracked source files for diff capture: ${(err as Error).message}`)
      }
    }

    let diff: string
    try {
      diff = await new Promise<string>((resolve, reject) => {
        const child = spawn("git", diffArgs, { cwd: process.cwd() })
        let stdout = ""
        let stderr = ""
        child.stdout.on("data", (data: Buffer) => { stdout += data.toString("utf-8") })
        child.stderr.on("data", (data: Buffer) => { stderr += data.toString("utf-8") })
        child.on("close", (code) => {
          if (code !== 0) reject(new Error(stderr || `git diff exited with code ${code}`))
          else resolve(stdout)
        })
        child.on("error", reject)
      })
    } finally {
      if (intentToAddApplied) {
        try {
          await runGitSpawn(["reset", "-q", "--", ...untrackedSourcePaths])
        } catch (err) {
          warnings.push(`Failed to restore index for untracked source files: ${(err as Error).message}`)
        }
      }
    }

    if (diff.trim().length === 0) {
      const missed = untrackedSourcePaths.filter((p) => !diff.includes(p))
      warnings.push(
        missed.length > 0
          ? `git-diff produced an empty patch; untracked source files were not captured: ${missed.join(", ")}`
          : "git-diff produced an empty patch"
      )
    }

    const destPath = path.join(baseDir, "git-diff.patch")
    await fs.writeFile(destPath, diff)
    captured.push({ kind: "git-diff", path: path.relative(process.cwd(), destPath), hash: sha256(diff) })
  }

  if (testResultsPath) {
    await captureFile("test-results", testResultsPath, "test-results.txt")
  }

  for (const sourcePath of attachPaths) {
    const destName = path.basename(sourcePath)
    await captureFile("attachment", sourcePath, destName)
  }

  const manifestPath = path.join(baseDir, "manifest.json")
  // The runtime reducer accumulates unique evidence across EVIDENCE_ATTACHED
  // events. Keep the durable proof manifest in lockstep rather than replacing
  // it with only the artifacts from the most recent CLI invocation.
  const existingAttachments = await readManifestAttachments(manifestPath, expeditionId)
  const manifest: EvidenceManifest = {
    expeditionId,
    capturedAt: Date.now(),
    note,
    attachments: mergeEvidenceAttachments(existingAttachments, captured),
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "AttachEvidence",
    payload: { id: expeditionId, attachments: captured, note },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "EvidenceAttachFailed")
  }

  return { attachments: captured, warnings, manifestPath }
}


export async function cmdExpeditionEvidence(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const gitDiff = flags["git-diff"] === true || flags["git-diff"] === "true"
  const testResultsPath = typeof flags["test-results"] === "string" ? flags["test-results"] : undefined
  const rawAttach = typeof flags.attach === "string" ? flags.attach : ""
  const attachPaths = rawAttach
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const note = typeof flags.note === "string" ? flags.note : undefined
  const baseline = typeof flags.baseline === "string" ? flags.baseline : undefined

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  // Expedition 5c2b2db1: --dry-run must be read-only. Preview what would be
  // captured (file list + event trail) without writing proof artifacts,
  // appending EVIDENCE_ATTACHED, or staging git files.
  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const state = await ctx.runtime.getState()
    const expedition = state.expeditions[expeditionId]
    if (!expedition) {
      printError(`Expedition ${expeditionId} not found.`, { code: "ExpeditionNotFound", category: "validation" })
    }
    const sources = [
      ...(testResultsPath ? [testResultsPath] : []),
      ...attachPaths,
    ]
    const missingSources: string[] = []
    for (const source of sources) {
      try {
        await fs.access(path.resolve(source))
      } catch {
        missingSources.push(source)
      }
    }
    const baseDir = path.join("proof", "expeditions", expeditionId)
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "AttachEvidence",
      payload: { id: expeditionId, ...(note ? { note } : {}) },
      eventType: "EVIDENCE_ATTACHED",
      expeditionId,
    })
    printJson({
      ...dryRun,
      kind: "EvidenceAttachDryRun",
      wouldWrite: [
        ...(gitDiff ? [path.join(baseDir, "git-diff.patch")] : []),
        ...(testResultsPath ? [path.join(baseDir, "test-results.txt")] : []),
        ...attachPaths.map((p) => path.join(baseDir, "attachments", path.basename(p))),
        path.join(baseDir, "manifest.json"),
      ],
      missingSources,
      note: "No files written, no events appended, no git staging",
    })
    return
  }

  const { attachments, warnings, manifestPath } = await attachExpeditionEvidence(ctx, expeditionId, {
    gitDiff,
    testResultsPath,
    attachPaths,
    note,
    baseline,
  })

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "evidence-attach", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "EvidenceAttached",
    expeditionId,
    attachments,
    note,
    manifestPath: path.relative(process.cwd(), manifestPath),
  }
  if (warnings.length > 0) {
    response.warnings = warnings
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}


export async function cmdExpeditionRefine(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const note = typeof flags.note === "string" ? flags.note : ""
  if (!note) printError("--note is required")

  // Expedition 886dc15e deliverable (3): dependsOn is a settable canonical
  // attribute via `expedition refine --depends-on <id>[,<id>...]`. Omitted
  // means "leave unchanged" (domain preserves existing dependsOn).
  const rawDependsOn = typeof flags["depends-on"] === "string" ? flags["depends-on"] : ""
  const dependsOn = rawDependsOn
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "RefineExpedition",
      payload: { id: expeditionId, note, ...(dependsOn.length > 0 ? { dependsOn } : {}) },
      eventType: "EXPEDITION_REFINED",
      expeditionId,
      targetStatus: undefined,
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.refine", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "RefineExpedition",
    payload: { id: expeditionId, note, ...(dependsOn.length > 0 ? { dependsOn } : {}) },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionRefineFailed")
  }

  const refined = result.result as { metadata?: Record<string, unknown> } | undefined

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "expedition-refine", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "ExpeditionRefined",
    expeditionId,
    note,
    ...(dependsOn.length > 0 ? { dependsOn } : {}),
    refinementId: refined?.metadata?.refinementId,
    result: refined,
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}


export async function certifyExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  options: { evaluationPath?: string; evidencePath?: string } = {},
): Promise<{ decision: string; confidence?: unknown; certificationId?: string; result: unknown; missionId: string; alignmentContractId: string }> {
  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[expeditionId]
  if (!expedition) {
    printError(`Expedition ${expeditionId} not found.`, { code: "ExpeditionNotFound", category: "validation" })
  }
  if (expedition.status !== "executing" && expedition.status !== "completed") {
    printError(
      `Expedition ${expeditionId} is ${expedition.status}; only executing or completed expeditions can be certified.`,
      { code: "ExpeditionNotCertifiable", category: "lifecycle" },
    )
  }

  const mission = state.missions[expedition.missionId]
  if (!mission) {
    printError(`Mission ${expedition.missionId} not found.`, { code: "MissionNotFound", category: "validation" })
  }

  const alignmentContractId = mission.alignmentContractId
  if (!alignmentContractId) {
    printError(
      `Mission ${mission.id} has no alignment contract. Approve the mission with --alignment-contract-id first.`,
      { code: "AlignmentContractMissing", category: "validation" },
    )
  }

  const { evaluationPath, evidencePath } = options

  let evaluation: import("../governance/proposal-evaluation/types.js").EvaluationResult
  if (evaluationPath) {
    let parsed: unknown
    try {
      const raw = await fs.readFile(path.resolve(evaluationPath), "utf-8")
      parsed = JSON.parse(raw)
    } catch (err) {
      printError(
        `Evaluation file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        {
          code: "EvaluationFileParseFailed",
          category: "validation",
          suggestion: "Verify the file contains a single JSON object and check for trailing commas or unmatched braces.",
        },
      )
    }

    const validation = validateEvaluationResult(parsed)
    if (!validation.valid) {
      printError(formatEvaluationErrors(validation.errors), {
        code: "EvaluationSchemaValidationFailed",
        category: "validation",
        suggestion: "Provide an EvaluationResult with decision, confidence, matchedRules, violatedRules, matchedDriftClasses, evidence, reasoning, and deterministic: true.",
        errors: validation.errors,
      })
    }
    evaluation = validation.result
  } else {
    // Auto-generate a default aligned evaluation from the expedition goal
    // and attached evidence when the operator does not supply one.
    evaluation = generateConvergenceEvaluation(expedition)
  }

  const artifactPath = evidencePath ?? evaluationPath
  const artifacts: import("../governance/convergence-certification/types.js").ImplementedArtifact[] = artifactPath
    ? [{ kind: "artifact", id: "evidence", path: artifactPath, description: "Certification evidence supplied by operator" }]
    : [
        {
          kind: "artifact",
          id: "auto-generated-evaluation",
          path: `synth://missions/${mission.id}/expeditions/${expeditionId}/evaluation`,
          description: "Auto-generated converged evaluation from expedition goal and attached evidence",
        },
      ]

  const runtimeEvidence: import("../governance/convergence-certification/types.js").ObservedRuntimeEvidence[] = [
    {
      kind: "runtime",
      id: "cli-certification",
      source: "synth-cli",
      observation: `Convergence certification invoked for expedition ${expeditionId}`,
      timestamp: Date.now(),
    },
  ]

  const executionEvidence: import("../governance/convergence-certification/types.js").ExecutionEvidence[] = [
    {
      kind: "execution",
      id: "expedition-lifecycle",
      eventIds: [],
      summary: `Execution evidence drawn from expedition ${expeditionId} lifecycle`,
    },
  ]

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CertifyConvergence",
    payload: {
      missionId: mission.id,
      expeditionId,
      alignmentContractId,
      evaluation,
      artifacts,
      runtimeEvidence,
      executionEvidence,
    },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ConvergenceCertificationFailed")
  }

  const certificationEvent = await ctx.infra.eventStore.loadAll().then((events) =>
    events.reverse().find((e) =>
      (e.type === "CONVERGENCE_CERTIFIED" || e.type === "CONVERGENCE_DIVERGED") &&
      (e.payload as Record<string, unknown>).expeditionId === expeditionId
    )
  )

  return {
    decision: (result.result as Record<string, unknown>)?.decision as string,
    confidence: (result.result as Record<string, unknown>)?.confidence,
    certificationId: (certificationEvent?.payload as Record<string, unknown>)?.certificationId as string | undefined,
    result: result.result,
    missionId: mission.id,
    alignmentContractId,
  }
}


export async function cmdExpeditionCertify(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  // Expedition 5c2b2db1: --dry-run must be read-only. The help advertises
  // --dry-run for certify but the flag was silently ignored and the full
  // certification executed (CONVERGENCE_* events appended). Preview the
  // read-only preconditions and the would-be trail instead.
  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const state = await ctx.runtime.getState()
    const expedition = state.expeditions[expeditionId]
    if (!expedition) {
      printError(`Expedition ${expeditionId} not found.`, { code: "ExpeditionNotFound", category: "validation" })
    }
    if (expedition.status !== "executing" && expedition.status !== "completed") {
      printError(
        `Expedition ${expeditionId} is ${expedition.status}; only executing or completed expeditions can be certified.`,
        { code: "ExpeditionNotCertifiable", category: "lifecycle" },
      )
    }
    const evaluationPath = typeof flags.evaluation === "string" ? flags.evaluation : undefined
    const evidencePath = typeof flags.evidence === "string" ? flags.evidence : undefined
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "CertifyConvergence",
      payload: {
        expeditionId,
        missionId: expedition.missionId,
        ...(evaluationPath ? { evaluationPath } : {}),
        ...(evidencePath ? { evidencePath } : {}),
      },
      eventType: "CONVERGENCE_CERTIFIED",
      expeditionId,
    })
    printJson({
      ...dryRun,
      kind: "ConvergenceCertifyDryRun",
      note: "Actual trail is CONVERGENCE_CERTIFIED on convergence, CONVERGENCE_DIVERGED otherwise; nothing appended",
    })
    return
  }

  const { decision, confidence, certificationId, result, missionId, alignmentContractId } = await certifyExpedition(
    ctx,
    expeditionId,
    {
      evaluationPath: typeof flags.evaluation === "string" ? flags.evaluation : undefined,
      evidencePath: typeof flags.evidence === "string" ? flags.evidence : undefined,
    },
  )

  const autoCommit = isAutoCommitEnabled(flags) && decision === "converged"
    ? await autoCommitDerivedState(process.cwd(), "convergence-certification", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: decision === "converged" ? "ok" : "error",
    kind: decision === "converged" ? "ConvergenceCertified" : "ConvergenceDiverged",
    expeditionId,
    missionId,
    alignmentContractId,
    decision,
    confidence,
    certificationId,
    result,
    nextStep: decision === "converged" ? `synth expedition complete --id ${expeditionId}` : undefined,
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (["approve", "commit", "start", "finish", "complete", "archive", "cancel", "deliver", "seal", "abandon"].includes(sub)) {
    await guardEventLogLineage(flags)
  }
  if (sub === "create") await cmdExpeditionCreate(flags)
  else if (sub === "approve") await cmdExpeditionApprove(flags)
  else if (sub === "commit") await cmdExpeditionCommit(flags)
  else if (sub === "start") await cmdExpeditionStart(flags)
  else if (sub === "pause") await cmdExpeditionPause(flags)
  else if (sub === "cancel") await cmdExpeditionCancel(flags)
  else if (sub === "complete") await cmdExpeditionComplete(flags)
  else if (sub === "finish") await cmdExpeditionFinish(flags)
  else if (sub === "archive") await cmdExpeditionArchive(flags)
  else if (sub === "delete") await cmdExpeditionDelete(flags)
  else if (sub === "move") await cmdExpeditionMove(flags)
  else if (sub === "evidence") await cmdExpeditionEvidence(flags)
  else if (sub === "abandon") await (await import("./commands-ledger.js")).cmdExpeditionAbandon(flags)
  else if (sub === "deliver") await (await import("./commands-ledger.js")).cmdExpeditionDeliver(flags)
  else if (sub === "seal") await (await import("./commands-ledger.js")).cmdExpeditionSeal(flags)
  else if (sub === "refine") await cmdExpeditionRefine(flags)
  else if (sub === "certify") await cmdExpeditionCertify(flags)
  else if (sub === "list") await cmdExpeditionList(flags)
  else if (sub === "show") await cmdExpeditionShow(flags)
  else if (sub === "explain") await cmdExpeditionShow(flags)
  else if (sub === "rank") await cmdExpeditionRank(flags)
  else if (sub === "report") await cmdExpeditionReport(flags)
  else if (sub === "new") await cmdExpeditionNew(flags)
  else
    printError(
      `Unknown subcommand '${sub}' for 'synth expedition'. Did you mean 'synth expedition show --id <expedition-id>'?`,
      {
        code: "UnknownExpeditionSubcommand",
        category: "cli",
        suggestion: "Run 'synth expedition --help' for the full list of lifecycle and inventory commands.",
      },
    )
}
