// ============================================================
// DOMAIN: Project Logic (Pure)
// ============================================================
// Zero side effects. Zero IO. Pure deterministic state transitions.
// ============================================================

import type { Project, DomainContext } from "../types/index.js"

/** Create a new project */
export function createProject(id: string, name: string, goal: string, _ctx: DomainContext, overrides: Partial<Project> = {}): Project {
  return {
    id,
    name,
    goal,
    plans: [],
    status: "active",
    ...overrides,
  }
}

/** Archive a project */
export function archiveProject(project: Project): Project {
  if (project.status === "terminated") {
    throw new Error("INVARIANT_VIOLATION: cannot archive a terminated project")
  }
  return { ...project, status: "archived" }
}

/** Terminate a project */
export function terminateProject(project: Project): Project {
  return { ...project, status: "terminated" }
}

/** Add a plan to a project */
export function addPlanToProject(project: Project, planId: string): Project {
  if (project.plans.includes(planId)) {
    return project
  }
  return {
    ...project,
    plans: [...project.plans, planId],
  }
}

/** Validate project invariants */
export function validateProjectInvariants(project: Project): string[] {
  const violations: string[] = []

  if (!project.id || project.id.length === 0) {
    violations.push("Project must have a non-empty id")
  }

  if (!project.name || project.name.length === 0) {
    violations.push("Project must have a name")
  }

  if (!project.goal || project.goal.length === 0) {
    violations.push("Project must have a goal specification")
  }

  if (!["active", "archived", "terminated"].includes(project.status)) {
    violations.push(`Invalid project status: ${project.status}`)
  }

  return violations
}
