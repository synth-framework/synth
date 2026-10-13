// ============================================================
// LEDGER — Delivery (ADR-055 §2.6 / rev 2 §R2.1 · AC12)
// ============================================================
// Delivery is a state, not a convention:
//
//   finish                 → completed locally, deliveryPending while the
//                            branch has not been delivered/integrated
//   deliver                → EXPEDITION_DELIVERED (branch, tip, remote, prRef)
//   seal --merge-commit    → EXPEDITION_INTEGRATED, verified: the delivered tip
//                            must be an ancestor of the merge commit
//
// The state is *derived* from the record (`metadata.delivery` /
// `metadata.integration`), so a completed expedition with no integration record
// is pending by definition — no extra event or flag to keep in sync.
// ============================================================

import { execFileSync } from "node:child_process"

export type DeliveryRecord = {
  branch?: string
  tipCommit?: string
  remote?: string
  prRef?: string
  deliveredAt?: number
  deliveredBy?: string
}

export type IntegrationRecord = {
  mergeCommit?: string
  baseBranch?: string
  branch?: string
  tipCommit?: string
  integratedAt?: number
  integratedBy?: string
}

export type DeliveryState = {
  status?: string
  delivered: boolean
  integrated: boolean
  /**
   * True when the expedition finished locally but no merge commit has been
   * sealed (ADR-055 §2.6.1: completion no longer implies delivery). In E5 the
   * charter-level `--no-delivery` opt-out is not implemented yet, so every
   * terminal-but-unsealed expedition is pending; E6 adds the opt-out with
   * `close`.
   */
  deliveryPending: boolean
  delivery?: DeliveryRecord
  integration?: IntegrationRecord
}

type ExpeditionLike = {
  status?: string
  metadata?: Record<string, unknown>
}

export function deliveryState(record: ExpeditionLike | undefined): DeliveryState {
  const metadata = (record?.metadata ?? {}) as Record<string, unknown>
  const delivery = (metadata.delivery ?? undefined) as DeliveryRecord | undefined
  const integration = (metadata.integration ?? undefined) as IntegrationRecord | undefined
  const status = record?.status
  const terminal = status === "completed" || status === "archived"
  return {
    status,
    delivered: Boolean(delivery?.tipCommit),
    integrated: Boolean(integration?.mergeCommit),
    deliveryPending: Boolean(terminal && !integration?.mergeCommit),
    ...(delivery ? { delivery } : {}),
    ...(integration ? { integration } : {}),
  }
}

// ------------------------------------------------------------
// Git mechanics (the CLI passes the repo root; this module never prints)
// ------------------------------------------------------------

function git(root: string, args: string[]): { ok: boolean; out: string } {
  try {
    return {
      ok: true,
      out: execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim(),
    }
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string }
    return { ok: false, out: (String(e.stdout ?? "") + String(e.stderr ?? "") + (e.message ?? "")).trim() }
  }
}

export function resolveCommit(root: string, ref: string): string | undefined {
  const result = git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])
  return result.ok && result.out.length > 0 ? result.out : undefined
}

/** Resolve the object a ref names, without peeling tags to commits. */
export function resolveObject(root: string, ref: string): string | undefined {
  const result = git(root, ["rev-parse", "--verify", "--quiet", ref])
  return result.ok && result.out.length > 0 ? result.out : undefined
}

export function isAncestor(root: string, ancestor: string, descendant: string): boolean {
  return git(root, ["merge-base", "--is-ancestor", ancestor, descendant]).ok
}

export type PushResult = { ok: boolean; detail: string; pushed?: boolean }

/**
 * Push the expedition's branch to the remote. Idempotent: an already-up-to-date
 * remote is a success ("nothing to push"), never a failure.
 */
export function pushBranch(root: string, remote: string, branch: string): PushResult {
  if (!branch) return { ok: false, detail: "No branch to push" }
  const exists = git(root, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])
  if (!exists.ok) {
    const remoteRef = git(root, ["rev-parse", "--verify", "--quiet", `refs/remotes/${remote}/${branch}`])
    if (!remoteRef.ok) return { ok: false, detail: `Branch ${branch} does not exist locally or on ${remote}` }
    return { ok: true, detail: `${branch} already exists on ${remote}`, pushed: false }
  }
  const result = git(root, ["push", "--porcelain", remote, `refs/heads/${branch}:refs/heads/${branch}`])
  if (result.ok) return { ok: true, detail: result.out || `pushed ${branch} to ${remote}`, pushed: true }
  // "Everything up-to-date" arrives on stderr sometimes; treat as success.
  if (/up-to-date|up to date/i.test(result.out)) {
    return { ok: true, detail: `${branch} is already up to date on ${remote}`, pushed: false }
  }
  return { ok: false, detail: result.out }
}

export type SealVerification = {
  ok: boolean
  detail: string
  tipCommit?: string
  mergeCommit?: string
  onBaseBranch?: boolean
}

/**
 * Verify a seal: the merge commit must exist, must contain the delivered tip as
 * an ancestor, and must itself be reachable from the base branch when that ref
 * exists locally.
 */
export function verifySeal(root: string, options: { tipCommit?: string; mergeCommit: string; baseBranch?: string }): SealVerification {
  const mergeCommit = resolveCommit(root, options.mergeCommit)
  if (!mergeCommit) {
    return { ok: false, detail: `Merge commit ${options.mergeCommit} does not exist in this repository` }
  }
  const tipCommit = options.tipCommit ? resolveCommit(root, options.tipCommit) : undefined
  if (options.tipCommit && !tipCommit) {
    return { ok: false, detail: `Delivered tip ${options.tipCommit} does not exist in this repository`, mergeCommit }
  }
  if (tipCommit && !isAncestor(root, tipCommit, mergeCommit)) {
    return {
      ok: false,
      detail: `Merge commit ${mergeCommit.slice(0, 8)} does not contain the delivered tip ${tipCommit.slice(0, 8)}`,
      tipCommit,
      mergeCommit,
    }
  }
  let onBaseBranch: boolean | undefined
  if (options.baseBranch) {
    const base = resolveCommit(root, options.baseBranch)
    if (base) {
      onBaseBranch = isAncestor(root, mergeCommit, base)
      if (!onBaseBranch) {
        return {
          ok: false,
          detail: `Merge commit ${mergeCommit.slice(0, 8)} is not on ${options.baseBranch} (fetch/merge first, then seal)`,
          tipCommit,
          mergeCommit,
          onBaseBranch,
        }
      }
    }
  }
  return {
    ok: true,
    detail: `Merge commit ${mergeCommit.slice(0, 8)} contains the delivered tip${tipCommit ? ` ${tipCommit.slice(0, 8)}` : ""}`,
    ...(tipCommit ? { tipCommit } : {}),
    mergeCommit,
    ...(onBaseBranch !== undefined ? { onBaseBranch } : {}),
  }
}

// ------------------------------------------------------------
// Abandonment (ADR-055 §2.7 / AC5, record half)
// ------------------------------------------------------------
// Nothing is wiped by default: the tip is preserved under
// `refs/synth/abandoned/<id8>` (an annotated tag object holds the reason and
// date), and the record carries a handoff block. `--discard` is the only path
// that deletes, and it must be recorded to have happened.

export type HandoffBlock = {
  reason: string
  abandonedAt?: number
  branch?: string
  tipCommit?: string
  delivered?: boolean
  merged?: boolean
  discarded?: boolean
  ref?: string
}

type ExpeditionLike2 = { status?: string; metadata?: Record<string, unknown> }

export function handoffState(record: ExpeditionLike2 | undefined): HandoffBlock | undefined {
  const metadata = (record?.metadata ?? {}) as Record<string, unknown>
  return metadata.abandonment as HandoffBlock | undefined
}

export function abandonmentRef(id: string): string {
  return `refs/synth/abandoned/${id.slice(0, 8)}`
}

export type RecoveryRefResult = { ok: boolean; ref?: string; detail: string }

/**
 * Preserve an abandoned tip. The annotated tag object carries the reason and
 * date (a ref alone cannot), and the custom ref name points at it.
 */
export function createAbandonmentRef(
  root: string,
  options: { expeditionId: string; tipCommit: string; reason: string; timestamp: number },
): RecoveryRefResult {
  const ref = abandonmentRef(options.expeditionId)
  const tempTag = `synth-abandoned-${options.expeditionId.slice(0, 8)}`
  const message = `synth abandon ${options.expeditionId.slice(0, 8)} at ${new Date().toISOString()}\n\n${options.reason}`
  const tag = git(root, ["tag", "-f", "-a", "-m", message, tempTag, options.tipCommit])
  if (!tag.ok) return { ok: false, detail: `Could not tag ${options.tipCommit.slice(0, 8)}: ${tag.out}` }
  const tagObject = resolveObject(root, `refs/tags/${tempTag}`)
  if (!tagObject) return { ok: false, detail: `Could not resolve the recovery tag object for ${tempTag}` }
  const refWrite = git(root, ["update-ref", "-m", `abandoned: ${options.reason}`, ref, tagObject])
  if (!refWrite.ok) return { ok: false, detail: `Could not write ${ref}: ${refWrite.out}` }
  git(root, ["update-ref", "-d", `refs/tags/${tempTag}`])
  return { ok: true, ref, detail: `${ref} → ${tagObject.slice(0, 8)} (tip ${options.tipCommit.slice(0, 8)})` }
}

export type DiscardResult = { ok: boolean; deleted: string[]; detail: string }

/** The only path that deletes: the branch it was abandoned on, and its ref. */
export function discardAbandoned(
  root: string,
  options: { expeditionId: string; branch?: string },
): DiscardResult {
  const deleted: string[] = []
  const notes: string[] = []
  const ref = abandonmentRef(options.expeditionId)

  if (options.branch) {
    const current = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).out
    if (current === options.branch) {
      notes.push(`branch ${options.branch} is checked out; refusing to delete the branch you are standing on`)
    } else {
      const del = git(root, ["branch", "-D", options.branch])
      if (del.ok) deleted.push(`branch ${options.branch}`)
      else notes.push(`could not delete branch ${options.branch}: ${del.out}`)
    }
  }

  const refExists = git(root, ["rev-parse", "--verify", "--quiet", ref]).ok
  if (refExists) {
    const del = git(root, ["update-ref", "-d", ref])
    if (del.ok) deleted.push(ref)
    else notes.push(`could not delete ${ref}: ${del.out}`)
  }

  return {
    ok: notes.length === 0,
    deleted,
    detail: notes.length > 0 ? notes.join("; ") : deleted.length > 0 ? `deleted ${deleted.join(", ")}` : "nothing to delete",
  }
}
