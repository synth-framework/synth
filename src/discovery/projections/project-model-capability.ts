// ============================================================
// DISCOVERY PROJECTION CAPABILITY: ProjectModel
// ============================================================
// Projects a ProjectModel from the EvidenceGraph using a set of
// discrete, composable inference rules.
//
// Contract:
//   Input:  EvidenceGraph, findings projection output, declaredIntent?
//   Output: ProjectModel
//   Invariants: Rule-driven inference; deterministic confidence
//               composition; schema validation before return.
//   Failure: Validation failure throws; missing evidence → unknowns.
// ============================================================

import type {
  CapabilityItem,
  ConfidenceRule,
  ConfidenceScore,
  EvidenceClaim,
  EvidenceGraph,
  KnowledgeItem,
  LifecycleStage,
  LifecycleStageValue,
  NamedConfidence,
  NormalizedObservation,
  ProjectIdentity,
  ProjectModel,
  ProjectModelDomain,
  ProjectModelFieldUpdate,
  ProjectModelRule,
  ProjectionCapability,
  ProjectionContext,
} from "../types.js"
import {
  PROJECT_MODEL_LIFECYCLE_VALUES,
  PROJECT_MODEL_SCHEMA_VERSION,
} from "../types.js"
import { createHash } from "crypto"

export const PROJECT_MODEL_CAPABILITY_ID = "discovery:project-model"
export const PROJECT_MODEL_CAPABILITY_VERSION = "1.0.0"
export const PROJECT_MODEL_PROJECTION_TYPE = "project-model"
export const FINDINGS_PROJECTION_TYPE = "findings"

const PROJECT_MODEL_DOMAINS: ProjectModelDomain[] = [
  "identity",
  "lifecycle",
  "language",
  "framework",
  "runtime",
  "capability",
  "knowledge",
  "unknown",
  "metadata",
]

function deterministicConfidence(
  value: number,
  reason: string,
  kind: ConfidenceScore["kind"] = "derived",
): ConfidenceScore {
  let label: ConfidenceScore["label"] = "none"
  if (value >= 0.95) label = "certain"
  else if (value >= 0.8) label = "high"
  else if (value >= 0.5) label = "medium"
  else if (value >= 0.2) label = "low"

  return { value, label, kind, reason }
}

function hasClaim(evidenceGraph: EvidenceGraph, assertion: string): boolean {
  return evidenceGraph.claims.some((claim) => claim.assertion === assertion)
}

function findClaims(evidenceGraph: EvidenceGraph, assertion: string): EvidenceClaim[] {
  return evidenceGraph.claims.filter((claim) => claim.assertion === assertion)
}

function findClaimIds(evidenceGraph: EvidenceGraph, assertion: string): string[] {
  return findClaims(evidenceGraph, assertion).map((claim) => claim.id)
}

function getClaimObservationPayloads(
  evidenceGraph: EvidenceGraph,
  claim: EvidenceClaim,
): Record<string, unknown>[] {
  return claim.observationIds
    .map((id) => {
      const index = evidenceGraph.observationIndex[id]
      return index !== undefined ? evidenceGraph.observations[index] : undefined
    })
    .filter((obs): obs is NormalizedObservation => obs !== undefined)
    .map((obs) => obs.payload ?? {})
}

// -------------------------------------------------------------------------
// Inference rules
// -------------------------------------------------------------------------

function identityRule(): ProjectModelRule {
  return {
    id: "project-model:identity",
    domain: "identity",
    requiredClaims: ["Source directory observed"],
    infer(evidenceGraph) {
      const sourceClaims = findClaims(evidenceGraph, "Source directory observed")
      if (sourceClaims.length === 0) return undefined

      const filesystemSources = sourceClaims
        .map((claim) => claim.source)
        .filter((source) => source.type === "filesystem")

      if (filesystemSources.length === 0) return undefined

      const fsSource = filesystemSources[0] as { type: "filesystem"; path: string }
      const name = fsSource.path.split("/").pop() || fsSource.path
      const identity: ProjectIdentity = { id: name, name }

      return [
        {
          field: "identity",
          value: identity,
          confidence: deterministicConfidence(1.0, "Source directory observed", "deterministic"),
          evidenceClaimIds: sourceClaims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function lifecycleRule(): ProjectModelRule {
  return {
    id: "project-model:lifecycle",
    domain: "lifecycle",
    requiredClaims: [],
    infer(evidenceGraph) {
      const hasImplementation =
        hasClaim(evidenceGraph, "Node.js project manifest present") ||
        hasClaim(evidenceGraph, "Implementation directory observed")
      const hasTests = hasClaim(evidenceGraph, "Tests directory observed")
      const hasDocs = hasClaim(evidenceGraph, "Documentation present")
      const hasArchitecture = hasClaim(evidenceGraph, "Architecture documentation present")

      let stage: LifecycleStage
      let evidenceClaimIds: string[] = []

      if (hasImplementation) {
        evidenceClaimIds = [
          ...findClaimIds(evidenceGraph, "Node.js project manifest present"),
          ...findClaimIds(evidenceGraph, "Implementation directory observed"),
          ...findClaimIds(evidenceGraph, "Tests directory observed"),
        ]
        stage = {
          value: "implementation",
          confidence: deterministicConfidence(
            hasTests ? 0.95 : 0.85,
            hasTests
              ? "Implementation files and tests observed"
              : "Implementation files observed",
          ),
        }
      } else if (hasDocs || hasArchitecture) {
        evidenceClaimIds = [
          ...findClaimIds(evidenceGraph, "Documentation present"),
          ...findClaimIds(evidenceGraph, "Architecture documentation present"),
        ]
        stage = {
          value: "specification",
          confidence: deterministicConfidence(0.8, "Documentation present without implementation"),
        }
      } else {
        evidenceClaimIds = evidenceGraph.claims.map((claim) => claim.id)
        stage = {
          value: "unknown",
          confidence: deterministicConfidence(
            0,
            "Insufficient evidence to determine lifecycle stage",
            "deterministic",
          ),
        }
      }

      return [
        {
          field: "lifecycleStage",
          value: stage,
          confidence: stage.confidence,
          evidenceClaimIds,
        },
      ]
    },
  }
}

function languageRule(): ProjectModelRule {
  return {
    id: "project-model:language",
    domain: "language",
    requiredClaims: ["File extension observed"],
    infer(evidenceGraph) {
      const extensionClaims = findClaims(evidenceGraph, "File extension observed")
      if (extensionClaims.length === 0) return undefined

      const mapping: Record<string, string> = {
        ts: "TypeScript",
        js: "JavaScript",
        mjs: "JavaScript",
        cjs: "JavaScript",
        py: "Python",
        go: "Go",
        rs: "Rust",
        java: "Java",
        kt: "Kotlin",
        rb: "Ruby",
        php: "PHP",
        cs: "C#",
        cpp: "C++",
        c: "C",
        swift: "Swift",
        md: "Markdown",
        json: "JSON",
        yml: "YAML",
        yaml: "YAML",
        sh: "Shell",
      }

      const updates: ProjectModelFieldUpdate[] = []
      const seen = new Set<string>()

      for (const claim of extensionClaims) {
        const payloads = getClaimObservationPayloads(evidenceGraph, claim)
        const extensions = payloads.flatMap(
          (payload) => (payload.extensions as string[] | undefined) ?? [],
        )

        for (const ext of extensions) {
          const language = mapping[ext.toLowerCase()]
          if (language && !seen.has(language)) {
            seen.add(language)
            const named: NamedConfidence = {
              name: language,
              confidence: deterministicConfidence(0.9, `File extension .${ext} observed`),
            }
            updates.push({
              field: language,
              value: named,
              confidence: named.confidence,
              evidenceClaimIds: [claim.id],
            })
          }
        }
      }

      return updates.length > 0 ? updates : undefined
    },
  }
}

function nodeLanguageRule(): ProjectModelRule {
  return {
    id: "project-model:language:node-manifest",
    domain: "language",
    requiredClaims: ["Node.js project manifest present"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Node.js project manifest present")
      const named: NamedConfidence = {
        name: "JavaScript",
        confidence: deterministicConfidence(0.9, "Node.js project manifest observed"),
      }

      return [
        {
          field: "JavaScript",
          value: named,
          confidence: named.confidence,
          evidenceClaimIds: claims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function frameworkRule(): ProjectModelRule {
  return {
    id: "project-model:framework",
    domain: "framework",
    requiredClaims: ["manifest dependencies observed"],
    infer(evidenceGraph) {
      const dependencyClaims = findClaims(evidenceGraph, "manifest dependencies observed")
      if (dependencyClaims.length === 0) return undefined

      const mapping: Record<string, string> = {
        next: "Next.js",
        react: "React",
        express: "Express",
        "@nestjs/core": "NestJS",
        fastify: "Fastify",
        vue: "Vue",
        svelte: "Svelte",
        nuxt: "Nuxt",
      }

      const updates: ProjectModelFieldUpdate[] = []
      const seen = new Set<string>()

      for (const claim of dependencyClaims) {
        const payloads = getClaimObservationPayloads(evidenceGraph, claim)
        const deps = payloads.flatMap(
          (payload) => (payload.dependencies as string[] | undefined) ?? [],
        )

        for (const dep of deps) {
          const framework = mapping[dep]
          if (framework && !seen.has(framework)) {
            seen.add(framework)
            const named: NamedConfidence = {
              name: framework,
              confidence: deterministicConfidence(0.85, `Dependency ${dep} observed in package.json`),
            }
            updates.push({
              field: framework,
              value: named,
              confidence: named.confidence,
              evidenceClaimIds: [claim.id],
            })
          }
        }
      }

      return updates.length > 0 ? updates : undefined
    },
  }
}

function runtimeRule(): ProjectModelRule {
  return {
    id: "project-model:runtime",
    domain: "runtime",
    requiredClaims: ["Node.js project manifest present"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Node.js project manifest present")
      if (claims.length === 0) return undefined

      const named: NamedConfidence = {
        name: "Node.js",
        confidence: deterministicConfidence(0.9, "package.json observed"),
      }

      return [
        {
          field: "Node.js",
          value: named,
          confidence: named.confidence,
          evidenceClaimIds: claims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function testingCapabilityRule(): ProjectModelRule {
  return {
    id: "project-model:capability:testing",
    domain: "capability",
    requiredClaims: ["Tests directory observed"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Tests directory observed")
      if (claims.length === 0) return undefined

      const item: CapabilityItem = {
        name: "testing",
        available: true,
        evidenceClaimIds: claims.map((claim) => claim.id),
      }

      return [
        {
          field: "testing",
          value: item,
          confidence: deterministicConfidence(0.9, "Tests directory observed", "deterministic"),
          evidenceClaimIds: item.evidenceClaimIds,
        },
      ]
    },
  }
}

function documentationCapabilityRule(): ProjectModelRule {
  return {
    id: "project-model:capability:documentation",
    domain: "capability",
    requiredClaims: ["Documentation present"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Documentation present")
      if (claims.length === 0) return undefined

      const item: CapabilityItem = {
        name: "documentation",
        available: true,
        evidenceClaimIds: claims.map((claim) => claim.id),
      }

      return [
        {
          field: "documentation",
          value: item,
          confidence: deterministicConfidence(0.9, "Documentation present", "deterministic"),
          evidenceClaimIds: item.evidenceClaimIds,
        },
      ]
    },
  }
}

function readmeKnowledgeRule(): ProjectModelRule {
  return {
    id: "project-model:knowledge:readme",
    domain: "knowledge",
    requiredClaims: ["Documentation present"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Documentation present")
      if (claims.length === 0) return undefined

      const item: KnowledgeItem = { kind: "readme", path: "README.md" }
      return [
        {
          field: "readme",
          value: item,
          confidence: deterministicConfidence(0.9, "README.md present", "deterministic"),
          evidenceClaimIds: claims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function architectureKnowledgeRule(): ProjectModelRule {
  return {
    id: "project-model:knowledge:architecture",
    domain: "knowledge",
    requiredClaims: ["Architecture documentation present"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Architecture documentation present")
      if (claims.length === 0) return undefined

      const item: KnowledgeItem = { kind: "architecture" }
      return [
        {
          field: "architecture",
          value: item,
          confidence: deterministicConfidence(0.9, "Architecture documentation present", "deterministic"),
          evidenceClaimIds: claims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function docsKnowledgeRule(): ProjectModelRule {
  return {
    id: "project-model:knowledge:docs",
    domain: "knowledge",
    requiredClaims: ["Docs directory observed"],
    infer(evidenceGraph) {
      const claims = findClaims(evidenceGraph, "Docs directory observed")
      if (claims.length === 0) return undefined

      const item: KnowledgeItem = { kind: "docs" }
      return [
        {
          field: "docs",
          value: item,
          confidence: deterministicConfidence(0.9, "Docs directory observed", "deterministic"),
          evidenceClaimIds: claims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function unknownManifestRule(): ProjectModelRule {
  return {
    id: "project-model:unknown:manifest",
    domain: "unknown",
    requiredClaims: ["Source directory observed"],
    infer(evidenceGraph) {
      if (hasClaim(evidenceGraph, "Node.js project manifest present")) return undefined

      const sourceClaims = findClaims(evidenceGraph, "Source directory observed")
      return [
        {
          field: "missing-manifest",
          value: "No package manifest detected; language/ecosystem confidence is low",
          confidence: deterministicConfidence(0.9, "Source directory observed without package manifest", "deterministic"),
          evidenceClaimIds: sourceClaims.map((claim) => claim.id),
        },
      ]
    },
  }
}

function unknownFindingsRule(): ProjectModelRule {
  return {
    id: "project-model:unknown:findings",
    domain: "unknown",
    requiredClaims: ["Source directory observed"],
    infer(_evidenceGraph, priorOutputs) {
      const findings = priorOutputs.findings as { items: unknown[] } | undefined
      if (findings && Array.isArray(findings.items) && findings.items.length > 0) return undefined

      return [
        {
          field: "missing-findings",
          value: "No findings synthesized; may indicate insufficient evidence",
          confidence: deterministicConfidence(0.5, "Findings projection produced no items"),
          evidenceClaimIds: [],
        },
      ]
    },
  }
}

function fileCountRule(): ProjectModelRule {
  return {
    id: "project-model:metadata:file-count",
    domain: "metadata",
    requiredClaims: [],
    infer(evidenceGraph) {
      const count = evidenceGraph.observations.filter((observation) => observation.fact === "file exists")
        .length

      return [
        {
          field: "fileCount",
          value: count,
          confidence: deterministicConfidence(
            1.0,
            `${count} file existence observation${count === 1 ? "" : "s"}`,
            "deterministic",
          ),
          evidenceClaimIds: [],
        },
      ]
    },
  }
}

function packageManagerRule(): ProjectModelRule {
  return {
    id: "project-model:metadata:package-manager",
    domain: "metadata",
    requiredClaims: ["Source directory observed"],
    infer(evidenceGraph) {
      const manifestObservations = evidenceGraph.observations.filter(
        (observation) => observation.fact === "manifest detected",
      )
      if (manifestObservations.length === 0) return undefined

      const manifestTypes = new Set(
        manifestObservations.map((observation) => observation.payload?.type as string),
      )

      let name: string | undefined
      if (manifestTypes.has("node")) {
        name = "npm"
      } else if (manifestTypes.has("python")) {
        name = "pip/poetry"
      } else if (manifestTypes.has("cargo")) {
        name = "cargo"
      }

      if (!name) return undefined

      const sourceClaims = findClaimIds(evidenceGraph, "Source directory observed")
      const named: NamedConfidence = {
        name,
        confidence: deterministicConfidence(1.0, `${name} manifest detected`, "deterministic"),
      }

      return [
        {
          field: "packageManager",
          value: named,
          confidence: named.confidence,
          evidenceClaimIds: sourceClaims,
        },
      ]
    },
  }
}

// -------------------------------------------------------------------------
// Rule application and confidence composition
// -------------------------------------------------------------------------

function applyRulesForDomain(
  domain: ProjectModelDomain,
  rules: ProjectModelRule[],
  confidenceRules: ConfidenceRule[],
  evidenceGraph: EvidenceGraph,
  priorOutputs: Record<string, unknown>,
): ProjectModelFieldUpdate[] {
  const composedUpdates: ProjectModelFieldUpdate[] = []

  for (const rule of rules) {
    if (rule.domain !== domain) continue

    const requiredSatisfied = rule.requiredClaims.every((assertion) =>
      hasClaim(evidenceGraph, assertion),
    )
    if (!requiredSatisfied) continue

    const updates = rule.infer(evidenceGraph, priorOutputs)
    if (updates) {
      composedUpdates.push(...updates)
    }
  }

  const finalUpdates: ProjectModelFieldUpdate[] = []
  for (const update of composedUpdates) {
    const confidenceRule = confidenceRules.find((rule) => rule.appliesTo === domain)
    if (confidenceRule) {
      finalUpdates.push({
        ...update,
        confidence: confidenceRule.compute(update, evidenceGraph),
      })
    } else {
      finalUpdates.push(update)
    }
  }

  return finalUpdates
}

function pickHighestConfidencePerField(
  updates: ProjectModelFieldUpdate[],
): ProjectModelFieldUpdate[] {
  const byField = new Map<string, ProjectModelFieldUpdate>()

  for (const update of updates) {
    const existing = byField.get(update.field)
    if (!existing || update.confidence.value > existing.confidence.value) {
      byField.set(update.field, update)
    }
  }

  return Array.from(byField.values())
}

function buildProjectModel(
  domainUpdates: Record<ProjectModelDomain, ProjectModelFieldUpdate[]>,
  declaredIntent: string,
  evidenceGraph: EvidenceGraph,
): ProjectModel {
  const identityUpdates = domainUpdates.identity
  const identity = (identityUpdates[0]?.value as ProjectIdentity | undefined) ?? {
    id: "unknown",
    name: "Unknown Project",
  }

  const lifecycleUpdates = domainUpdates.lifecycle
  const lifecycleStage = (lifecycleUpdates[0]?.value as LifecycleStage | undefined) ?? {
    value: "unknown",
    confidence: deterministicConfidence(
      0,
      "Insufficient evidence to determine lifecycle stage",
      "deterministic",
    ),
  }

  const languages = domainUpdates.language.map((update) => update.value as NamedConfidence)
  const frameworks = domainUpdates.framework.map((update) => update.value as NamedConfidence)
  const runtimes = domainUpdates.runtime.map((update) => update.value as NamedConfidence)

  const capabilities = domainUpdates.capability.map((update) => update.value as CapabilityItem)
  const knowledgeInventory = domainUpdates.knowledge.map((update) => update.value as KnowledgeItem)
  const unknowns = domainUpdates.unknown.map((update) => update.value as string)

  const metadataUpdates = domainUpdates.metadata
  const fileCountUpdate = metadataUpdates.find((update) => update.field === "fileCount")
  const packageManagerUpdate = metadataUpdates.find((update) => update.field === "packageManager")

  const fileCount = typeof fileCountUpdate?.value === "number" ? fileCountUpdate.value : 0
  const packageManager = packageManagerUpdate?.value as NamedConfidence | undefined

  return {
    schemaVersion: PROJECT_MODEL_SCHEMA_VERSION,
    identity,
    intent: {
      statement: declaredIntent || "unknown",
    },
    lifecycleStage,
    languages: sortByName(languages),
    frameworks: sortByName(frameworks),
    runtimes: sortByName(runtimes),
    capabilities,
    knowledgeInventory,
    unknowns,
    evidenceClaimReferences: evidenceGraph.claims.map((claim) => claim.id),
    fileCount,
    packageManager,
  }
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name))
}

// -------------------------------------------------------------------------
// Public factories and projection functions
// -------------------------------------------------------------------------

/**
 * Create the default set of ProjectModel inference rules.
 */
export function createDefaultProjectModelRules(): ProjectModelRule[] {
  return [
    identityRule(),
    lifecycleRule(),
    languageRule(),
    nodeLanguageRule(),
    frameworkRule(),
    runtimeRule(),
    testingCapabilityRule(),
    documentationCapabilityRule(),
    readmeKnowledgeRule(),
    architectureKnowledgeRule(),
    docsKnowledgeRule(),
    unknownManifestRule(),
    unknownFindingsRule(),
    fileCountRule(),
    packageManagerRule(),
  ]
}

/**
 * Create the default set of confidence rules for ProjectModel inferences.
 */
export function createDefaultConfidenceRules(): ConfidenceRule[] {
  return PROJECT_MODEL_DOMAINS.map((domain) => ({
    id: `project-model:default-confidence:${domain}`,
    appliesTo: domain,
    compute: (update: ProjectModelFieldUpdate) => update.confidence,
  }))
}

/**
 * Validate a projected ProjectModel.
 */
export function validateProjectModel(
  model: ProjectModel,
  evidenceGraph: EvidenceGraph,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const validLifecycle = PROJECT_MODEL_LIFECYCLE_VALUES as readonly string[]

  const requiredFields: (keyof ProjectModel)[] = [
    "schemaVersion",
    "identity",
    "intent",
    "lifecycleStage",
    "languages",
    "frameworks",
    "runtimes",
    "capabilities",
    "knowledgeInventory",
    "unknowns",
    "evidenceClaimReferences",
    "fileCount",
  ]

  for (const field of requiredFields) {
    if (!(field in model)) {
      errors.push(`Missing required field: ${field}`)
    }
  }

  if (model.schemaVersion !== PROJECT_MODEL_SCHEMA_VERSION) {
    errors.push(`Invalid schemaVersion: ${model.schemaVersion}`)
  }

  if (!model.identity || typeof model.identity.id !== "string" || typeof model.identity.name !== "string") {
    errors.push("Identity must have id and name strings")
  }

  if (!model.intent || typeof model.intent.statement !== "string") {
    errors.push("Intent must have a statement string")
  }

  if (!model.lifecycleStage || !validLifecycle.includes(model.lifecycleStage.value)) {
    errors.push(`Invalid lifecycle stage: ${model.lifecycleStage?.value}`)
  }

  function validateConfidence(confidence: ConfidenceScore | undefined, path: string): void {
    if (!confidence || typeof confidence.value !== "number") {
      errors.push(`Missing confidence at ${path}`)
      return
    }
    if (confidence.value < 0 || confidence.value > 1) {
      errors.push(`Confidence out of range at ${path}: ${confidence.value}`)
    }
  }

  validateConfidence(model.lifecycleStage?.confidence, "lifecycleStage.confidence")

  function checkDuplicates(items: NamedConfidence[], path: string): void {
    const seen = new Set<string>()
    for (const item of items) {
      if (seen.has(item.name)) {
        errors.push(`Duplicate ${path} name: ${item.name}`)
      }
      seen.add(item.name)
    }
  }

  if (!Array.isArray(model.languages)) {
    errors.push("languages must be an array")
  } else {
    checkDuplicates(model.languages, "language")
    for (const lang of model.languages) validateConfidence(lang.confidence, `language.${lang.name}`)
  }

  if (!Array.isArray(model.frameworks)) {
    errors.push("frameworks must be an array")
  } else {
    checkDuplicates(model.frameworks, "framework")
    for (const fw of model.frameworks) validateConfidence(fw.confidence, `framework.${fw.name}`)
  }

  if (!Array.isArray(model.runtimes)) {
    errors.push("runtimes must be an array")
  } else {
    checkDuplicates(model.runtimes, "runtime")
    for (const rt of model.runtimes) validateConfidence(rt.confidence, `runtime.${rt.name}`)
  }

  if (!Array.isArray(model.capabilities)) {
    errors.push("capabilities must be an array")
  } else {
    for (const cap of model.capabilities) {
      if (typeof cap.name !== "string" || typeof cap.available !== "boolean" || !Array.isArray(cap.evidenceClaimIds)) {
        errors.push(`Invalid capability item: ${cap.name}`)
      }
    }
  }

  if (!Array.isArray(model.knowledgeInventory)) {
    errors.push("knowledgeInventory must be an array")
  } else {
    for (const item of model.knowledgeInventory) {
      if (typeof item.kind !== "string") {
        errors.push("Knowledge item must have a kind string")
      }
    }
  }

  if (!Array.isArray(model.unknowns)) {
    errors.push("unknowns must be an array")
  } else {
    for (const unknown of model.unknowns) {
      if (typeof unknown !== "string") errors.push("Each unknown must be a string")
    }
  }

  if (typeof model.fileCount !== "number" || model.fileCount < 0 || !Number.isInteger(model.fileCount)) {
    errors.push(`fileCount must be a non-negative integer: ${model.fileCount}`)
  }

  if (model.packageManager !== undefined) {
    if (typeof model.packageManager.name !== "string") {
      errors.push("packageManager.name must be a string")
    }
    validateConfidence(model.packageManager.confidence, "packageManager.confidence")
  }

  if (!Array.isArray(model.evidenceClaimReferences)) {
    errors.push("evidenceClaimReferences must be an array")
  } else {
    const claimIds = new Set(evidenceGraph.claims.map((claim) => claim.id))
    for (const ref of model.evidenceClaimReferences) {
      if (!claimIds.has(ref)) {
        errors.push(`Evidence claim reference not found: ${ref}`)
      }
    }
    for (const cap of model.capabilities) {
      for (const ref of cap.evidenceClaimIds) {
        if (!claimIds.has(ref)) {
          errors.push(`Capability evidence claim reference not found: ${ref}`)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Project a ProjectModel from the EvidenceGraph using registered rules.
 */
export function projectProjectModel(
  evidenceGraph: EvidenceGraph,
  priorOutputs: Record<string, unknown>,
  declaredIntent?: string,
): ProjectModel {
  const rules = createDefaultProjectModelRules()
  const confidenceRules = createDefaultConfidenceRules()
  const domainUpdates = {} as Record<ProjectModelDomain, ProjectModelFieldUpdate[]>

  for (const domain of PROJECT_MODEL_DOMAINS) {
    const rawUpdates = applyRulesForDomain(domain, rules, confidenceRules, evidenceGraph, priorOutputs)
    domainUpdates[domain] = pickHighestConfidencePerField(rawUpdates)
  }

  const model = buildProjectModel(domainUpdates, declaredIntent ?? "unknown", evidenceGraph)
  const validation = validateProjectModel(model, evidenceGraph)

  if (!validation.valid) {
    throw new Error(`ProjectModel validation failed: ${validation.errors.join("; ")}`)
  }

  return model
}

/**
 * Create the ProjectModel projection capability.
 */
export function createProjectModelProjectionCapability(
  declaredIntent?: string,
): ProjectionCapability<ProjectModel> {
  return {
    id: PROJECT_MODEL_CAPABILITY_ID,
    version: PROJECT_MODEL_CAPABILITY_VERSION,
    projectionType: PROJECT_MODEL_PROJECTION_TYPE,
    dependencies: [FINDINGS_PROJECTION_TYPE],

    project(context: ProjectionContext): ProjectModel {
      return projectProjectModel(
        context.evidenceGraph,
        context.priorOutputs,
        declaredIntent ?? context.declaredIntent,
      )
    },
  }
}
