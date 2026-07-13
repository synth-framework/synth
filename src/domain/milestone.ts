// ============================================================
// DOMAIN: Milestone Logic (Pure)
// ============================================================
// Zero side effects. Zero IO. Pure deterministic state transitions.
// ============================================================

import type { Milestone, DomainContext } from "../types/index.js"

/** Create a new milestone */
export function createMilestone(
  id: string,
  planId: string,
  name: string,
  _ctx: DomainContext,
  overrides: Partial<Milestone> = {}
): Milestone {
  return {
    id,
    planId,
    name,
    workItems: [],
    completionCriteria: "",
    status: "pending",
    ...overrides,
  }
}

/** Start a milestone */
export function startMilestone(milestone: Milestone, _ctx: DomainContext): Milestone {
  if (milestone.status !== "pending") {
    throw new Error("INVARIANT_VIOLATION: can only start a pending milestone")
  }
  return { ...milestone, status: "in_progress" }
}

/** Complete a milestone */
export function completeMilestone(milestone: Milestone, _ctx: DomainContext): Milestone {
  if (milestone.status !== "in_progress") {
    throw new Error("INVARIANT_VIOLATION: can only complete an in-progress milestone")
  }
  return { ...milestone, status: "completed" }
}

/** Add a work item to a milestone */
export function addWorkItemToMilestone(milestone: Milestone, workItemId: string): Milestone {
  if (milestone.workItems.includes(workItemId)) {
    return milestone
  }
  return {
    ...milestone,
    workItems: [...milestone.workItems, workItemId],
  }
}

/** Check if all work items in milestone are complete */
export function allWorkItemsComplete(
  milestone: Milestone,
  workItemStatuses: Record<string, string>
): boolean {
  if (milestone.workItems.length === 0) return false
  return milestone.workItems.every((id) => workItemStatuses[id] === "complete")
}

/** Validate milestone invariants */
export function validateMilestoneInvariants(milestone: Milestone): string[] {
  const violations: string[] = []

  if (!milestone.id || milestone.id.length === 0) {
    violations.push("Milestone must have a non-empty id")
  }

  if (!milestone.planId || milestone.planId.length === 0) {
    violations.push("Milestone must belong to a plan")
  }

  if (!milestone.name || milestone.name.length === 0) {
    violations.push("Milestone must have a name")
  }

  if (!["pending", "in_progress", "completed"].includes(milestone.status)) {
    violations.push(`Invalid milestone status: ${milestone.status}`)
  }

  return violations
}
