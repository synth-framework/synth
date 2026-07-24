// ============================================================
// PLANNING: PCE Subsystems (Pure)
// ============================================================
// Stateless planning cognition helpers. No IO, no mutation,
// no runtime coupling. SideQuestManager keeps in-memory state only.
// ============================================================

import { uuid as sdkUuid } from "../sdk/identity/index.js"

export type PlanningQuestion = {
  id: string
  text: string
  category: string
  priority: string
}

export type IntentClassification = {
  mode: number
  name: string
  confidence: number
}

export type ExtractedKnowledge = {
  entities: Array<{ type: string; name: string }>
  requirements: string[]
  constraints: string[]
  risks: string[]
  architecture: string[]
  dependencies: string[]
  concepts: string[]
  extractedAt: number
}

export type SynthesizedObjective = {
  id: string
  title: string
  purpose: string
  synthesizedFrom: string
  confidence: number
}

export type DiscoveryEvaluation = {
  discoveryId: string
  impact: string
  severity: number
  suggestsObjectives: boolean
  suggestsDecision: boolean
  affectedObjectiveIds: string[]
  evaluatedAt: number
}

export type DecisionEvaluation = {
  decisionId: string
  isAdrCandidate: boolean
  reason: string
  confidence: number
}

export type SideQuest = {
  id: string
  description: string
  parentObjectiveId?: string
  expeditionId?: string
  status: "active" | "resolved"
  createdAt: number
  type: "side_quest"
}

export type PlanningConfidenceResult = {
  score: number
  factors: {
    completionRate: number
    uncertaintyFactor: number
    decisionFactor: number
  }
  recommendation: string
}

export type PlanningState = {
  objectives?: Record<string, { status: string }>
  discoveries?: Record<string, { impact: string }>
  decisions?: Record<string, { status: string }>
}

function uuid(): string {
  return sdkUuid()
}

export class QuestionGenerator {
  generate(intent: { capability: string; payload?: Record<string, unknown> }, context: Record<string, unknown> = {}): PlanningQuestion[] {
    const questions: PlanningQuestion[] = []
    const cap = intent.capability
    const payload = intent.payload || {}

    if (cap === "CreateMission" || cap === "MISSION_CHARTED") {
      if (!payload.purpose) questions.push({ id: uuid(), text: "What is the mission's purpose?", category: "scope", priority: "critical" })
      if (!payload.constraints) questions.push({ id: uuid(), text: "What constraints govern this mission?", category: "governance", priority: "high" })
      if (!payload.successCriteria) questions.push({ id: uuid(), text: "How will success be measured?", category: "acceptance", priority: "high" })
    }

    if (cap === "CreateExpedition" || cap === "EXPEDITION_CHARTED") {
      if (!payload.goal) questions.push({ id: uuid(), text: "What is the expedition's goal?", category: "intent", priority: "critical" })
      if (!payload.acceptanceCriteria) questions.push({ id: uuid(), text: "What are the acceptance criteria?", category: "acceptance", priority: "high" })
      if (!payload.risks) questions.push({ id: uuid(), text: "What risks should be tracked?", category: "risk", priority: "medium" })
    }

    if (cap === "AddObjective" || cap === "PLAN_EXPANDED") {
      if (!payload.purpose) questions.push({ id: uuid(), text: "What outcome does this objective achieve?", category: "intent", priority: "critical" })
      if (!payload.dependencies) questions.push({ id: uuid(), text: "What does this objective depend on?", category: "dependency", priority: "medium" })
    }

    if (!payload.id) questions.push({ id: uuid(), text: "What identifier should be assigned?", category: "identity", priority: "critical" })

    return questions
  }
}

export class IntentClassifier {
  classify(intent: { payload?: Record<string, unknown> }, context: Record<string, unknown> = {}): IntentClassification {
    const documents = context.documents as string[] | undefined
    const hasDocuments = documents && documents.length > 0
    const hasRepository = context.repository === true
    const hasContinuation = "continuationId" in context
    const hasDetailedSpec = hasDocuments && documents.some((d) => typeof d === "string" && d.length > 500)
    const description = intent.payload?.description
    const hasSparseReq = typeof description === "string" && description.length < 100

    if (hasContinuation) return { mode: 5, name: "Continuation", confidence: 0.95 }
    if (hasRepository && !hasDocuments) return { mode: 4, name: "Brownfield Adoption", confidence: 0.85 }
    if (hasDetailedSpec && !intent.payload?.goal) return { mode: 3, name: "Knowledge-Driven Build", confidence: 0.80 }
    if (hasSparseReq && !hasDocuments) return { mode: 2, name: "Intent-Only Build", confidence: 0.70 }
    return { mode: 1, name: "Guided Build", confidence: 0.90 }
  }
}

export class KnowledgeExtractor {
  extract(documents: Array<string | { content?: string }> = [], timestamp?: number): ExtractedKnowledge {
    const knowledge: ExtractedKnowledge = {
      entities: [],
      requirements: [],
      constraints: [],
      risks: [],
      architecture: [],
      dependencies: [],
      concepts: [],
      extractedAt: timestamp ?? Date.now(),
    }

    for (const doc of documents) {
      const text = typeof doc === "string" ? doc : doc.content || ""

      const headingMatches = text.match(/^#{1,3}\s+(.+)$/gm)
      if (headingMatches) {
        for (const h of headingMatches) {
          const title = h.replace(/^#{1,3}\s+/, "").trim()
          if (title.length > 3) knowledge.entities.push({ type: "heading", name: title })
        }
      }

      const reqMatches = text.match(/[^.]*\b(shall|must|should|will)\b[^.]*\./gi)
      if (reqMatches) knowledge.requirements.push(...reqMatches.map((r) => r.trim()))

      const constraintMatches = text.match(/[^.]*\b(constraint|limit|bound|restrict|only)\b[^.]*\./gi)
      if (constraintMatches) knowledge.constraints.push(...constraintMatches.map((c) => c.trim()))

      const riskMatches = text.match(/[^.]*\b(risk|danger|caution|warn|vulnerabil)\b[^.]*\./gi)
      if (riskMatches) knowledge.risks.push(...riskMatches.map((r) => r.trim()))

      const archMatches = text.match(/\b(ADR-\d+|RFC \d+|Architecture|Kernel|Engine|Layer|Component)\b/g)
      if (archMatches) knowledge.architecture.push(...archMatches)
    }

    return knowledge
  }
}

export class ObjectiveSynthesizer {
  synthesize(knowledge: ExtractedKnowledge, expedition?: { name?: string; goal?: string }): SynthesizedObjective[] {
    const objectives: SynthesizedObjective[] = []

    for (const req of knowledge.requirements || []) {
      const title = req.length > 60 ? req.substring(0, 60) + "..." : req
      objectives.push({ id: uuid(), title, purpose: req, synthesizedFrom: "requirement", confidence: 0.80 })
    }

    for (const arch of [...new Set(knowledge.architecture || [])]) {
      objectives.push({
        id: uuid(),
        title: `Implement ${arch}`,
        purpose: `Support ${arch} architecture`,
        synthesizedFrom: "architecture",
        confidence: 0.75,
      })
    }

    if (objectives.length === 0 && expedition) {
      objectives.push({
        id: uuid(),
        title: `Fulfill expedition: ${expedition.name || "Unknown"}`,
        purpose: expedition.goal || "Expedition goal",
        synthesizedFrom: "expedition",
        confidence: 0.60,
      })
    }

    return objectives
  }
}

export class DiscoveryEvaluator {
  evaluate(
    discovery: { id: string; impact?: string },
    affectedObjectives: Array<{ id: string } | string> = [],
    timestamp?: number,
  ): DiscoveryEvaluation {
    const impact = discovery.impact || "medium"
    const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
    const severity = severityOrder[impact] || 2

    const suggestsObjectives = severity >= 2 && affectedObjectives.length > 0
    const suggestsDecision = severity >= 3

    return {
      discoveryId: discovery.id,
      impact,
      severity,
      suggestsObjectives,
      suggestsDecision,
      affectedObjectiveIds: affectedObjectives.map((o) => (typeof o === "string" ? o : o.id)),
      evaluatedAt: timestamp ?? Date.now(),
    }
  }
}

export class DecisionEvaluator {
  evaluate(decision: {
    id: string
    alternatives?: unknown[]
    consequences?: { positive?: unknown[]; negative?: unknown[] }
  }): DecisionEvaluation {
    const hasAlternatives = (decision.alternatives || []).length > 0
    const hasConsequences =
      (decision.consequences?.positive || []).length > 0 || (decision.consequences?.negative || []).length > 0
    const isArchitectural = hasAlternatives && hasConsequences

    return {
      decisionId: decision.id,
      isAdrCandidate: isArchitectural,
      reason: isArchitectural ? "Decision has alternatives and consequences — warrants ADR" : "Decision is operational — record only",
      confidence: isArchitectural ? 0.85 : 0.60,
    }
  }
}

export class SideQuestManager {
  private sideQuests: SideQuest[] = []

  recognize(description: string, parentObjectiveId?: string, expeditionId?: string, timestamp?: number): SideQuest {
    const sq: SideQuest = {
      id: uuid(),
      description,
      parentObjectiveId,
      expeditionId,
      status: "active",
      createdAt: timestamp ?? Date.now(),
      type: "side_quest",
    }
    this.sideQuests.push(sq)
    return sq
  }

  resolve(sideQuestId: string): SideQuest | undefined {
    const sq = this.sideQuests.find((s) => s.id === sideQuestId)
    if (sq) sq.status = "resolved"
    return sq
  }

  getActive(expeditionId?: string): SideQuest[] {
    return this.sideQuests.filter((s) => (expeditionId ? s.expeditionId === expeditionId : true) && s.status === "active")
  }
}

export class PlanningConfidence {
  calculate(planningState: PlanningState): PlanningConfidenceResult {
    const objectives = Object.values(planningState.objectives || {})
    const discoveries = Object.values(planningState.discoveries || {})
    const decisions = Object.values(planningState.decisions || {})

    const totalObjectives = objectives.length
    const completedObjectives = objectives.filter((o) => o.status === "completed").length
    const completionRate = totalObjectives > 0 ? completedObjectives / totalObjectives : 0

    const highImpactDiscoveries = discoveries.filter((d) => d.impact === "high" || d.impact === "critical").length
    const uncertaintyFactor = totalObjectives > 0 ? highImpactDiscoveries / totalObjectives : 0

    const acceptedDecisions = decisions.filter((d) => d.status === "accepted").length
    const decisionFactor = decisions.length > 0 ? acceptedDecisions / decisions.length : 0.5

    const score = Math.max(
      0.1,
      Math.min(0.95, completionRate * 0.4 + (1 - uncertaintyFactor) * 0.35 + decisionFactor * 0.25),
    )

    return {
      score,
      factors: { completionRate, uncertaintyFactor, decisionFactor },
      recommendation:
        score < 0.4 ? "High uncertainty — more discovery needed" : score < 0.7 ? "Moderate confidence — continue monitoring" : "High confidence — proceed",
    }
  }
}
