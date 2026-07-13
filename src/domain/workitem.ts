// ============================================================
// DOMAIN: WorkItem Logic (Pure)
// ============================================================
// Zero side effects. Zero IO. Pure deterministic state transitions.
// Canonical execution entity per EXP-TERM-001 and Ubiquitous Language.
// ============================================================

import type { WorkItem, CanonicalState, DomainContext } from "../types/index.js"

/** Create a new work item with default values */
export function createWorkItem(id: string, ctx: DomainContext, overrides: Partial<WorkItem> = {}): WorkItem {
  const now = ctx.timestamp
  return {
    id,
    status: "idle",
    dependencies: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Pure transition: start a work item */
export function startWorkItem(workItem: WorkItem, ctx: DomainContext): WorkItem {
  if (workItem.status === "active") {
    return workItem // already active, no change
  }
  if (workItem.status === "complete") {
    throw new Error("INVARIANT_VIOLATION: cannot start a completed work item")
  }
  return {
    ...workItem,
    status: "active",
    updatedAt: ctx.timestamp,
  }
}

/** Pure transition: complete a work item */
export function completeWorkItem(workItem: WorkItem, ctx: DomainContext): WorkItem {
  if (workItem.status !== "active") {
    throw new Error("INVARIANT_VIOLATION: can only complete an active work item")
  }
  return {
    ...workItem,
    status: "complete",
    updatedAt: ctx.timestamp,
  }
}

/** Pure transition: block a work item */
export function blockWorkItem(workItem: WorkItem, reason: string | undefined, ctx: DomainContext): WorkItem {
  return {
    ...workItem,
    status: "blocked",
    metadata: { ...workItem.metadata, blockReason: reason },
    updatedAt: ctx.timestamp,
  }
}

/** Pure transition: reset a work item to idle */
export function resetWorkItem(workItem: WorkItem, ctx: DomainContext): WorkItem {
  if (workItem.status === "complete") {
    throw new Error("INVARIANT_VIOLATION: cannot reset a completed work item")
  }
  return {
    ...workItem,
    status: "idle",
    updatedAt: ctx.timestamp,
  }
}

/** Check if all dependencies are satisfied */
export function dependenciesSatisfied(workItem: WorkItem, state: CanonicalState): boolean {
  return workItem.dependencies.every((depId) => {
    const dep = state.workItems[depId]
    return dep?.status === "complete"
  })
}

/** Validate work item invariants */
export function validateWorkItemInvariants(workItem: WorkItem): string[] {
  const violations: string[] = []

  if (!workItem.id || workItem.id.length === 0) {
    violations.push("WorkItem must have a non-empty id")
  }

  if (!["idle", "active", "blocked", "complete"].includes(workItem.status)) {
    violations.push(`Invalid work item status: ${workItem.status}`)
  }

  if (workItem.createdAt <= 0) {
    violations.push("WorkItem must have a valid createdAt timestamp")
  }

  return violations
}
