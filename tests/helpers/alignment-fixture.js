// ============================================================
// Test helper — create an aligned Alignment Contract for Phase 2
// ============================================================

/** Extract the most recent event of a given type from the event store. */
async function lastEvent(ctx, type, predicate = () => true) {
  const events = await ctx.infra.eventStore.loadAll()
  const matches = events.filter((e) => e.type === type && predicate(e))
  if (matches.length === 0) return undefined
  return matches[matches.length - 1]
}

/** Create a piece of reference evidence and return its generated id. */
export async function createReferenceEvidence(ctx, overrides = {}) {
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateReferenceEvidence",
    payload: {
      input: {
        kind: overrides.kind || "image",
        uri: overrides.uri || "file://test/reference.png",
        hash: overrides.hash || "sha256:deadbeef",
        mimeType: overrides.mimeType || "image/png",
        description: overrides.description || "Reference evidence for alignment fixture",
      },
    },
  })
  if (result.status !== "ok") {
    throw new Error(`CreateReferenceEvidence failed: ${result.error}`)
  }
  const event = await lastEvent(ctx, "REFERENCE_EVIDENCE_CREATED")
  if (!event) throw new Error("REFERENCE_EVIDENCE_CREATED event not found")
  return event.payload.evidenceId
}

/** Create a minimal valid Intent Model and return its generated id. */
export async function createIntentModel(ctx, overrides = {}) {
  const evidenceId = overrides.evidenceId || (await createReferenceEvidence(ctx))
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateIntentModel",
    payload: {
      input: {
        rawIntentReference: overrides.rawIntentReference || "test-raw-intent",
        explicitObjectives: overrides.explicitObjectives || ["Build a deterministic execution system"],
        implicitObjectives: overrides.implicitObjectives || ["Create trust through replay"],
        audience: overrides.audience || "developers",
        problemStatement: overrides.problemStatement || "Engineering intent is often lost between humans and AI agents",
        desiredOutcome: overrides.desiredOutcome || "A homepage that feels like Mission Studio",
        nonGoals: overrides.nonGoals || ["Build a chat interface"],
        forbiddenInterpretations: overrides.forbiddenInterpretations || ["Generic dashboard", "Marketing landing page"],
        allowedInterpretations: overrides.allowedInterpretations || ["Mission Studio workspace"],
        referenceEvidenceIds: [evidenceId],
        unresolvedAmbiguity: overrides.unresolvedAmbiguity || [],
        knownUnknowns: overrides.knownUnknowns || [],
      },
    },
  })
  if (result.status !== "ok") {
    throw new Error(`CreateIntentModel failed: ${result.error}`)
  }
  const event = await lastEvent(ctx, "INTENT_MODEL_CREATED")
  if (!event) throw new Error("INTENT_MODEL_CREATED event not found")
  return { intentModelId: event.payload.intentModelId, evidenceId }
}

/** Create an Alignment Contract from an Intent Model and return its generated id. */
export async function createAlignmentContract(ctx, intentModelId, overrides = {}) {
  const evidenceId = overrides.evidenceId || (await createReferenceEvidence(ctx))
  const result = await ctx.api.handleIntent({
    actor: "test",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: overrides.intentSummary || "Build a deterministic execution system",
        expectedExperience: overrides.expectedExperience || "Mission Studio workspace as homepage",
        requiredProperties: overrides.requiredProperties || ["Persistent workspace", "Artifact-driven interaction"],
        forbiddenProperties: overrides.forbiddenProperties || ["Generic dashboard", "Marketing-first layout"],
        requiredBehaviors: overrides.requiredBehaviors || ["Lifecycle progression", "Replay visibility"],
        successCriteria: overrides.successCriteria || ["Homepage matches approved design boards"],
        forbiddenInterpretation: overrides.forbiddenInterpretation || ["Generic dashboard", "Marketing landing page"],
        forbiddenDrift: overrides.forbiddenDrift || ["Add chat interface", "Use bootstrap aesthetics"],
        referenceEvidenceIds: [evidenceId],
      },
    },
  })
  if (result.status !== "ok") {
    throw new Error(`CreateAlignmentContract failed: ${result.error}`)
  }
  const event = await lastEvent(ctx, "ALIGNMENT_CONTRACT_CREATED")
  if (!event) throw new Error("ALIGNMENT_CONTRACT_CREATED event not found")
  return { contractId: event.payload.contractId, evidenceId }
}

/** Submit and approve an Alignment Contract. */
export async function approveAlignmentContract(ctx, contractId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "SubmitAlignmentContract",
    payload: { contractId },
  })
  if (result.status !== "ok") {
    throw new Error(`SubmitAlignmentContract failed: ${result.error}`)
  }

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ApproveAlignmentContract",
    payload: {
      contractId,
      reviewer: { kind: "human", id: "test-operator" },
    },
  })
  if (result.status !== "ok") {
    throw new Error(`ApproveAlignmentContract failed: ${result.error}`)
  }
}

/** Open a Divergence Gate and resolve it as aligned. Returns the generated gate id. */
export async function alignDivergenceGate(ctx, contractId, intentModelId) {
  let result = await ctx.api.handleIntent({
    actor: "test",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  if (result.status !== "ok") {
    throw new Error(`OpenDivergenceGate failed: ${result.error}`)
  }
  const openedEvent = await lastEvent(ctx, "DIVERGENCE_GATE_OPENED", (e) => e.payload.contractId === contractId)
  if (!openedEvent) throw new Error("DIVERGENCE_GATE_OPENED event not found")
  const gateId = openedEvent.payload.gateId

  result = await ctx.api.handleIntent({
    actor: "test",
    capability: "ResolveDivergenceGate",
    payload: {
      gateId,
      decision: "aligned",
      reviewer: { kind: "human", id: "test-operator" },
      reason: "Contract accurately captures intent and references approved design boards",
      evidence: ["board-3-homepage-design.png"],
    },
  })
  if (result.status !== "ok") {
    throw new Error(`ResolveDivergenceGate failed: ${result.error}`)
  }
  return gateId
}

/** Full fixture: create intent model, alignment contract, approve it, and align divergence gate. */
export async function createAlignedContract(ctx, overrides = {}) {
  const { intentModelId } = await createIntentModel(ctx, overrides)
  const { contractId } = await createAlignmentContract(ctx, intentModelId, overrides)
  await approveAlignmentContract(ctx, contractId)
  const gateId = await alignDivergenceGate(ctx, contractId, intentModelId)
  return { intentModelId, contractId, gateId }
}
