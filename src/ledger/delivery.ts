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

/**
 * True when this clone is shallow (`.git/shallow` grafts history). A shallow
 * boundary hides parent links, so an ancestry proof that would pass on a full
 * clone is *refused* here — the difference matters enough to say so.
 */
export function isShallowRepository(root: string): boolean {
  const result = git(root, ["rev-parse", "--is-shallow-repository"])
  return result.ok && result.out.trim() === "true"
}

/** How to undo a shallow graft, phrased as the command the operator runs. */
export const UNSHALLOW_HINT = "git fetch origin main --unshallow"

/**
 * The hint appended to a refused verification when the refusal may be an
 * artifact of a shallow clone rather than a real absence of the tip.
 */
function shallowHint(root: string): string | undefined {
  if (!isShallowRepository(root)) return undefined
  return `This clone is shallow, so parent links are grafted and ancestry cannot be proven. Deepen it, then re-run: ${UNSHALLOW_HINT} (or 'git fetch --deepen=1' for one level).`
}

// ------------------------------------------------------------
// Delivery branch resolution — the "dull inbox"
// ------------------------------------------------------------
// `status` must print a deliver/seal command that *works* when pasted. That
// means resolving the branch the same way an operator would have to: the
// recorded execution branch, else the branch the ledger says was created, else
// a remote ref that names the expedition. Never a bare `--id` that fails with
// NoExecutionBranch, and never a branch name this clone cannot resolve.

export type DeliveryBranchSource = "executionBranch" | "branchCreatedEvent" | "remoteScan"

export type BranchCreatedEventLike = {
  type?: string
  timestamp?: number
  payload?: Record<string, unknown> | undefined
}

export type DeliveryBranchResolution = {
  /** A ref this clone can resolve — safe to paste after `--branch`. */
  branch?: string
  /** Where the answer came from, so the caller can say so. */
  source?: DeliveryBranchSource
  tipCommit?: string
  /** The canonical branch name without the `origin/` prefix, when they differ. */
  canonicalBranch?: string
  /** Set when a name was found but nothing in this clone resolves it. */
  unresolved?: string
  /** The command that would make an unresolved branch resolvable. */
  fetchHint?: string
}

/**
 * The branch named by the newest `EXPEDITION_BRANCH_CREATED` event for an
 * expedition. This is the fallback that matters: canonical replay projects
 * `executionBranch` from `EXPEDITION_BRANCH_BOUND` only, so an expedition whose
 * branch was auto-created (never declared) has no `executionBranch` even though
 * the ledger knows the branch name.
 */
export function lastBranchCreatedBranch(
  events: readonly BranchCreatedEventLike[] | undefined,
  expeditionId: string,
): string | undefined {
  if (!Array.isArray(events) || !expeditionId) return undefined
  let best: { branch: string; timestamp: number } | undefined
  for (const event of events) {
    if (event?.type !== "EXPEDITION_BRANCH_CREATED") continue
    const payload = (event.payload ?? {}) as Record<string, unknown>
    if (String(payload.expeditionId ?? "") !== expeditionId) continue
    const branch = typeof payload.branch === "string" ? payload.branch : ""
    if (branch.length === 0) continue
    const timestamp = typeof event.timestamp === "number" ? event.timestamp : 0
    // Events are not guaranteed ordered across partitions: newest timestamp
    // wins, and a tie keeps the later entry.
    if (!best || timestamp >= best.timestamp) best = { branch, timestamp }
  }
  return best?.branch
}

/** Remote-tracking refs (`origin/foo`), excluding the symbolic `origin/HEAD`. */
export function listRemoteTrackingBranches(root: string): string[] {
  const result = git(root, ["for-each-ref", "--format=%(refname:short)", "refs/remotes/"])
  if (!result.ok || result.out.length === 0) return []
  return result.out
    .split("\n")
    .map((line) => line.trim())
    .filter((name) => name.length > 0 && !name.endsWith("/HEAD"))
}

/**
 * Every ref in the clone, as `refname → object sha`, read with ONE git call.
 *
 * `synth status` resolves a branch per pending expedition; spawning git per
 * name would make the briefing slower than the work it reports. The index keeps
 * resolution in memory and keeps status read-only (no write-on-read).
 */
export type RefIndex = Map<string, string>

export function buildRefIndex(root: string): RefIndex {
  const index: RefIndex = new Map()
  const result = git(root, ["for-each-ref", "--format=%(refname) %(objectname)"])
  if (!result.ok || result.out.length === 0) return index
  for (const line of result.out.split("\n")) {
    const split = line.lastIndexOf(" ")
    if (split <= 0) continue
    index.set(line.slice(0, split), line.slice(split + 1))
  }
  return index
}

/**
 * Resolve a ref name against an index using git's own lookup order
 * (`<name>`, `refs/<name>`, `refs/tags/<name>`, `refs/heads/<name>`,
 * `refs/remotes/<name>`, `refs/remotes/<name>/HEAD`).
 */
export function resolveFromRefIndex(index: RefIndex, name: string): string | undefined {
  if (!name || index.size === 0) return undefined
  const direct = index.get(name)
  if (direct) return direct
  for (const prefix of ["refs/", "refs/tags/", "refs/heads/", "refs/remotes/"]) {
    const hit = index.get(`${prefix}${name}`)
    if (hit) return hit
  }
  return index.get(`refs/remotes/${name}/HEAD`)
}

/** The remote-tracking short names (`origin/foo`) inside an index. */
export function remoteBranchesFromIndex(index: RefIndex): string[] {
  const names: string[] = []
  for (const refname of index.keys()) {
    if (!refname.startsWith("refs/remotes/")) continue
    const short = refname.slice("refs/remotes/".length)
    if (short.length === 0 || short.endsWith("/HEAD")) continue
    names.push(short)
  }
  return names
}

/**
 * Resolve the branch an expedition was delivered from, in the order an operator
 * would search: recorded binding → branch-created event → a remote ref naming
 * the expedition. Every candidate must resolve to a commit in *this* clone;
 * a name that does not resolve is reported as unresolved with the fetch that
 * would fix it, so the printed command is never a dead end.
 *
 * `remoteBranches` and `cache` exist so one `synth status` lists refs once and
 * resolves each name once, however many expeditions are pending.
 */
export function resolveDeliveryBranch(
  root: string,
  options: {
    expeditionId: string
    executionBranch?: string
    events?: readonly BranchCreatedEventLike[]
    remoteBranches?: string[]
    cache?: Map<string, string | undefined>
    /** Pre-built ref index: resolve names in memory instead of spawning git. */
    refs?: RefIndex
  },
): DeliveryBranchResolution {
  const cache = options.cache ?? new Map<string, string | undefined>()
  const tipOf = (name: string): string | undefined => {
    if (!name) return undefined
    if (cache.has(name)) return cache.get(name)
    const tip = options.refs ? resolveFromRefIndex(options.refs, name) : resolveCommit(root, name)
    cache.set(name, tip)
    return tip
  }

  const id8 = String(options.expeditionId).slice(0, 8)
  const candidates: Array<{ name: string; source: DeliveryBranchSource }> = []
  if (options.executionBranch) candidates.push({ name: options.executionBranch, source: "executionBranch" })
  const fromEvent = lastBranchCreatedBranch(options.events, options.expeditionId)
  if (fromEvent) candidates.push({ name: fromEvent, source: "branchCreatedEvent" })
  const remote =
    options.remoteBranches ?? (options.refs ? remoteBranchesFromIndex(options.refs) : listRemoteTrackingBranches(root))
  for (const name of remote) {
    if (name.includes(id8)) candidates.push({ name, source: "remoteScan" })
  }

  let firstKnown: { name: string; source: DeliveryBranchSource } | undefined
  for (const candidate of candidates) {
    if (!firstKnown) firstKnown = candidate
    const tip = tipOf(candidate.name)
    const canonical = candidate.name.startsWith("origin/") ? candidate.name.slice("origin/".length) : undefined
    if (tip) {
      return {
        branch: candidate.name,
        source: candidate.source,
        tipCommit: tip,
        ...(canonical ? { canonicalBranch: canonical } : {}),
      }
    }
    // A canonical name that only exists on origin still yields a working
    // command once fetched: `origin/<name>` resolves as a ref.
    if (candidate.source === "remoteScan") continue
    const remoteTip = tipOf(`origin/${candidate.name}`)
    if (remoteTip) {
      return {
        branch: `origin/${candidate.name}`,
        source: candidate.source,
        tipCommit: remoteTip,
        canonicalBranch: candidate.name,
      }
    }
  }

  if (firstKnown) {
    return {
      branch: firstKnown.name,
      source: firstKnown.source,
      unresolved: firstKnown.name,
      fetchHint: `git fetch origin ${firstKnown.name}`,
    }
  }
  return {}
}

export type IntegrationCandidate = {
  /** A commit in this clone that contains the delivered tip. */
  mergeCommit?: string
  /** The base ref the commit came from. */
  base?: string
}

/**
 * The merge commit to seal against, when the base branch already contains the
 * delivered tip. Nothing is invented when it does not: the caller prints the
 * `<sha>` placeholder rather than a commit that would fail verification.
 */
export function resolveIntegrationCandidate(
  root: string,
  options: {
    tipCommit?: string
    baseBranches?: readonly string[]
    cache?: Map<string, string | undefined>
    refs?: RefIndex
  },
): IntegrationCandidate {
  if (!options.tipCommit) return {}
  const cache = options.cache
  for (const base of options.baseBranches ?? ["origin/main", "main"]) {
    let resolved = cache?.has(base) ? cache.get(base) : undefined
    if (resolved === undefined && !cache?.has(base)) {
      resolved = options.refs ? resolveFromRefIndex(options.refs, base) : resolveCommit(root, base)
      cache?.set(base, resolved)
    }
    if (!resolved) continue
    if (isAncestor(root, options.tipCommit, resolved)) return { mergeCommit: resolved, base }
  }
  return {}
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
  /** Set when the refusal may be an artifact of a shallow clone. */
  hint?: string
}

/**
 * Verify a seal: the merge commit must exist, must contain the delivered tip as
 * an ancestor, and must itself be reachable from the base branch when that ref
 * exists locally.
 *
 * A refusal in a shallow clone names the shallow clone: the ancestry proof is
 * only as good as the history present, and "does not contain the tip" is
 * indistinguishable from "the parents were never fetched" unless we say so.
 */
export function verifySeal(root: string, options: { tipCommit?: string; mergeCommit: string; baseBranch?: string }): SealVerification {
  const mergeCommit = resolveCommit(root, options.mergeCommit)
  if (!mergeCommit) {
    const hint = shallowHint(root)
    return {
      ok: false,
      detail: `Merge commit ${options.mergeCommit} does not exist in this repository${hint ? `. ${hint}` : ""}`,
      ...(hint ? { hint } : {}),
    }
  }
  const tipCommit = options.tipCommit ? resolveCommit(root, options.tipCommit) : undefined
  if (options.tipCommit && !tipCommit) {
    const hint = shallowHint(root)
    return {
      ok: false,
      detail: `Delivered tip ${options.tipCommit} does not exist in this repository${hint ? `. ${hint}` : ""}`,
      mergeCommit,
      ...(hint ? { hint } : {}),
    }
  }
  if (tipCommit && !isAncestor(root, tipCommit, mergeCommit)) {
    const hint = shallowHint(root)
    return {
      ok: false,
      detail: `Merge commit ${mergeCommit.slice(0, 8)} does not contain the delivered tip ${tipCommit.slice(0, 8)}${hint ? `. ${hint}` : ""}`,
      tipCommit,
      mergeCommit,
      ...(hint ? { hint } : {}),
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
