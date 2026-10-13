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
import {
  canonicalBranchCandidates,
  classifyBranch,
  isCanonicalBranchForRole,
  validateBranchName,
} from "./branch-taxonomy.js"

export type BranchPolicyMode = "off" | "enforce"
export type BranchStrategy = "featured" | "trunk" | "observed"

export type BranchPolicy = {
  mode: BranchPolicyMode
  strategy: BranchStrategy
  allowChoreOnMain: boolean
  choreCapabilities: string[]
  /**
   * ADR-056 §2.4: branch patterns pre-approved as declared execution targets
   * (`arena/*`). A match softens the override warning; it never binds anything
   * implicitly — the binding still has to be declared and recorded.
   */
  declaredPatterns: string[]
}

export type ExecutionRole = "mission" | "expedition" | "chore" | "internal"

export type ExecutionBranchContext = {
  missionId?: string
  expeditionId?: string
  missionName?: string
  expeditionName?: string
  capability?: string
  /** ADR-056 §2.1: the operator-declared binding, consulted before the taxonomy. */
  declaredBranch?: string
}

export type ExecutionBranchResult = {
  ok: boolean
  mode: BranchPolicyMode
  strategy: BranchStrategy
  requiredBranch?: string
  reason?: string
  /** Set when the decision came from an operator declaration (ADR-056). */
  declaredBranch?: string
  /** True when the declared branch is not a canonical branch for the role. */
  overridden?: boolean
  /** True when the declared branch matched `declaredPatterns` (no warning). */
  patternMatched?: boolean
}

// Canonical-state records consulted when enriching a branch context with
// human-readable names. Structural subset — any canonical state satisfies it.
export type ExecutionNameRecords = {
  missions?: Record<string, { name?: string; status?: string; executionBranch?: string } | undefined>
  expeditions?: Record<
    string,
    { name?: string; missionId?: string; status?: string; executionBranch?: string } | undefined
  >
}

// Single source of name enrichment for candidate resolution: fills missing
// mission/expedition names from canonical state records so every layer —
// the ExecutionGate phase and the CLI fail-fast guard alike — resolves an
// identical candidate set (preferred slug form + legacy raw-ID form).
export function enrichExecutionBranchContext(
  role: "mission" | "expedition",
  requestId: string,
  records: ExecutionNameRecords | null | undefined,
  base?: ExecutionBranchContext,
): ExecutionBranchContext {
  if (role === "mission") {
    return {
      ...base,
      missionId: requestId,
      missionName: base?.missionName ?? records?.missions?.[requestId]?.name,
      declaredBranch: base?.declaredBranch ?? records?.missions?.[requestId]?.executionBranch,
    }
  }
  const expedition = records?.expeditions?.[requestId]
  const missionId = base?.missionId ?? String(expedition?.missionId ?? "")
  return {
    ...base,
    expeditionId: requestId,
    missionId: missionId || undefined,
    expeditionName: base?.expeditionName ?? expedition?.name,
    missionName: base?.missionName ?? (missionId ? records?.missions?.[missionId]?.name : undefined),
    // ADR-056: a recorded binding is consulted before the taxonomy, so the
    // resolution survives replays and later commands can omit --branch.
    declaredBranch:
      base?.declaredBranch ??
      expedition?.executionBranch ??
      (missionId ? records?.missions?.[missionId]?.executionBranch : undefined),
  }
}

function defaultBranchPolicy(): BranchPolicy {
  return {
    mode: "off",
    strategy: "featured",
    allowChoreOnMain: false,
    choreCapabilities: [],
    declaredPatterns: [],
  }
}

/**
 * Glob-style match for `declaredPatterns` (ADR-056 §2.4). `*` matches any run
 * of characters, including `/`; everything else is literal.
 */
export function matchesDeclaredBranchPattern(
  branch: string,
  patterns: readonly string[] | undefined | null,
): boolean {
  const list = Array.isArray(patterns) ? patterns : []
  return list.some((pattern) => {
    if (typeof pattern !== "string" || pattern.length === 0) return false
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
    return new RegExp(`^${escaped}$`).test(branch)
  })
}

/**
 * A live entity that already owns a branch (ADR-056 §2.3). Exclusivity is per
 * role: a live mission binding does not block its expeditions from declaring
 * the same branch (the operator-owned workspace case).
 */
export function findLiveBranchBindingOwner(
  records: ExecutionNameRecords | null | undefined,
  role: "mission" | "expedition",
  entityId: string,
  branch: string,
): { kind: "mission" | "expedition"; id: string } | undefined {
  if (!branch) return undefined
  if (role === "mission") {
    const live = new Set(["projected", "draft", "active"])
    for (const [id, mission] of Object.entries(records?.missions ?? {})) {
      if (!mission || mission.executionBranch !== branch || id === entityId) continue
      if (!live.has(String((mission as { status?: string }).status))) continue
      return { kind: "mission", id }
    }
    return undefined
  }
  const live = new Set(["draft", "approved", "committed", "executing", "paused"])
  for (const [id, expedition] of Object.entries(records?.expeditions ?? {})) {
    if (!expedition || expedition.executionBranch !== branch || id === entityId) continue
    if (!live.has(String((expedition as { status?: string }).status))) continue
    return { kind: "expedition", id }
  }
  return undefined
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
  if (Array.isArray(policy.declaredPatterns)) {
    config.declaredPatterns = policy.declaredPatterns.filter((p: unknown): p is string => typeof p === "string")
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

  // Operator-declared execution branch (ADR-056 §2.1). The binding is
  // consulted before the naming taxonomy: the convention becomes a default
  // rather than a law, and the override is explicit — never silent.
  if (context.declaredBranch) {
    const declared = context.declaredBranch
    // A binding is not a bypass: the checked-out branch must be the declared
    // one. Resolution then comes from the binding, not from the name taxonomy.
    if (currentBranch !== declared) {
      return {
        ...base,
        ok: false,
        requiredBranch: declared,
        declaredBranch: declared,
        reason: `${role} execution is bound to ${declared} (ADR-056); current branch is ${currentBranch}`,
      }
    }
    const canonical =
      role === "mission" || role === "expedition"
        ? isCanonicalBranchForRole(role, declared, {
            missionId: context.missionId,
            missionName: context.missionName,
            expeditionId: role === "expedition" ? context.expeditionId : undefined,
            expeditionName: role === "expedition" ? context.expeditionName : undefined,
          })
        : false
    const patternMatched = matchesDeclaredBranchPattern(declared, policy.declaredPatterns)
    if (canonical) {
      return {
        ...base,
        requiredBranch: declared,
        declaredBranch: declared,
        overridden: false,
        patternMatched,
        reason: `Declared ${role} branch ${declared} is canonical`,
      }
    }
    return {
      ...base,
      requiredBranch: declared,
      declaredBranch: declared,
      overridden: true,
      patternMatched,
      reason: patternMatched
        ? `Declared branch ${declared} matches a configured declaredPattern`
        : `BRANCH_POLICY_OVERRIDDEN: declared branch ${declared} is not a canonical ${role} branch; recorded as an operator decision`,
    }
  }

  // Mission/expedition roles require a canonical branch matching their id.
  const branchType = classifyBranch(currentBranch)
  const canonicalNames = canonicalBranchCandidates(role === "mission" ? "mission" : "expedition", {
    missionId: context.missionId,
    missionName: context.missionName,
    expeditionId: role === "expedition" ? context.expeditionId : undefined,
    expeditionName: role === "expedition" ? context.expeditionName : undefined,
  })
  const requiredBranch = canonicalNames[0]

  if (branchType === role && canonicalNames.includes(currentBranch)) {
    return {
      ...base,
      ok: true,
      requiredBranch,
      reason: `On canonical ${role} branch ${currentBranch}`,
    }
  }

  const ruleValidation = validateBranchName(requiredBranch, {
    missionId: context.missionId,
    expeditionId: role === "expedition" ? context.expeditionId : undefined,
  })
  // Cite every accepted canonical form so the operator can land on any
  // of them; the first candidate remains the preferred checkout target.
  const reason = ruleValidation.valid
    ? `${role} execution must run on ${canonicalNames.join(" or ")}; current branch is ${currentBranch}`
    : `Cannot derive canonical branch: ${ruleValidation.errors.join("; ")}`

  return { ...base, ok: false, requiredBranch, reason }
}