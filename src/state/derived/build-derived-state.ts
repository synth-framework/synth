// ============================================================
// SYNTH v2 — DERIVED STATE BUILDERS
// ============================================================
// Pure functions that derive workflow, governance, execution,
// and audit state from the event log.
//
// These builders replace the derived-field handling that used to
// live inside src/runtime/replay.ts applyEvent().
// ============================================================

import {
  EXPEDITION_STATUSES,
} from "../../types/index.js"
import type {
  SynthEvent,
  DerivedState,
  ReviewGateExpeditionState,
  ReviewGateState,
  ReviewGatePolicy,
  IntentModelState,
  RefinementSessionState,
  RefinementReportState,
  AlignmentContractState,
  ReferenceEvidenceState,
  DivergenceGateState,
  ConvergenceCertificationState,
  GeneratedWorkItem,
  Execution,
  ExecutionIntentState,
  ExecutionGraphState,
  Expedition,
} from "../../types/index.js"
import { checkUpstreamDependencies, type DependencyStatus } from "../../governance/dependency-graph.js"

export function buildDerivedState(events: SynthEvent[]): DerivedState {
  const convergenceCertifications = buildConvergenceCertifications(events)
  return {
    reviewGateExpeditions: buildReviewGateExpeditions(events),
    intentModels: buildIntentModels(events),
    refinementSessions: buildRefinementSessions(events),
    refinementReports: buildRefinementReports(events),
    alignmentContracts: buildAlignmentContracts(events),
    referenceEvidence: buildReferenceEvidence(events),
    divergenceGates: buildDivergenceGates(events),
    convergenceCertifications,
    generatedWorkItems: buildGeneratedWorkItems(events),
    executions: buildExecutions(events),
    executionIntents: buildExecutionIntents(events),
    executionGraphs: buildExecutionGraphs(events),
    dependencyStatusMap: buildDependencyStatusMap(events, convergenceCertifications),
  }
}

// ---------------------------------------------------------------------------
// Review / Acceptance / Gate state
// ---------------------------------------------------------------------------

function buildReviewGateExpeditions(
  events: SynthEvent[],
): Record<string, ReviewGateExpeditionState> {
  const state: Record<string, ReviewGateExpeditionState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "REVIEW_GATE_OPENED": {
        const expeditionId = String(payload.expeditionId)
        const gateId = String(payload.gateId)
        const reviewPackageId = String(payload.reviewPackageId)
        const rge = state[expeditionId] || {
          expeditionId,
          status: "executing",
          gates: [],
        }
        state[expeditionId] = {
          ...rge,
          status: "awaiting_review",
          currentGateId: gateId,
          reviewPackageId,
          gates: [
            ...rge.gates.filter((g) => g.id !== gateId),
            {
              id: gateId,
              gateType: "review",
              expeditionId,
              policy: (payload.policy as ReviewGatePolicy) ?? { reviewers: ["human"], quorum: "all" },
              status: "awaiting_review",
              inputs: [],
              outputs: [],
              blocking: true,
              createdAt: event.timestamp,
            },
          ],
        }
        break
      }
      case "REVIEW_GATE_RESOLVED": {
        const expeditionId = String(payload.expeditionId)
        const gateId = String(payload.gateId)
        const decision = String(payload.decision)
        const rge = state[expeditionId]
        if (rge) {
          const nextStatus =
            decision === "approve" || decision === "approve_with_conditions"
              ? "approved"
              : decision === "revision_required"
                ? "revision_requested"
                : "rejected"
          state[expeditionId] = {
            ...rge,
            status: nextStatus,
            reviewDecisionId: String(payload.decisionId),
            evaluation: payload.evaluation as ReviewGateExpeditionState["evaluation"],
            gates: rge.gates.map((g) =>
              g.id === gateId
                ? {
                    ...g,
                    status: nextStatus as ReviewGateState["status"],
                    decisionId: String(payload.decisionId),
                    decision,
                    decisionReason: String(payload.reason ?? ""),
                    decisionEvidence: Array.isArray(payload.evidence) ? payload.evidence as string[] : [],
                    decisionAffectedAssets: Array.isArray(payload.affectedAssets) ? payload.affectedAssets as string[] : [],
                    decisionRequiredChanges: Array.isArray(payload.requiredChanges) ? payload.requiredChanges as string[] : [],
                    reviewer: payload.reviewer as ReviewGateState["reviewer"],
                    resolvedAt: event.timestamp,
                    conditions: Array.isArray(payload.conditions) ? payload.conditions as ReviewGateState["conditions"] : undefined,
                  }
                : g,
            ),
          }
        }
        break
      }
      case "REVISION_REQUESTED": {
        const expeditionId = String(payload.expeditionId)
        const gateId = String(payload.gateId)
        const rge = state[expeditionId]
        if (rge) {
          state[expeditionId] = {
            ...rge,
            status: "executing",
            gates: rge.gates.map((g) =>
              g.id === gateId ? { ...g, status: "revision_requested" as ReviewGateState["status"] } : g,
            ),
          }
        }
        break
      }
      case "CONDITION_FULFILLED": {
        const expeditionId = String(payload.expeditionId)
        const gateId = String(payload.gateId)
        const conditionId = String(payload.conditionId)
        const fulfilledBy = String(payload.fulfilledBy || "unknown")
        const rge = state[expeditionId]
        if (rge) {
          state[expeditionId] = {
            ...rge,
            gates: rge.gates.map((g) =>
              g.id === gateId && g.conditions
                ? {
                    ...g,
                    conditions: g.conditions.map((c) =>
                      c.id === conditionId
                        ? { ...c, fulfilled: true, fulfilledBy, fulfilledAt: event.timestamp }
                        : c
                    ),
                  }
                : g
            ),
          }
        }
        break
      }
      case "ACCEPTANCE_GATE_OPENED": {
        const expeditionId = String(payload.expeditionId)
        const gateId = String(payload.gateId)
        const acceptancePackageId = String(payload.acceptancePackageId)
        const rge = state[expeditionId]
        if (rge) {
          state[expeditionId] = {
            ...rge,
            status: "awaiting_acceptance",
            currentGateId: gateId,
            acceptancePackageId,
            gates: [
              ...rge.gates.filter((g) => g.id !== gateId),
              {
                id: gateId,
                gateType: "acceptance",
                expeditionId,
                policy: (payload.policy as ReviewGatePolicy) ?? { reviewers: ["human"], quorum: "all" },
                status: "awaiting_review",
                inputs: [],
                outputs: [],
                blocking: true,
                createdAt: event.timestamp,
              },
            ],
          }
        }
        break
      }
      case "ACCEPTANCE_GATE_RESOLVED": {
        const expeditionId = String(payload.expeditionId)
        const gateId = String(payload.gateId)
        const decision = String(payload.decision)
        const rge = state[expeditionId]
        if (rge) {
          const nextStatus = decision === "accepted" ? "accepted" : "rejected"
          state[expeditionId] = {
            ...rge,
            status: nextStatus,
            acceptanceRecordId: String(payload.recordId),
            gates: rge.gates.map((g) =>
              g.id === gateId
                ? {
                    ...g,
                    status: nextStatus as ReviewGateState["status"],
                    decisionId: String(payload.decisionId),
                    decision,
                    decisionReason: String(payload.reason ?? ""),
                    decisionEvidence: Array.isArray(payload.evidence) ? payload.evidence as string[] : [],
                    reviewer: payload.reviewer as ReviewGateState["reviewer"],
                    resolvedAt: event.timestamp,
                  }
                : g,
            ),
          }
        }
        break
      }
      case "EXPEDITION_CLOSED": {
        const expeditionId = String(payload.expeditionId)
        const rge = state[expeditionId]
        if (rge) {
          state[expeditionId] = { ...rge, status: "closed" }
        }
        break
      }
      case "REFINED_INTENT_APPROVED": {
        const expeditionId = String(payload.expeditionId)
        const refinedIntentId = String(payload.refinedIntentId)
        const rge = state[expeditionId] ?? {
          expeditionId,
          status: "proposed",
          gates: [],
        }
        state[expeditionId] = { ...rge, status: "proposed", refinedIntentId }
        break
      }
    }
  }

  return state
}

// ---------------------------------------------------------------------------
// Genesis / Alignment state
// ---------------------------------------------------------------------------

function buildIntentModels(events: SynthEvent[]): Record<string, IntentModelState> {
  const state: Record<string, IntentModelState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "INTENT_MODEL_CREATED":
      case "INTENT_MODEL_REVISED": {
        const intentModel = payload.intentModel as IntentModelState
        if (intentModel) state[intentModel.id] = intentModel
        break
      }
      case "INTENT_MODEL_SUBMITTED": {
        const intentModelId = String(payload.intentModelId)
        if (state[intentModelId]) {
          state[intentModelId] = { ...state[intentModelId], status: "sufficient" }
        }
        break
      }
      case "INTENT_MODEL_SUPERSEDED": {
        const intentModelId = String(payload.intentModelId)
        if (state[intentModelId]) {
          state[intentModelId] = { ...state[intentModelId], status: "superseded" }
        }
        break
      }
    }
  }

  return state
}

function buildRefinementSessions(events: SynthEvent[]): Record<string, RefinementSessionState> {
  const state: Record<string, RefinementSessionState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "REFINEMENT_SESSION_STARTED": {
        const sessionId = String(payload.sessionId)
        state[sessionId] = {
          id: sessionId,
          intentModelId: String(payload.intentModelId),
          status: "active",
          questions: Array.isArray(payload.questions) ? (payload.questions as Array<{ id: string; text: string; category: string; priority: string }>) : [],
          answers: [],
          version: 1,
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        }
        break
      }
      case "REFINEMENT_QUESTION_ANSWERED": {
        const sessionId = String(payload.sessionId)
        const session = state[sessionId]
        if (session) {
          session.answers.push({ questionId: String(payload.questionId), text: String(payload.answer) })
          session.updatedAt = event.timestamp
        }
        break
      }
    }
  }

  return state
}

function buildRefinementReports(events: SynthEvent[]): Record<string, RefinementReportState> {
  const state: Record<string, RefinementReportState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "REFINEMENT_REPORT_CREATED": {
        const report = payload.report as RefinementReportState
        if (report) state[report.id] = report
        break
      }
      case "REFINEMENT_REPORT_APPROVED": {
        const reportId = String(payload.reportId)
        const intentModelId = String(payload.intentModelId)
        if (state[reportId]) {
          state[reportId] = { ...state[reportId], recommendation: "approve_for_alignment" }
        }
        // Note: intentModel refinementApproval is part of intent model derived state
        break
      }
    }
  }

  return state
}

function buildAlignmentContracts(events: SynthEvent[]): Record<string, AlignmentContractState> {
  const state: Record<string, AlignmentContractState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "ALIGNMENT_CONTRACT_CREATED": {
        const contract = payload.contract as AlignmentContractState
        if (contract) state[contract.id] = contract
        break
      }
      case "ALIGNMENT_CONTRACT_SUBMITTED": {
        const contractId = String(payload.contractId)
        if (state[contractId]) {
          state[contractId] = { ...state[contractId], status: "awaiting_review" }
        }
        break
      }
      case "ALIGNMENT_CONTRACT_APPROVED": {
        const contractId = String(payload.contractId)
        const approvedBy = payload.approvedBy as { kind: string; id: string } | undefined
        if (state[contractId]) {
          state[contractId] = {
            ...state[contractId],
            status: "approved",
            approvedBy,
            approvedAt: event.timestamp,
          }
        }
        break
      }
      case "ALIGNMENT_CONTRACT_REJECTED": {
        const contractId = String(payload.contractId)
        if (state[contractId]) {
          state[contractId] = { ...state[contractId], status: "rejected" }
        }
        break
      }
      case "ALIGNMENT_CONTRACT_SUPERSEDED": {
        const contractId = String(payload.contractId)
        if (state[contractId]) {
          state[contractId] = { ...state[contractId], status: "superseded" }
        }
        break
      }
      case "REFERENCE_EVIDENCE_BOUND": {
        const contractId = String(payload.contractId)
        const evidenceId = String(payload.evidenceId)
        const contract = state[contractId]
        if (contract && !contract.referenceEvidenceIds.includes(evidenceId)) {
          contract.referenceEvidenceIds = [...contract.referenceEvidenceIds, evidenceId]
        }
        break
      }
    }
  }

  return state
}

function buildReferenceEvidence(events: SynthEvent[]): Record<string, ReferenceEvidenceState> {
  const state: Record<string, ReferenceEvidenceState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    if (event.type === "REFERENCE_EVIDENCE_CREATED") {
      const evidence = payload.evidence as ReferenceEvidenceState
      if (evidence) state[evidence.id] = evidence
    }
  }

  return state
}

function buildDivergenceGates(events: SynthEvent[]): Record<string, DivergenceGateState> {
  const state: Record<string, DivergenceGateState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "DIVERGENCE_GATE_OPENED": {
        const gateId = String(payload.gateId)
        state[gateId] = {
          id: gateId,
          contractId: String(payload.contractId),
          intentModelId: String(payload.intentModelId),
          status: "awaiting_alignment",
          createdAt: event.timestamp,
        }
        break
      }
      case "DIVERGENCE_GATE_RESOLVED": {
        const gateId = String(payload.gateId)
        const gate = state[gateId]
        if (gate) {
          gate.status = String(payload.decision)
          gate.reportId = String(payload.reportId)
          gate.resolvedAt = event.timestamp
        }
        break
      }
    }
  }

  return state
}

function buildConvergenceCertifications(
  events: SynthEvent[]
): Record<string, ConvergenceCertificationState> {
  const state: Record<string, ConvergenceCertificationState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    if (event.type === "CONVERGENCE_CERTIFIED" || event.type === "CONVERGENCE_DIVERGED") {
      const certificationId = String(payload.certificationId)
      const decision = String(payload.decision) as ConvergenceCertificationState["decision"]
      const status: ConvergenceCertificationState["status"] =
        decision === "converged" ? "certified" : decision === "diverged" ? "diverged" : "insufficient_evidence"

      state[certificationId] = {
        id: certificationId,
        missionId: String(payload.missionId),
        expeditionId: String(payload.expeditionId),
        alignmentContractId: String(payload.alignmentContractId),
        status,
        decision,
        confidence: Number(payload.confidence ?? 0),
        failureClasses: Array.isArray(payload.failureClasses) ? payload.failureClasses.map(String) : [],
        certifiedAt: event.timestamp,
        certifier: (payload.certifier as { kind: string; id: string }) ?? { kind: "engine", id: "convergence-certification" },
      }
    }
  }

  return state
}

/** Build a minimal expedition status map from events for dependency propagation. */
function buildExpeditionsForDependencyMap(events: SynthEvent[]): Record<string, Expedition> {
  const expeditions: Record<string, Expedition> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "EXPEDITION_CREATED": {
        const expedition = payload.expedition as Expedition
        if (expedition) {
          expeditions[expedition.id] = expedition
        }
        break
      }
      case "EXPEDITION_APPROVED":
      case "EXPEDITION_AUTHORIZED":
      case "EXPEDITION_COMMITTED":
      case "EXPEDITION_STARTED":
      case "EXPEDITION_PAUSED":
      case "EXPEDITION_COMPLETED":
      case "EXPEDITION_CANCELLED":
      case "EXPEDITION_ARCHIVED": {
        const expeditionId = String(payload.id ?? payload.expeditionId)
        const existing = expeditions[expeditionId]
        if (existing) {
          const statusMap: Record<string, Expedition["status"]> = {
            EXPEDITION_APPROVED: "approved",
            EXPEDITION_AUTHORIZED: "committed",
            EXPEDITION_COMMITTED: "committed",
            EXPEDITION_STARTED: "executing",
            EXPEDITION_PAUSED: "paused",
            EXPEDITION_COMPLETED: "completed",
            EXPEDITION_CANCELLED: "cancelled",
          }
          let nextStatus: Expedition["status"] | undefined = statusMap[event.type]
          if (event.type === "EXPEDITION_ARCHIVED") {
            // Historical archive events may carry the target status in
            // payload.status (e.g. "cancelled"). Prefer that when valid.
            const candidate = payload.status
            nextStatus =
              typeof candidate === "string" && EXPEDITION_STATUSES.includes(candidate)
                ? (candidate as Expedition["status"])
                : "archived"
          }
          if (nextStatus) {
            expeditions[expeditionId] = { ...existing, status: nextStatus, updatedAt: event.timestamp }
          }
        }
        break
      }
    }
  }

  return expeditions
}

/** Propagate upstream gate status to every expedition that declares dependencies. */
function buildDependencyStatusMap(
  events: SynthEvent[],
  convergenceCertifications: Record<string, ConvergenceCertificationState>,
): Record<string, DependencyStatus> {
  const expeditions = buildExpeditionsForDependencyMap(events)
  const state = { expeditions } as { expeditions: Record<string, Expedition> }
  const map: Record<string, DependencyStatus> = {}

  for (const expedition of Object.values(expeditions)) {
    if (!expedition.dependsOn?.length) continue
    map[expedition.id] = checkUpstreamDependencies(
      expedition.id,
      state as import("../../types/index.js").CanonicalState,
      undefined,
      convergenceCertifications,
    ).status
  }

  return map
}

// ---------------------------------------------------------------------------
// Planning / Execution / Audit state
// ---------------------------------------------------------------------------

function buildGeneratedWorkItems(events: SynthEvent[]): Record<string, GeneratedWorkItem> {
  const state: Record<string, GeneratedWorkItem> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    if (event.type === "WORK_ITEM_GENERATED") {
      const workItem = payload.workItem as GeneratedWorkItem
      if (workItem) state[workItem.id] = workItem
    }
  }

  return state
}

function buildExecutions(events: SynthEvent[]): Record<string, Execution> {
  const state: Record<string, Execution> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    if (event.type === "TRANSACTION_STARTED") {
      const txId = String(payload.txId)
      state[txId] = {
        id: txId,
        capability: "",
        intent: {},
        txId,
        startedAt: event.timestamp,
        status: "success",
      }
    }
  }

  return state
}

function buildExecutionIntents(events: SynthEvent[]): Record<string, ExecutionIntentState> {
  const state: Record<string, ExecutionIntentState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "EXECUTION_INTENT_CREATED": {
        const intentId = String(payload.intentId)
        state[intentId] = {
          id: intentId,
          expeditionId: String(payload.expeditionId),
          objectiveId: String(payload.objectiveId),
          workItemId: String(payload.workItemId),
          sequence: Number(payload.sequence ?? 0),
          capability: String(payload.capability),
          operation: String(payload.operation),
          target: String(payload.target ?? ""),
          status: "pending",
          dependencies: Array.isArray(payload.dependencies) ? payload.dependencies.map(String) : [],
        }
        break
      }
      case "EXECUTION_INTENT_STARTED": {
        const intentId = String(payload.intentId)
        const intent = state[intentId]
        if (intent) {
          intent.status = "running"
          intent.startedAt = event.timestamp
        }
        break
      }
      case "EXECUTION_INTENT_COMPLETED": {
        const intentId = String(payload.intentId)
        const intent = state[intentId]
        if (intent) {
          intent.status = "completed"
          intent.completedAt = event.timestamp
        }
        break
      }
      case "EXECUTION_INTENT_FAILED": {
        const intentId = String(payload.intentId)
        const intent = state[intentId]
        if (intent) {
          intent.status = "failed"
          intent.failureReason = String(payload.reason)
          intent.completedAt = event.timestamp
        }
        break
      }
      case "EXECUTION_INTENT_ROLLEDBACK": {
        const intentId = String(payload.intentId)
        const intent = state[intentId]
        if (intent) {
          intent.status = "rolledback"
          intent.completedAt = event.timestamp
        }
        break
      }
    }
  }

  return state
}

function buildExecutionGraphs(events: SynthEvent[]): Record<string, ExecutionGraphState> {
  const state: Record<string, ExecutionGraphState> = {}

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | undefined
    if (!payload) continue

    switch (event.type) {
      case "EXECUTION_INTENT_GRAPH_CREATED": {
        const expeditionId = String(payload.expeditionId)
        state[expeditionId] = {
          expeditionId,
          branch: String(payload.branch ?? ""),
          phase: "approved",
          intentIds: Array.isArray(payload.intentIds) ? payload.intentIds.map(String) : [],
        }
        break
      }
      case "EXPEDITION_BRANCH_CREATED": {
        const expeditionId = String(payload.expeditionId)
        const graph = state[expeditionId]
        if (graph) {
          graph.branch = String(payload.branch)
          graph.baseCommit = String(payload.baseCommit)
          graph.phase = "branch-created"
        }
        break
      }
      case "EXECUTION_INTENT_STARTED": {
        const graph = state[String(payload.expeditionId)]
        if (graph) {
          graph.phase = "executing"
          graph.currentIntentId = String(payload.intentId)
        }
        break
      }
      case "EXECUTION_INTENT_FAILED": {
        const graph = state[String(payload.expeditionId)]
        if (graph) graph.phase = "failed"
        break
      }
      case "EXECUTION_INTENT_ROLLEDBACK": {
        const graph = state[String(payload.expeditionId)]
        if (graph) graph.phase = "rolledback"
        break
      }
      case "EXPEDITION_EXECUTION_COMMITTED": {
        const expeditionId = String(payload.expeditionId)
        const graph = state[expeditionId]
        if (graph) {
          graph.phase = "committed"
          graph.resultCommit = String(payload.commit)
        }
        break
      }
      case "EXPEDITION_EXECUTION_PROJECTED": {
        const expeditionId = String(payload.expeditionId)
        const graph = state[expeditionId]
        if (graph) {
          graph.phase = "projected"
          graph.projectionType = payload.projectionType as "pull_request" | "patch" | "diff"
          graph.projectionUrl = payload.projectionUrl ? String(payload.projectionUrl) : undefined
        }
        break
      }
    }
  }

  return state
}
