// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { printJson, printError } from "./print.js"
import { commitCeremony } from "../ledger/ceremony.js"
import { deliveryState } from "../ledger/delivery.js"
import { runVerification } from "../verification/engine.js"
import { resolveDeclaredBranch } from "../repository/branch-declaration.js"
import { enrichExecutionBranchContext, loadBranchPolicyConfig, resolveExecutionBranch, type ExecutionBranchContext, type ExecutionNameRecords } from "../repository/branch-policy.js"
import * as sdk from "../sdk/index.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { gateDecision, printGateBlock } from "./gate-reporting.js"
import { getNonDerivedWorkingTreeStatus, isAutoCommitEnabled } from "./working-tree.js"
import type { AutoCommitResult } from "./working-tree.js"


/**
 * Best-effort commit of derived SYNTH state files. Never throws; failures are
 * returned in `reason` so lifecycle commands can warn without aborting.
 */
/**
 * Commit the ceremony's governance state on the ledger branch (ADR-055 §2.3).
 *
 * This replaces the former best-effort `git add` sweep on the current branch:
 * the commit goes through the Ledger Writer (lock → residue check → commit →
 * CAS), and a refusal is loud — the CLI prints the `LEDGER_*` code and its next
 * step and exits non-zero instead of reporting success with
 * `{committed:false}`.
 */
export async function autoCommitDerivedState(
  cwd: string,
  transition: string,
  expeditionId?: string,
): Promise<AutoCommitResult> {
  try {
    await fs.access(path.join(cwd, ".git"))
  } catch {
    return { committed: false, message: `chore(synth): record ${transition}`, files: [], reason: "Not a git repository" }
  }

  const ceremony = await commitCeremony(cwd, transition, expeditionId)
  if (!ceremony.committed && ceremony.code) {
    printError(ceremony.reason ?? "The ledger commit failed", {
      code: ceremony.code,
      category: "ledger",
      suggestion: ceremony.nextStep,
    })
  }

  return {
    committed: ceremony.committed,
    ...(ceremony.commitHash ? { commitHash: ceremony.commitHash } : {}),
    message: ceremony.message,
    files: ceremony.files,
    ...(ceremony.reason ? { reason: ceremony.reason } : {}),
  }
}


export function resolveExpeditionId(flags: Record<string, string | boolean>): string {
  if (typeof flags.id === "string" && flags.id.length > 0) return flags.id
  if (typeof flags["expedition-id"] === "string" && flags["expedition-id"].length > 0) return flags["expedition-id"]
  return ""
}


export interface LifecycleDryRunInput {
  capability: string
  payload: Record<string, unknown>
  eventType: string
  expeditionId: string
  targetStatus?: string
}


export async function runLifecycleDryRun(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  input: LifecycleDryRunInput,
): Promise<{
  status: "ok"
  kind: "LifecycleDryRun"
  wouldAppend: { type: string; payload: Record<string, unknown> }
  verifyResult: { pass: number; fail: number; warn: number; skipped: number }
  stateDelta: string
}> {
  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[input.expeditionId]
  const beforeStatus = expedition?.status ?? "unknown"
  const verifyReport = await runVerification(process.cwd())
  const checks = Array.isArray(verifyReport.checks) ? verifyReport.checks : []
  const pass = checks.filter((c: any) => c.status === "ok" || c.status === "pass").length
  const fail = checks.filter((c: any) => c.status === "error" || c.status === "fail").length
  const warn = checks.filter((c: any) => c.status === "warning" || c.status === "warn").length
  // A check that could not run is reported as such instead of silently
  // shrinking the pass count (EXP 2c9c6c62).
  const skipped = checks.filter((c: any) => c.status === "skipped").length

  return {
    status: "ok",
    kind: "LifecycleDryRun",
    wouldAppend: {
      type: input.eventType,
      payload: input.payload,
    },
    verifyResult: { pass, fail, warn, skipped },
    stateDelta: input.targetStatus
      ? `expedition ${input.expeditionId} status: ${beforeStatus} → ${input.targetStatus}`
      : `expedition ${input.expeditionId} metadata updated (${input.eventType})`,
  }
}


// ------------------------------------------------------------
// ADR-056 — operator-declared execution branches
// ------------------------------------------------------------

export type DeclaredBranchInfo = {
  ok: boolean
  branch: string
  created: boolean
  baseCommit: string
  warning?: string
  code?: string
  error?: string
  suggestion?: string
}


/** Read canonical state for the live-owner rule; degrade to no records. */
export async function readStateRecords(): Promise<unknown | undefined> {
  try {
    return (await sdk.state.readState(process.cwd())) ?? undefined
  } catch {
    return undefined
  }
}


/**
 * Resolve an operator-declared execution branch (ADR-056 §2.1/§2.2): git
 * mechanics live in repository/branch-declaration; the policy verdict and its
 * warning class are added here.
 */
export async function declareExecutionBranch(
  role: "mission" | "expedition",
  options: {
    branch: string
    noCreate: boolean
    entityId: string
    missionId?: string
    missionName?: string
    expeditionName?: string
  },
): Promise<DeclaredBranchInfo> {
  const state = await readStateRecords()
  const resolution = resolveDeclaredBranch({
    root: process.cwd(),
    role,
    entityId: options.entityId,
    branch: options.branch,
    noCreate: options.noCreate,
    state: state as ExecutionNameRecords | undefined,
  })
  if (!resolution.ok) {
    return {
      ok: false,
      branch: resolution.branch,
      created: false,
      baseCommit: resolution.baseCommit,
      ...(resolution.code ? { code: resolution.code } : {}),
      ...(resolution.error ? { error: resolution.error } : {}),
      ...(resolution.suggestion ? { suggestion: resolution.suggestion } : {}),
    }
  }

  const policy = loadBranchPolicyConfig(process.cwd())
  const verdict = resolveExecutionBranch(role, resolution.currentBranch, policy, {
    missionId: options.missionId,
    expeditionId: role === "expedition" ? options.entityId : undefined,
    missionName: options.missionName,
    expeditionName: options.expeditionName,
    declaredBranch: options.branch,
  })
  const warning = verdict.overridden && !verdict.patternMatched ? verdict.reason : undefined
  return {
    ok: true,
    branch: resolution.branch,
    created: resolution.created,
    baseCommit: resolution.baseCommit,
    ...(warning ? { warning } : {}),
  }
}


/** Record the binding in the ledger so later commands agree without flags. */
export async function recordExecutionBranchBinding(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  role: "mission" | "expedition",
  entityId: string,
  info: DeclaredBranchInfo,
): Promise<void> {
  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "BindExecutionBranch",
    payload: {
      role,
      entityId,
      branch: info.branch,
      declared: true,
      created: info.created,
      baseCommit: info.baseCommit,
      declaredBy: "operator",
    },
  })
  if (result.status !== "ok") {
    printError(`Failed to record the branch binding for ${role} ${entityId}: ${result.error || JSON.stringify(result)}`)
  }
}


// CLI fail-fast branch guard (ECOSYSTEM-001): surface a branch-policy
// violation before heavy lifecycle work runs. The ExecutionGate enforces the
// same policy inside handleIntent; this gives the operator an early, specific
// error naming the required canonical branch.
export async function assertExecutionBranch(
  capability: string,
  role: "mission" | "expedition" | "chore",
  context: { missionId?: string; expeditionId?: string; missionName?: string; expeditionName?: string; capability?: string },
  declaredBranch?: string,
): Promise<void> {
  const { createGitRepositoryAdapter } = await import("../adapters/repository/git.js")
  const adapter = createGitRepositoryAdapter({ path: process.cwd() })
  let enriched: ExecutionBranchContext = { ...context }
  if (role !== "chore") {
    const requestId = role === "mission" ? enriched.missionId : enriched.expeditionId
    if (requestId) {
      try {
        const state = await sdk.state.readState(process.cwd())
        enriched = enrichExecutionBranchContext(role, requestId, state as ExecutionNameRecords, enriched)
      } catch {
        // State unreadable: fall back to ID-only naming (legacy form) rather
        // than blocking. The ExecutionGate still enforces at the boundary.
      }
    }
  }
  if (declaredBranch) {
    // ADR-056: the operator declaration is consulted before the taxonomy, so
    // the fail-fast guard and the ExecutionGate agree on one resolution order.
    enriched = { ...enriched, declaredBranch }
  }
  const result = await adapter.validateExecutionBranch(role, enriched)
  if (result.ok) return
  printError(
    `BRANCH_POLICY_DENIED for ${capability}: ${result.reason || "Execution branch policy violated"}` +
      (result.requiredBranch ? `\nRequired branch: ${result.requiredBranch}` : ""),
    {
      code: "BranchPolicyDenied",
      category: "governance",
      suggestion: result.requiredBranch
        ? `Switch to the canonical branch before running this command:\n  git checkout ${result.requiredBranch}`
        : "Check the declared branch policy in .synth/config.yaml",
      ...(result.requiredBranch ? { requiredBranch: result.requiredBranch } : {}),
    },
  )
}


export async function completeExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  options: { evidencePath?: string; force?: boolean; forceReason?: string; skipDirtyCheck?: boolean } = {},
): Promise<{ status: string; result: unknown; evidencePath?: string; force: boolean; forceReason?: string }> {
  const { evidencePath, force = false, forceReason, skipDirtyCheck = false } = options
  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[expeditionId]

  // Completion is deliberately not branch-gated (debranching expedition
  // 4b5694ab06ccb652): it records governance state, not source work, and
  // the canonical branch may be gone by conclusion time. The ExecutionGate
  // no longer enforces a branch for CompleteExpedition either.

  // Hard lifecycle gate first: Convergence Certification must be present
  // before we even consider evidence or verification. This keeps the error
  // surfaced by `expedition.complete` stable and lets `--force` act only on
  // operational gates, not on architectural convergence.
  const intake = await gateDecision({ kind: "expedition.complete", expeditionId, force }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  // EXP-034d3ecc2cc0015e + EXP-AUTO-COMMIT-001: source-only working tree
  // gate. Derived SYNTH state (.synth/data/, proof/expeditions/) is no longer
  // allowed to block completion; it is auto-committed after the transition
  // succeeds. Only non-derived source changes must be committed by the agent.
  // The `finish` command bypasses this check because it captures the current
  // working-tree diff as evidence before completing.
  if (!force && !skipDirtyCheck) {
    const { dirty, status: gitStatus, suggestedCommit } = await getNonDerivedWorkingTreeStatus()
    if (dirty) {
      const nextStep = suggestedCommit || `git add -A && git commit -m "expedition(${expeditionId}): describe changes"`
      printError(
        `Expedition ${expeditionId} cannot be completed while the working tree has uncommitted source changes.\n\n${gitStatus}`,
        {
          code: "DirtyWorkingTreeBlocksCompletion",
          category: "governance",
          suggestion: `Commit source changes first:\n  ${nextStep}\nOr bypass with --force --reason "<why tree is dirty>".`,
          nextStep,
          gitStatus,
          suggestedCommit,
        },
      )
    }
  }

  const hasEvidence = expedition && Array.isArray(expedition.attachments) && expedition.attachments.length > 0
  if (!hasEvidence && !force) {
    printError(
      `Expedition ${expeditionId} cannot be completed because no evidence has been attached.`,
      {
        code: "MissingEvidenceBlocksCompletion",
        category: "governance",
        suggestion: `Capture evidence first: synth expedition evidence --id ${expeditionId} --git-diff`,
      },
    )
  }

  // EXP-GATE-014: mandatory verification gate.
  const verifyReport = await runVerification(process.cwd())
  if (verifyReport.status !== "ok" && !force) {
    printError(
      `Expedition ${expeditionId} cannot be completed because verification failed (${verifyReport.summary.pass}/${verifyReport.summary.total} passed, ${verifyReport.summary.fail} failed).`,
      {
        code: "VerificationFailedBlocksCompletion",
        category: "verification",
        suggestion: verifyReport.nextStep || "Run `synth verify` and resolve the failing checks before completing the expedition.",
        verifySummary: verifyReport.summary,
      },
    )
  }

  const completePayload: Record<string, unknown> = { id: expeditionId, evidencePath }
  if (force) {
    completePayload.force = true
    completePayload.forceReason = forceReason
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CompleteExpedition",
    payload: completePayload,
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionCompleteFailed")
  }

  return {
    status: "ok",
    result: result.result,
    evidencePath,
    force,
    forceReason,
  }
}


export async function cmdExpeditionComplete(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const evidencePath = typeof flags.evidence === "string" ? flags.evidence : undefined
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
      payload: { id: expeditionId, evidencePath, force, forceReason },
      eventType: "EXPEDITION_COMPLETED",
      expeditionId,
      targetStatus: "completed",
    })
    printJson(dryRun)
    return
  }

  // Use the project's actual event log so the CompleteExpedition event is
  // persisted and replayable.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const { status, result, evidencePath: finalEvidencePath, force: finalForce, forceReason: finalForceReason } = await completeExpedition(
    ctx,
    expeditionId,
    { evidencePath, force, forceReason },
  )

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "expedition-complete", expeditionId)
    : undefined

  // ADR-055 §2.6 / AC12: a completed-but-undelivered expedition is *pending*,
  // and the response says so instead of letting the next agent assume done.
  const pendingAfter = deliveryState((await ctx.runtime.getState()).expeditions[expeditionId])
  const response: Record<string, unknown> = {
    status,
    kind: "ExpeditionCompleted",
    expeditionId,
    evidencePath: finalEvidencePath,
    force: finalForce,
    forceReason: finalForceReason,
    deliveryPending: pendingAfter.deliveryPending,
    result,
  }
  if (pendingAfter.deliveryPending) {
    response.nextStep = `synth expedition deliver --id ${expeditionId}   (deliver/seal is what closes the loop)`
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
