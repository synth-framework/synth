// ============================================================
// REPOSITORY: Branch Taxonomy
// ============================================================
// Defines canonical branch types and naming rules for SYNTH
// repositories. Every governed branch must map to one of these
// types.
//
// Naming strategy (human-readable, deterministic, traceable):
//   mission:    mission/<mission-slug>-<missionId[0:7]>
//   expedition: expedition/<mission-slug>/<expedition-slug>-<expeditionId[0:7]>
// The short ID suffix preserves uniqueness and traceability while the
// slug keeps the branch readable. When names are unavailable, the
// generator falls back to the legacy raw-ID form so existing branches
// and enforcement keep resolving deterministically.
// ============================================================

export type BranchType = "main" | "release" | "mission" | "expedition" | "hotfix"

const BRANCH_TYPES: BranchType[] = ["main", "release", "mission", "expedition", "hotfix"]

export type BranchNamingRule = {
  type: BranchType
  prefix: string
  requiresMissionId: boolean
  requiresExpeditionId: boolean
  allowedBaseBranches: BranchType[]
}

const BRANCH_RULES: Record<BranchType, BranchNamingRule> = {
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

/**
 * Convert a human-readable name into a deterministic URL-safe slug.
 * Lowercases, collapses whitespace/non-alphanumerics to single hyphens,
 * and trims leading/trailing hyphens. Reference-safe: always returns a
 * non-empty ASCII string (falls back to "untitled" for empty input).
 */
export function slugify(name: string): string {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug.length > 0 ? slug : "untitled"
}

/** Number of leading characters of an id included for traceability. */
export const ID_SUFFIX_LENGTH = 7

export type BranchNameOptions = {
  missionId?: string
  expeditionId?: string
  missionName?: string
  expeditionName?: string
  suffix?: string
}

/**
 * All canonical names a governed branch of this type may take for the
 * given context. The slug form is preferred (first). The legacy raw-ID form
 * is the same generator invoked without names — it is retained as a distinct
 * candidate only for branches created before the human-readable naming
 * strategy. Enforcement matches against any of them.
 */
export function canonicalBranchCandidates(
  type: BranchType,
  options: BranchNameOptions = {},
): string[] {
  const slugName = generateBranchName(type, options)
  const legacyName = generateBranchName(type, {
    missionId: options.missionId,
    expeditionId: options.expeditionId,
    suffix: options.suffix,
  })
  const candidates = [slugName]
  if (legacyName && legacyName !== slugName) candidates.push(legacyName)
  return candidates
}

/**
 * Named mission/expedition records as the single branch-name source. Clients
 * that hold these records (from canonical state) compose branch names through
 * this entry point; branch creation receives the name and never re-composes.
 */
export type BranchNameSource = {
  mission?: { id?: string; name?: string }
  expedition?: { id?: string; name?: string }
}

/**
 * Single source of truth for a governed branch name. Composes the canonical
 * slug form from the mission/expedition records; when names are unavailable
 * it falls back to the legacy raw-ID form. Guaranteed non-empty.
 */
export function branchNameCandidates(
  type: BranchType,
  source: BranchNameSource = {},
): string[] {
  return canonicalBranchCandidates(type, {
    missionId: source.mission?.id,
    missionName: source.mission?.name,
    expeditionId: source.expedition?.id,
    expeditionName: source.expedition?.name,
  })
}

function segment(id: string, name?: string): string {
  return typeof name === "string" && name.length > 0
    ? `${slugify(name)}-${id.slice(0, ID_SUFFIX_LENGTH)}`
    : id
}

export function generateBranchName(
  type: BranchType,
  options: BranchNameOptions = {},
): string {
  const rule = BRANCH_RULES[type]
  const parts = [rule.prefix]

  if (type === "main") return rule.prefix

  if (options.expeditionId && options.missionId && rule.type === "expedition") {
    parts.push(segment(options.missionId, options.missionName))
    parts.push(segment(options.expeditionId, options.expeditionName))
  } else if (options.missionId && rule.type === "mission") {
    parts.push(segment(options.missionId, options.missionName))
  } else {
    if (options.missionId) parts.push(options.missionId)
    if (options.expeditionId) parts.push(options.expeditionId)
  }

  if (options.suffix) parts.push(options.suffix)

  return parts.join("/")
}
