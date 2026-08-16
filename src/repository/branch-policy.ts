// ============================================================
// REPOSITORY: Branch Policy
// ============================================================
// Declares how SYNTH governs the execution branch for missions
// and expeditions, and resolves whether the current branch is
// acceptable for a given operation.
//
// The framework reads the project setup transparently:
//   - No policy declared in .synth/config.yaml -> defaults apply.
//   - git.branchStrategy declares featured or trunk workflow.
//   - git.branchPolicy.mode controls enforcement (off/enforce).
// When the underlying VCS has no branch concept, enforcement
// degrades to observation and never silently masks a violation.
// ============================================================

import fs from "fs"
import path from "path"
import { load as loadYaml } from "js-yaml"
import { classifyBranch, generateBranchName, validateBranchName } from "./branch-taxonomy.js"

export type BranchPolicyMode = "off" | "enforce"
export type BranchStrategy = "featured" | "trunk" | "observed"

export type BranchPolicy = {
  mode: BranchPolicyMode
  strategy: BranchStrategy
  allowChoreOnMain: boolean
  choreCapabilities: string[]
}

export type ExecutionRole = "mission" | "expedition" | "chore" | "internal"

export type ExecutionBranchContext = {
  missionId?: string
  expeditionId?: string
  capability?: string
}

export type ExecutionBranchResult = {
  ok: boolean
  mode: BranchPolicyMode
  strategy: BranchStrategy
  requiredBranch?: string
  reason?: string
}

function defaultBranchPolicy(): BranchPolicy {
  return {
    mode: "off",
    strategy: "featured",
    allowChoreOnMain: false,
    choreCapabilities: [],
  }
}

export function loadBranchPolicyConfig(cwd: string): BranchPolicy {
  const configPath = path.join(cwd, ".synth", "config.yaml")
  let parsed: Record<string, unknown> = {}
  if (fs.existsSync(configPath)) {
    try {
      parsed = loadYaml(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>
    } catch {
      parsed = {}
    }
  }
  const gitConfig = (parsed.git as Record<string, unknown>) || {}
  const policy = (gitConfig.branchPolicy as Record<string, unknown>) || {}
  const config = defaultBranchPolicy()

  if (gitConfig.branchStrategy === "featured" || gitConfig.branchStrategy === "trunk") {
    config.strategy = gitConfig.branchStrategy
  }
  if (policy.mode === "off" || policy.mode === "enforce") {
    config.mode = policy.mode
  }
  if (typeof policy.allowChoreOnMain === "boolean") {
    config.allowChoreOnMain = policy.allowChoreOnMain
  }
  if (Array.isArray(policy.choreCapabilities)) {
    config.choreCapabilities = policy.choreCapabilities.filter((c: unknown): c is string => typeof c === "string")
  }
  return config
}

/**
 * Resolve whether the current branch satisfies the execution branch policy
 * for the given role. Pure and deterministic: the adapter supplies the
 * current branch name and this function decides.
 */
export function resolveExecutionBranch(
  role: ExecutionRole,
  currentBranch: string,
  policy: BranchPolicy,
  context: ExecutionBranchContext = {},
): ExecutionBranchResult {
  const base: ExecutionBranchResult = { ok: true, mode: policy.mode, strategy: policy.strategy }

  // Observed strategy: vendor has no branch concept (or policy unknown).
  // Enforcement degrades to observation with an explicit reason, never silently.
  if (policy.strategy === "observed") {
    return { ...base, reason: "No branch concept for the detected VCS; enforcement is observed only" }
  }

  // Mode off: policy not enforced; the framework never fabricates a requirement.
  if (policy.mode === "off") {
    return { ...base, reason: "Execution branch policy is off" }
  }

  // Trunk-based workflow: main is the canonical execution branch.
  if (policy.strategy === "trunk") {
    return { ...base, reason: "Trunk-based workflow permits main" }
  }

  // Chore lane: allowlisted internal operations may run on main only when
  // the operator explicitly enables it AND the capability is allowlisted.
  if (role === "chore") {
    if (!policy.allowChoreOnMain) {
      return {
        ...base,
        ok: false,
        reason: `Chore lane requires allowChoreOnMain (capability: ${context.capability ?? "unknown"})`,
      }
    }
    if (!context.capability || !policy.choreCapabilities.includes(context.capability)) {
      return {
        ...base,
        ok: false,
        reason: `Capability ${context.capability ?? "unknown"} is not in the chore allowlist`,
      }
    }
    return { ...base, reason: `Chore lane permits ${context.capability} on main` }
  }

  // Internal/framework operations never block on canonical branches.
  if (role === "internal") {
    return { ...base, reason: "Internal operations are exempt from branch enforcement" }
  }

  // Mission/expedition roles require a canonical branch matching their id.
  const branchType = classifyBranch(currentBranch)
  const requiredBranch = generateBranchName(role === "mission" ? "mission" : "expedition", {
    missionId: context.missionId,
    expeditionId: role === "expedition" ? context.expeditionId : undefined,
  })

  if (branchType === role && currentBranch === requiredBranch) {
    return { ...base, reason: `On canonical ${role} branch ${requiredBranch}` }
  }

  const ruleValidation = validateBranchName(requiredBranch, {
    missionId: context.missionId,
    expeditionId: role === "expedition" ? context.expeditionId : undefined,
  })
  const reason = ruleValidation.valid
    ? `${role} execution must run on ${requiredBranch}; current branch is ${currentBranch}`
    : `Cannot derive canonical branch: ${ruleValidation.errors.join("; ")}`

  return { ...base, ok: false, requiredBranch, reason }
}