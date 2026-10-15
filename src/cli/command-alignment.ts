// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"


export interface AlignmentPrepareResult {
  contractId: string
  intentModelId: string
  gateId: string
}


export async function prepareAlignmentContract(ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>): Promise<AlignmentPrepareResult> {
  async function lastEvent(type: string, predicate: (e: any) => boolean = () => true) {
    const events = await ctx.infra.eventStore.loadAll()
    const matches = events.filter((e: any) => e.type === type && predicate(e))
    return matches.length > 0 ? matches[matches.length - 1] : undefined
  }

  const evidenceResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateReferenceEvidence",
    payload: {
      input: {
        kind: "document",
        uri: "file://alignment/prepare.md",
        hash: "sha256:00000000",
        mimeType: "text/markdown",
        description: "Reference evidence created by alignment prepare",
      },
    },
  })
  if (evidenceResult.status !== "ok") {
    throw new Error(`CreateReferenceEvidence failed: ${evidenceResult.error}`)
  }
  const evidenceEvent = await lastEvent("REFERENCE_EVIDENCE_CREATED")
  const evidenceId = (evidenceEvent?.payload as Record<string, any> | undefined)?.evidenceId
  if (!evidenceId) throw new Error("Reference evidence id not found after creation")

  const intentResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateIntentModel",
    payload: {
      input: {
        rawIntentReference: "synth-cli-alignment-prepare",
        explicitObjectives: ["Mission created through CLI alignment prepare"],
        implicitObjectives: [],
        audience: "operators",
        problemStatement: "Provide an aligned intent model for Mission approval",
        desiredOutcome: "Aligned Mission approved",
        nonGoals: [],
        forbiddenInterpretations: [],
        allowedInterpretations: ["CLI-prepared alignment"],
        referenceEvidenceIds: [evidenceId],
        unresolvedAmbiguity: [],
        knownUnknowns: [],
      },
    },
  })
  if (intentResult.status !== "ok") {
    throw new Error(`CreateIntentModel failed: ${intentResult.error}`)
  }
  const intentEvent = await lastEvent("INTENT_MODEL_CREATED")
  const intentModelId = (intentEvent?.payload as Record<string, any> | undefined)?.intentModelId
  if (!intentModelId) throw new Error("Intent model id not found after creation")

  const contractResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: "Mission created through CLI alignment prepare",
        expectedExperience: "Aligned Mission execution",
        requiredProperties: ["Mission approved with aligned intent"],
        forbiddenProperties: ["Mission approved without alignment contract"],
        requiredBehaviors: ["Approval validates alignment"],
        successCriteria: ["Mission approval succeeds"],
        forbiddenInterpretation: ["Unaligned mission approval"],
        forbiddenDrift: ["Bypass alignment governance"],
        referenceEvidenceIds: [evidenceId],
      },
    },
  })
  if (contractResult.status !== "ok") {
    throw new Error(`CreateAlignmentContract failed: ${contractResult.error}`)
  }
  const contractEvent = await lastEvent("ALIGNMENT_CONTRACT_CREATED")
  const contractId = (contractEvent?.payload as Record<string, any> | undefined)?.contractId
  if (!contractId) throw new Error("Alignment contract id not found after creation")

  const submitResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "SubmitAlignmentContract",
    payload: { contractId },
  })
  if (submitResult.status !== "ok") {
    throw new Error(`SubmitAlignmentContract failed: ${submitResult.error}`)
  }

  const approveResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveAlignmentContract",
    payload: {
      contractId,
      reviewer: { kind: "human", id: "synth-cli-operator" },
    },
  })
  if (approveResult.status !== "ok") {
    throw new Error(`ApproveAlignmentContract failed: ${approveResult.error}`)
  }

  const openGateResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  if (openGateResult.status !== "ok") {
    throw new Error(`OpenDivergenceGate failed: ${openGateResult.error}`)
  }
  const gateEvent = await lastEvent("DIVERGENCE_GATE_OPENED", (e: any) => e.payload.contractId === contractId)
  const gateId = (gateEvent?.payload as Record<string, any> | undefined)?.gateId
  if (!gateId) throw new Error("Divergence gate id not found after opening")

  const resolveResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ResolveDivergenceGate",
    payload: {
      gateId,
      decision: "aligned",
      reviewer: { kind: "human", id: "synth-cli-operator" },
      reason: "CLI alignment prepare: contract accepted as baseline",
      evidence: ["alignment-prepare"],
    },
  })
  if (resolveResult.status !== "ok") {
    throw new Error(`ResolveDivergenceGate failed: ${resolveResult.error}`)
  }

  return { contractId, intentModelId, gateId }
}
