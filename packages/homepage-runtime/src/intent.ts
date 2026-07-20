// ============================================================
// HOMEPAGE RUNTIME: Intent Extraction
// ============================================================
// Deterministic, rule-based extraction of intent artifacts from
// plain-language operator input. No external models. No filesystem.
// ============================================================

import type {
  ClarificationQuestion,
  Confidence,
  DiscoveryCard,
  DomainCard,
  EntryMode,
  EvidenceCard,
  ExpeditionCard,
  IntentCard,
  MissionCard,
  UnknownCard,
  UnknownsCard,
} from "./types.js"

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
}

const CAPABILITY_PATTERNS: Record<string, string> = {
  auth: "authentication",
  authentication: "authentication",
  login: "authentication",
  billing: "billing",
  payment: "payments",
  notify: "notifications",
  notification: "notifications",
  markdown: "markdown",
  html: "html-rendering",
  schema: "schema-validation",
  event: "event-processing",
  search: "search",
  upload: "file-upload",
  export: "data-export",
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

function extractGoals(input: string): string[] {
  const normalized = normalizeInput(input)
  const segments = normalized.split(/\s+(?:and|that|which|with)\s+|[,.]/).filter((s) => s.trim().length > 0)
  const actionVerbs = ["build", "create", "make", "track", "display", "validate", "manage", "monitor", "render", "convert"]
  const goals: string[] = []

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

  return Array.from(new Set(goals))
}

function deriveSuccessCriteria(goals: string[]): string[] {
  return goals.map((goal) => {
    const rest = goal.replace(/^(build|create|make|track|display|validate|manage|monitor|render|convert)\s+/i, "")
    return `Users can ${rest}`
  })
}

function computeConfidence(intent: IntentCard, discovery: DiscoveryCard): Confidence {
  const byField: Record<string, number> = {
    description: intent.description.length > 10 ? 0.9 : 0.4,
    goals: intent.goals.length > 0 ? 0.8 : 0.3,
    runtime: discovery.constraints.some((c) => c.startsWith("Runtime")) ? 0.8 : 0.4,
    capabilities: discovery.capabilities.length > 0 ? 0.8 : 0.3,
  }

  const values = Object.values(byField)
  const overall = values.reduce((sum, v) => sum + v, 0) / values.length

  return { overall, byField }
}

export function extractIntent(input: string, mode: EntryMode): IntentCard {
  const description = input.trim()
  const goals = extractGoals(input)
  const successCriteria = deriveSuccessCriteria(goals)

  return {
    kind: "intent",
    description,
    goals,
    successCriteria,
    mode,
  }
}

export function discoverIntent(intent: IntentCard): DiscoveryCard {
  const normalized = normalizeInput(intent.description)
  const runtimes = detectKeywords(normalized, RUNTIME_KEYWORDS)
  const languages = detectKeywords(normalized, LANGUAGE_KEYWORDS)
  const capabilities = detectKeywords(normalized, CAPABILITY_PATTERNS)

  const findings: string[] = [
    `Intent: ${intent.description}`,
    ...(runtimes.length > 0 ? [`Target runtime: ${runtimes.join(", ")}`] : []),
    ...(languages.length > 0 ? [`Language preferences: ${languages.join(", ")}`] : []),
  ]

  const constraints: string[] = [
    ...(runtimes.length > 0 ? [`Runtime: ${runtimes[0]}`] : []),
    ...(languages.length > 0 ? [`Language: ${languages.join(", ")}`] : []),
  ]

  return {
    kind: "discovery",
    findings,
    capabilities: capabilities.length > 0 ? capabilities : ["domain-modeling"],
    constraints,
  }
}

export function generateUnknowns(intent: IntentCard, discovery: DiscoveryCard): UnknownsCard {
  const items: UnknownCard[] = []

  if (!discovery.constraints.some((c) => c.startsWith("Runtime:"))) {
    items.push({
      kind: "unknown",
      field: "runtime",
      description: "Target runtime is not specified.",
      confidence: 0.2,
    })
  }

  if (!discovery.constraints.some((c) => c.startsWith("Language:"))) {
    items.push({
      kind: "unknown",
      field: "language",
      description: "Language preferences are not specified.",
      confidence: 0.2,
    })
  }

  if (discovery.capabilities.length === 0 || discovery.capabilities[0] === "domain-modeling") {
    items.push({
      kind: "unknown",
      field: "capabilities",
      description: "Required capabilities could not be inferred from the input.",
      confidence: 0.2,
    })
  }

  return { kind: "unknowns", items }
}

export function generateDomain(intent: IntentCard, discovery: DiscoveryCard): DomainCard {
  const normalized = normalizeInput(intent.description)
  const entities: string[] = []

  // Simple noun-phrase extraction: look for domain nouns.
  const domainNouns = ["user", "project", "task", "mission", "expedition", "customer", "product", "order", "document", "event", "note", "contact", "recipe", "inventory", "portfolio"]
  for (const noun of domainNouns) {
    if (normalized.includes(noun)) {
      entities.push(noun)
    }
  }

  if (entities.length === 0) {
    entities.push("entity")
  }

  return {
    kind: "domain",
    entities: Array.from(new Set(entities)),
    relationships: [`${entities[0]} belongs to a bounded context`],
    boundedContexts: ["core-domain"],
  }
}

export function generateMission(intent: IntentCard, discovery: DiscoveryCard, domain: DomainCard): MissionCard {
  const id = `mission-${hashString(intent.description)}`
  const name = intent.goals[0] ?? intent.description.slice(0, 40)

  return {
    kind: "mission",
    id,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    purpose: `Build ${intent.description} with governed Discovery, Mission, and Expedition lifecycle.`,
    objectives: [
      "Capture intent and constraints",
      "Model the domain",
      "Define expedition proposals",
      "Produce replayable governance evidence",
    ],
    successCriteria: intent.successCriteria,
  }
}

export function generateExpeditions(mission: MissionCard, discovery: DiscoveryCard): ExpeditionCard[] {
  const base: ExpeditionCard[] = [
    {
      kind: "expedition",
      id: `${mission.id}-exp-discovery`,
      missionId: mission.id,
      name: "Discovery and Domain Modeling",
      goal: "Formalize intent, unknowns, and domain model.",
      status: "draft",
    },
    {
      kind: "expedition",
      id: `${mission.id}-exp-architecture`,
      missionId: mission.id,
      name: "Architecture Projection",
      goal: "Project architecture candidates and verify capabilities.",
      status: "draft",
    },
    {
      kind: "expedition",
      id: `${mission.id}-exp-governance`,
      missionId: mission.id,
      name: "Governance and Validation",
      goal: "Establish governance boundaries and validation plan.",
      status: "draft",
    },
  ]

  if (discovery.capabilities.includes("authentication")) {
    base.push({
      kind: "expedition",
      id: `${mission.id}-exp-auth`,
      missionId: mission.id,
      name: "Identity and Access Expedition",
      goal: "Design authentication and authorization boundaries.",
      status: "draft",
    })
  }

  return base
}

export function generateEvidence(intent: IntentCard, discovery: DiscoveryCard): EvidenceCard[] {
  return [
    {
      kind: "evidence",
      id: `ev-${hashString(intent.description)}`,
      observation: `Intent extracted from operator input: "${intent.description}"`,
      confidence: 0.85,
      source: "rule-based-intent-extraction",
    },
    {
      kind: "evidence",
      id: `ev-cap-${hashString(discovery.capabilities.join("-"))}`,
      observation: `Capabilities inferred: ${discovery.capabilities.join(", ")}`,
      confidence: discovery.capabilities.length > 1 ? 0.75 : 0.5,
      source: "capability-pattern-matching",
    },
  ]
}

export function generateClarificationQuestions(unknowns: UnknownsCard): ClarificationQuestion[] {
  return unknowns.items.map((item, index) => ({
    id: `q-${index}`,
    field: item.field,
    description: item.description,
  }))
}

function hashString(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return String(Math.abs(hash)).slice(0, 8)
}
