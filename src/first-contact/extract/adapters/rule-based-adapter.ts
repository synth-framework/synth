// ============================================================
// FIRST CONTACT: Rule-Based Intent Extraction Adapter
// ============================================================
// A deterministic, heuristic adapter that extracts Discovery Artifact
// fields from plain-language operator input.
//
// This adapter is intentionally simple. It demonstrates the adapter
// contract and produces structured output without invoking an LLM.
// Future adapters can implement the same interface with richer strategies.
// ============================================================

import type {
  ExtractedAudience,
  ExtractedCapabilities,
  ExtractedConstraints,
  ExtractedEnvironment,
  ExtractedIntent,
  ExtractedUnknown,
  IntentExtractionAdapter,
  IntentExtractionContext,
  IntentExtractionResult,
  TranscriptEntry,
} from "../types.js"
import { computeConfidence } from "../confidence.js"

const RUNTIME_KEYWORDS: Record<string, string> = {
  web: "web",
  website: "web",
  "web app": "web",
  "web application": "web",
  cli: "cli",
  "command line": "cli",
  "command-line": "cli",
  desktop: "desktop",
  mobile: "mobile",
  "mobile app": "mobile",
  "react native": "mobile",
}

const LANGUAGE_KEYWORDS: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  node: "node",
  "node.js": "node",
  rust: "rust",
  go: "go",
  java: "java",
  csharp: "csharp",
  "c#": "csharp",
}

const PLATFORM_KEYWORDS: Record<string, string> = {
  serverless: "serverless",
  "static site": "static-site",
  responsive: "responsive-ui",
  "responsive ui": "responsive-ui",
  crossplatform: "cross-platform",
  "cross-platform": "cross-platform",
  local: "local-only",
  offline: "no-network-required",
}

function normalizeInput(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s\-]/g, " ").replace(/\s+/g, " ").trim()
}

function detectKeywords(normalized: string, dictionary: Record<string, string>): string[] {
  const found = new Set<string>()
  for (const [phrase, value] of Object.entries(dictionary)) {
    if (normalized.includes(phrase)) {
      found.add(value)
    }
  }
  return Array.from(found)
}

function extractDescription(input: string): string {
  return input.trim()
}

function extractGoals(input: string): string[] {
  const normalized = normalizeInput(input)
  const goals: string[] = []

  // Split on common conjunctions and punctuation.
  const segments = normalized.split(/\s+(?:and|that|which|with)\s+|,|\./).filter((s) => s.trim().length > 0)

  const actionVerbs = ["build", "create", "make", "track", "display", "validate", "manage", "monitor", "render", "convert"]

  for (const segment of segments) {
    for (const verb of actionVerbs) {
      if (segment.startsWith(verb + " ") || segment.includes(" " + verb + " ")) {
        const goal = segment.replace(new RegExp(`^${verb}\\s+`, "i"), "").trim()
        if (goal.length > 2) {
          goals.push(`${verb} ${goal}`)
        }
        break
      }
    }
  }

  // Deduplicate while preserving order.
  return Array.from(new Set(goals))
}

function deriveSuccessCriteria(goals: string[]): string[] {
  return goals.map((goal) => {
    const rest = goal.replace(/^(build|create|make|track|display|validate|manage|monitor|render|convert)\s+/i, "")
    return `Users can ${rest}`
  })
}

function extractAudience(_input: string): ExtractedAudience {
  return {
    primaryUsers: [],
    stakeholders: [],
  }
}

function extractEnvironment(input: string): ExtractedEnvironment {
  const normalized = normalizeInput(input)
  const runtimes = detectKeywords(normalized, RUNTIME_KEYWORDS)
  const languages = detectKeywords(normalized, LANGUAGE_KEYWORDS)
  const platforms = detectKeywords(normalized, PLATFORM_KEYWORDS)

  return {
    targetRuntime: runtimes[0] ?? "",
    languagePreferences: languages,
    platformConstraints: platforms,
  }
}

function extractCapabilities(input: string): ExtractedCapabilities {
  const normalized = normalizeInput(input)
  const required: string[] = []

  // Domain nouns often imply capabilities.
  const capabilityPatterns: Record<string, string> = {
    "launch": "launch-api",
    "mission": "mission-display",
    "notification": "notifications",
    "markdown": "markdown-parser",
    "html": "html-renderer",
    "viewer": "document-viewer",
    "schema": "schema-validation",
    "event": "event-processing",
  }

  for (const [phrase, capability] of Object.entries(capabilityPatterns)) {
    if (normalized.includes(phrase)) {
      required.push(capability)
    }
  }

  return {
    required: Array.from(new Set(required)),
    optional: [],
  }
}

function extractConstraints(_input: string): ExtractedConstraints {
  return {
    functional: [],
    nonFunctional: [],
  }
}

function deriveUnknowns(result: IntentExtractionResult): ExtractedUnknown[] {
  const unknowns: ExtractedUnknown[] = []

  if (result.audience.primaryUsers.length === 0) {
    unknowns.push({
      field: "audience.primaryUsers",
      description: "Primary users are not identified in the input.",
      confidence: 0.2,
      accepted: false,
    })
  }

  if (result.environment.targetRuntime === "") {
    unknowns.push({
      field: "environment.targetRuntime",
      description: "Target runtime is not specified.",
      confidence: 0.2,
      accepted: false,
    })
  }

  if (result.environment.languagePreferences.length === 0) {
    unknowns.push({
      field: "environment.languagePreferences",
      description: "Language preferences are not specified.",
      confidence: 0.2,
      accepted: false,
    })
  }

  if (result.capabilities.required.length === 0) {
    unknowns.push({
      field: "capabilities.required",
      description: "Required capabilities could not be inferred from the input.",
      confidence: 0.2,
      accepted: false,
    })
  }

  return unknowns
}

function buildTranscript(input: string, context?: IntentExtractionContext): TranscriptEntry[] {
  const baseTurn = context?.turn ?? 1
  const prior = context?.priorTranscript ?? []
  const entry: TranscriptEntry = {
    turn: baseTurn,
    actor: "operator",
    type: "input",
    content: input.trim(),
    timestamp: new Date().toISOString(),
  }
  return [...prior, entry]
}

export class RuleBasedIntentExtractionAdapter implements IntentExtractionAdapter {
  readonly version = "1.0.0"

  extract(input: string, context?: IntentExtractionContext): IntentExtractionResult {
    const description = extractDescription(input)
    const goals = extractGoals(input)
    const successCriteria = deriveSuccessCriteria(goals)

    const intent: ExtractedIntent = { description, goals, successCriteria }
    const audience = extractAudience(input)
    const environment = extractEnvironment(input)
    const capabilities = extractCapabilities(input)
    const constraints = extractConstraints(input)

    const draft: IntentExtractionResult = {
      intent,
      audience,
      environment,
      capabilities,
      constraints,
      unknowns: [],
      confidence: { overall: 0, byField: {} },
      transcript: buildTranscript(input, context),
    }

    draft.unknowns = deriveUnknowns(draft)
    draft.confidence = computeConfidence(draft)

    return draft
  }
}
