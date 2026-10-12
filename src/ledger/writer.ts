// ============================================================
// LEDGER — Writer (ADR-055 §2.3 / §2.10)
// ============================================================
// One mechanism, one lock, one code path for governance mutations:
//
//   lock (.git/synth-ledger.lock)  →  anchor worktree (.synth/anchor, detached,
//   sparse)  →  commit there  →  `git update-ref` CAS advances the canonical
//   branch.
//
// The writer never writes best-effort: if it cannot advance the ledger it
// throws a LedgerError with a code and a next step (the ceremony is expected to
// fail loudly rather than report {committed:false}).
// ============================================================

import { execFileSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"

export type LedgerErrorCode =
  | "LEDGER_LOCKED"
  | "LEDGER_UNAVAILABLE"
  | "LEDGER_DIRTY"
  | "LEDGER_DIVERGED"
  | "LEDGER_NO_CHANGES"

export class LedgerError extends Error {
  readonly code: LedgerErrorCode
  readonly nextStep?: string

  constructor(code: LedgerErrorCode, message: string, nextStep?: string) {
    super(message)
    this.name = "LedgerError"
    this.code = code
    if (nextStep) this.nextStep = nextStep
  }
}

/** Ledger paths: the writer only ever commits these (ADR-055 §2.10). */
export const LEDGER_PATHS = [".synth", "proof", "AGENTS.md"] as const

export function anchorPath(root: string): string {
  return path.join(root, ".synth", "anchor")
}

/**
 * The anchor worktree is writer bookkeeping, never ledger content. Git would
 * only skip it when the project ignores `.synth/anchor/` — and a project that
 * forgets must not be able to turn the writer's own worktree into a ledger
 * change (which would make the writer try to copy the anchor into itself).
 */
export function isAnchorPath(root: string, changedPath: string): boolean {
  const relative = path.relative(root, anchorPath(root)).split(path.sep).join("/")
  return changedPath === relative || changedPath.startsWith(`${relative}/`)
}

function lockPath(root: string): string {
  return path.join(root, ".git", "synth-ledger.lock")
}

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
}

function gitQuiet(root: string, args: string[]): { ok: boolean; out: string } {
  try {
    return { ok: true, out: git(root, args) }
  } catch (err) {
    const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string }
    const out = String(e.stdout ?? "") + String(e.stderr ?? "") + (e.message ?? "")
    return { ok: false, out: out.trim() }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function processIsAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    // EPERM means the process exists but belongs to someone else.
    return (err as NodeJS.ErrnoException).code === "EPERM"
  }
}

export type LedgerLock = {
  path: string
  release: () => Promise<void>
}

export type LockOptions = {
  timeoutMs?: number
  staleMs?: number
  pollMs?: number
}

/**
 * Serialize ceremonies with a lock file (`.git/synth-ledger.lock`). A lock is
 * stolen when its owner is gone or when it is older than `staleMs`, so a
 * crashed process never blocks the writer forever.
 */
export async function acquireLedgerLock(root: string, options: LockOptions = {}): Promise<LedgerLock> {
  const { timeoutMs = 10_000, staleMs = 5 * 60_000, pollMs = 100 } = options
  const file = lockPath(root)
  const deadline = Date.now() + timeoutMs

  await fs.mkdir(path.dirname(file), { recursive: true })

  const release = async (): Promise<void> => {
    // Only remove the lock we still own (best effort; a stolen lock is not ours).
    try {
      await fs.unlink(file)
    } catch {
      /* already gone */
    }
  }

  for (;;) {
    try {
      const handle = await fs.open(file, "wx")
      try {
        await handle.writeFile(
          JSON.stringify({ pid: process.pid, host: process.env.HOSTNAME ?? "unknown", startedAt: Date.now() }, null, 2),
        )
      } finally {
        await handle.close()
      }
      return { path: file, release }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
        throw new LedgerError("LEDGER_UNAVAILABLE", `Cannot create the ledger lock at ${file}: ${String(err)}`)
      }
    }

    let owner: { pid?: number; startedAt?: number } = {}
    try {
      owner = JSON.parse(await fs.readFile(file, "utf-8")) as { pid?: number; startedAt?: number }
    } catch {
      // Unreadable lock: treat as stale below when it is old enough.
    }
    const age = Date.now() - Number(owner.startedAt ?? 0)
    const ownerAlive = owner.pid === undefined ? true : processIsAlive(Number(owner.pid))
    if (!ownerAlive || age > staleMs) {
      try {
        await fs.unlink(file)
      } catch {
        /* raced with another waiter */
      }
      continue
    }

    if (Date.now() >= deadline) {
      throw new LedgerError(
        "LEDGER_LOCKED",
        `Another SYNTH process holds the ledger lock (${file}, pid ${owner.pid ?? "unknown"}).`,
        "Wait for it to finish, or delete the lock file if the process is gone.",
      )
    }
    await sleep(pollMs)
  }
}

export async function withLedgerLock<T>(
  root: string,
  fn: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const lock = await acquireLedgerLock(root, options)
  try {
    return await fn()
  } finally {
    await lock.release()
  }
}

export type AnchorState = {
  path: string
  present: boolean
  /** A worktree entry exists but its directory is gone. */
  prunable: boolean
  detached: boolean
  commit: string
  /** Ledger paths with local modifications inside the anchor. */
  dirtyPaths: string[]
}

/** Inspect the anchor: present, prunable, detached, and clean on ledger paths. */
export async function readAnchorState(root: string, ledgerPaths: readonly string[] = LEDGER_PATHS): Promise<AnchorState> {
  const dir = anchorPath(root)
  let present = false
  try {
    const stat = await fs.stat(dir)
    present = stat.isDirectory()
  } catch {
    present = false
  }

  const list = gitQuiet(root, ["worktree", "list", "--porcelain"])
  const prunable = list.ok && /prunable\s+synth-anchor|prunable/.test(list.out) && list.out.includes(dir)

  if (!present) {
    return { path: dir, present: false, prunable, detached: false, commit: "", dirtyPaths: [] }
  }

  const head = gitQuiet(dir, ["rev-parse", "HEAD"])
  const branch = gitQuiet(dir, ["rev-parse", "--abbrev-ref", "HEAD"])
  const detached = branch.ok && branch.out === "HEAD"
  const status = gitQuiet(dir, ["status", "--porcelain", "--", ...ledgerPaths])
  const dirtyPaths = status.ok
    ? status.out
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : []

  return {
    path: dir,
    present: true,
    prunable,
    detached,
    commit: head.ok ? head.out : "",
    dirtyPaths,
  }
}

export type EnsureAnchorResult = {
  path: string
  created: boolean
  commit: string
}

/**
 * Ensure the detached, sparse anchor exists at the canonical branch tip.
 * Repairs a prunable worktree entry (the directory was deleted) first.
 */
export async function ensureAnchor(root: string, branch: string, options: { sparse?: boolean } = {}): Promise<EnsureAnchorResult> {
  const sparse = options.sparse !== false
  const dir = anchorPath(root)

  let state = await readAnchorState(root)
  if (!state.present && state.prunable) {
    gitQuiet(root, ["worktree", "prune"])
    state = await readAnchorState(root)
  }

  if (state.present) {
    // Re-point the anchor at the current tip of the branch (it is detached, so
    // this never fights the operator's checkout for the branch).
    const tip = gitQuiet(root, ["rev-parse", branch])
    if (!tip.ok) {
      throw new LedgerError("LEDGER_UNAVAILABLE", `Cannot resolve ledger branch ${branch}.`, `Create ${branch} first.`)
    }
    if (state.commit !== tip.out) {
      const checkout = gitQuiet(dir, ["checkout", "--detach", tip.out])
      if (!checkout.ok) {
        throw new LedgerError(
          "LEDGER_UNAVAILABLE",
          `Cannot re-point the anchor ${dir} at ${branch}: ${checkout.out}`,
          "Run `git worktree prune` and retry.",
        )
      }
    }
    return { path: dir, created: false, commit: tip.out }
  }

  const add = gitQuiet(root, ["worktree", "add", "--detach", dir, branch])
  if (!add.ok) {
    throw new LedgerError(
      "LEDGER_UNAVAILABLE",
      `Cannot create the ledger anchor at ${dir}: ${add.out}`,
      "Delete .synth/anchor, run `git worktree prune`, and retry.",
    )
  }

  if (sparse) {
    gitQuiet(dir, ["sparse-checkout", "set", "--no-cone", ".synth/", "proof/"])
  }
  const commit = gitQuiet(dir, ["rev-parse", "HEAD"])
  return { path: dir, created: true, commit: commit.ok ? commit.out : "" }
}

/** Repair: prune orphaned worktree metadata and recreate the anchor. */
export async function repairAnchor(root: string, branch: string): Promise<EnsureAnchorResult & { pruned: boolean }> {
  const dir = anchorPath(root)
  let pruned = false
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    /* best effort */
  }
  gitQuiet(root, ["worktree", "prune"])
  pruned = true
  const ensured = await ensureAnchor(root, branch)
  return { ...ensured, pruned }
}

/** `git status --porcelain` line → the path it refers to. */
export function porcelainPath(line: string): string {
  // Porcelain v1: one or two status columns, then the path. The caller trims
  // each line, which eats the leading space of a one-column status (" M p"),
  // so accept both shapes.
  const match = /^\s*[A-Z?!]{1,2}\s+(.*)$/.exec(line)
  return (match ? match[1] : line).trim().replace(/^"(.*)"$/, "$1")
}

function stripStatus(line: string): string {
  return porcelainPath(line)
}

function isUnderAnyPathspec(filePath: string, paths: readonly string[]): boolean {
  return paths.some((spec) => {
    const clean = spec.replace(/^\/+|\/+$/g, "")
    return filePath === clean || filePath.startsWith(`${clean}/`)
  })
}

export type LedgerChange = { status: string; path: string }

/**
 * Ledger paths with a local modification in `root` (the checkout a ceremony
 * ran in). Porcelain `-z` form, so no path ever needs unquoting.
 */
export function ledgerChanges(root: string, paths: readonly string[] = LEDGER_PATHS): LedgerChange[] {
  // Deliberately not the trimmed `gitQuiet`: porcelain status lines start with
  // a space for worktree-only changes, and trimming eats the first path byte.
  let raw: string
  try {
    raw = execFileSync("git", ["status", "--porcelain", "-z", "--", ...paths], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })
  } catch {
    return []
  }
  const entries = raw.split("\0").filter((entry) => entry.length > 0)
  const changes: LedgerChange[] = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const status = entry.slice(0, 2)
    let changedPath = entry.slice(3)
    if (status.includes("R") || status.includes("C")) {
      // rename/copy: the destination is the next NUL-separated field
      changedPath = entries[++i] ?? changedPath
    }
    if (!changedPath) continue
    if (isAnchorPath(root, changedPath)) continue
    changes.push({ status: status.trim() || "??", path: changedPath })
  }
  return changes
}

export function isUnderAnyPathspecFile(filePath: string, paths: readonly string[]): boolean {
  return isUnderAnyPathspec(filePath, paths)
}

/**
 * Copy the ceremony's ledger edits from the checkout that produced them into
 * the writer's worktree (the anchor). The anchor is a separate working tree, so
 * without this step the commit would see an unchanged tree and report "no
 * changes" while the ledger sat uncommitted in the operator's checkout.
 */
async function materializeInto(sourceRoot: string, targetRoot: string, changes: readonly LedgerChange[]): Promise<void> {
  for (const change of changes) {
    if (isAnchorPath(sourceRoot, change.path)) continue
    const from = path.join(sourceRoot, change.path)
    const to = path.join(targetRoot, change.path)
    if (change.status.includes("D")) {
      await fs.rm(to, { recursive: true, force: true })
      continue
    }
    await fs.mkdir(path.dirname(to), { recursive: true })
    await fs.cp(from, to, { recursive: true, force: true })
  }
}

export type AdvanceResult = {
  committed: boolean
  branch: string
  commitHash: string
  files: string[]
  reason?: string
}

export type AdvanceOptions = {
  branch: string
  message: string
  /** Restrict staging to these pathspecs (defaults to the ledger paths). */
  paths?: readonly string[]
  /** When set, take the short path through this clean checkout instead of the anchor. */
  useCheckout?: string
  /** Set false to leave the operator checkout untouched after the CAS (tests). */
  refreshCheckout?: boolean
  /**
   * The checkout the ceremony ran in, when it is not the writer's worktree.
   * Its ledger edits are materialized into the anchor before staging.
   */
  sourceRoot?: string
}

/**
 * Commit `paths` and advance `branch` with a single `update-ref` CAS. Throws
 * `LEDGER_DIRTY` when the writing checkout has local changes on ledger paths,
 * and `LEDGER_DIVERGED` when the branch moved underneath the commit.
 */
export async function advanceCanonicalBranch(root: string, options: AdvanceOptions): Promise<AdvanceResult> {
  const paths = options.paths ?? LEDGER_PATHS
  const expectedBefore = gitQuiet(root, ["rev-parse", options.branch])
  if (!expectedBefore.ok) {
    throw new LedgerError("LEDGER_UNAVAILABLE", `Cannot resolve ledger branch ${options.branch}.`)
  }
  const old = expectedBefore.out

  const writerPath = options.useCheckout ?? (await ensureAnchor(root, options.branch)).path

  // A ceremony that ran in another checkout: move its ledger edits into the
  // writer's worktree so the commit has content to record.
  if (!options.useCheckout && options.sourceRoot && options.sourceRoot !== writerPath) {
    const changes = ledgerChanges(options.sourceRoot, paths)
    if (changes.length > 0) await materializeInto(options.sourceRoot, writerPath, changes)
  }

  // Committing in the operator's own checkout (which is on the ledger branch)
  // moves the ref as part of the commit, so the compare-and-swap below would
  // compare against a ref this process already advanced. Detect the shortcut.
  const writerHead = gitQuiet(writerPath, ["symbolic-ref", "-q", "HEAD"])
  const commitsInBranch = writerHead.ok && writerHead.out === `refs/heads/${options.branch}`

  // The residue check must see the *whole* ledger, not just this ceremony's
  // payload: a stale edit under `proof/` blocks a ceremony that only owns
  // `.synth/` (ADR-055 §2.10).
  const dirty = gitQuiet(writerPath, ["status", "--porcelain", "--", ...LEDGER_PATHS])
  if (!dirty.ok) {
    throw new LedgerError(
      "LEDGER_UNAVAILABLE",
      `Cannot read the ledger status in ${writerPath}: ${dirty.out}`,
      "Run `synth doctor --fix` to recreate the anchor.",
    )
  }
  const dirtyPaths = dirty.out.split("\n").map((line) => line.trim()).filter(Boolean)
  // Dirty paths the caller asked for are this ceremony's payload (that is how
  // the ledger gets written at all). Dirty paths outside the payload are
  // residue — a crashed ceremony or a human edit — and must not be folded into
  // this commit silently.
  const residue = dirtyPaths.filter((line) => !isUnderAnyPathspec(stripStatus(line), paths))
  if (residue.length > 0) {
    throw new LedgerError(
      "LEDGER_DIRTY",
      `The ledger is dirty in ${writerPath} outside this ceremony's paths: ${residue.join(", ")}`,
      "Commit or stash the ledger paths (.synth, proof, AGENTS.md) first.",
    )
  }

  // A non-existent pathspec (e.g. AGENTS.md before it is created) makes
  // `git add` fail atomically and stage nothing — the same bug E1 fixed in the
  // ceremony path. Only real paths are passed to git.
  const existingPaths: string[] = []
  for (const spec of paths) {
    const clean = spec.replace(/^\/+|\/+$/g, "")
    const visible = await fs
      .access(path.join(writerPath, clean))
      .then(() => true)
      .catch(() => false)
    if (visible) existingPaths.push(spec)
  }
  if (existingPaths.length === 0) {
    return { committed: false, branch: options.branch, commitHash: old, files: [], reason: "no ledger changes" }
  }
  gitQuiet(writerPath, ["add", "-A", "--", ...existingPaths])
  const staged = gitQuiet(writerPath, ["diff", "--cached", "--name-only", "--", ...existingPaths])
  const files = staged.ok ? staged.out.split("\n").map((line) => line.trim()).filter(Boolean) : []
  if (files.length === 0) {
    return { committed: false, branch: options.branch, commitHash: old, files: [], reason: "no ledger changes" }
  }

  const commit = gitQuiet(writerPath, ["commit", "-m", options.message, "--", ...existingPaths])
  if (!commit.ok) {
    throw new LedgerError("LEDGER_UNAVAILABLE", `Ledger commit failed in ${writerPath}: ${commit.out}`)
  }
  const newCommit = gitQuiet(writerPath, ["rev-parse", "HEAD"])
  if (!newCommit.ok) {
    throw new LedgerError("LEDGER_UNAVAILABLE", "Ledger commit succeeded but HEAD is unreadable.")
  }

  if (commitsInBranch) {
    return { committed: true, branch: options.branch, commitHash: newCommit.out, files }
  }

  const cas = gitQuiet(root, ["update-ref", `refs/heads/${options.branch}`, newCommit.out, old])
  if (!cas.ok) {
    throw new LedgerError(
      "LEDGER_DIVERGED",
      `The ledger branch ${options.branch} moved while the ceremony was running (expected ${old.slice(0, 8)}): ${cas.out}`,
      "Re-run the ceremony; if this repeats, another writer is active (ADR-055 §2.9).",
    )
  }

  // The branch moved underneath the operator's checkout. If that checkout is on
  // this branch, bring the ceremony's paths up to date so `git status` stays
  // clean and the ledger does not appear locally modified.
  if (!options.useCheckout && options.refreshCheckout !== false) {
    await refreshCheckout(root, options.branch, newCommit.out, existingPaths)
  }

  return { committed: true, branch: options.branch, commitHash: newCommit.out, files }
}

/**
 * Restore `paths` (as they exist in `commit`) into the operator's index and
 * working tree, but only when the operator is checked out on `branch`.
 */
async function refreshCheckout(root: string, branch: string, commit: string, paths: readonly string[]): Promise<void> {
  const head = gitQuiet(root, ["symbolic-ref", "-q", "HEAD"])
  if (!head.ok || head.out !== `refs/heads/${branch}`) return

  const listing = gitQuiet(root, ["ls-tree", "--name-only", "-r", commit, "--", ...paths])
  if (!listing.ok) return
  const files = listing.out.split("\n").map((line) => line.trim()).filter(Boolean)
  if (files.length === 0) return

  gitQuiet(root, ["restore", `--source=${commit}`, "--staged", "--worktree", "--", ...files])
}
