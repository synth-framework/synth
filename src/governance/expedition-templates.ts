// ============================================================
// GOVERNANCE: Expedition Template Catalog
// =========================================================
// Pre-defined expedition templates for repetitive work types.
// Templates reduce planning friction by providing a pre-filled goal
// and acceptance criteria for common expedition categories.
// ============================================================

export type ExpeditionTemplate = {
  id: string
  name: string
  description: string
  goal: string
  defaultScope?: string[]
  acceptanceCriteria: string[]
}

export const EXPEDITION_TEMPLATES: ExpeditionTemplate[] = [
  {
    id: "ci",
    name: "Continuous Integration",
    description: "Add or harden CI pipeline steps, checks, or workflow automation.",
    goal: "Establish a reliable continuous integration pipeline that validates every change before merge.",
    defaultScope: [".github/workflows/*", "scripts/ci/*"],
    acceptanceCriteria: [
      "Pipeline runs on every pull request",
      "Required checks block merge on failure",
      "Pipeline failure produces actionable output",
    ],
  },
  {
    id: "deployment",
    name: "Deployment",
    description: "Implement or improve deployment automation, staging, or release mechanics.",
    goal: "Deploy the system to the target environment safely, repeatably, and with rollback capability.",
    defaultScope: ["scripts/deploy/*", "infrastructure/*", "distribution/*"],
    acceptanceCriteria: [
      "Deployment is scripted and documented",
      "Staging environment reflects production configuration",
      "Rollback path is verified",
    ],
  },
  {
    id: "observability",
    name: "Observability",
    description: "Add logging, metrics, tracing, alerting, or health checks.",
    goal: "Make the system's behavior observable in production so issues are detected and diagnosed quickly.",
    defaultScope: ["src/observability/**", "scripts/health/*"],
    acceptanceCriteria: [
      "Key workflows emit traceable events",
      "Critical failures trigger alerts",
      "Dashboards or queries answer common diagnostic questions",
    ],
  },
  {
    id: "documentation",
    name: "Documentation",
    description: "Write or update operator, architecture, or API documentation.",
    goal: "Document the change so operators and future agents can understand and maintain it.",
    defaultScope: ["docs/**", "README*"],
    acceptanceCriteria: [
      "Documentation reflects the current implementation",
      "New operator can follow the documented steps",
      "Public vocabulary and conventions are preserved",
    ],
  },
]

export function findExpeditionTemplate(id: string): ExpeditionTemplate | undefined {
  return EXPEDITION_TEMPLATES.find((t) => t.id === id)
}
