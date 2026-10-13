// ============================================================
// LEDGER — Branch resolution (ADR-055 rev 2 §R2.1, E5 slice 4)
// ============================================================
// The ledger branch must be *named*, not inferred from whichever branch the
// operator happens to be standing on. Resolution order:
//
//   1. `.synth/config.yaml` → `git.ledgerBranch`   (explicit; wins)
//   2. `.synth/data/ledger.json` → the branch recorded at bootstrap
//      (written by the first ceremony that had to infer one)
//   3. the attached checkout                       (inferred; always warned)
//
// A branch named by 1 or 2 that does not exist *in this clone* (a fresh agent
// session, or a value left behind by a branch that was merged and deleted)
// falls back to `main`, then to the checkout, and says so in `warning`. Naming
// a branch is still the answer; a stale name is not a reason to refuse every
// ceremony with LEDGER_UNAVAILABLE.
//
// A detached HEAD with no config and no record resolves to nothing, and every
// caller must treat that as a loud refusal — never as "commit where I stand".
// ============================================================

import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { load as loadYaml } from "js-yaml"

export type LedgerBranchSource = "config" | "recorded" | "inferred" | "none"

export type LedgerBranchResolution = {
  branch?: string
  source: LedgerBranchSource
  /** Where the answer came from (config path or record path). */
  from?: string
  /** Set when the caller should tell the operator the branch was inferred. */
  warning?: string
}

export const LEDGER_RECORD_PATH = [".synth", "data", "ledger.json"] as const

/** Where each answer comes from, as a repo-relative path (for `from`). */
const CONFIG_PATH = ".synth/config.yaml"
const RECORD_PATH = LEDGER_RECORD_PATH.join("/")

/**
 * The branch ceremonies fall back to when the named one is absent from this
 * clone. `main` is the canonical ledger branch (ADR-055 §2.9); the checkout is
 * the last resort, and both are reported in the resolution warning.
 */
export const LEDGER_FALLBACK_BRANCH = "main"

function git(root: string, args: string[]): string | undefined {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return undefined
  }
}

/** Does `refs/heads/<branch>` exist in this clone? (Remote refs do not count.) */
export function branchExistsLocally(root: string, branch: string): boolean {
  if (!branch) return false
  const resolved = git(root, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])
  return typeof resolved === "string" && resolved.length > 0
}

/** The branch the operator's checkout is on (undefined when detached). */
export function currentBranch(root: string): string | undefined {
  const head = git(root, ["symbolic-ref", "-q", "--short", "HEAD"])
  return head && head.length > 0 ? head : undefined
}

/** `git.ledgerBranch` from `.synth/config.yaml`, when present and non-empty. */
export function readConfiguredLedgerBranch(root: string): string | undefined {
  const configPath = path.join(root, ".synth", "config.yaml")
  if (!fs.existsSync(configPath)) return undefined
  try {
    const parsed = loadYaml(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown> | undefined
    const gitConfig = (parsed?.git as Record<string, unknown>) || {}
    const value = gitConfig.ledgerBranch
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
  } catch {
    return undefined
  }
}

export type LedgerBranchRecord = { branch?: string; recordedAt?: string; recordedBy?: string }

/**
 * The branch recorded in the ledger itself (`.synth/data/ledger.json`). Because
 * the file lives under `.synth/data`, it is inherited by every branch cut from
 * the ledger branch — which is exactly the bootstrap default rev 3.5 names.
 */
export function readRecordedLedgerBranch(root: string): LedgerBranchRecord {
  const recordPath = path.join(root, ...LEDGER_RECORD_PATH)
  if (!fs.existsSync(recordPath)) return {}
  try {
    const parsed = JSON.parse(fs.readFileSync(recordPath, "utf-8")) as LedgerBranchRecord
    const branch = typeof parsed.branch === "string" && parsed.branch.length > 0 ? parsed.branch : undefined
    return { ...(branch ? { branch } : {}), recordedAt: parsed.recordedAt, recordedBy: parsed.recordedBy }
  } catch {
    return {}
  }
}

export function resolveLedgerBranch(root: string): LedgerBranchResolution {
  const configured = readConfiguredLedgerBranch(root)
  if (configured) {
    if (branchExistsLocally(root, configured)) {
      return { branch: configured, source: "config", from: CONFIG_PATH }
    }
    // A configured branch this clone does not have — a fresh agent session, or
    // a stale value left behind by a branch that was merged and deleted — must
    // not turn every ceremony into a loud LEDGER_UNAVAILABLE. Fall back to the
    // canonical base branch (else the checkout) and say so in the warning.
    const fallback = [LEDGER_FALLBACK_BRANCH, currentBranch(root)].find((name) => branchExistsLocally(root, name ?? ""))
    if (fallback) {
      return {
        branch: fallback,
        source: "config",
        from: CONFIG_PATH,
        warning: `git.ledgerBranch (${configured}) does not exist in this clone; committing ceremonies on ${fallback} instead. Fetch it ('git fetch origin ${configured}') or point git.ledgerBranch at a branch that exists.`,
      }
    }
    // Nothing to fall back to: continue to the recorded branch / inference.
  }

  const record = readRecordedLedgerBranch(root)
  if (record.branch) {
    if (branchExistsLocally(root, record.branch)) {
      return { branch: record.branch, source: "recorded", from: RECORD_PATH }
    }
    const fallback = [LEDGER_FALLBACK_BRANCH, currentBranch(root)].find((name) => branchExistsLocally(root, name ?? ""))
    if (fallback) {
      return {
        branch: fallback,
        source: "recorded",
        from: RECORD_PATH,
        warning: `The recorded ledger branch (${record.branch}) does not exist in this clone; committing ceremonies on ${fallback} instead.`,
      }
    }
  }

  const current = currentBranch(root)
  if (!current) {
    return { source: "none" }
  }
  return {
    branch: current,
    source: "inferred",
    warning: `Ledger branch inferred from the checkout (${current}); set git.ledgerBranch in .synth/config.yaml to name it.`,
  }
}

/**
 * Record the ledger branch in the ledger itself, so the inference happens once
 * per repository. Returns the repo-relative path written (the caller commits it
 * with the ceremony that triggered the recording).
 */
export function recordLedgerBranch(root: string, branch: string, recordedBy = "ceremony"): string {
  const recordPath = path.join(root, ...LEDGER_RECORD_PATH)
  fs.mkdirSync(path.dirname(recordPath), { recursive: true })
  fs.writeFileSync(
    recordPath,
    JSON.stringify({ branch, recordedAt: new Date().toISOString(), recordedBy }, null, 2) + "\n",
  )
  return LEDGER_RECORD_PATH.join("/")
}
