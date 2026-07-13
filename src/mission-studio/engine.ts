// ============================================================
// MISSION STUDIO: Engine
// ============================================================
// Pure, read-only planning orchestrator. Consumes canonical
// observations, produces immutable PlanningSessions and
// ApprovedMissionModelSnapshots.
//
// No ExecutionGate, EventStore, RuntimeEngine, or adapter imports.
// ============================================================

import crypto from "crypto"
import type { PlanningObservation } from "../planning/observation.js"
import type {
  Evidence,
  EvidenceCollection,
  Unknown,
  ConfidenceResult,
  WorldModel,
  WorldModelNode,
  WorldModelEdge,
  PlanningDecision,
  PlanningQuestion,
  PlanningSession,
  PlanningOperation,
  Proposal,
  MissionProposal,
  ExpeditionProposal,
  ObjectiveProposal,
  ApprovedMissionModelSnapshot,
  MissionStudioConfig,
  MissionStudioResult,
} from "./types.js"
import { MissionIntake } from "./intake.js"
import { buildSnapshotLineage } from "./snapshot-lineage.js"

export class MissionStudio {
  private intake: MissionIntake
  private config: Required<MissionStudioConfig>

  constructor(config: MissionStudioConfig = {}, intake = new MissionIntake()) {
    this.intake = intake
    this.config = {
      approvalThreshold: config.approvalThreshold ?? 0.7,
      unknownsBlockApproval: config.unknownsBlockApproval ?? true,
    }
  }

  // ============================================================
  // Session lifecycle
  // ============================================================

  startSession(observations: PlanningObservation[]): PlanningSession {
    const normalized = this.intake.normalize(observations)
    const evidence = this.intake.buildEvidenceCollection(normalized)
    const unknowns = this.generateUnknowns(normalized, evidence)
    const confidence = this.computeConfidence(normalized, evidence, unknowns)
    const worldModel = this.buildWorldModel(normalized, evidence, unknowns, confidence)

    return {
      id: this.sessionId(normalized),
      createdAt: Date.now(),
      observations: normalized,
      evidence,
      questions: this.generateQuestions(unknowns, normalized),
      unknowns,
      confidence,
      worldModel,
      planningDecisions: [],
      approvalState: "draft",
    }
  }

  buildWorldModel(
    observations: PlanningObservation[],
    evidence: EvidenceCollection,
    unknowns: Unknown[],
    confidence: ConfidenceResult,
  ): WorldModel {
    const nodes = new Map<string, WorldModelNode>()
    const edges: WorldModelEdge[] = []

    // Build mission nodes
    for (const obs of observations.filter((o) => o.type === "mission")) {
      const node: WorldModelNode = {
        id: this.nodeId("mission", obs),
        kind: "mission",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Mission",
        description: typeof obs.payload.purpose === "string" ? obs.payload.purpose : undefined,
        purpose: typeof obs.payload.purpose === "string" ? obs.payload.purpose : "",
        expeditionIds: [],
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build expedition nodes and link to missions
    for (const obs of observations.filter((o) => o.type === "expedition")) {
      const missionId = this.findParentMissionId(obs, observations, nodes)
      const node: WorldModelNode = {
        id: this.nodeId("expedition", obs),
        kind: "expedition",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Expedition",
        description: typeof obs.payload.goal === "string" ? obs.payload.goal : undefined,
        missionId: missionId || "",
        goal: typeof obs.payload.goal === "string" ? obs.payload.goal : "",
        objectiveIds: [],
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)

      if (missionId) {
        edges.push({
          id: this.edgeId("expedition", node.id, missionId),
          source: node.id,
          target: missionId,
          relation: "parent_of",
          observationIds: [obs.id],
        })
      }
    }

    // Build objective nodes and link to expeditions
    for (const obs of observations.filter((o) => o.type === "objective")) {
      const expeditionId = this.findParentExpeditionId(obs, observations, nodes)
      const node: WorldModelNode = {
        id: this.nodeId("objective", obs),
        kind: "objective",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Objective",
        description: typeof obs.payload.description === "string" ? obs.payload.description : undefined,
        title: typeof obs.payload.title === "string" ? obs.payload.title : obs.payload.subject as string || "Unnamed Objective",
        expeditionId: expeditionId || "",
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)

      if (expeditionId) {
        edges.push({
          id: this.edgeId("objective", node.id, expeditionId),
          source: expeditionId,
          target: node.id,
          relation: "parent_of",
          observationIds: [obs.id],
        })
      }
    }

    // Build component nodes
    for (const obs of observations.filter((o) => o.type === "component" || o.type === "language" || o.type === "framework")) {
      const node: WorldModelNode = {
        id: this.nodeId("component", obs),
        kind: "component",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || String(obs.payload.name || obs.type),
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build capability nodes
    for (const obs of observations.filter((o) => o.type === "capability")) {
      const node: WorldModelNode = {
        id: this.nodeId("capability", obs),
        kind: "capability",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Capability",
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build actor nodes
    for (const obs of observations.filter((o) => o.type === "actor")) {
      const node: WorldModelNode = {
        id: this.nodeId("actor", obs),
        kind: "actor",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Actor",
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build constraint nodes
    for (const obs of observations.filter((o) => o.type === "constraint")) {
      const node: WorldModelNode = {
        id: this.nodeId("constraint", obs),
        kind: "constraint",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Constraint",
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build risk nodes
    for (const obs of observations.filter((o) => o.type === "risk")) {
      const node: WorldModelNode = {
        id: this.nodeId("risk", obs),
        kind: "risk",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Risk",
        severity: ["low", "medium", "high", "critical"].includes(String(obs.payload.severity)) ? (obs.payload.severity as any) : "medium",
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build assumption nodes
    for (const obs of observations.filter((o) => o.type === "assumption")) {
      const node: WorldModelNode = {
        id: this.nodeId("assumption", obs),
        kind: "assumption",
        name: typeof obs.payload.name === "string" ? obs.payload.name : obs.payload.subject as string || "Unnamed Assumption",
        observationIds: [obs.id],
        evidenceRefs: [evidence.byObservationId.get(obs.id)?.id].filter(Boolean) as string[],
        confidence: this.confidenceToNumber(obs.confidence),
      }
      nodes.set(node.id, node)
    }

    // Build unknown nodes from unknowns
    for (const u of unknowns) {
      const node: WorldModelNode = {
        id: this.hash(`unknown-${u.id}`),
        kind: "unknown",
        name: u.question,
        description: u.reason,
        observationIds: u.observationIds || [],
        evidenceRefs: [],
        confidence: 0,
      }
      nodes.set(node.id, node)
    }

    return {
      version: 1,
      nodes,
      edges,
      evidence,
      unknowns,
      confidence,
      planningDecisions: [],
    }
  }

  generateUnknowns(observations: PlanningObservation[], evidence: EvidenceCollection): Unknown[] {
    const unknowns: Unknown[] = []

    // Unknowns from low-confidence observations
    for (const obs of observations) {
      if (obs.confidence === "low" || obs.confidence === "unknown") {
        unknowns.push({
          id: this.hash(`unknown-confidence-${obs.id}`),
          question: `What additional evidence can strengthen the ${obs.type} observation from ${obs.sourceAdapter}?`,
          reason: `Observation ${obs.id} has low or unknown confidence.`,
          requiredFor: [obs.id],
          blocking: false,
          confidenceImpact: 0.1,
          observationIds: [obs.id],
        })
      }
    }

    // Unknowns from missing mission/expedition/objective linkage
    const objectives = observations.filter((o) => o.type === "objective")
    const expeditions = observations.filter((o) => o.type === "expedition")

    for (const obj of objectives) {
      const hasParent = expeditions.some((e) =>
        String(e.payload.subject || e.payload.name || "").includes(String(obj.payload.expeditionSubject || ""))
      )
      if (!hasParent && expeditions.length > 0) {
        unknowns.push({
          id: this.hash(`unknown-parent-${obj.id}`),
          question: `Which expedition does objective ${obj.payload.subject || obj.payload.name || obj.id} belong to?`,
          reason: "Objective lacks a clear parent expedition linkage.",
          requiredFor: [obj.id],
          blocking: false,
          confidenceImpact: 0.15,
          observationIds: [obj.id],
        })
      }
    }

    // Unknowns from missing purpose/goal
    for (const obs of observations.filter((o) => o.type === "mission" || o.type === "expedition")) {
      const payload = obs.payload
      if (!payload.purpose && !payload.goal && !payload.description) {
        unknowns.push({
          id: this.hash(`unknown-purpose-${obs.id}`),
          question: `What is the purpose or goal of ${obs.type} ${obs.payload.subject || obs.payload.name || obs.id}?`,
          reason: `${obs.type} observation lacks purpose/goal.`,
          requiredFor: [obs.id],
          blocking: false,
          confidenceImpact: 0.1,
          observationIds: [obs.id],
        })
      }
    }

    return unknowns
  }

  generateQuestions(unknowns: Unknown[], observations: PlanningObservation[]): PlanningQuestion[] {
    return unknowns.map((u) => ({
      id: this.hash(`question-${u.id}`),
      text: u.question,
      reason: u.reason,
      unknownId: u.id,
      observationIds: u.observationIds,
      answered: false,
    }))
  }

  computeConfidence(observations: PlanningObservation[], evidence: EvidenceCollection, unknowns: Unknown[]): ConfidenceResult {
    const total = observations.length || 1
    const confidenceMap = { certain: 1, high: 0.8, medium: 0.5, low: 0.2, unknown: 0 }

    const observationCoverage = Math.min(1, total / 10)
    const evidenceQuality =
      observations.reduce((sum, obs) => sum + confidenceMap[obs.confidence || "unknown"], 0) / total

    const consistency = 1 - (unknowns.filter((u) => u.blocking).length * 0.1)
    const completeness =
      observations.filter((o) => {
        const p = o.payload
        return p.subject || p.name || p.title || p.description || p.purpose || p.goal
      }).length / total

    const inferenceDepth = Math.min(1, evidence.evidence.length / Math.max(1, total))
    const unknownImpact = Math.min(1, unknowns.reduce((sum, u) => sum + u.confidenceImpact, 0))
    const contradictionCount = 0 // Reserved for future contradiction detection

    const overall = Math.max(
      0,
      Math.min(
        1,
        observationCoverage * 0.2 +
          evidenceQuality * 0.25 +
          consistency * 0.2 +
          completeness * 0.15 +
          inferenceDepth * 0.1 -
          unknownImpact * 0.1,
      ),
    )

    return {
      overall,
      observationCoverage,
      evidenceQuality,
      consistency,
      completeness,
      inferenceDepth,
      unknownImpact,
      contradictionCount,
    }
  }

  proposeMissions(session: PlanningSession): MissionProposal[] {
    const missions = Array.from(session.worldModel.nodes.values()).filter((n) => n.kind === "mission")
    return missions.map((m) => ({
      id: this.hash(`proposal-mission-${m.id}`),
      kind: "mission",
      name: m.name,
      description: m.description,
      purpose: (m as any).purpose || "",
      evidenceRefs: m.evidenceRefs,
      observationIds: m.observationIds,
      confidence: m.confidence,
      rationale: `Proposed from mission observation ${m.observationIds.join(", ")}`,
    }))
  }

  proposeExpeditions(session: PlanningSession): ExpeditionProposal[] {
    const expeditions = Array.from(session.worldModel.nodes.values()).filter((n) => n.kind === "expedition")
    return expeditions.map((e) => ({
      id: this.hash(`proposal-expedition-${e.id}`),
      kind: "expedition",
      name: e.name,
      description: e.description,
      missionId: (e as any).missionId || "",
      goal: (e as any).goal || "",
      evidenceRefs: e.evidenceRefs,
      observationIds: e.observationIds,
      confidence: e.confidence,
      rationale: `Proposed from expedition observation ${e.observationIds.join(", ")}`,
    }))
  }

  proposeObjectives(session: PlanningSession): ObjectiveProposal[] {
    const objectives = Array.from(session.worldModel.nodes.values()).filter((n) => n.kind === "objective")
    return objectives.map((o) => ({
      id: this.hash(`proposal-objective-${o.id}`),
      kind: "objective",
      name: o.name,
      description: o.description,
      expeditionId: (o as any).expeditionId || "",
      title: (o as any).title || o.name,
      evidenceRefs: o.evidenceRefs,
      observationIds: o.observationIds,
      confidence: o.confidence,
      rationale: `Proposed from objective observation ${o.observationIds.join(", ")}`,
    }))
  }

  // ============================================================
  // Wizard / Planning Operations
  // ============================================================

  plan(session: PlanningSession, operation: PlanningOperation): MissionStudioResult<unknown> {
    switch (operation.kind) {
      case "ApproveProposal":
        return this.approveProposal(session, operation.proposalId)
      case "RejectProposal":
        return this.rejectProposal(session, operation.proposalId)
      case "MergeObjectives":
        return this.mergeObjectives(session, operation.sourceIds, operation.targetName)
      case "SplitObjective":
        return this.splitObjective(session, operation.sourceId, operation.targets)
      case "RenameComponent":
        return this.renameNode(session, operation.nodeId, operation.newName)
      case "AcceptObservation":
        return this.acceptObservation(session, operation.observationId)
      case "RejectObservation":
        return this.rejectObservation(session, operation.observationId)
      case "AddConstraint":
        return this.addConstraint(session, operation.name, operation.description, operation.observationIds)
      case "RemoveAssumption":
        return this.removeAssumption(session, operation.nodeId)
      case "RequestEvidence":
        return this.requestEvidence(session, operation.question, operation.reason)
      case "GenerateClarificationQuestions":
        return this.regenerateQuestions(session)
      case "PrioritizeExpeditions":
        return this.prioritizeExpeditions(session, operation.expeditionIds)
      case "PrioritizeObjectives":
        return this.prioritizeObjectives(session, operation.objectiveIds)
      case "EstimateRisk":
        return this.estimateRisk(session, operation.nodeId, operation.severity)
      case "RecordDecision":
        return this.recordDecision(session, operation.type, operation.rationale, operation.evidenceRefs)
      default:
        return { success: false, session, error: "Unknown planning operation" }
    }
  }

  answerQuestion(session: PlanningSession, questionId: string, answer: string): PlanningSession {
    const questions = session.questions.map((q) =>
      q.id === questionId ? { ...q, answered: true, answer } : q,
    )
    return {
      ...session,
      questions,
      worldModel: {
        ...session.worldModel,
        version: session.worldModel.version + 1,
      },
    }
  }

  approve(
    session: PlanningSession,
    parentSnapshot?: ApprovedMissionModelSnapshot,
    actor?: string,
  ): MissionStudioResult<ApprovedMissionModelSnapshot> {
    const unknownsBlock = this.config.unknownsBlockApproval && session.unknowns.some((u) => u.blocking)
    if (unknownsBlock) {
      return { success: false, session, error: "Blocking unknowns prevent approval" }
    }

    if (session.confidence.overall < this.config.approvalThreshold) {
      return {
        success: false,
        session,
        error: `Confidence ${session.confidence.overall.toFixed(2)} below threshold ${this.config.approvalThreshold}`,
      }
    }

    const proposals: Proposal[] = [
      ...this.proposeMissions(session),
      ...this.proposeExpeditions(session),
      ...this.proposeObjectives(session),
    ]

    const snapshot: ApprovedMissionModelSnapshot = {
      id: this.hash(`approved-${session.id}-${session.worldModel.version}`),
      version: "1.0.0",
      signature: this.sign(session),
      sessionId: session.id,
      worldModel: session.worldModel,
      proposals,
      timestamp: Date.now(),
      lineage: undefined,
    }

    snapshot.lineage = buildSnapshotLineage(snapshot, parentSnapshot, actor)

    return {
      success: true,
      session: {
        ...session,
        approvalState: "approved",
      },
      data: snapshot,
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private approveProposal(session: PlanningSession, proposalId: string): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-approve-${proposalId}`),
      type: "ApproveProposal",
      rationale: `Approved proposal ${proposalId}`,
      evidenceRefs: [],
      observationIds: [],
      timestamp: Date.now(),
    }
    return {
      success: true,
      session: this.addDecision(session, decision),
    }
  }

  private rejectProposal(session: PlanningSession, proposalId: string): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-reject-${proposalId}`),
      type: "RejectProposal",
      rationale: `Rejected proposal ${proposalId}`,
      evidenceRefs: [],
      observationIds: [],
      timestamp: Date.now(),
    }
    return {
      success: true,
      session: this.addDecision(session, decision),
    }
  }

  private mergeObjectives(
    session: PlanningSession,
    sourceIds: string[],
    targetName: string,
  ): MissionStudioResult<unknown> {
    const nodes = new Map(session.worldModel.nodes)
    const sources = sourceIds.map((id) => nodes.get(id)).filter(Boolean) as WorldModelNode[]
    if (sources.length === 0) return { success: false, session, error: "No source objectives found" }

    const first = sources[0]
    const merged: WorldModelNode = {
      ...first,
      id: this.hash(`merged-${sourceIds.sort().join("-")}`),
      name: targetName,
      observationIds: sources.flatMap((s) => s.observationIds),
      evidenceRefs: sources.flatMap((s) => s.evidenceRefs),
    }

    nodes.set(merged.id, merged)
    for (const id of sourceIds) nodes.delete(id)

    return {
      success: true,
      session: this.updateWorldModel(session, nodes),
    }
  }

  private splitObjective(
    session: PlanningSession,
    sourceId: string,
    targets: Array<{ name: string; description?: string }>,
  ): MissionStudioResult<unknown> {
    const nodes = new Map(session.worldModel.nodes)
    const source = nodes.get(sourceId)
    if (!source || source.kind !== "objective") return { success: false, session, error: "Source objective not found" }

    nodes.delete(sourceId)
    for (const target of targets) {
      const split: WorldModelNode = {
        ...source,
        id: this.hash(`split-${sourceId}-${target.name}`),
        name: target.name,
        description: target.description,
        observationIds: source.observationIds,
        evidenceRefs: source.evidenceRefs,
      }
      nodes.set(split.id, split)
    }

    return {
      success: true,
      session: this.updateWorldModel(session, nodes),
    }
  }

  private renameNode(session: PlanningSession, nodeId: string, newName: string): MissionStudioResult<unknown> {
    const nodes = new Map(session.worldModel.nodes)
    const node = nodes.get(nodeId)
    if (!node) return { success: false, session, error: "Node not found" }

    nodes.set(nodeId, { ...node, name: newName })
    return { success: true, session: this.updateWorldModel(session, nodes) }
  }

  private acceptObservation(session: PlanningSession, observationId: string): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-accept-obs-${observationId}`),
      type: "AcceptObservation",
      rationale: `Accepted observation ${observationId}`,
      evidenceRefs: [session.evidence.byObservationId.get(observationId)?.id].filter(Boolean) as string[],
      observationIds: [observationId],
      timestamp: Date.now(),
    }
    return { success: true, session: this.addDecision(session, decision) }
  }

  private rejectObservation(session: PlanningSession, observationId: string): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-reject-obs-${observationId}`),
      type: "RejectObservation",
      rationale: `Rejected observation ${observationId}`,
      evidenceRefs: [],
      observationIds: [observationId],
      timestamp: Date.now(),
    }
    return { success: true, session: this.addDecision(session, decision) }
  }

  private addConstraint(
    session: PlanningSession,
    name: string,
    description: string,
    observationIds: string[],
  ): MissionStudioResult<unknown> {
    const nodes = new Map(session.worldModel.nodes)
    const constraint: WorldModelNode = {
      id: this.hash(`constraint-${name}-${observationIds.sort().join("-")}`),
      kind: "constraint",
      name,
      description,
      observationIds,
      evidenceRefs: observationIds
        .map((id) => session.evidence.byObservationId.get(id)?.id)
        .filter(Boolean) as string[],
      confidence: 1,
    }
    nodes.set(constraint.id, constraint)
    return { success: true, session: this.updateWorldModel(session, nodes) }
  }

  private removeAssumption(session: PlanningSession, nodeId: string): MissionStudioResult<unknown> {
    const nodes = new Map(session.worldModel.nodes)
    const node = nodes.get(nodeId)
    if (!node || node.kind !== "assumption") return { success: false, session, error: "Assumption not found" }

    nodes.delete(nodeId)
    const decision: PlanningDecision = {
      id: this.hash(`decision-remove-assumption-${nodeId}`),
      type: "RemoveAssumption",
      rationale: `Removed assumption ${nodeId}`,
      evidenceRefs: node.evidenceRefs,
      observationIds: node.observationIds,
      timestamp: Date.now(),
    }
    return { success: true, session: this.addDecision(this.updateWorldModel(session, nodes), decision) }
  }

  private requestEvidence(session: PlanningSession, question: string, reason: string): MissionStudioResult<unknown> {
    const unknown: Unknown = {
      id: this.hash(`unknown-request-${question}`),
      question,
      reason,
      blocking: false,
      confidenceImpact: 0.1,
    }
    return {
      success: true,
      session: {
        ...session,
        unknowns: [...session.unknowns, unknown],
        questions: [...session.questions, ...this.generateQuestions([unknown], session.observations)],
        worldModel: {
          ...session.worldModel,
          unknowns: [...session.worldModel.unknowns, unknown],
          version: session.worldModel.version + 1,
        },
      },
    }
  }

  private regenerateQuestions(session: PlanningSession): MissionStudioResult<unknown> {
    return {
      success: true,
      session: {
        ...session,
        questions: this.generateQuestions(session.unknowns, session.observations),
      },
    }
  }

  private prioritizeExpeditions(session: PlanningSession, expeditionIds: string[]): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-prioritize-${expeditionIds.sort().join("-")}`),
      type: "PrioritizeExpeditions",
      rationale: `Prioritized expeditions: ${expeditionIds.join(", ")}`,
      evidenceRefs: [],
      observationIds: expeditionIds,
      timestamp: Date.now(),
      metadata: { order: expeditionIds },
    }
    return { success: true, session: this.addDecision(session, decision) }
  }

  private prioritizeObjectives(session: PlanningSession, objectiveIds: string[]): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-prioritize-obj-${objectiveIds.sort().join("-")}`),
      type: "PrioritizeObjectives",
      rationale: `Prioritized objectives: ${objectiveIds.join(", ")}`,
      evidenceRefs: [],
      observationIds: objectiveIds,
      timestamp: Date.now(),
      metadata: { order: objectiveIds },
    }
    return { success: true, session: this.addDecision(session, decision) }
  }

  private estimateRisk(
    session: PlanningSession,
    nodeId: string,
    severity: "low" | "medium" | "high" | "critical",
  ): MissionStudioResult<unknown> {
    const nodes = new Map(session.worldModel.nodes)
    const node = nodes.get(nodeId)
    if (!node || node.kind !== "risk") return { success: false, session, error: "Risk node not found" }

    const riskNode: WorldModelNode = { ...node, severity }
    nodes.set(nodeId, riskNode)
    const decision: PlanningDecision = {
      id: this.hash(`decision-risk-${nodeId}-${severity}`),
      type: "EstimateRisk",
      rationale: `Estimated risk ${nodeId} as ${severity}`,
      evidenceRefs: node.evidenceRefs,
      observationIds: node.observationIds,
      timestamp: Date.now(),
    }
    return { success: true, session: this.addDecision(this.updateWorldModel(session, nodes), decision) }
  }

  private recordDecision(
    session: PlanningSession,
    type: string,
    rationale: string,
    evidenceRefs: string[],
  ): MissionStudioResult<unknown> {
    const decision: PlanningDecision = {
      id: this.hash(`decision-${type}-${rationale}`),
      type,
      rationale,
      evidenceRefs,
      observationIds: [],
      timestamp: Date.now(),
    }
    return { success: true, session: this.addDecision(session, decision) }
  }

  // ============================================================
  // World model mutation helpers (always return new session)
  // ============================================================

  private updateWorldModel(session: PlanningSession, nodes: Map<string, WorldModelNode>): PlanningSession {
    return {
      ...session,
      worldModel: {
        ...session.worldModel,
        nodes,
        version: session.worldModel.version + 1,
      },
    }
  }

  private addDecision(session: PlanningSession, decision: PlanningDecision): PlanningSession {
    return {
      ...session,
      planningDecisions: [...session.planningDecisions, decision],
      worldModel: {
        ...session.worldModel,
        planningDecisions: [...session.worldModel.planningDecisions, decision],
        version: session.worldModel.version + 1,
      },
    }
  }

  // ============================================================
  // Deterministic identity
  // ============================================================

  private sessionId(observations: PlanningObservation[]): string {
    const payload = observations
      .map((o) => `${o.id}:${o.sourceAdapter}:${o.type}:${o.timestamp}`)
      .sort()
      .join("|")
    return this.hash(`session-${payload}`)
  }

  private nodeId(kind: string, obs: PlanningObservation): string {
    const identity = `${kind}-${obs.id}-${obs.sourceAdapter}-${obs.timestamp}`
    return this.hash(identity)
  }

  private edgeId(kind: string, source: string, target: string): string {
    return this.hash(`edge-${kind}-${source}-${target}`)
  }

  private sign(session: PlanningSession): string {
    const data = JSON.stringify({
      sessionId: session.id,
      version: session.worldModel.version,
      nodeCount: session.worldModel.nodes.size,
      evidenceCount: session.evidence.evidence.length,
      unknownCount: session.unknowns.length,
    })
    return crypto.createHash("sha256").update(data).digest("hex")
  }

  private hash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)
  }

  private confidenceToNumber(confidence?: string): number {
    const map: Record<string, number> = { certain: 1, high: 0.8, medium: 0.5, low: 0.2, unknown: 0 }
    return map[confidence || "unknown"] ?? 0
  }

  private findParentMissionId(
    obs: PlanningObservation,
    observations: PlanningObservation[],
    nodes: Map<string, WorldModelNode>,
  ): string | undefined {
    const subject = String(obs.payload.subject || obs.payload.name || "")
    // Look for explicit missionSubject in metadata
    const missionSubject = obs.payload.missionSubject
    if (typeof missionSubject === "string") {
      const mission = observations.find((o) => o.type === "mission" && (o.payload.subject === missionSubject || o.payload.name === missionSubject))
      if (mission) {
        const id = this.nodeId("mission", mission)
        if (nodes.has(id)) return id
      }
    }
    // Fallback: first mission node
    for (const [id, node] of nodes) {
      if (node.kind === "mission") return id
    }
    return undefined
  }

  private findParentExpeditionId(
    obs: PlanningObservation,
    observations: PlanningObservation[],
    nodes: Map<string, WorldModelNode>,
  ): string | undefined {
    const expeditionSubject = obs.payload.expeditionSubject
    if (typeof expeditionSubject === "string") {
      const expedition = observations.find((o) => o.type === "expedition" && (o.payload.subject === expeditionSubject || o.payload.name === expeditionSubject))
      if (expedition) {
        const id = this.nodeId("expedition", expedition)
        if (nodes.has(id)) return id
      }
    }
    // Fallback: first expedition node
    for (const [id, node] of nodes) {
      if (node.kind === "expedition") return id
    }
    return undefined
  }
}

export function createMissionStudio(config?: MissionStudioConfig, intake?: MissionIntake): MissionStudio {
  return new MissionStudio(config, intake)
}
