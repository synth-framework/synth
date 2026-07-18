// ============================================================
// INITIALIZATION: ProjectModel Contract
// ============================================================
// The governed intermediate representation that every
// InitializationAdapter converges on. This is the semantic
// attractor established during project initialization.
//
// The ProjectModel intentionally contains no implementation
// details (framework, language, database, platform, etc.).
// Those are produced by later expeditions, not invented during
// initialization.
// ============================================================

export const PROJECT_MODEL_SCHEMA_VERSION = "1.0.0"

export type LifecycleStage =
  | "unknown"
  | "initialized"
  | "specification"
  | "design"
  | "implementation"
  | "operation"
  | "maintenance"
  | "archive"

export type ConfidenceLabel = "none" | "low" | "medium" | "high"

export type ConfidenceScore = {
  value: number
  label: ConfidenceLabel
}

export type ProjectIdentity = {
  id: string
  name: string
  displayName?: string
}

export type ProjectIntent = {
  statement: string
  targetOutcomes?: string[]
}

export type DomainModel = {
  name: string
  description?: string
}

export type Constraint = {
  type: string
  statement: string
}

export type EvidenceReference = {
  adapterId: string
  adapterVersion: string
  sourceType: string
  collectedAt: string
  summary: string
}

export interface ProjectModel {
  schemaVersion: typeof PROJECT_MODEL_SCHEMA_VERSION
  identity: ProjectIdentity
  intent: ProjectIntent
  lifecycleStage: LifecycleStage
  domains: DomainModel[]
  constraints: Constraint[]
  evidence: EvidenceReference[]
  confidence: ConfidenceScore
}

// ============================================================
// Runtime contract guards
// ============================================================

const PROHIBITED_EVIDENCE_KEYS = new Set([
  "framework",
  "language",
  "database",
  "platform",
  "deployment",
  "hosting",
  "runtime",
  "architecture",
  "repositoryStructure",
])

const GOVERNANCE_KEYS = new Set([
  "expedition",
  "expeditions",
  "mission",
  "missions",
  "workItem",
  "workItems",
  "program",
  "programs",
])

function hasProhibitedKey(input: Record<string, unknown>, keys: Set<string>): string | undefined {
  for (const key of Object.keys(input)) {
    if (keys.has(key)) return key
  }
  return undefined
}

export type ProjectModelInput = {
  identity: ProjectIdentity
  intent?: Partial<ProjectIntent> | string
  lifecycleStage?: LifecycleStage
  domains?: DomainModel[]
  constraints?: Constraint[]
  evidence?: EvidenceReference[]
  confidence?: Partial<ConfidenceScore>
  metadata?: Record<string, unknown>
}

export class ProjectModelError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProjectModelError"
  }
}

/**
 * Construct a governed ProjectModel from normalized evidence.
 *
 * Enforces the contract-only invariants:
 *  - No implementation assumptions may be introduced.
 *  - No missions, expeditions, or work items may be created.
 *  - Missing evidence remains explicitly unknown.
 */
export function createProjectModel(input: ProjectModelInput): ProjectModel {
  if (input.metadata) {
    const prohibited = hasProhibitedKey(input.metadata, PROHIBITED_EVIDENCE_KEYS)
    if (prohibited) {
      throw new ProjectModelError(
        `Implementation assumption detected in metadata: ${prohibited}. ` +
          "Initialization must not introduce framework, language, database, platform, or deployment details.",
      )
    }

    const governance = hasProhibitedKey(input.metadata, GOVERNANCE_KEYS)
    if (governance) {
      throw new ProjectModelError(
        `Governance artifact detected in metadata: ${governance}. ` +
          "Initialization cannot create expeditions, missions, or work items.",
      )
    }
  }

  const intentStatement =
    typeof input.intent === "string"
      ? input.intent
      : (input.intent?.statement ?? "")

  const targetOutcomes =
    typeof input.intent === "string" ? [] : (input.intent?.targetOutcomes ?? [])

  const lifecycleStage: LifecycleStage = input.lifecycleStage ?? "unknown"

  return {
    schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
    identity: input.identity,
    intent: {
      statement: intentStatement || "unknown",
      targetOutcomes,
    },
    lifecycleStage,
    domains: input.domains ?? [],
    constraints: input.constraints ?? [],
    evidence: input.evidence ?? [],
    confidence: {
      value: input.confidence?.value ?? 0,
      label: input.confidence?.label ?? "none",
    },
  }
}

function sorted<T>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aJson = JSON.stringify(a)
    const bJson = JSON.stringify(b)
    return aJson.localeCompare(bJson)
  })
}

/**
 * Determine whether two ProjectModel instances are semantically equivalent.
 *
 * Equivalence ignores provenance (evidence references) and compares the
 * governed interpretation: identity, intent, lifecycle stage, domains, and
 * constraints. This is the testable form of the semantic equivalence
 * invariant: different input sources with the same intent must converge to
 * an equivalent model.
 */
export function areProjectModelsEquivalent(
  a: ProjectModel,
  b: ProjectModel,
): boolean {
  if (a.identity.id !== b.identity.id) return false
  if (a.identity.name !== b.identity.name) return false
  if (a.lifecycleStage !== b.lifecycleStage) return false
  if (a.intent.statement !== b.intent.statement) return false
  if (JSON.stringify(sorted(a.intent.targetOutcomes ?? [])) !== JSON.stringify(sorted(b.intent.targetOutcomes ?? []))) {
    return false
  }
  if (JSON.stringify(sorted(a.domains)) !== JSON.stringify(sorted(b.domains))) {
    return false
  }
  if (
    JSON.stringify(sorted(a.constraints)) !==
    JSON.stringify(sorted(b.constraints))
  ) {
    return false
  }
  return true
}
