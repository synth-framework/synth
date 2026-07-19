// ============================================================
// REPOSITORY: Governance
// ============================================================
// Core logic for repository state machine, promotion validation,
// and semantic version inference.
// ============================================================

import type { CanonicalState, Mission, Expedition, Decision } from "../types/index.js"

export type RepositoryLifecycle =
  | "uninitialized"
  | "initialized"
  | "branch-created"
  | "promotion-proposed"
  | "promotion-approved"
  | "merged"
  | "released"

export type VersionStrategy = "semver" | "calver" | "build" | "custom"

export function getRepositoryLifecycle(state: CanonicalState): RepositoryLifecycle {
  return state.repository?.lifecycle || "uninitialized"
}

export function inferVersionBump(state: CanonicalState): "major" | "minor" | "patch" | undefined {
  if (!state.repository) return undefined

  const missions = Object.values(state.missions)
  const expeditions = Object.values(state.expeditions)
  const decisions = Object.values(state.decisions)

  const hasBreakingChange = decisions.some(isBreakingChange)
  const hasNewCapability = missions.some(hasNewCapabilityObjective) || expeditions.some(hasNewCapabilityObjective)

  if (hasBreakingChange) return "major"
  if (hasNewCapability) return "minor"
  if (expeditions.some((e) => e.status === "completed")) return "patch"

  return undefined
}

function isBreakingChange(decision: Decision): boolean {
  const title = decision.title.toLowerCase()
  return title.includes("breaking") || title.includes("deprecat")
}

function hasNewCapabilityObjective(entity: Mission | Expedition): boolean {
  const text = JSON.stringify(entity).toLowerCase()
  return text.includes("new capability") || text.includes("add capability") || text.includes("introduce")
}

export function nextSemanticVersion(
  current: string,
  bump: "major" | "minor" | "patch",
): string {
  const parts = current.replace(/^v/, "").split(".")
  const major = Number(parts[0] || 0)
  const minor = Number(parts[1] || 0)
  const patch = Number(parts[2] || 0)

  switch (bump) {
    case "major":
      return `${major + 1}.0.0`
    case "minor":
      return `${major}.${minor + 1}.0`
    case "patch":
      return `${major}.${minor}.${patch + 1}`
  }
}

export function validatePromotion(
  state: CanonicalState,
  from: string,
  to: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const lifecycle = getRepositoryLifecycle(state)

  if (lifecycle === "uninitialized") {
    errors.push("Repository is not initialized")
  }

  if (!state.repository?.pullRequests || Object.keys(state.repository.pullRequests).length === 0) {
    errors.push("No pull request exists for promotion")
  }

  const allowedTransitions: Record<RepositoryLifecycle, RepositoryLifecycle[]> = {
    uninitialized: ["initialized"],
    initialized: ["branch-created"],
    "branch-created": ["promotion-proposed"],
    "promotion-proposed": ["promotion-approved"],
    "promotion-approved": ["merged"],
    merged: ["released"],
    released: ["initialized"],
  }

  if (!allowedTransitions[lifecycle]?.includes(to as RepositoryLifecycle)) {
    errors.push(`Invalid promotion transition from ${lifecycle} to ${to}`)
  }

  return { valid: errors.length === 0, errors }
}

export function formatReleaseNotes(state: CanonicalState): string {
  const missions = Object.values(state.missions)
    .filter((m) => m.status === "active" || m.status === "completed")
    .map((m) => `- ${m.name}: ${m.purpose}`)

  const expeditions = Object.values(state.expeditions)
    .filter((e) => e.status === "completed")
    .map((e) => `- ${e.name}: ${e.goal}`)

  const lines = ["## Missions", ...missions, "", "## Expeditions", ...expeditions]
  return lines.join("\n")
}
