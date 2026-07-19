// ============================================================
// REPOSITORY: Branch Taxonomy
// ============================================================
// Defines canonical branch types and naming rules for SYNTH
// repositories. Every governed branch must map to one of these
// types.
// ============================================================

export type BranchType = "main" | "release" | "mission" | "expedition" | "hotfix"

export const BRANCH_TYPES: BranchType[] = ["main", "release", "mission", "expedition", "hotfix"]

export type BranchNamingRule = {
  type: BranchType
  prefix: string
  requiresMissionId: boolean
  requiresExpeditionId: boolean
  allowedBaseBranches: BranchType[]
}

export const BRANCH_RULES: Record<BranchType, BranchNamingRule> = {
  main: {
    type: "main",
    prefix: "main",
    requiresMissionId: false,
    requiresExpeditionId: false,
    allowedBaseBranches: [],
  },
  release: {
    type: "release",
    prefix: "release",
    requiresMissionId: false,
    requiresExpeditionId: false,
    allowedBaseBranches: ["main"],
  },
  mission: {
    type: "mission",
    prefix: "mission",
    requiresMissionId: true,
    requiresExpeditionId: false,
    allowedBaseBranches: ["main", "release"],
  },
  expedition: {
    type: "expedition",
    prefix: "expedition",
    requiresMissionId: true,
    requiresExpeditionId: true,
    allowedBaseBranches: ["main", "release", "mission"],
  },
  hotfix: {
    type: "hotfix",
    prefix: "hotfix",
    requiresMissionId: false,
    requiresExpeditionId: false,
    allowedBaseBranches: ["main", "release"],
  },
}

export function classifyBranch(name: string): BranchType | undefined {
  for (const type of BRANCH_TYPES) {
    const rule = BRANCH_RULES[type]
    if (type === "main" && name === rule.prefix) return type
    if (name.startsWith(`${rule.prefix}/`)) return type
  }
  return undefined
}

export function validateBranchName(
  name: string,
  options: { missionId?: string; expeditionId?: string } = {},
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const type = classifyBranch(name)

  if (!type) {
    errors.push(`Branch name "${name}" does not match any canonical branch type`)
    return { valid: false, errors }
  }

  const rule = BRANCH_RULES[type]

  if (rule.requiresMissionId && !options.missionId) {
    errors.push(`Branch type "${type}" requires a missionId`)
  }

  if (rule.requiresExpeditionId && !options.expeditionId) {
    errors.push(`Branch type "${type}" requires an expeditionId`)
  }

  return { valid: errors.length === 0, errors }
}

export function generateBranchName(
  type: BranchType,
  options: { missionId?: string; expeditionId?: string; suffix?: string } = {},
): string {
  const rule = BRANCH_RULES[type]
  const parts = [rule.prefix]

  if (options.missionId) parts.push(options.missionId)
  if (options.expeditionId) parts.push(options.expeditionId)
  if (options.suffix) parts.push(options.suffix)

  return type === "main" ? rule.prefix : parts.join("/")
}
