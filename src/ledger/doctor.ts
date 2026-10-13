// ============================================================
// LEDGER — Doctor (ADR-055 §2.10, AC6 / AC8 / AC13)
// ============================================================
// Four silent-failure classes become visible (and repairable with --fix):
//
//   1. an uncommitted ceremony         → ledgerCeremony
//   2. a stale / prunable anchor       → ledgerAnchor
//   3. the anchor behind the branch    → ledgerSync
//   4. a detached checkout             → ledgerBranch
//
// `repairLedger` recreates the anchor and commits a stalled ceremony through
// the same writer every other ceremony uses (one commit, loud failure).
// ============================================================

import { execFileSync } from "node:child_process"

import {
  LEDGER_PATHS,
  porcelainPath,
  LedgerError,
  advanceCanonicalBranch,
  ensureAnchor,
  readAnchorState,
  repairAnchor,
} from "./writer.js"
import {
  currentBranch,
  recordLedgerBranch,
  resolveLedgerBranch,
  type LedgerBranchSource,
} from "./branch.js"

export type LedgerCheck = { ok: boolean; detail: string; nextStep?: string }

export type LedgerHealth = {
  repo: boolean
  /** The ledger branch (named by config, recorded at bootstrap, or inferred). */
  branch?: string
  /** Where the ledger branch came from: config | recorded | inferred | none. */
  branchSource?: LedgerBranchSource
  warning?: string
  anchor: LedgerCheck
  ceremony: LedgerCheck
  sync: LedgerCheck
}

function git(root: string, args: string[]): { ok: boolean; out: string } {
  try {
    return { ok: true, out: execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() }
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string }
    return { ok: false, out: (String(e.stdout ?? "") + String(e.stderr ?? "") + (e.message ?? "")).trim() }
  }
}

/** Dirty ledger paths in the operator's checkout (the uncommitted-ceremony class). */
export function dirtyLedgerPaths(root: string, paths: readonly string[] = LEDGER_PATHS): string[] {
  const status = git(root, ["status", "--porcelain", "--", ...paths])
  if (!status.ok) return []
  return status.out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * The ledger branch: named by config, recorded in the ledger, or inferred from
 * the checkout. Undefined only on a detached HEAD with no recorded branch.
 */
export function ledgerBranch(root: string): string | undefined {
  return resolveLedgerBranch(root).branch
}

export async function checkLedger(root: string, options: { ledgerPaths?: readonly string[] } = {}): Promise<LedgerHealth> {
  const paths = options.ledgerPaths ?? LEDGER_PATHS
  const inside = git(root, ["rev-parse", "--git-dir"])
  if (!inside.ok) {
    return {
      repo: false,
      anchor: { ok: true, detail: "Not a git repository; the ledger is not versioned here" },
      ceremony: { ok: true, detail: "Not a git repository" },
      sync: { ok: true, detail: "Not a git repository" },
    }
  }

  const resolution = resolveLedgerBranch(root)
  const branch = resolution.branch
  const anchorState = await readAnchorState(root, paths)

  // 1. Anchor presence. An absent anchor is normal (created lazily); a prunable
  //    one is the silent-failure class (metadata without a directory).
  const anchor: LedgerCheck = !anchorState.present
    ? anchorState.prunable
      ? {
          ok: false,
          detail: "Anchor worktree entry is prunable (.synth/anchor was deleted)",
          nextStep: "Run `synth doctor --fix` to prune and recreate the anchor.",
        }
      : { ok: true, detail: "Not created yet (the next ceremony creates it)" }
    : { ok: true, detail: `Anchor at ${anchorState.commit.slice(0, 8)} (detached${anchorState.dirtyPaths.length ? `, dirty: ${anchorState.dirtyPaths.length}` : ", clean"})` }

  // 2. Uncommitted ceremony: ledger paths modified in the operator's checkout.
  const dirty = dirtyLedgerPaths(root, paths)
  const ceremony: LedgerCheck =
    dirty.length === 0
      ? { ok: true, detail: "No uncommitted ceremony" }
      : {
          ok: false,
          detail: `Uncommitted ledger changes in the checkout: ${dirty.length} path(s) — ${dirty
            .slice(0, 3)
            .map((line) => porcelainPath(line))
            .join(", ")}${dirty.length > 3 ? ", …" : ""}`,
          nextStep: "Run `synth doctor --fix` to commit them as a ledger repair, or commit/stash them yourself.",
        }

  // 3. Sync: does the anchor still point at the branch tip?
  let sync: LedgerCheck = { ok: true, detail: "No anchor to compare" }
  if (anchorState.present) {
    if (!branch) {
      sync = { ok: false, detail: "Detached HEAD; the ledger branch cannot be resolved", nextStep: "Check out a branch before running ceremonies." }
    } else {
      const tip = git(root, ["rev-parse", branch])
      if (!tip.ok) {
        sync = { ok: false, detail: `Ledger branch ${branch} cannot be resolved`, nextStep: "Check the repository state." }
      } else if (tip.out === anchorState.commit) {
        sync = { ok: true, detail: `Anchor tracks ${branch} (${tip.out.slice(0, 8)})` }
      } else {
        const ahead = git(root, ["rev-list", "--count", `${anchorState.commit}..${tip.out}`])
        const behind = git(root, ["rev-list", "--count", `${tip.out}..${anchorState.commit}`])
        sync = {
          ok: false,
          detail: `Anchor is behind ${branch} by ${ahead.ok ? ahead.out : "?"} commit(s)` +
            (behind.ok && behind.out !== "0" ? `, ahead by ${behind.out}` : ""),
          nextStep: "Run `synth doctor --fix` to re-point the anchor at the branch tip.",
        }
      }
    }
  }

  return {
    repo: true,
    ...(branch ? { branch } : {}),
    branchSource: resolution.source,
    ...(resolution.warning ? { warning: resolution.warning } : {}),
    anchor,
    ceremony,
    sync,
  }
}

export type LedgerRepair = {
  actions: string[]
  errors: string[]
  anchor?: { created: boolean; pruned: boolean }
  commit?: { commitHash: string; files: string[] }
}

/**
 * Repair what `checkLedger` reports, in an order that leaves the ledger
 * consistent: (1) commit a stalled ceremony through the same writer every
 * other ceremony uses, (2) prune/recreate/re-point the anchor at the branch
 * tip. Never throws: every failure is reported in `errors`.
 */
export async function repairLedger(root: string, options: { ledgerPaths?: readonly string[] } = {}): Promise<LedgerRepair> {
  const paths = options.ledgerPaths ?? LEDGER_PATHS
  const result: LedgerRepair = { actions: [], errors: [] }

  const resolution = resolveLedgerBranch(root)
  const branch = resolution.branch
  if (!branch) {
    result.errors.push("Detached HEAD and no recorded ledger branch: check out a branch before repairing the ledger.")
    return result
  }
  // The same resolution the ceremonies use: record an inferred branch so the
  // repair commit itself is the last guess this repository has to make.
  if (resolution.source === "inferred") {
    try {
      recordLedgerBranch(root, branch, "doctor --fix")
      result.actions.push(`recorded the ledger branch as ${branch}`)
    } catch {
      // best effort; the repair below still runs
    }
  }
  const fastPath = currentBranch(root) === branch

  const checkoutDirty = dirtyLedgerPaths(root, paths)
  const anchorBefore = await readAnchorState(root, paths)
  const anchorDirty = anchorBefore.present ? anchorBefore.dirtyPaths : []

  // 1. The stalled ceremony. Prefer the operator's checkout; the anchor is the
  //    fallback when the checkout is clean but the anchor holds the edits.
  const message = "chore(synth): ledger repair (doctor --fix)"
  try {
    if (checkoutDirty.length > 0 && fastPath) {
      const committed = await advanceCanonicalBranch(root, { branch, message, paths, useCheckout: root })
      if (committed.committed) {
        result.commit = { commitHash: committed.commitHash, files: committed.files }
        result.actions.push(
          `committed ledger changes: ${committed.files.length} path(s) as ${committed.commitHash.slice(0, 8)}`,
        )
      }
    } else if (anchorDirty.length > 0 || (checkoutDirty.length > 0 && !fastPath)) {
      const committed = await advanceCanonicalBranch(root, { branch, message, paths })
      if (committed.committed) {
        result.commit = { commitHash: committed.commitHash, files: committed.files }
        result.actions.push(
          `committed ledger changes: ${committed.files.length} path(s) as ${committed.commitHash.slice(0, 8)}`,
        )
      }
    }
  } catch (err) {
    const e = err as LedgerError
    result.errors.push(e.code ? `${e.code}: ${e.message}` : String(err))
  }

  // 2. The anchor itself: a missing/prunable worktree entry is recreated; a
  //    stale one is re-pointed at the branch tip.
  try {
    const state = await readAnchorState(root, paths)
    const tip = git(root, ["rev-parse", branch])
    if (!state.present || state.prunable) {
      const repaired = await repairAnchor(root, branch)
      result.anchor = { created: repaired.created, pruned: repaired.pruned }
      result.actions.push(`recreated the anchor at ${repaired.path}`)
    } else if (tip.ok && state.commit !== tip.out) {
      await ensureAnchor(root, branch)
      result.actions.push(`re-pointed the anchor at ${branch}`)
    }
  } catch (err) {
    const e = err as LedgerError
    result.errors.push(e.code ? `${e.code}: ${e.message}` : String(err))
  }

  return result
}
