// ============================================================
// API: System Entrypoint
// ============================================================
// The API layer is the ONLY external entrypoint.
// It forwards ALL requests to the ExecutionGate.
// It does NOT mutate state, validate, or execute.
// It ONLY: receives requests, forwards to gate, returns responses.
// ============================================================

import crypto from "crypto"
import type { IntentRequest, IntentResponse, CapabilityInvocation } from "../types/index.js"
import type { ExecutionGate, ExecutionGateError } from "../control/execution-gate.js"
import type { PlanningEngine } from "../planning/index.js"
import type { MissionStudio } from "../mission-studio/index.js"
import type { PlanningObservation } from "../planning/observation.js"
import type { AdapterRegistry } from "../adapters/registry.js"
import type { ApprovedMissionModelSnapshot } from "../mission-studio/types.js"
import type { SnapshotStore } from "../mission-studio/snapshot-store.js"
import { validateIntentRequest } from "../validation/validator.js"
import { translateCapability } from "../capability/registry.js"
import { computeEventHash } from "../core/hash.js"
import { collectPlanningObservations } from "../mission-studio/adapter-observation-collector.js"
import { snapshotToGenesisInput } from "../genesis/snapshot-bridge.js"
import { certifyGenesisIntake, buildGenesisIntegrityProof } from "../genesis/certification.js"
import { reconstructSessionFromSnapshot, diffSnapshots, getSnapshotLineage } from "../mission-studio/snapshot-lineage.js"
import { documentFromKnowledgeBase } from "../documentation/documentation-expedition.js"

export class SynthAPI {
  constructor(
    private gate: ExecutionGate,
    private planning?: PlanningEngine,
    private missionStudio?: MissionStudio,
    private adapterRegistry?: AdapterRegistry,
    private snapshotStore?: SnapshotStore,
  ) {}

  /**
   * Collect PlanningObservations from params.observations plus any requested adapters.
   */
  private async collectObservations(params: Record<string, unknown>): Promise<PlanningObservation[]> {
    const provided = (params.observations || []) as PlanningObservation[]

    if (!this.adapterRegistry || !Array.isArray(params.adapterNames) || params.adapterNames.length === 0) {
      return provided
    }

    try {
      const fromAdapters = await collectPlanningObservations(this.adapterRegistry, {
        adapterNames: params.adapterNames as string[],
        enrich: params.enrich !== false,
      })
      return [...fromAdapters, ...provided]
    } catch (err) {
      // If adapter collection fails, fall back to provided observations rather than failing silently.
      return provided
    }
  }

  /** Handle an intent request — forwarded to ExecutionGate */
  async handleIntent(req: IntentRequest): Promise<IntentResponse> {
    // Schema validation at API boundary (structural only)
    const validation = validateIntentRequest(req)
    if (!validation.valid) {
      return {
        status: "error",
        error: validation.errors.map((e) => `${e.field}: ${e.message}`).join(", "),
        traceId: `pre-gate-${req.actor}-${req.capability}`,
      }
    }

    // ASC-001: Translate legacy Ticket capability names → WorkItem at API boundary
    const invocation: CapabilityInvocation = {
      actor: req.actor,
      capability: translateCapability(req.capability),
      payload: req.payload,
      context: req.context,
    }

    try {
      // ALL mutations go through the ExecutionGate
      const { result, contract } = await this.gate.execute(invocation)

      return {
        status: "ok",
        result: result.output,
        traceId: result.transaction.id,
        // Include contract metadata for audit
        meta: {
          contractSatisfied: contract.finalState === "COMMITTED",
          phasesExecuted: contract.phases.length,
        },
      }
    } catch (err) {
      if (err instanceof Error && err.name === "ExecutionGateError") {
        const gateErr = err as ExecutionGateError
        return {
          status: "error",
          error: `[${gateErr.phase}] ${gateErr.message}`,
          traceId: gateErr.contract.transactionId,
          meta: {
            contractSatisfied: false,
            failedPhase: gateErr.phase,
          },
        }
      }

      return {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        traceId: `error-${req.actor}-${req.capability}`,
      }
    }
  }

  /** Planning API — delegates to PlanningEngine when available */
  async plan(req: { operation: string; params?: Record<string, unknown>; context?: Record<string, unknown> }): Promise<unknown> {
    if (!this.planning) {
      return { status: "error", error: "Planning engine not configured" }
    }

    const { operation, params = {}, context = {} } = req
    switch (operation) {
      case "classifyIntent":
        return this.planning.intentClassifier.classify(params, context)
      case "generateQuestions":
        return this.planning.questionGenerator.generate(params as { capability: string; payload?: Record<string, unknown> }, context)
      case "extractKnowledge":
        return this.planning.knowledgeExtractor.extract(params.documents as Array<string | { content?: string }>)
      case "chartMission":
        return this.planning.chartMission(String(params.id), String(params.name), String(params.purpose || ""), context)
      case "commissionMission":
        return this.planning.commissionMission(String(params.id), context)
      case "chartExpedition":
        return this.planning.chartExpedition(String(params.id), String(params.missionId), String(params.name), String(params.goal || ""), context)
      case "synthesizeObjectives":
        return this.planning.synthesizeObjectives(String(params.expeditionId), params.knowledge as any, params.state as any)
      case "recordDiscovery":
        return this.planning.recordDiscovery(String(params.id), String(params.expeditionId), String(params.description), String(params.context || ""), (params.impact || "medium") as any, params.state as any)
      case "makeDecision":
        return this.planning.makeDecision(String(params.id), String(params.expeditionId), String(params.title), Number(params.chosenAlternative), context)
      case "evaluateDiscovery":
        return this.planning.evaluateDiscovery(params.discovery as any, params.affectedObjectives as any)
      case "evaluateDecision":
        return this.planning.evaluateDecision(params.decision as any)
      case "estimateConfidence":
        return this.planning.estimateConfidence(params.state as any)
      default:
        return { status: "error", error: `Unknown planning operation: ${operation}` }
    }
  }

  /** Adapter API — lifecycle and observation operations on the adapter registry */
  async adapterOperation(req: { operation: string; params?: Record<string, unknown> }): Promise<unknown> {
    if (!this.adapterRegistry) {
      return { status: "error", error: "Adapter registry not configured" }
    }

    const { operation, params = {} } = req

    switch (operation) {
      case "list": {
        return { status: "ok", adapters: this.adapterRegistry.list() }
      }
      case "status": {
        const name = String(params.name || "")
        if (!name) return { status: "error", error: "name required" }
        const adapter = this.adapterRegistry.get(name)
        if (!adapter) return { status: "error", error: `Adapter not found: ${name}` }
        return { status: "ok", state: adapter.state, health: adapter.health, metadata: adapter.metadata }
      }
      case "observe": {
        const adapterNames = Array.isArray(params.adapterNames)
          ? (params.adapterNames as string[])
          : undefined
        try {
          const observations = await collectPlanningObservations(this.adapterRegistry, {
            adapterNames,
            enrich: params.enrich !== false,
          })
          return { status: "ok", observations }
        } catch (err) {
          return { status: "error", error: err instanceof Error ? err.message : String(err) }
        }
      }
      default:
        return { status: "error", error: `Unknown adapter operation: ${operation}` }
    }
  }

  /** Mission Studio API — delegates to MissionStudio when available */
  async missionStudioOperation(req: { operation: string; params?: Record<string, unknown> }): Promise<unknown> {
    if (!this.missionStudio) {
      return { status: "error", error: "Mission Studio not configured" }
    }

    const { operation, params = {} } = req
    const observations = await this.collectObservations(params)

    switch (operation) {
      case "startSession":
        return { status: "ok", session: this.missionStudio.startSession(observations) }
      case "generateQuestions": {
        const session = this.missionStudio.startSession(observations)
        return { status: "ok", questions: session.questions }
      }
      case "computeConfidence": {
        const session = this.missionStudio.startSession(observations)
        return { status: "ok", confidence: session.confidence }
      }
      case "buildWorldModel": {
        const session = this.missionStudio.startSession(observations)
        return { status: "ok", worldModel: session.worldModel }
      }
      case "proposeMissions": {
        const session = this.missionStudio.startSession(observations)
        return { status: "ok", proposals: this.missionStudio.proposeMissions(session) }
      }
      case "proposeExpeditions": {
        const session = this.missionStudio.startSession(observations)
        return { status: "ok", proposals: this.missionStudio.proposeExpeditions(session) }
      }
      case "proposeObjectives": {
        const session = this.missionStudio.startSession(observations)
        return { status: "ok", proposals: this.missionStudio.proposeObjectives(session) }
      }
      case "planOperation": {
        const session = params.session as any
        const op = params.operation as any
        if (!session || !op) return { status: "error", error: "session and operation required" }
        const result = this.missionStudio.plan(session, op)
        return { status: result.success ? "ok" : "error", result }
      }
      case "approveModel": {
        const session = params.session as any
        if (!session) return { status: "error", error: "session required" }
        const parentSnapshot = params.parentSnapshot as ApprovedMissionModelSnapshot | undefined
        const actor = typeof params.actor === "string" ? params.actor : undefined
        const result = this.missionStudio.approve(session, parentSnapshot, actor)
        if (!result.success) {
          return {
            status: "ok",
            decision: {
              approved: false,
              reason: result.error,
              confidence: result.session?.confidence?.overall ?? session.confidence?.overall,
            },
            proposals: this.missionStudio.proposeMissions(session),
          }
        }
        return {
          status: "ok",
          decision: {
            approved: true,
            confidence: result.session?.confidence?.overall ?? session.confidence?.overall,
          },
          result,
        }
      }
      case "saveSnapshot": {
        if (!this.snapshotStore) return { status: "error", error: "snapshot store not configured" }
        const snapshot = params.snapshot as ApprovedMissionModelSnapshot
        const session = params.session as any
        if (!snapshot || !session) return { status: "error", error: "snapshot and session required" }
        await this.snapshotStore.save({ snapshot, session })
        return { status: "ok", snapshotId: snapshot.id }
      }
      case "getSnapshot": {
        if (!this.snapshotStore) return { status: "error", error: "snapshot store not configured" }
        const snapshotId = String(params.snapshotId || "")
        if (!snapshotId) return { status: "error", error: "snapshotId required" }
        const stored = await this.snapshotStore.get(snapshotId)
        if (!stored) return { status: "error", error: `snapshot not found: ${snapshotId}` }
        return { status: "ok", snapshot: stored.snapshot, session: stored.session }
      }
      case "listSnapshots": {
        if (!this.snapshotStore) return { status: "error", error: "snapshot store not configured" }
        const lineageId = typeof params.lineageId === "string" ? params.lineageId : undefined
        const snapshots = await this.snapshotStore.list(lineageId)
        return { status: "ok", snapshots: snapshots.map((s) => s.snapshot) }
      }
      case "diffSnapshots": {
        if (!this.snapshotStore) return { status: "error", error: "snapshot store not configured" }
        const fromId = String(params.fromId || "")
        const toId = String(params.toId || "")
        if (!fromId || !toId) return { status: "error", error: "fromId and toId required" }
        const fromStored = await this.snapshotStore.get(fromId)
        const toStored = await this.snapshotStore.get(toId)
        if (!fromStored) return { status: "error", error: `snapshot not found: ${fromId}` }
        if (!toStored) return { status: "error", error: `snapshot not found: ${toId}` }
        const diff = diffSnapshots(fromStored.snapshot, toStored.snapshot)
        return { status: "ok", diff }
      }
      case "reconstructSession": {
        if (!this.snapshotStore) return { status: "error", error: "snapshot store not configured" }
        const snapshotId = String(params.snapshotId || "")
        if (!snapshotId) return { status: "error", error: "snapshotId required" }
        const lineage = await getSnapshotLineage(this.snapshotStore, snapshotId)
        if (lineage.length === 0) return { status: "error", error: `snapshot not found: ${snapshotId}` }
        const session = await reconstructSessionFromSnapshot(this.snapshotStore, snapshotId)
        return { status: "ok", session, lineage: lineage.map((s) => s.snapshot) }
      }
      default:
        return { status: "error", error: `Unknown Mission Studio operation: ${operation}` }
    }
  }

  /**
   * Documentation API — run the Documentation Expedition over the knowledge base.
   */
  async documentationOperation(req: { operation: string; params?: Record<string, unknown> }): Promise<unknown> {
    const { operation, params = {} } = req

    switch (operation) {
      case "generateDocs": {
        const knowledgeBaseDir = String(params.knowledgeBaseDir || "./docs")
        const outDir = String(params.outDir || "./docs/generated")
        const linkPrefix = typeof params.linkPrefix === "string" ? params.linkPrefix : undefined
        const { projections, summary } = await documentFromKnowledgeBase(knowledgeBaseDir, outDir, linkPrefix)
        return {
          status: summary.zeroExtractionWarning ? "warning" : "ok",
          summary,
          projections: projections.map((p) => ({ filename: p.filename, title: p.title })),
          ...(summary.zeroExtractionWarning
            ? { warning: "Zero concepts extracted from matched Markdown files. Check that source files contain headings, lists, or identifiable concepts." }
            : {}),
        }
      }
      default:
        return { status: "error", error: `Unknown documentation operation: ${operation}` }
    }
  }

  /**
   * Genesis API — commit an approved Mission Model Snapshot as seed events.
   * This is the constitutional bridge from planning to execution.
   */
  async genesisFromSnapshot(req: { snapshot: ApprovedMissionModelSnapshot }): Promise<IntentResponse> {
    const snapshot = req.snapshot
    if (!snapshot) {
      return { status: "error", error: "snapshot required", traceId: "genesis-snapshot-missing" }
    }

    const genesisInput = snapshotToGenesisInput(snapshot)
    const seedEvents: Array<{ type: string; payload: Record<string, unknown> }> = genesisInput.seedEvents || []

    // EXP-HARDEN-003: certify the snapshot and the seed event graph
    // BEFORE any seed event is committed through the gate. Genesis
    // does not trust that the snapshot passed Mission Studio approval.
    const certification = certifyGenesisIntake({ snapshot, seedEvents })
    if (certification.result === "rejected") {
      return {
        status: "error",
        error: `Genesis certification failed: ${certification.violations.join("; ")}`,
        traceId: "genesis-snapshot-tx",
        meta: { contractSatisfied: false, certification },
      }
    }

    // Build raw SynthEvent objects for executeGenesis and compute hash chain.
    // The chain must continue from the last event in the log, not restart at genesis.
    const now = Date.now()
    const rawEvents = seedEvents.map((seed) => ({
      id: crypto.randomUUID(),
      type: seed.type,
      timestamp: now,
      transactionId: "genesis-snapshot-tx",
      capability: "Genesis",
      actor: "system",
      payload: seed.payload,
      eventHash: "",
      previousHash: "",
    }))

    let previousHash = await this.gate.getLastEventHash()
    for (const event of rawEvents) {
      event.previousHash = previousHash
      event.eventHash = computeEventHash(event)
      previousHash = event.eventHash
    }

    try {
      await this.gate.executeGenesis(rawEvents)
      const integrityProof = buildGenesisIntegrityProof({ report: certification, events: rawEvents })
      return {
        status: "ok",
        result: {
          systemId: genesisInput.systemId,
          projectName: genesisInput.projectName,
          seededEvents: rawEvents.length,
          certification,
          integrityProof,
        },
        traceId: "genesis-snapshot-tx",
        meta: { contractSatisfied: true },
      }
    } catch (err) {
      return {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        traceId: "genesis-snapshot-tx",
        meta: { contractSatisfied: false },
      }
    }
  }
}

export function createAPI(
  gate: ExecutionGate,
  planning?: PlanningEngine,
  missionStudio?: MissionStudio,
  adapterRegistry?: AdapterRegistry,
  snapshotStore?: SnapshotStore,
): SynthAPI {
  return new SynthAPI(gate, planning, missionStudio, adapterRegistry, snapshotStore)
}
