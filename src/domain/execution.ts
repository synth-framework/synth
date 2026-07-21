// ============================================================
// DOMAIN: Execution Logic (Pure)
// ============================================================

import type { CanonicalState, CapabilityInvocation, CapabilityResult, Discovery, DomainContext, ExecutionContext, IntentModelState } from "../types/index.js"
import { computeEventHash } from "../core/hash.js"
import * as workItemLogic from "./workitem.js"
import * as planLogic from "./plan.js"
import * as milestoneLogic from "./milestone.js"
import * as projectLogic from "./project.js"
import * as planningLogic from "./planning.js"
import {
  ensureReviewGateExpedition,
  engineOpenReviewGate,
  engineResolveReviewGate,
  engineRequestRevision,
  engineOpenAcceptanceGate,
  engineResolveAcceptanceGate,
  engineCloseExpedition,
  engineApproveRefinedIntent,
  isBlockedByUpstreamGate,
} from "../governance/review-gate-engine.js"
import type { GatePolicy, ReviewDecisionType } from "../governance/review-gates.js"
import { createIntentModel, reviseIntentModel, validateIntentModel } from "../governance/intent-model.js"
import { startRefinement, answerQuestion, submitForRefinedIntent, supersedeRefinement } from "../governance/refinement-layer.js"
import { createRefinementReport, validateRefinementReport } from "../governance/refinement-report.js"
import {
  createAlignmentContract,
  validateAlignmentContract,
  submitAlignmentContract,
  approveAlignmentContract,
  rejectAlignmentContract,
  supersedeAlignmentContract,
} from "../governance/alignment-contract.js"
import { createReferenceEvidence, validateReferenceEvidence, bindEvidenceToContract } from "../governance/reference-evidence.js"
import { openDivergenceGate, resolveDivergenceGate, isAligned } from "../governance/divergence-gate.js"
import { projectMission, ProjectionInvariantError, ProjectionCompletenessError } from "../governance/project-mission.js"

/** Execute domain logic — pure function: (intent, state, ctx) → result */
export function applyDomain(
  intent: CapabilityInvocation,
  state: CanonicalState,
  ctx: DomainContext,
): CapabilityResult {
  switch (intent.capability) {
    // ============================================================
    // WorkItem capabilities (canonical)
    // ============================================================
    case "CreateWorkItem": {
      const id = String(intent.payload.id)
      const workItem = workItemLogic.createWorkItem(id, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "WORK_ITEM_CREATED", payload: { workItem } }] }
    }

    case "StartWorkItem": {
      const id = String(intent.payload.id)
      const existing = state.workItems[id]
      if (!existing) {
        return { events: [{ type: "WORK_ITEM_STARTED", payload: { id, status: "active" } }] }
      }
      const updated = workItemLogic.startWorkItem(existing, ctx)
      return { events: [{ type: "WORK_ITEM_STARTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteWorkItem": {
      const id = String(intent.payload.id)
      const existing = state.workItems[id]
      if (!existing) {
        return { events: [{ type: "WORK_ITEM_COMPLETED", payload: { id, status: "complete" } }] }
      }
      const updated = workItemLogic.completeWorkItem(existing, ctx)
      return { events: [{ type: "WORK_ITEM_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "BlockWorkItem": {
      const id = String(intent.payload.id)
      const existing = state.workItems[id]
      const reason = String(intent.payload.reason || "")
      if (!existing) {
        return { events: [{ type: "WORK_ITEM_BLOCKED", payload: { id, status: "blocked", reason } }] }
      }
      const updated = workItemLogic.blockWorkItem(existing, reason, ctx)
      return { events: [{ type: "WORK_ITEM_BLOCKED", payload: { id: updated.id, status: updated.status, reason } }] }
    }

    // ============================================================
    // Plan capabilities
    // ============================================================
    case "CreatePlan": {
      const id = String(intent.payload.id)
      const name = String(intent.payload.name)
      const plan = planLogic.createPlan(id, name, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "PLAN_CREATED", payload: { plan } }] }
    }

    case "ActivatePlan": {
      const id = String(intent.payload.id)
      const existing = state.plans[id]
      if (!existing) {
        return { events: [{ type: "PLAN_ACTIVATED", payload: { id, status: "active" } }] }
      }
      const updated = planLogic.activatePlan(existing, ctx)
      return { events: [{ type: "PLAN_ACTIVATED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompletePlan": {
      const id = String(intent.payload.id)
      const existing = state.plans[id]
      if (!existing) {
        return { events: [{ type: "PLAN_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = planLogic.completePlan(existing, ctx)
      return { events: [{ type: "PLAN_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    // ============================================================
    // Milestone capabilities
    // ============================================================
    case "CreateMilestone": {
      const id = String(intent.payload.id)
      const planId = String(intent.payload.planId)
      const name = String(intent.payload.name)
      const ms = milestoneLogic.createMilestone(id, planId, name, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "MILESTONE_CREATED", payload: { milestone: ms } }] }
    }

    case "StartMilestone": {
      const id = String(intent.payload.id)
      const existing = state.milestones[id]
      if (!existing) {
        return { events: [{ type: "MILESTONE_STARTED", payload: { id, status: "in_progress" } }] }
      }
      const updated = milestoneLogic.startMilestone(existing, ctx)
      return { events: [{ type: "MILESTONE_STARTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteMilestone": {
      const id = String(intent.payload.id)
      const existing = state.milestones[id]
      if (!existing) {
        return { events: [{ type: "MILESTONE_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = milestoneLogic.completeMilestone(existing, ctx)
      return { events: [{ type: "MILESTONE_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    // ============================================================
    // Project capabilities
    // ============================================================
    case "CreateProject": {
      const id = String(intent.payload.id)
      const name = String(intent.payload.name)
      const goal = String(intent.payload.goal)
      const project = projectLogic.createProject(id, name, goal, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "PROJECT_CREATED", payload: { project } }] }
    }

    case "InitializeProject": {
      const projectId = String(intent.payload.projectId)
      const name = String(intent.payload.name)
      const governanceVersion = String(intent.payload.governanceVersion)
      return {
        events: [{
          type: "PROJECT_INITIALIZED",
          payload: { projectId, name, governanceVersion },
        }],
      }
    }

    // ============================================================
    // Planning capabilities (PCE)
    // ============================================================
    case "CreateMission": {
      const id = String(intent.payload.id)
      const name = String(intent.payload.name)
      const purpose = String(intent.payload.purpose || "")
      const mission = planningLogic.createMission(id, name, purpose, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "MISSION_CREATED", payload: { mission } }] }
    }

    case "ApproveMission": {
      const id = String(intent.payload.id)
      const existing = state.missions[id]
      if (!existing) {
        return { events: [{ type: "MISSION_APPROVED", payload: { id, status: "active" } }] }
      }
      const alignmentContractId = String(intent.payload.alignmentContractId || existing.alignmentContractId || "")
      if (!alignmentContractId || alignmentContractId === "undefined") {
        throw new Error("ALIGNMENT_CONTRACT_REQUIRED: ApproveMission requires an alignment contract")
      }
      const contract = state.alignmentContracts[alignmentContractId]
      if (!contract) {
        throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${alignmentContractId}`)
      }
      const alignedGate = Object.values(state.divergenceGates).find(
        (g) => g.contractId === alignmentContractId && g.status === "aligned"
      )
      if (!alignedGate) {
        throw new Error(`DIVERGENCE_GATE_NOT_ALIGNED: Mission cannot be approved without an aligned divergence gate for contract ${alignmentContractId}`)
      }
      const updated = planningLogic.approveMission(existing, ctx)
      return {
        events: [{
          type: "MISSION_APPROVED",
          payload: { id: updated.id, status: updated.status, alignmentContractId },
        }],
      }
    }

    case "CompleteMission": {
      const id = String(intent.payload.id)
      const existing = state.missions[id]
      if (!existing) {
        return { events: [{ type: "MISSION_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = planningLogic.completeMission(existing, ctx)
      return { events: [{ type: "MISSION_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "ArchiveMission": {
      const id = String(intent.payload.id)
      const existing = state.missions[id]
      if (!existing) {
        return { events: [{ type: "MISSION_ARCHIVED", payload: { id, status: "archived" } }] }
      }
      const updated = planningLogic.archiveMission(existing, ctx)
      return { events: [{ type: "MISSION_ARCHIVED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CreateExpedition": {
      const id = String(intent.payload.id)
      const missionId = String(intent.payload.missionId)
      const name = String(intent.payload.name)
      const goal = String(intent.payload.goal || "")
      const dependsOn = Array.isArray(intent.payload.dependsOn)
        ? intent.payload.dependsOn.map(String)
        : []
      const expedition = planningLogic.createExpedition(id, missionId, name, goal, ctx, {
        ...(intent.payload as Record<string, unknown>),
        dependsOn,
      })
      return { events: [{ type: "EXPEDITION_CREATED", payload: { expedition } }] }
    }

    case "ApproveExpedition": {
      const id = String(intent.payload.id)
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_APPROVED", payload: { id, status: "approved" } }] }
      }
      const updated = planningLogic.approveExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_APPROVED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CommitExpedition": {
      const id = String(intent.payload.id)
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_COMMITTED", payload: { id, status: "committed" } }] }
      }
      const updated = planningLogic.commitExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_COMMITTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "StartExpedition": {
      const id = String(intent.payload.id)
      if (isBlockedByUpstreamGate(state, id)) {
        throw new Error(`UPSTREAM_GATE_BLOCKED: Expedition ${id} cannot start while an upstream gate is unresolved`)
      }
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_STARTED", payload: { id, status: "executing" } }] }
      }
      const updated = planningLogic.startExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_STARTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteExpedition": {
      const id = String(intent.payload.id)
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = planningLogic.completeExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    // Intent refinement capabilities (EXP-PROGRAM-036)
    case "CreateIntentModel": {
      const input = intent.payload.input as Record<string, unknown>
      const model = createIntentModel({
        rawIntentReference: String(input.rawIntentReference),
        explicitObjectives: Array.isArray(input.explicitObjectives) ? input.explicitObjectives.map(String) : [],
        implicitObjectives: Array.isArray(input.implicitObjectives) ? input.implicitObjectives.map(String) : undefined,
        audience: typeof input.audience === "string" ? input.audience : undefined,
        problemStatement: typeof input.problemStatement === "string" ? input.problemStatement : undefined,
        desiredOutcome: typeof input.desiredOutcome === "string" ? input.desiredOutcome : undefined,
        nonGoals: Array.isArray(input.nonGoals) ? input.nonGoals.map(String) : undefined,
        forbiddenInterpretations: Array.isArray(input.forbiddenInterpretations)
          ? input.forbiddenInterpretations.map(String)
          : undefined,
        allowedInterpretations: Array.isArray(input.allowedInterpretations)
          ? input.allowedInterpretations.map(String)
          : undefined,
        referenceEvidenceIds: Array.isArray(input.referenceEvidenceIds)
          ? input.referenceEvidenceIds.map(String)
          : undefined,
        unresolvedAmbiguity: Array.isArray(input.unresolvedAmbiguity) ? input.unresolvedAmbiguity.map(String) : undefined,
        knownUnknowns: Array.isArray(input.knownUnknowns) ? input.knownUnknowns.map(String) : undefined,
      })
      const validation = validateIntentModel(model)
      if (!validation.valid) {
        throw new Error(`INTENT_MODEL_INVALID: ${validation.errors.join(", ")}`)
      }
      return { events: [{ type: "INTENT_MODEL_CREATED", payload: { intentModelId: model.id, intentModel: model } }] }
    }

    case "StartRefinementSession": {
      const intentModelId = String(intent.payload.intentModelId)
      const model = state.intentModels[intentModelId]
      if (!model) {
        throw new Error(`INTENT_MODEL_NOT_FOUND: ${intentModelId}`)
      }
      const session = startRefinement(model as import("../governance/intent-model.js").IntentModel)
      return {
        events: [
          {
            type: "REFINEMENT_SESSION_STARTED",
            payload: {
              sessionId: session.id,
              intentModelId,
              questions: session.questions,
            },
          },
        ],
      }
    }

    case "AnswerRefinementQuestion": {
      const sessionId = String(intent.payload.sessionId)
      const questionId = String(intent.payload.questionId)
      const answer = String(intent.payload.answer)
      const session = state.refinementSessions[sessionId]
      if (!session) {
        throw new Error(`REFINEMENT_SESSION_NOT_FOUND: ${sessionId}`)
      }
      const model = state.intentModels[session.intentModelId]
      if (!model) {
        throw new Error(`INTENT_MODEL_NOT_FOUND: ${session.intentModelId}`)
      }
      const { session: updatedSession, model: updatedModel } = answerQuestion(
        session as import("../governance/refinement-layer.js").RefinementSession,
        model as import("../governance/intent-model.js").IntentModel,
        questionId,
        answer
      )
      return {
        events: [
          { type: "REFINEMENT_QUESTION_ANSWERED", payload: { sessionId, questionId, answer } },
          { type: "INTENT_MODEL_REVISED", payload: { intentModelId: updatedModel.id, intentModel: updatedModel } },
          {
            type: "REFINEMENT_SESSION_STARTED",
            payload: {
              sessionId: updatedSession.id,
              intentModelId: updatedSession.intentModelId,
              questions: updatedSession.questions,
            },
          },
        ],
      }
    }

    case "SubmitIntentModel": {
      const intentModelId = String(intent.payload.intentModelId)
      const model = state.intentModels[intentModelId]
      if (!model) {
        throw new Error(`INTENT_MODEL_NOT_FOUND: ${intentModelId}`)
      }
      const submitted = submitForRefinedIntent(model as import("../governance/intent-model.js").IntentModel)
      return {
        events: [{ type: "INTENT_MODEL_SUBMITTED", payload: { intentModelId: submitted.id } }],
      }
    }

    case "SupersedeIntentModel": {
      const intentModelId = String(intent.payload.intentModelId)
      const model = state.intentModels[intentModelId]
      const session = Object.values(state.refinementSessions).find((s) => s.intentModelId === intentModelId)
      if (!model) {
        throw new Error(`INTENT_MODEL_NOT_FOUND: ${intentModelId}`)
      }
      if (session) {
        supersedeRefinement(
          session as import("../governance/refinement-layer.js").RefinementSession,
          model as import("../governance/intent-model.js").IntentModel
        )
      }
      return {
        events: [{ type: "INTENT_MODEL_SUPERSEDED", payload: { intentModelId } }],
      }
    }

    case "CreateRefinementReport": {
      const sessionId = String(intent.payload.sessionId)
      const session = state.refinementSessions[sessionId]
      if (!session) {
        throw new Error(`REFINEMENT_SESSION_NOT_FOUND: ${sessionId}`)
      }
      const intentModelId = session.intentModelId
      const finalModel = state.intentModels[intentModelId]
      if (!finalModel) {
        throw new Error(`INTENT_MODEL_NOT_FOUND: ${intentModelId}`)
      }
      const initialModel = (intent.payload.initialModel as IntentModelState | undefined) ?? finalModel
      const reviewer = (intent.payload.reviewer as { kind: string; id: string }) ?? { kind: "human", id: "synth-cli-operator" }
      const recommendation = String(intent.payload.recommendation || "approve_for_alignment") as
        | "approve_for_alignment"
        | "clarification_required"
        | "reject_intent"
        | "supersede_intent"
      const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : "Refinement review completed"

      const additionalEntries = Array.isArray(intent.payload.additionalEntries)
        ? (intent.payload.additionalEntries as Array<{ question: { id: string; text: string; category: string; priority: string }; answer: string }>)
        : undefined

      const report = createRefinementReport(
        session as import("../governance/refinement-layer.js").RefinementSession,
        initialModel as import("../governance/intent-model.js").IntentModel,
        finalModel as import("../governance/intent-model.js").IntentModel,
        reviewer,
        recommendation,
        reason,
        additionalEntries as import("../governance/refinement-report.js").RefinementReportEntry[] | undefined
      )
      const validation = validateRefinementReport(report)
      if (!validation.valid) {
        throw new Error(`REFINEMENT_REPORT_INVALID: ${validation.errors.join(", ")}`)
      }
      return { events: [{ type: "REFINEMENT_REPORT_CREATED", payload: { reportId: report.id, report } }] }
    }

    case "ApproveRefinementReport": {
      const reportId = String(intent.payload.reportId)
      const report = state.refinementReports[reportId]
      if (!report) {
        throw new Error(`REFINEMENT_REPORT_NOT_FOUND: ${reportId}`)
      }
      const intentModelId = report.intentModelId
      const decision = String(intent.payload.decision || "approved_for_alignment") as
        | "approved_for_alignment"
        | "revision_required"
        | "rejected"
      const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : "Refinement report approved"
      const reviewer = (intent.payload.reviewer as { kind: string; id: string }) ?? { kind: "human", id: "synth-cli-operator" }

      if (decision === "approved_for_alignment") {
        return {
          events: [
            {
              type: "REFINEMENT_REPORT_APPROVED",
              payload: { reportId, intentModelId, approvedBy: reviewer, reason },
            },
          ],
        }
      }
      return {
        events: [
          {
            type: "REFINEMENT_REPORT_REJECTED",
            payload: { reportId, intentModelId, rejectedBy: reviewer, reason },
          },
        ],
      }
    }

    // Alignment and divergence capabilities (EXP-PROGRAM-036 Phase 2)
    case "CreateAlignmentContract": {
      const input = intent.payload.input as Record<string, unknown>
      const contract = createAlignmentContract({
        intentModelId: String(input.intentModelId),
        refinedIntentId: typeof input.refinedIntentId === "string" ? input.refinedIntentId : undefined,
        intentSummary: String(input.intentSummary),
        expectedExperience: String(input.expectedExperience),
        requiredProperties: Array.isArray(input.requiredProperties) ? input.requiredProperties.map(String) : undefined,
        forbiddenProperties: Array.isArray(input.forbiddenProperties) ? input.forbiddenProperties.map(String) : undefined,
        requiredBehaviors: Array.isArray(input.requiredBehaviors) ? input.requiredBehaviors.map(String) : undefined,
        visualReferences: Array.isArray(input.visualReferences) ? input.visualReferences.map(String) : undefined,
        behavioralReferences: Array.isArray(input.behavioralReferences) ? input.behavioralReferences.map(String) : undefined,
        functionalExpectations: Array.isArray(input.functionalExpectations) ? input.functionalExpectations.map(String) : undefined,
        technicalConstraints: Array.isArray(input.technicalConstraints) ? input.technicalConstraints.map(String) : undefined,
        successCriteria: Array.isArray(input.successCriteria) ? input.successCriteria.map(String) : undefined,
        explicitNonRequirements: Array.isArray(input.explicitNonRequirements)
          ? input.explicitNonRequirements.map(String)
          : undefined,
        allowedInterpretation: Array.isArray(input.allowedInterpretation) ? input.allowedInterpretation.map(String) : undefined,
        allowedVariation: Array.isArray(input.allowedVariation) ? input.allowedVariation.map(String) : undefined,
        forbiddenInterpretation: Array.isArray(input.forbiddenInterpretation)
          ? input.forbiddenInterpretation.map(String)
          : undefined,
        forbiddenDrift: Array.isArray(input.forbiddenDrift) ? input.forbiddenDrift.map(String) : undefined,
        referenceEvidenceIds: Array.isArray(input.referenceEvidenceIds) ? input.referenceEvidenceIds.map(String) : undefined,
      })
      const validation = validateAlignmentContract(contract)
      if (!validation.valid) {
        throw new Error(`ALIGNMENT_CONTRACT_INVALID: ${validation.errors.join(", ")}`)
      }
      return { events: [{ type: "ALIGNMENT_CONTRACT_CREATED", payload: { contractId: contract.id, contract } }] }
    }

    case "SubmitAlignmentContract": {
      const contractId = String(intent.payload.contractId)
      const contract = state.alignmentContracts[contractId]
      if (!contract) throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${contractId}`)
      const submitted = submitAlignmentContract(contract as import("../governance/alignment-contract.js").AlignmentContract)
      return {
        events: [
          { type: "ALIGNMENT_CONTRACT_SUBMITTED", payload: { contractId } },
          { type: "ALIGNMENT_CONTRACT_CREATED", payload: { contractId: submitted.id, contract: submitted } },
        ],
      }
    }

    case "ApproveAlignmentContract": {
      const contractId = String(intent.payload.contractId)
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const contract = state.alignmentContracts[contractId]
      if (!contract) throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${contractId}`)
      const approved = approveAlignmentContract(
        contract as import("../governance/alignment-contract.js").AlignmentContract,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string }
      )
      return {
        events: [
          { type: "ALIGNMENT_CONTRACT_APPROVED", payload: { contractId, approvedBy: reviewer } },
          { type: "ALIGNMENT_CONTRACT_CREATED", payload: { contractId: approved.id, contract: approved } },
        ],
      }
    }

    case "RejectAlignmentContract": {
      const contractId = String(intent.payload.contractId)
      const reason = String(intent.payload.reason)
      return { events: [{ type: "ALIGNMENT_CONTRACT_REJECTED", payload: { contractId, reason } }] }
    }

    // Mission Projection capability (EXP-REFINE-014)
    case "ProjectMission": {
      const contractId = String(intent.payload.alignmentContractId)
      const contractState = state.alignmentContracts[contractId]
      if (!contractState) throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${contractId}`)
      if (contractState.status !== "approved") {
        throw new Error(`ALIGNMENT_CONTRACT_NOT_APPROVED: ${contractId}`)
      }

      const intentModelState = state.intentModels[contractState.intentModelId]
      if (!intentModelState) throw new Error(`INTENT_MODEL_NOT_FOUND: ${contractState.intentModelId}`)

      const refinementReportState = Object.values(state.refinementReports).find(
        (r) => r.intentModelId === contractState.intentModelId
      )
      if (!refinementReportState) throw new Error(`REFINEMENT_REPORT_NOT_FOUND: ${contractState.intentModelId}`)

      const pkg = projectMission({
        alignmentContract: contractState as import("../governance/alignment-contract.js").AlignmentContract,
        intentModel: intentModelState as import("../governance/intent-model.js").IntentModel,
        refinementReport: refinementReportState as import("../governance/refinement-report.js").RefinementReport,
      })

      const events: Array<{ type: string; payload: Record<string, unknown> }> = [
        {
          type: "MISSION_PROJECTED",
          payload: {
            projectionId: pkg.projectionId,
            contractId: pkg.alignmentContractId,
            missionFingerprint: pkg.fingerprint,
          },
        },
      ]

      if (pkg.certification.result === "passed") {
        events.push({
          type: "PROJECTION_CERTIFIED",
          payload: {
            certificationId: pkg.certification.certificationId,
            projectionId: pkg.projectionId,
            checks: pkg.certification.checks,
          },
        })
        const mission = {
          ...pkg.mission,
          projectionStatus: "certified" as const,
          status: "draft" as const,
          expeditions: [],
          metadata: {},
        }
        events.push({
          type: "MISSION_CREATED",
          payload: { missionId: mission.id, mission },
        })
      } else {
        events.push({
          type: "PROJECTION_CERTIFICATION_FAILED",
          payload: {
            certificationId: pkg.certification.certificationId,
            projectionId: pkg.projectionId,
            reason: pkg.certification.checks.filter((c) => !c.passed).map((c) => c.reason).join("; "),
          },
        })
      }

      return {
        events,
        result: {
          projectionId: pkg.projectionId,
          missionId: pkg.mission.id,
          missionFingerprint: pkg.fingerprint,
          certification: pkg.certification,
          mission: pkg.mission,
        },
      }
    }

    case "CreateReferenceEvidence": {
      const input = intent.payload.input as Record<string, unknown>
      const evidence = createReferenceEvidence({
        kind: String(input.kind) as import("../governance/reference-evidence.js").EvidenceKind,
        uri: String(input.uri),
        hash: typeof input.hash === "string" ? input.hash : undefined,
        mimeType: typeof input.mimeType === "string" ? input.mimeType : undefined,
        description: typeof input.description === "string" ? input.description : undefined,
      })
      const validation = validateReferenceEvidence(evidence)
      if (!validation.valid) {
        throw new Error(`REFERENCE_EVIDENCE_INVALID: ${validation.errors.join(", ")}`)
      }
      return { events: [{ type: "REFERENCE_EVIDENCE_CREATED", payload: { evidenceId: evidence.id, evidence } }] }
    }

    case "BindReferenceEvidence": {
      const contractId = String(intent.payload.contractId)
      const evidenceId = String(intent.payload.evidenceId)
      return { events: [{ type: "REFERENCE_EVIDENCE_BOUND", payload: { contractId, evidenceId } }] }
    }

    case "OpenDivergenceGate": {
      const contractId = String(intent.payload.contractId)
      const contract = state.alignmentContracts[contractId]
      if (!contract) throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${contractId}`)
      if (contract.status !== "approved") {
        throw new Error(`ALIGNMENT_CONTRACT_NOT_APPROVED: ${contractId}`)
      }
      const gate = openDivergenceGate(contractId, contract.intentModelId)
      return {
        events: [
          {
            type: "DIVERGENCE_GATE_OPENED",
            payload: { gateId: gate.id, contractId, intentModelId: contract.intentModelId },
          },
        ],
      }
    }

    case "ResolveDivergenceGate": {
      const gateId = String(intent.payload.gateId)
      const decision = String(intent.payload.decision) as import("../governance/divergence-gate.js").DivergenceGateDecision
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const gate = state.divergenceGates[gateId]
      if (!gate) throw new Error(`DIVERGENCE_GATE_NOT_FOUND: ${gateId}`)
      const { gate: resolvedGate, report } = resolveDivergenceGate(
        gate as import("../governance/divergence-gate.js").DivergenceGate,
        decision,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence
      )
      return {
        events: [
          {
            type: "DIVERGENCE_GATE_RESOLVED",
            payload: {
              gateId: resolvedGate.id,
              contractId: resolvedGate.contractId,
              decision,
              reportId: report.id,
            },
          },
        ],
      }
    }

    // Review gate capabilities (EXP-PROGRAM-035)
    case "ApproveRefinedIntent": {
      const expeditionId = String(intent.payload.expeditionId)
      const refinedIntentInput = intent.payload.refinedIntent as Record<string, unknown>
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const policy = intent.payload.policy as Record<string, unknown>
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineApproveRefinedIntent(
        current,
        expeditionId,
        refinedIntentInput as Parameters<typeof engineApproveRefinedIntent>[2],
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        policy as GatePolicy
      )
      return { events: result.events }
    }

    case "OpenReviewGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const implementationReference = String(intent.payload.implementationReference)
      const policy = intent.payload.policy as Record<string, unknown>
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineOpenReviewGate(current, expeditionId, implementationReference, policy as GatePolicy)
      return { events: result.events }
    }

    case "ResolveReviewGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const decision = String(intent.payload.decision) as ReviewDecisionType
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const affectedAssets = Array.isArray(intent.payload.affectedAssets) ? intent.payload.affectedAssets.map(String) : []
      const requiredChanges = Array.isArray(intent.payload.requiredChanges) ? intent.payload.requiredChanges.map(String) : []
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineResolveReviewGate(
        current,
        decision,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence,
        affectedAssets,
        requiredChanges
      )
      return { events: result.events }
    }

    case "RequestRevision": {
      const expeditionId = String(intent.payload.expeditionId)
      const gateId = String(intent.payload.gateId)
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineRequestRevision(
        current,
        gateId,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence
      )
      return { events: result.events }
    }

    case "OpenAcceptanceGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const policy = intent.payload.policy as Record<string, unknown>
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineOpenAcceptanceGate(current, policy as GatePolicy)
      return { events: result.events }
    }

    case "ResolveAcceptanceGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const decision = String(intent.payload.decision) as "accepted" | "rejected"
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineResolveAcceptanceGate(
        current,
        decision,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence
      )
      return { events: result.events }
    }

    case "CloseExpedition": {
      const expeditionId = String(intent.payload.expeditionId)
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineCloseExpedition(current)
      return { events: result.events }
    }

    case "AddObjective": {
      const id = String(intent.payload.id)
      const expeditionId = String(intent.payload.expeditionId)
      const title = String(intent.payload.title)
      const purpose = String(intent.payload.purpose || "")
      const objective = planningLogic.createObjective(id, expeditionId, title, purpose, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "OBJECTIVE_ADDED", payload: { objective } }] }
    }

    case "RecordDiscovery": {
      const id = String(intent.payload.id)
      const expeditionId = String(intent.payload.expeditionId)
      const description = String(intent.payload.description)
      const discoveryContext = String(intent.payload.context || "")
      const impact = String(intent.payload.impact || "medium") as Discovery["impact"]
      const discovery = planningLogic.createDiscovery(id, expeditionId, description, discoveryContext, impact, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "DISCOVERY_RECORDED", payload: { discovery } }] }
    }

    case "AcceptDecision": {
      const id = String(intent.payload.id)
      const existing = state.decisions[id]
      if (!existing) {
        return { events: [{ type: "DECISION_ACCEPTED", payload: { id, status: "accepted" } }] }
      }
      const updated = planningLogic.acceptDecision(existing, ctx)
      return { events: [{ type: "DECISION_ACCEPTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "RejectDecision": {
      const id = String(intent.payload.id)
      const existing = state.decisions[id]
      if (!existing) {
        return { events: [{ type: "DECISION_REJECTED", payload: { id, status: "rejected" } }] }
      }
      const updated = planningLogic.rejectDecision(existing, ctx)
      return { events: [{ type: "DECISION_REJECTED", payload: { id: updated.id, status: updated.status } }] }
    }

    // ============================================================
    // Repository governance capabilities (EXP-PROGRAM-028)
    // ============================================================
    case "InitializeRepository": {
      const repositoryId = String(intent.payload.repositoryId)
      const defaultBranch = String(intent.payload.defaultBranch)
      const forgeProvider = String(intent.payload.forgeProvider)
      const versionStrategy = String(intent.payload.versionStrategy)
      return {
        events: [{
          type: "REPOSITORY_INITIALIZED",
          payload: { repositoryId, defaultBranch, forgeProvider, versionStrategy },
        }],
      }
    }

    case "CreateBranch": {
      const branchName = String(intent.payload.branchName)
      const branchType = String(intent.payload.branchType)
      const baseBranch = typeof intent.payload.baseBranch === "string" ? intent.payload.baseBranch : undefined
      const missionId = typeof intent.payload.missionId === "string" ? intent.payload.missionId : undefined
      const expeditionId = typeof intent.payload.expeditionId === "string" ? intent.payload.expeditionId : undefined
      return {
        events: [{
          type: "BRANCH_CREATED",
          payload: { branchName, branchType, baseBranch, missionId, expeditionId },
        }],
      }
    }

    case "OpenPullRequest": {
      const pullRequestId = String(intent.payload.pullRequestId)
      const forgeId = String(intent.payload.forgeId)
      const url = String(intent.payload.url)
      const number = Number(intent.payload.number)
      const headBranch = String(intent.payload.headBranch)
      const baseBranch = String(intent.payload.baseBranch)
      const title = String(intent.payload.title || "")
      const missionId = typeof intent.payload.missionId === "string" ? intent.payload.missionId : undefined
      const expeditionId = typeof intent.payload.expeditionId === "string" ? intent.payload.expeditionId : undefined
      return {
        events: [{
          type: "PULL_REQUEST_OPENED",
          payload: { pullRequestId, forgeId, url, number, headBranch, baseBranch, title, missionId, expeditionId },
        }],
      }
    }

    case "ApprovePromotion": {
      const promotionId = String(intent.payload.promotionId)
      const approver = String(intent.payload.approver || "operator")
      return {
        events: [{ type: "PROMOTION_APPROVED", payload: { promotionId, approver } }],
      }
    }

    case "MergePullRequest": {
      const pullRequestId = String(intent.payload.pullRequestId)
      const commit = String(intent.payload.commit)
      const strategy = String(intent.payload.strategy || "merge")
      return {
        events: [{ type: "PULL_REQUEST_MERGED", payload: { pullRequestId, commit, strategy } }],
      }
    }

    case "CreateRelease": {
      const releaseId = String(intent.payload.releaseId)
      const tag = String(intent.payload.tag)
      const targetCommit = String(intent.payload.targetCommit)
      const evidenceReference = typeof intent.payload.evidenceReference === "string" ? intent.payload.evidenceReference : undefined
      return {
        events: [{ type: "RELEASE_CREATED", payload: { releaseId, tag, targetCommit, evidenceReference } }],
      }
    }

    default:
      return { events: [] }
  }
}

/** Convert a domain result into canonical events with transaction metadata */
export function toEvents(
  result: CapabilityResult,
  ctx: ExecutionContext
): Array<{
  id: string
  type: string
  timestamp: number
  transactionId: string
  capability: string
  actor: string
  payload: Record<string, unknown>
  eventHash: string
  previousHash: string
}> {
  let previousHash = ctx.previousHash
  return result.events.map((event, index) => {
    const base = {
      id: `${ctx.commandId}-${index}`,
      type: event.type,
      timestamp: ctx.timestamp,
      transactionId: ctx.commandId,
      capability: ctx.capability,
      actor: ctx.actor,
      payload: event.payload,
      previousHash,
    }
    const eventHash = computeEventHash(base)
    previousHash = eventHash
    return {
      ...base,
      eventHash,
    }
  })
}
