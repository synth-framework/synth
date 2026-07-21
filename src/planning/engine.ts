// ============================================================
// PLANNING: PlanningEngine — PCE orchestrator
// ============================================================
// Orchestrates the Planning Cognition Engine pipeline. Produces
// PlanningPermits and commits them through PlanningCoordinator.
// No direct runtime/CommandBus coupling.
// ============================================================

import crypto from "crypto"
import type { CanonicalState } from "../types/index.js"

function deterministicPermitId(intent: { actor?: string; capability: string; payload?: Record<string, unknown> }): string {
  const data = JSON.stringify({
    actor: intent.actor || "pce",
    capability: intent.capability,
    payload: intent.payload || {},
  })
  return crypto.createHash("sha256").update(data).digest("hex")
}
import {
  PlanningCoordinator,
} from "./coordinator.js"
import {
  PlanningPermit,
  PlanningIntent,
} from "./permit.js"
import {
  QuestionGenerator,
  IntentClassifier,
  KnowledgeExtractor,
  ObjectiveSynthesizer,
  DiscoveryEvaluator,
  DecisionEvaluator,
  SideQuestManager,
  PlanningConfidence,
  ExtractedKnowledge,
} from "./subsystems.js"

export class PlanningEngine {
  private coordinator: PlanningCoordinator
  private planningKey: string
  public readonly questionGenerator: QuestionGenerator
  public readonly intentClassifier: IntentClassifier
  public readonly knowledgeExtractor: KnowledgeExtractor
  private objectiveSynthesizer: ObjectiveSynthesizer
  private discoveryEvaluator: DiscoveryEvaluator
  private decisionEvaluator: DecisionEvaluator
  private sideQuestManager: SideQuestManager
  private confidenceEstimator: PlanningConfidence

  constructor(coordinator: PlanningCoordinator, planningKey: string) {
    this.coordinator = coordinator
    this.planningKey = planningKey
    this.questionGenerator = new QuestionGenerator()
    this.intentClassifier = new IntentClassifier()
    this.knowledgeExtractor = new KnowledgeExtractor()
    this.objectiveSynthesizer = new ObjectiveSynthesizer()
    this.discoveryEvaluator = new DiscoveryEvaluator()
    this.decisionEvaluator = new DecisionEvaluator()
    this.sideQuestManager = new SideQuestManager()
    this.confidenceEstimator = new PlanningConfidence()
  }

  async process(
    intent: { actor?: string; capability: string; payload?: Record<string, unknown> },
    context: Record<string, unknown> = {},
  ): Promise<{
    output: unknown
    events: Array<{ type: string; payload: unknown }>
    transactionId: string
    classification: { mode: number; name: string; confidence: number }
    questions: { id: string; text: string; category: string; priority: string }[]
    knowledge: ExtractedKnowledge | null
    permit: { txId: string; timestamp: number }
  }> {
    const txId = deterministicPermitId(intent)
    const actor = intent.actor || "pce"
    const capability = intent.capability
    const payload = intent.payload || {}

    const classification = this.intentClassifier.classify(intent, context)
    const questions = this.questionGenerator.generate(intent, context)
    const knowledge = context.documents
      ? this.knowledgeExtractor.extract(context.documents as Array<string | { content?: string }>)
      : null

    const planningIntent: PlanningIntent = {
      actor,
      capability,
      payload,
      context: { classification, questionsResolved: questions.length },
    }
    const permit = PlanningPermit.create(txId, planningIntent, this.planningKey)

    const result = await this.coordinator.commit(permit, planningIntent)

    return {
      output: result.output,
      events: result.events,
      transactionId: result.transactionId,
      classification,
      questions,
      knowledge,
      permit: { txId: permit.txId, timestamp: permit.timestamp },
    }
  }

  async chartMission(
    id: string,
    name: string,
    purpose: string,
    context: Record<string, unknown> = {},
  ): Promise<ReturnType<PlanningEngine["process"]>> {
    const questions = this.questionGenerator.generate(
      { capability: "CreateMission", payload: { id, name, purpose } },
      context,
    )
    return this.process(
      {
        actor: "pce",
        capability: "CreateMission",
        payload: { id, name, purpose, constraints: context.constraints, successCriteria: context.successCriteria },
      },
      { ...context, questions },
    )
  }

  async commissionMission(
    id: string,
    context: Record<string, unknown> = {},
  ): Promise<ReturnType<PlanningEngine["process"]>> {
    const alignmentContractId = typeof context.alignmentContractId === "string" ? context.alignmentContractId : undefined
    return this.process(
      {
        actor: "pce",
        capability: "ApproveMission",
        payload: alignmentContractId ? { id, alignmentContractId } : { id },
      },
      context,
    )
  }

  async chartExpedition(
    id: string,
    missionId: string,
    name: string,
    goal: string,
    context: Record<string, unknown> = {},
  ): Promise<ReturnType<PlanningEngine["process"]>> {
    const questions = this.questionGenerator.generate(
      { capability: "CreateExpedition", payload: { id, missionId, name, goal } },
      context,
    )
    return this.process(
      {
        actor: "pce",
        capability: "CreateExpedition",
        payload: {
          id,
          missionId,
          name,
          goal,
          acceptanceCriteria: context.acceptanceCriteria,
          risks: context.risks,
        },
      },
      { ...context, questions },
    )
  }

  async synthesizeObjectives(
    expeditionId: string,
    knowledge: ExtractedKnowledge,
    state: CanonicalState,
  ): Promise<{ objectives: { id: string; title: string; purpose: string; synthesizedFrom: string; confidence: number }[]; results: Awaited<ReturnType<PlanningEngine["process"]>>[] }> {
    const expedition = state.expeditions?.[expeditionId]
    if (!expedition) return { objectives: [], results: [] }

    const objectives = this.objectiveSynthesizer.synthesize(knowledge, expedition)
    const results: Awaited<ReturnType<PlanningEngine["process"]>>[] = []

    for (const obj of objectives) {
      const result = await this.process({
        actor: "pce",
        capability: "AddObjective",
        payload: {
          id: obj.id,
          expeditionId,
          title: obj.title,
          purpose: obj.purpose,
          synthesizedFrom: obj.synthesizedFrom,
        },
      })
      results.push(result)
    }

    return { objectives, results }
  }

  async recordDiscovery(
    id: string,
    expeditionId: string,
    description: string,
    context: string,
    impact: "low" | "medium" | "high" | "critical",
    state: CanonicalState,
  ): Promise<Awaited<ReturnType<PlanningEngine["process"]>> & { evaluation: ReturnType<DiscoveryEvaluator["evaluate"]> }> {
    const result = await this.process({
      actor: "pce",
      capability: "RecordDiscovery",
      payload: { id, expeditionId, description, context, impact },
    })

    const discovery = { id, expeditionId, description, context, impact }
    const affectedObjectives = Object.values(state.objectives || {}).filter((o) => o.expeditionId === expeditionId)
    const evaluation = this.discoveryEvaluator.evaluate(discovery, affectedObjectives)

    return { ...result, evaluation }
  }

  async makeDecision(
    id: string,
    expeditionId: string,
    title: string,
    chosenAlternative: number,
    context: Record<string, unknown> = {},
  ): Promise<Awaited<ReturnType<PlanningEngine["process"]>> & { adrEvaluation: ReturnType<DecisionEvaluator["evaluate"]> }> {
    const result = await this.process({
      actor: "pce",
      capability: "RecordDecision",
      payload: {
        id,
        expeditionId,
        title,
        chosenAlternative,
        alternatives: context.alternatives,
        consequences: context.consequences,
      },
    })

    const decision = {
      id,
      expeditionId,
      title,
      chosenAlternative,
      alternatives: context.alternatives as unknown[] | undefined,
      consequences: context.consequences as { positive?: unknown[]; negative?: unknown[] } | undefined,
    }
    const adrEvaluation = this.decisionEvaluator.evaluate(decision)

    return { ...result, adrEvaluation }
  }

  evaluateDiscovery(
    discovery: { id: string; impact?: string },
    affectedObjectives: Array<{ id: string } | string> = [],
  ): ReturnType<DiscoveryEvaluator["evaluate"]> {
    return this.discoveryEvaluator.evaluate(discovery, affectedObjectives)
  }

  evaluateDecision(decision: {
    id: string
    alternatives?: unknown[]
    consequences?: { positive?: unknown[]; negative?: unknown[] }
  }): ReturnType<DecisionEvaluator["evaluate"]> {
    return this.decisionEvaluator.evaluate(decision)
  }

  estimateConfidence(state: { objectives?: Record<string, { status: string }>; discoveries?: Record<string, { impact: string }>; decisions?: Record<string, { status: string }> }): ReturnType<PlanningConfidence["calculate"]> {
    return this.confidenceEstimator.calculate(state)
  }

  recognizeSideQuest(description: string, parentObjectiveId?: string, expeditionId?: string): ReturnType<SideQuestManager["recognize"]> {
    return this.sideQuestManager.recognize(description, parentObjectiveId, expeditionId)
  }

  resolveSideQuest(sideQuestId: string): ReturnType<SideQuestManager["resolve"]> {
    return this.sideQuestManager.resolve(sideQuestId)
  }

  getActiveSideQuests(expeditionId?: string): ReturnType<SideQuestManager["getActive"]> {
    return this.sideQuestManager.getActive(expeditionId)
  }
}
