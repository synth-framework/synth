// ============================================================
// DOMAIN: Plan Logic (Pure)
// ============================================================

import type { Plan, DomainContext } from "../types/index.js"

export function createPlan(id: string, name: string, _ctx: DomainContext, overrides: Partial<Plan> = {}): Plan {
  return {
    id,
    name,
    status: "draft",
    milestones: [],
    dependencies: [],
    metadata: {},
    ...overrides,
  }
}

export function activatePlan(plan: Plan, _ctx: DomainContext): Plan {
  if (plan.status !== "draft") {
    throw new Error("INVARIANT_VIOLATION: can only activate a draft plan")
  }
  return { ...plan, status: "active" }
}

export function completePlan(plan: Plan, _ctx: DomainContext): Plan {
  if (plan.status !== "active") {
    throw new Error("INVARIANT_VIOLATION: can only complete an active plan")
  }
  return { ...plan, status: "completed" }
}

export function deprecatePlan(plan: Plan): Plan {
  if (plan.status === "completed" || plan.status === "deprecated") {
    throw new Error("INVARIANT_VIOLATION: cannot deprecate a completed or already deprecated plan")
  }
  return { ...plan, status: "deprecated" }
}

export function addMilestone(plan: Plan, milestoneId: string): Plan {
  if (plan.milestones.includes(milestoneId)) return plan
  return { ...plan, milestones: [...plan.milestones, milestoneId] }
}

export function isAcyclic(plan: Plan, allPlans: Record<string, Plan>): boolean {
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function dfs(planId: string): boolean {
    visited.add(planId)
    recursionStack.add(planId)
    const currentPlan = allPlans[planId]
    if (!currentPlan) return true
    for (const depId of currentPlan.dependencies) {
      if (!visited.has(depId)) {
        if (!dfs(depId)) return false
      } else if (recursionStack.has(depId)) {
        return false
      }
    }
    recursionStack.delete(planId)
    return true
  }

  return dfs(plan.id)
}

export function validatePlanInvariants(plan: Plan): string[] {
  const violations: string[] = []
  if (!plan.id || plan.id.length === 0) violations.push("Plan must have a non-empty id")
  if (!plan.name || plan.name.length === 0) violations.push("Plan must have a name")
  if (!["draft", "active", "completed", "deprecated"].includes(plan.status)) {
    violations.push(`Invalid plan status: ${plan.status}`)
  }
  return violations
}
