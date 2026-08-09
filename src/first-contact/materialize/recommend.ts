// ============================================================
// FIRST CONTACT: Detected-Stack Adapter Recommendation
// ============================================================
// Rule-based adapter recommendation engine for EXP-AIFC-011.
// Maps the approved Discovery Artifact to registered SYNTH adapters
// with deterministic confidence scores.
// ============================================================

import type {
  MaterializationOptions,
  RecommendedAdapter,
  WorkflowTemplate,
} from "./types.js"
import { WORKFLOW_TEMPLATES } from "./templates/index.js"
import {
  createDefaultAdapterCatalog,
  type AdapterCatalog,
} from "../../adapters/adapter-catalog.js"
import type { AdapterDescriptor } from "../../types/adapter.js"

const catalog: AdapterCatalog = createDefaultAdapterCatalog()

const MAX_ADAPTERS = 16

function toRecommendedKind(kind: AdapterDescriptor["kind"]): RecommendedAdapter["kind"] {
  if (kind === "integration" || kind === "methodology" || kind === "runtime") {
    return kind
  }
  // Fallback for descriptors with planning/intelligence kinds that are not
  // valid first-contact recommendations. They are scored normally but
  // surfaced as integration adapters.
  return "integration"
}

function normalize(value: string): string {
  return value.toLowerCase().trim()
}

function hasIntersection(a: string[], b: string[]): boolean {
  const setA = new Set(a.map(normalize))
  return b.some((item) => setA.has(normalize(item)))
}

function intersectionCount(a: string[], b: string[]): number {
  const setA = new Set(a.map(normalize))
  return b.filter((item) => setA.has(normalize(item))).length
}

/**
 * Recommend SYNTH adapters for the materialization context.
 *
 * Scoring is deterministic: equivalent Discovery artifacts produce the
 * same ranked list. Scores are capped at 1.0 and adapters below 0.25 are
 * dropped.
 */
export function recommendAdapters(options: MaterializationOptions): RecommendedAdapter[] {
  const { approvedArtifact } = options
  const env = approvedArtifact.environment
  const intentText = normalize(approvedArtifact.intent.description)
  const targetRuntime = normalize(env.targetRuntime)
  const languages = env.languagePreferences.map(normalize)
  const platforms = env.platformConstraints.map(normalize)
  const requiredCaps = approvedArtifact.capabilities.required.map(normalize)
  const optionalCaps = approvedArtifact.capabilities.optional.map(normalize)

  const descriptors = catalog.all()

  const scored = descriptors.map((descriptor): RecommendedAdapter => {
    let score = 0
    const matchedRequired: string[] = []
    const matchedOptional: string[] = []
    const matchedPlatforms: string[] = []

    const descriptorCapabilities = descriptor.capabilities.map(normalize)
    const descriptorOptionalCapabilities = (descriptor.optionalCapabilities ?? []).map(normalize)

    for (const cap of requiredCaps) {
      if (descriptorCapabilities.includes(cap)) {
        score += 0.4
        matchedRequired.push(cap)
      }
    }

    for (const cap of optionalCaps) {
      if (
        descriptorCapabilities.includes(cap) ||
        descriptorOptionalCapabilities.includes(cap)
      ) {
        score += 0.1
        matchedOptional.push(cap)
      }
    }

    for (const platform of platforms) {
      if ((descriptor.platforms ?? []).map(normalize).includes(platform)) {
        score += 0.2
        matchedPlatforms.push(platform)
      }
    }

    const runtimeMatch = (descriptor.runtimes ?? []).map(normalize).includes(targetRuntime)
    const languageMatch = hasIntersection(descriptor.languages ?? [], languages)
    if (runtimeMatch || languageMatch) {
      score += 0.3
    }

    // Intent-text boost for common keywords that are not captured as
    // structured capabilities.
    if (descriptor.id === "nextjs-runtime" && /\b(web|ui|frontend|react)\b/.test(intentText)) {
      score += 0.1
    }
    if (descriptor.id === "api-route" && /\b(api|endpoint|backend)\b/.test(intentText)) {
      score += 0.1
    }
    if (descriptor.id === "python-cli" && /\b(cli|command.line|script)\b/.test(intentText)) {
      score += 0.1
    }

    score = Math.min(1.0, Math.round(score * 100) / 100)

    const reasons: string[] = []
    if (matchedRequired.length > 0) {
      reasons.push(`required capability '${matchedRequired[0]}' detected`)
    }
    if (runtimeMatch) {
      reasons.push(`runtime '${env.targetRuntime}' matched`)
    } else if (languageMatch) {
      reasons.push(`language '${env.languagePreferences[0]}' matched`)
    }
    if (matchedPlatforms.length > 0) {
      reasons.push(`platform '${matchedPlatforms[0]}' matched`)
    }
    if (matchedOptional.length > 0) {
      reasons.push(`optional capability '${matchedOptional[0]}' matched`)
    }

    const reason = reasons.length > 0
      ? reasons.join("; ")
      : `Candidate adapter for ${descriptor.kind} integration`

    return {
      adapterId: descriptor.id,
      kind: toRecommendedKind(descriptor.kind),
      confidence: score,
      reason,
      required: matchedRequired.length > 0,
      capabilities: Array.from(new Set([...matchedRequired, ...matchedOptional])),
    }
  })

  return scored
    .filter((adapter) => adapter.confidence >= 0.25)
    .sort((a, b) => b.confidence - a.confidence || a.adapterId.localeCompare(b.adapterId))
    .slice(0, MAX_ADAPTERS)
}

/**
 * Return the registered version for a recommended adapter id.
 */
export function getAdapterVersion(adapterId: string): string {
  return catalog.resolve(adapterId)?.version ?? "1.0.0"
}

/**
 * Select a default workflow template from the canonical catalog.
 *
 * Priority:
 * 1. Exact match against selected architecture id or name.
 * 2. Match against the detected target runtime.
 * 3. Match against the primary language preference.
 * 4. Fallback to the generic greenfield template.
 */
export function selectWorkflowTemplate(options: MaterializationOptions): WorkflowTemplate {
  const { approvedArtifact, selectedArchitecture } = options
  const targetRuntime = normalize(approvedArtifact.environment.targetRuntime)
  const primaryLanguage = normalize(approvedArtifact.environment.languagePreferences[0] ?? "")
  const archId = normalize(selectedArchitecture.id)
  const archName = normalize(selectedArchitecture.name)

  const byArchitecture = WORKFLOW_TEMPLATES.find((template) =>
    template.architectureTypes.some((t) => normalize(t) === archId || normalize(t) === archName)
  )
  if (byArchitecture) return byArchitecture

  if (targetRuntime === "web" || targetRuntime === "node") {
    const nextjs = WORKFLOW_TEMPLATES.find((t) => t.id === "nextjs-chatbot")
    if (nextjs) return nextjs
  }

  if (targetRuntime === "cli") {
    if (primaryLanguage === "python") {
      const python = WORKFLOW_TEMPLATES.find((t) => t.id === "python-cli")
      if (python) return python
    }
  }

  if (primaryLanguage === "python") {
    const python = WORKFLOW_TEMPLATES.find((t) => t.id === "python-cli")
    if (python) return python
  }

  if (primaryLanguage === "typescript" || primaryLanguage === "javascript" || primaryLanguage === "node") {
    const nextjs = WORKFLOW_TEMPLATES.find((t) => t.id === "nextjs-chatbot")
    if (nextjs) return nextjs
  }

  const generic = WORKFLOW_TEMPLATES.find((t) => t.id === "generic-greenfield")
  if (generic) return generic

  return WORKFLOW_TEMPLATES[0]
}
