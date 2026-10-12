// ============================================================
// REPOSITORY — Declared execution branch resolution (ADR-056)
// ============================================================
// Git-facing half of `--branch` / `--no-create`: validate the operator's
// branch name, refuse a branch already owned by another live entity, check
// existence locally and on origin, and check it out (creating it only when
// allowed). Policy decisions live in branch-policy; this module never prints.
// ============================================================

import { execFileSync } from "node:child_process"
import {
  findLiveBranchBindingOwner,
  type ExecutionNameRecords,
} from "./branch-policy.js"
import { validateDeclaredBranchName } from "./branch-taxonomy.js"

export type DeclaredBranchResolution = {
  ok: boolean
  branch: string
  /** True only when this call created the branch. */
  created: boolean
  currentBranch: string
  baseCommit: string
  code?: string
  error?: string
  suggestion?: string
}

export type DeclareBranchOptions = {
  root: string
  role: "mission" | "expedition"
  entityId: string
  branch: string
  noCreate?: boolean
  /** Ledger records used for the live-owner rule; omit to skip the check. */
  state?: ExecutionNameRecords | null
}

function gitOut(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch {
    return ""
  }
}

function branchExistsLocally(root: string, branch: string): boolean {
  return gitOut(root, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]) !== ""
}

function branchExistsOnOrigin(root: string, branch: string): boolean {
  return gitOut(root, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${branch}`]) !== ""
}

/**
 * Resolve `--branch` for one entity. Pure with respect to governance state:
 * the only side effects are git checkout / branch creation.
 */
export function resolveDeclaredBranch(options: DeclareBranchOptions): DeclaredBranchResolution {
  const { root, role, entityId, branch } = options
  const noCreate = options.noCreate === true
  const fail = (code: string, error: string, suggestion?: string): DeclaredBranchResolution => ({
    ok: false,
    branch,
    created: false,
    currentBranch: gitOut(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    baseCommit: gitOut(root, ["rev-parse", "HEAD"]),
    code,
    error,
    ...(suggestion ? { suggestion } : {}),
  })

  const invalid = validateDeclaredBranchName(branch)
  if (!invalid.valid) {
    return fail("INVALID_BRANCH_NAME", invalid.errors.join("; "))
  }
  try {
    execFileSync("git", ["check-ref-format", "--branch", branch], { cwd: root, stdio: ["pipe", "pipe", "pipe"] })
  } catch {
    return fail("INVALID_BRANCH_NAME", `git rejects the branch name ${branch}`)
  }

  const owner = findLiveBranchBindingOwner(options.state, role, entityId, branch)
  if (owner) {
    return fail(
      "DECLARED_BRANCH_IN_USE",
      `${owner.kind} ${owner.id} is already bound to ${branch}`,
      `Use another branch, or finish ${owner.id} first`,
    )
  }

  const currentBranch = gitOut(root, ["rev-parse", "--abbrev-ref", "HEAD"])
  const baseCommit = gitOut(root, ["rev-parse", "HEAD"])
  const localExists = branchExistsLocally(root, branch)
  const remoteExists = !localExists && branchExistsOnOrigin(root, branch)

  if (currentBranch !== branch) {
    try {
      if (localExists) {
        gitOut(root, ["checkout", branch])
      } else if (remoteExists) {
        // The branch pre-exists on origin: materialize a tracking branch.
        gitOut(root, ["checkout", "-b", branch, "--track", `origin/${branch}`])
      } else if (noCreate) {
        return fail(
          "DECLARED_BRANCH_MISSING",
          `Branch ${branch} does not exist locally or on origin, and --no-create was given`,
          `Create it first: git branch ${branch} <base> && git checkout ${branch}`,
        )
      } else {
        gitOut(root, ["checkout", "-b", branch, baseCommit])
      }
    } catch (err) {
      return fail("BRANCH_DECLARATION_FAILED", err instanceof Error ? err.message : String(err))
    }
    const after = gitOut(root, ["rev-parse", "--abbrev-ref", "HEAD"])
    if (after !== branch) {
      return fail("BRANCH_DECLARATION_FAILED", `Failed to check out ${branch}; HEAD is ${after || "detached"}`)
    }
  }

  return {
    ok: true,
    branch,
    // A branch that existed before this call is never reported as created.
    created: !localExists && !remoteExists,
    currentBranch: gitOut(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    baseCommit,
  }
}
