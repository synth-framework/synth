// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson, printError } from "./print.js"
import { abandonmentRef, createAbandonmentRef, deliveryState, discardAbandoned, handoffState, pushBranch, resolveCommit, resolveDeliveryBranch, resolveIntegrationCandidate, verifySeal } from "../ledger/delivery.js"
import * as sdk from "../sdk/index.js"
import { bootstrapWithCapabilities, flushPendingCeremony } from "./auto-commit-ceremony.js"
import type { LedgerCommitInfo } from "./auto-commit-ceremony.js"


/**
 * `synth expedition abandon --id <id> --reason <text> [--branch <name>] [--discard]`
 * ADR-055 §2.7 / AC5 (record half): nothing is wiped by default. The event lands
 * on the ledger first, the tip is preserved under `refs/synth/abandoned/<id8>`,
 * and the expedition record gains the handoff block. `--discard` is the only
 * deletion path and it is itself a recorded ceremony.
 */
export async function cmdExpeditionAbandon(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  const reason = typeof flags.reason === "string" ? flags.reason.trim() : ""
  if (!id || !reason) {
    printError("Usage: synth expedition abandon --id <expedition-id> --reason <text> [--branch <name>] [--discard]", {
      code: "MissingAbandonArguments",
      category: "validation",
      suggestion: "Abandonment needs a reason — it is the note your successor reads.",
    })
  }

  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const discard = flags.discard === true || flags.discard === "true"

  const ctx = await bootstrapWithCapabilities({ skipGenesis: true, infra: { persistence: "file" } })
  const expedition = (await ctx.runtime.getState()).expeditions[id]
  if (!expedition) {
    printError(`Expedition ${id} not found.`, { code: "ExpeditionNotFound", category: "validation" })
  }
  const handoff = handoffState(expedition)
  // Already abandoned, and the operator now wants the deletion done: that is a
  // second act (the discard), not a second abandonment. Everything else about
  // an already-terminal expedition is refused.
  const discardOnly = Boolean(handoff) && discard
  if (!discardOnly && (expedition.status === "cancelled" || expedition.status === "archived")) {
    printError(`Expedition ${id} is already ${expedition.status} — nothing to abandon.`, {
      code: "ExpeditionNotAbandonable",
      category: "governance",
      suggestion: handoff
        ? `The handoff is recorded. To delete the branch and ref: synth expedition abandon --id ${id} --reason "${handoff.reason}" --discard`
        : `Run 'synth expedition show --id ${id}' to see its state.`,
    })
  }

  const branch = typeof flags.branch === "string" ? flags.branch : (expedition.executionBranch ?? "")
  const tipCommit = branch ? resolveCommit(process.cwd(), branch) : undefined
  const delivery = deliveryState(expedition)
  const ref = abandonmentRef(id)

  if (dryRun) {
    printJson({
      status: "ok",
      kind: "ExpeditionAbandonDryRun",
      expeditionId: id,
      reason,
      branch: branch || undefined,
      tipCommit,
      delivered: delivery.delivered,
      merged: delivery.integrated,
      wouldPreserve: tipCommit ? ref : undefined,
      wouldDiscard: discard ? { branch: branch || undefined, ref } : undefined,
      note: discardOnly
        ? "Dry-run: the abandonment is already recorded; only the discard would run"
        : "Dry-run: no event, no ref, no deletion",
      nextStep: `synth expedition abandon --id ${id} --reason "${reason}"${discard ? " --discard" : ""}`,
    })
    return
  }

  // 1a. Preserve the tip first (default). Creating a tag deletes nothing, and
  //     the record must only name a ref that actually exists: a record that
  //     points at nothing would make the work's location a lie (AC5).
  let preserved: { ok: boolean; ref?: string; detail: string } | undefined
  if (tipCommit && !discard && !discardOnly) {
    preserved = createAbandonmentRef(process.cwd(), {
      expeditionId: id,
      tipCommit,
      reason,
      timestamp: Date.now(),
    })
  }

  // 1b. Record the abandonment on the canonical ledger, with the ref it made.
  let ledger: LedgerCommitInfo | undefined
  if (!discardOnly) {
    const payload: Record<string, unknown> = { id, reason }
    if (branch) payload.branch = branch
    if (tipCommit) payload.tipCommit = tipCommit
    if (preserved?.ok && preserved.ref) payload.ref = preserved.ref
    if (delivery.delivered) payload.delivered = true
    if (delivery.integrated) payload.merged = true

    const result = await ctx.api.handleIntent({ actor: "synth-cli", capability: "AbandonExpedition", payload })
    if (result?.status !== "ok") {
      printError(`Abandon refused: ${JSON.stringify(result?.error ?? result)}`, {
        code: "ABANDON_REFUSED",
        category: "governance",
        suggestion: `Run 'synth expedition show --id ${id}' to check its state.`,
      })
    }
    ledger = await flushPendingCeremony()
  }


  // 3. Discard is a second, separately recorded ceremony: it may only claim a
  //    deletion that actually happened.
  let discarded: { ok: boolean; deleted: string[]; detail: string } | undefined
  let discardLedger: LedgerCommitInfo | undefined
  if (discard) {
    const discardBranch = branch || handoff?.branch || ""
    const outcome = discardAbandoned(process.cwd(), {
      expeditionId: id,
      ...(discardBranch ? { branch: discardBranch } : {}),
    })
    discarded = { ok: outcome.ok, deleted: outcome.deleted, detail: outcome.detail }
    // Record whatever really got deleted, even when another step was refused
    // (e.g. the branch we stand on). Gating on `outcome.ok` left a deleted ref
    // unrecorded: exactly the missing-deletion case ADR-055 forbids.
    if (outcome.deleted.length > 0) {
      const discardPayload: Record<string, unknown> = { id }
      if (discardBranch) discardPayload.branch = discardBranch
      discardPayload.ref = ref
      if (tipCommit ?? handoff?.tipCommit) discardPayload.tipCommit = tipCommit ?? handoff?.tipCommit
      discardPayload.deleted = outcome.deleted
      const discardResult = await ctx.api.handleIntent({
        actor: "synth-cli",
        capability: "DiscardExpedition",
        payload: discardPayload,
      })
      if (discardResult?.status === "ok") {
        discardLedger = await flushPendingCeremony()
      } else {
        printError(`The discard happened but could not be recorded: ${JSON.stringify(discardResult?.error ?? discardResult)}`, {
          code: "DISCARD_UNRECORDED",
          category: "ledger",
          suggestion: "Record it by hand; the ledger must not be missing a deletion that happened.",
        })
      }
    }
  }

  const after = handoffState((await ctx.runtime.getState()).expeditions[id])
  const response: Record<string, unknown> = {
    status: "ok",
    kind: discardOnly ? "ExpeditionDiscarded" : "ExpeditionAbandoned",
    expeditionId: id,
    reason,
    ...(branch ? { branch } : {}),
    ...(tipCommit ? { tipCommit } : {}),
    delivered: delivery.delivered,
    merged: delivery.integrated,
    ...(after?.ref ? { recoveryRef: after.ref } : {}),
    ...(preserved && !preserved.ok ? { preservationError: preserved.detail } : {}),
    ...(preserved?.ok ? { preservedTo: preserved.ref } : {}),
    ...(discarded ? { discarded: discarded.deleted, discardDetail: discarded.detail } : {}),
    ...(ledger ? { ledger } : {}),
    ...(discardLedger ? { discardLedger } : {}),
    nextStep: "Then update the plan/branch bookkeeping so the abandoned work is not mistaken for live work.",
  }
  if (preserved && !preserved.ok) {
    response.preservationNextStep = `Create the recovery ref by hand: git update-ref ${ref} ${tipCommit}`
  }
  printJson(response)
}


/**
 * The branch a deliver should name: the flag, else the recorded binding, else
 * the branch the ledger says was created for this expedition, else a remote ref
 * naming it.
 *
 * Canonical replay projects `executionBranch` from `EXPEDITION_BRANCH_BOUND`
 * only. An expedition whose branch was auto-created (`EXPEDITION_BRANCH_CREATED`,
 * ECOSYSTEM-001) therefore has no recorded branch, and `deliver --id <id>` used
 * to fail with NoExecutionBranch — sending the operator to grep the event
 * stream for a name the ledger already holds. Events are read only when the
 * record has nothing, so the common path costs no extra I/O.
 */
export async function resolveDeliverBranch(
  expeditionId: string,
  executionBranch: string | undefined,
  flagBranch: string | undefined,
): Promise<{ branch: string; source?: string; note?: string; fetchHint?: string }> {
  if (flagBranch) return { branch: flagBranch, source: "flag" }
  if (executionBranch) return { branch: executionBranch, source: "executionBranch" }

  const events = await sdk.events.readEvents(process.cwd()).catch(() => [])
  const resolution = resolveDeliveryBranch(process.cwd(), {
    expeditionId,
    events: events as Array<{ type?: string; timestamp?: number; payload?: Record<string, unknown> }>,
  })
  if (!resolution.branch) return { branch: "" }

  const id8 = expeditionId.slice(0, 8)
  const note =
    resolution.source === "branchCreatedEvent"
      ? `No executionBranch is recorded for ${id8}; delivering ${resolution.branch} from its EXPEDITION_BRANCH_CREATED event.`
      : resolution.source === "remoteScan"
        ? `No executionBranch is recorded for ${id8}; delivering ${resolution.branch}, a remote ref naming ${id8}.`
        : undefined
  return {
    branch: resolution.branch,
    ...(resolution.source ? { source: resolution.source } : {}),
    ...(note ? { note } : {}),
    ...(resolution.fetchHint ? { fetchHint: resolution.fetchHint } : {}),
  }
}


/**
 * `synth expedition deliver --id <id> [--remote origin] [--pr <ref>] [--no-push]`
 * ADR-055 §2.6: deliver is what makes a finished branch reachable — push the
 * execution branch, record where it landed, and mark the ceremony committed.
 */
export async function cmdExpeditionDeliver(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth expedition deliver --id <expedition-id> [--remote <remote>] [--pr <ref>] [--no-push]", {
      code: "MissingExpeditionId",
      category: "validation",
      suggestion: "Run 'synth expedition show --id <id>' first.",
    })
    return
  }

  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const noPush = flags["no-push"] === true || flags["no-push"] === "true"
  const remote = typeof flags.remote === "string" ? flags.remote : "origin"

  const ctx = await bootstrapWithCapabilities({ skipGenesis: true, infra: { persistence: "file" } })
  if (dryRun) {
    const state = await ctx.runtime.getState()
    const expedition = state.expeditions[id]
    if (!expedition) {
      printError(`Expedition ${id} not found.`, { code: "ExpeditionNotFound", category: "validation" })
      return
    }
    const resolvedBranch = await resolveDeliverBranch(
      id,
      expedition.executionBranch,
      typeof flags.branch === "string" ? flags.branch : undefined,
    )
    const branch = resolvedBranch.branch
    const tip = branch ? resolveCommit(process.cwd(), branch) : undefined
    printJson({
      status: "ok",
      kind: "ExpeditionDeliverDryRun",
      expeditionId: id,
      expeditionStatus: expedition.status,
      branch,
      ...(resolvedBranch.source ? { branchSource: resolvedBranch.source } : {}),
      tipCommit: tip,
      remote,
      wouldPush: !noPush && Boolean(branch && tip),
      note: resolvedBranch.note
        ? `${resolvedBranch.note} Dry-run: nothing pushed, no ledger event written.`
        : "Dry-run: nothing pushed, no ledger event written",
      ...(resolvedBranch.fetchHint ? { fetchHint: resolvedBranch.fetchHint } : {}),
      nextStep: `synth expedition deliver --id ${id}${branch ? "" : "  # create/start the expedition first"}`,
    })
    return
  }

  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[id]
  if (!expedition) {
    printError(`Expedition ${id} not found.`, {
      code: "ExpeditionNotFound",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  const resolvedBranch = await resolveDeliverBranch(
    id,
    expedition.executionBranch,
    typeof flags.branch === "string" ? flags.branch : undefined,
  )
  const branch = resolvedBranch.branch
  if (!branch) {
    printError(`Expedition ${id} has no recorded execution branch to deliver.`, {
      code: "NoExecutionBranch",
      category: "validation",
      suggestion: `Name the branch explicitly (--branch <name>) or run 'synth expedition start --id ${id}' first. Neither the ledger (EXPEDITION_BRANCH_CREATED) nor a remote ref names ${id.slice(0, 8)}.`,
    })
    return
  }

  let pushDetail: string | undefined
  let pushed = false
  if (!noPush) {
    const result = pushBranch(process.cwd(), remote, branch)
    if (!result.ok) {
      printError(`Could not push ${branch} to ${remote}: ${result.detail}`, {
        code: "DELIVERY_PUSH_FAILED",
        category: "delivery",
        suggestion: "Push the branch manually (or re-run with --no-push to record an existing delivery), then retry.",
      })
      return
    }
    pushDetail = result.detail
    pushed = result.pushed === true
  }

  const tipCommit = resolveCommit(process.cwd(), branch)
  if (!tipCommit) {
    printError(`Could not resolve the tip commit of ${branch}.`, {
      code: "DELIVERY_TIP_UNRESOLVED",
      category: "delivery",
      suggestion: "Check the branch name (`git branch --list`) and retry.",
    })
    return
  }

  const payload: Record<string, unknown> = { id, branch, tipCommit }
  if (!noPush) payload.remote = remote
  if (typeof flags.pr === "string") payload.prRef = flags.pr

  const result = await ctx.api.handleIntent({ actor: "synth-cli", capability: "DeliverExpedition", payload })
  if (result?.status !== "ok") {
    printError(`Deliver refused: ${JSON.stringify(result?.error ?? result)}`, {
      code: "DELIVERY_REFUSED",
      category: "delivery",
      suggestion: "Verify the expedition is completed or executing, then retry.",
    })
    return
  }

  const ledger = await flushPendingCeremony()
  const after = deliveryState((await ctx.runtime.getState()).expeditions[id])
  // The seal command is printed ready to paste: when the base branch already
  // contains the delivered tip, name that commit instead of `<sha>`.
  const integration = resolveIntegrationCandidate(process.cwd(), { tipCommit })
  printJson({
    status: "ok",
    kind: "ExpeditionDelivered",
    expeditionId: id,
    branch,
    ...(resolvedBranch.source ? { branchSource: resolvedBranch.source } : {}),
    ...(resolvedBranch.note ? { note: resolvedBranch.note } : {}),
    tipCommit,
    ...(pushed ? { remote } : {}),
    ...(pushDetail ? { pushDetail } : {}),
    ...(typeof flags.pr === "string" ? { prRef: flags.pr } : {}),
    deliveryPending: after.deliveryPending,
    ...(ledger ? { ledger } : {}),
    nextStep: integration.mergeCommit
      ? `synth expedition seal --id ${id} --merge-commit ${integration.mergeCommit}   (${integration.base} already contains the delivered tip)`
      : `synth expedition seal --id ${id} --merge-commit <sha>   (after the merge lands on the base branch)`,
  })
}


/**
 * `synth expedition seal --id <id> --merge-commit <sha> [--base main]`
 * ADR-055 §2.6 / AC12: sealing proves the delivered tip is contained in the
 * merge commit. A tip outside the merge commit is refused — a seal is evidence,
 * never an assertion.
 */
export async function cmdExpeditionSeal(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  const mergeCommit = typeof flags["merge-commit"] === "string" ? flags["merge-commit"] : undefined
  if (!id || !mergeCommit) {
    printError("Usage: synth expedition seal --id <expedition-id> --merge-commit <sha> [--base <branch>]", {
      code: "MissingSealArguments",
      category: "validation",
      suggestion: "Get the merge commit from the PR that landed the expedition branch.",
    })
    return
  }

  const ctx = await bootstrapWithCapabilities({ skipGenesis: true, infra: { persistence: "file" } })
  const expedition = (await ctx.runtime.getState()).expeditions[id]
  if (!expedition) {
    printError(`Expedition ${id} not found.`, { code: "ExpeditionNotFound", category: "validation" })
    return
  }

  const delivery = deliveryState(expedition)
  const baseBranch = typeof flags.base === "string" ? flags.base : undefined
  const verification = verifySeal(process.cwd(), {
    ...(delivery.delivery?.tipCommit ? { tipCommit: delivery.delivery.tipCommit } : {}),
    mergeCommit,
    ...(baseBranch ? { baseBranch } : {}),
  })

  if (!verification.ok) {
    // A refused seal is a failure, not a result: non-zero exit so scripts stop,
    // with the structured envelope still machine-readable.
    printError(verification.detail, {
      code: "ExpeditionSealRefused",
      category: "delivery",
      suggestion: "Confirm the merge commit and re-run seal; a seal that cannot be verified is never recorded.",
      expeditionId: id,
      mergeCommit: verification.mergeCommit ?? mergeCommit,
      ...(verification.tipCommit ? { tipCommit: verification.tipCommit } : {}),
      delivered: delivery.delivered,
    })
  }

  const payload: Record<string, unknown> = { id, mergeCommit: verification.mergeCommit }
  if (delivery.delivery?.branch) payload.branch = delivery.delivery.branch
  if (verification.tipCommit) payload.tipCommit = verification.tipCommit
  if (baseBranch) payload.baseBranch = baseBranch

  const result = await ctx.api.handleIntent({ actor: "synth-cli", capability: "SealExpedition", payload })
  if (result?.status !== "ok") {
    printError(`Seal refused: ${JSON.stringify(result?.error ?? result)}`, {
      code: "SEAL_REFUSED",
      category: "delivery",
      suggestion: "Verify the expedition exists and the merge commit is reachable, then retry.",
    })
    return
  }

  const ledger = await flushPendingCeremony()
  const after = deliveryState((await ctx.runtime.getState()).expeditions[id])
  printJson({
    status: "ok",
    kind: "ExpeditionSealed",
    expeditionId: id,
    mergeCommit: verification.mergeCommit,
    ...(verification.tipCommit ? { tipCommit: verification.tipCommit } : {}),
    ...(baseBranch ? { baseBranch } : {}),
    ...(verification.onBaseBranch !== undefined ? { onBaseBranch: verification.onBaseBranch } : {}),
    detail: verification.detail,
    deliveryPending: after.deliveryPending,
    ...(ledger ? { ledger } : {}),
    nextStep: `synth expedition complete --id ${id}   (if not already complete)`,
  })
}
