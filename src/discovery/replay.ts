// ============================================================
// DISCOVERY: Replay Verifier
// ============================================================
// First-class compiler subsystem that proves the provenance,
// determinism, and reproducibility of a DiscoverySession.
//
// Replay answers "Can this be reproduced?" not "Is this true?"
//
// The verifier re-executes the Normalize → Correlate → Project pipeline
// and compares every stage hash, adapter record, and evidence claim
// reference against stored provenance. It produces a structured
// ReplayReport with per-stage results, explicit tamper detection, and
// adapter determinism classification.
// ============================================================

import type {
  AdapterCheckResult,
  AdapterExecutionRecord,
  CorrelationCapability,
  DiscoverySession,
  EvidenceGraph,
  NormalizedObservation,
  ProjectionCapability,
  ProvenanceCheckResult,
  ReplayReport,
  ReplayStageName,
  ReplayStageResult,
} from "./types.js"
import { correlateEvidence } from "./correlate.js"
import { normalizeObservations } from "./normalize.js"
import { executeProjectionCapabilities } from "./projection-capability-executor.js"
import { hashCanonical } from "./canonical.js"

const STAGE_INVARIANTS: Record<ReplayStageName, string> = {
  acquisition: "Adapter metadata and source-state snapshots are consistent",
  normalization: "Canonical observations hash matches",
  correlation: "EvidenceGraph hash matches",
  projection: "Projection output hashes match",
  verification: "Session hash matches recomputed content hash",
}

function stageResult(
  stage: ReplayStageName,
  status: ReplayStageResult["status"],
  expectedHash: string,
  actualHash: string,
  warnings: string[] = [],
): ReplayStageResult {
  return {
    stage,
    status,
    expectedHash,
    actualHash,
    invariant: STAGE_INVARIANTS[stage],
    warnings,
  }
}

function provenanceCheck(
  kind: "session-hash" | "stage-hash" | "claim-reference" | "projection-dependency",
  status: "passed" | "failed",
  targetId: string,
  reason?: string,
): ProvenanceCheckResult {
  return { kind, status, targetId, reason }
}

function sourceHasSnapshot(
  session: DiscoverySession,
  adapterSource: AdapterExecutionRecord["source"],
): boolean {
  const sourceHash = hashCanonical(adapterSource)
  return session.observations.some(
    (obs) => hashCanonical(obs.source) === sourceHash && obs.sourceState !== undefined && obs.sourceState !== null,
  )
}

function checkAdapters(session: DiscoverySession): AdapterCheckResult[] {
  const results: AdapterCheckResult[] = []

  for (const adapter of session.adapters) {
    const missingFields: string[] = []
    if (!adapter.adapterId) missingFields.push("adapterId")
    if (!adapter.adapterVersion) missingFields.push("adapterVersion")
    if (!adapter.capabilityVersion) missingFields.push("capabilityVersion")
    if (typeof adapter.configurationHash !== "string") missingFields.push("configurationHash")
    if (!adapter.determinism) missingFields.push("determinism")
    if (!adapter.source) missingFields.push("source")

    if (missingFields.length > 0) {
      results.push({
        adapterId: adapter.adapterId || "unknown",
        determinism: adapter.determinism || "non-deterministic",
        status: "failed",
        reason: `Missing or invalid fields: ${missingFields.join(", ")}`,
      })
      continue
    }

    const sourceInSession = session.sources.some(
      (s) => hashCanonical(s) === hashCanonical(adapter.source),
    )
    if (!sourceInSession) {
      results.push({
        adapterId: adapter.adapterId,
        determinism: adapter.determinism,
        status: "failed",
        reason: "Adapter source is not present in session.sources",
      })
      continue
    }

    if (adapter.determinism === "non-deterministic") {
      const hasSnapshot = sourceHasSnapshot(session, adapter.source)
      if (!hasSnapshot) {
        results.push({
          adapterId: adapter.adapterId,
          determinism: adapter.determinism,
          status: "failed",
          reason: "Non-deterministic adapter lacks source-state snapshot",
        })
      } else {
        results.push({
          adapterId: adapter.adapterId,
          determinism: adapter.determinism,
          status: "contextual",
          reason: "Non-deterministic adapter replay relies on source-state snapshot",
        })
      }
      continue
    }

    results.push({
      adapterId: adapter.adapterId,
      determinism: adapter.determinism,
      status: adapter.determinism === "contextual" ? "contextual" : "passed",
    })
  }

  return results
}

function collectClaimIds(graph: EvidenceGraph): Set<string> {
  return new Set(graph.claims.map((claim) => claim.id))
}

function findClaimReferences(value: unknown, refs: Set<string>): void {
  if (value === null || value === undefined) {
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      findClaimReferences(item, refs)
    }
    return
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    if (
      "evidenceClaimIds" in record &&
      Array.isArray(record.evidenceClaimIds)
    ) {
      for (const id of record.evidenceClaimIds) {
        if (typeof id === "string") refs.add(id)
      }
    }
    if (
      "evidenceClaimReferences" in record &&
      Array.isArray(record.evidenceClaimReferences)
    ) {
      for (const id of record.evidenceClaimReferences) {
        if (typeof id === "string") refs.add(id)
      }
    }
    for (const child of Object.values(record)) {
      findClaimReferences(child, refs)
    }
  }
}

function checkClaimReferences(
  session: DiscoverySession,
  validClaimIds: Set<string>,
): ProvenanceCheckResult[] {
  const referencedIds = new Set<string>()
  for (const projection of Object.values(session.projections)) {
    findClaimReferences(projection, referencedIds)
  }

  const results: ProvenanceCheckResult[] = []
  for (const id of referencedIds) {
    if (validClaimIds.has(id)) {
      results.push(provenanceCheck("claim-reference", "passed", id))
    } else {
      results.push(
        provenanceCheck(
          "claim-reference",
          "failed",
          id,
          "Referenced claim does not exist in the evidence graph",
        ),
      )
    }
  }

  return results
}

function checkProjectionDependencies(
  session: DiscoverySession,
): ProvenanceCheckResult[] {
  const results: ProvenanceCheckResult[] = []
  const evidenceGraphHash = hashCanonical(session.evidenceGraph)

  for (const [projectionType, provenance] of Object.entries(
    session.projectionProvenance,
  )) {
    if (provenance.evidenceGraphHash !== evidenceGraphHash) {
      results.push(
        provenanceCheck(
          "projection-dependency",
          "failed",
          projectionType,
          "EvidenceGraph hash in projection provenance does not match session evidence graph",
        ),
      )
      continue
    }

    const dependencyMismatches: string[] = []
    for (const [dependencyType, expectedHash] of Object.entries(
      provenance.priorOutputHashes,
    )) {
      const actualHash = hashCanonical(session.projections[dependencyType])
      if (actualHash !== expectedHash) {
        dependencyMismatches.push(
          `${dependencyType}: expected ${expectedHash}, got ${actualHash}`,
        )
      }
    }

    if (dependencyMismatches.length > 0) {
      results.push(
        provenanceCheck(
          "projection-dependency",
          "failed",
          projectionType,
          `Dependency hash mismatches: ${dependencyMismatches.join("; ")}`,
        ),
      )
    } else {
      results.push(
        provenanceCheck(
          "projection-dependency",
          "passed",
          projectionType,
        ),
      )
    }
  }

  return results
}

function recomputeSessionHash(session: DiscoverySession): string {
  // The session hash covers canonical evidence content, excluding transient
  // metadata (id, hash, replay, timestamps, and pipeline provenance with
  // durations) so deterministic runs are identical across time.
  const {
    id: _id,
    hash: _hash,
    replay: _replay,
    startedAt: _startedAt,
    completedAt: _completedAt,
    pipeline: _pipeline,
    ...content
  } = session
  return hashCanonical(content)
}

function buildImpossibleReport(
  session: DiscoverySession,
  startTime: number,
  stageResults: ReplayStageResult[],
  adapterChecks: AdapterCheckResult[],
  provenanceChecks: ProvenanceCheckResult[] = [],
): ReplayReport {
  return {
    status: "impossible",
    sessionId: session.id,
    sessionHash: session.hash,
    stageResults,
    adapterChecks,
    provenanceChecks,
    tamperDetected: false,
    tamperDetails: ["Pipeline re-execution failed"],
    durationMs: Date.now() - startTime,
  }
}

/**
 * Verify that a DiscoverySession can be replayed.
 *
 * Re-runs Normalize → Correlate → Projections from the stored
 * observations and compares hashes against stored provenance. Produces a
 * structured ReplayReport with per-stage results, adapter checks,
 * provenance checks, and explicit tamper detection.
 */
export function verifyDiscoveryReplay(
  session: DiscoverySession,
  correlationCapabilities: CorrelationCapability[],
  projectionCapabilities: ProjectionCapability[],
): ReplayReport {
  const startTime = Date.now()
  const stageResults: ReplayStageResult[] = []
  const tamperDetails: string[] = []

  // Adapter metadata checks (acquisition replay contract).
  const adapterChecks = checkAdapters(session)
  const acquisitionPassed = adapterChecks.every(
    (check) => check.status === "passed" || check.status === "contextual",
  )
  stageResults.push(
    stageResult(
      "acquisition",
      acquisitionPassed ? "passed" : "failed",
      session.pipeline.acquisition.inputHash,
      hashCanonical(session.sources),
      adapterChecks
        .filter((c) => c.status === "failed")
        .map((c) => `${c.adapterId}: ${c.reason ?? "metadata mismatch"}`),
    ),
  )
  for (const failed of adapterChecks.filter((c) => c.status === "failed")) {
    tamperDetails.push(
      `Adapter metadata failed for ${failed.adapterId}: ${failed.reason ?? "unknown reason"}`,
    )
  }

  // Re-run stages.
  let normalized: NormalizedObservation[]
  let evidenceGraph: EvidenceGraph
  let projections: Record<string, unknown>

  try {
    normalized = normalizeObservations(session.observations)
    evidenceGraph = correlateEvidence(normalized, correlationCapabilities)
    const result = executeProjectionCapabilities(
      evidenceGraph,
      projectionCapabilities,
    )
    projections = result.outputs
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error)
    return buildImpossibleReport(
      session,
      startTime,
      stageResults,
      adapterChecks,
    )
  }

  // Normalization stage.
  const normalizationActualHash = hashCanonical(normalized)
  const normalizationPassed =
    session.pipeline.normalization.outputHash === normalizationActualHash
  stageResults.push(
    stageResult(
      "normalization",
      normalizationPassed ? "passed" : "failed",
      session.pipeline.normalization.outputHash,
      normalizationActualHash,
      normalizationPassed
        ? []
        : [
            `Normalization output hash mismatch: expected ${session.pipeline.normalization.outputHash}, got ${normalizationActualHash}`,
          ],
    ),
  )
  if (!normalizationPassed) {
    tamperDetails.push(
      `Normalization stage hash mismatch: expected ${session.pipeline.normalization.outputHash}, got ${normalizationActualHash}`,
    )
  }

  // Correlation stage.
  const correlationActualHash = hashCanonical(evidenceGraph)
  const correlationPassed =
    session.pipeline.correlation.outputHash === correlationActualHash
  stageResults.push(
    stageResult(
      "correlation",
      correlationPassed ? "passed" : "failed",
      session.pipeline.correlation.outputHash,
      correlationActualHash,
      correlationPassed
        ? []
        : [
            `Correlation output hash mismatch: expected ${session.pipeline.correlation.outputHash}, got ${correlationActualHash}`,
          ],
    ),
  )
  if (!correlationPassed) {
    tamperDetails.push(
      `Correlation stage hash mismatch: expected ${session.pipeline.correlation.outputHash}, got ${correlationActualHash}`,
    )
  }

  // Projection stage.
  const projectionActualHash = hashCanonical(projections)
  const projectionPassed =
    session.pipeline.projection.outputHash === projectionActualHash
  stageResults.push(
    stageResult(
      "projection",
      projectionPassed ? "passed" : "failed",
      session.pipeline.projection.outputHash,
      projectionActualHash,
      projectionPassed
        ? []
        : [
            `Projection output hash mismatch: expected ${session.pipeline.projection.outputHash}, got ${projectionActualHash}`,
          ],
    ),
  )
  if (!projectionPassed) {
    tamperDetails.push(
      `Projection stage hash mismatch: expected ${session.pipeline.projection.outputHash}, got ${projectionActualHash}`,
    )
  }

  // Verification stage (session hash integrity).
  // During initial discovery the hash is computed after verification, so an
  // empty stored hash means the check cannot be performed yet.
  const hasStoredHash = session.hash.length > 0
  const recomputedSessionHash = hasStoredHash
    ? recomputeSessionHash(session)
    : ""
  const verificationPassed =
    hasStoredHash && session.hash === recomputedSessionHash
  stageResults.push(
    stageResult(
      "verification",
      hasStoredHash
        ? verificationPassed
          ? "passed"
          : "failed"
        : "skipped",
      session.hash,
      recomputedSessionHash,
      verificationPassed || !hasStoredHash
        ? []
        : [
            `Session hash mismatch: expected ${session.hash}, got ${recomputedSessionHash}`,
          ],
    ),
  )
  if (hasStoredHash && !verificationPassed) {
    tamperDetails.push(
      `Session hash mismatch: expected ${session.hash}, got ${recomputedSessionHash}`,
    )
  }

  // Provenance checks.
  const validClaimIds = collectClaimIds(session.evidenceGraph)
  const provenanceChecks: ProvenanceCheckResult[] = [
    provenanceCheck(
      "session-hash",
      hasStoredHash
        ? verificationPassed
          ? "passed"
          : "failed"
        : "passed",
      session.id,
      hasStoredHash && !verificationPassed
        ? "Session hash does not match recomputed canonical content"
        : undefined,
    ),
    ...checkClaimReferences(session, validClaimIds),
    ...checkProjectionDependencies(session),
  ]

  // Stage-hash provenance checks for stages whose output artifacts are
  // stored in the session. Acquisition output (raw observations) is not
  // retained, so its contract is enforced by adapter metadata checks.
  const stageHashes = [
    { stage: "normalization" as ReplayStageName, expected: session.pipeline.normalization.outputHash, actual: normalizationActualHash },
    { stage: "correlation" as ReplayStageName, expected: session.pipeline.correlation.outputHash, actual: correlationActualHash },
    { stage: "projection" as ReplayStageName, expected: session.pipeline.projection.outputHash, actual: projectionActualHash },
  ]
  for (const { stage, expected, actual } of stageHashes) {
    const passed = expected === actual
    provenanceChecks.push(
      provenanceCheck(
        "stage-hash",
        passed ? "passed" : "failed",
        stage,
        passed ? undefined : `Expected ${expected}, got ${actual}`,
      ),
    )
    if (!passed) {
      tamperDetails.push(`Stage hash mismatch for ${stage}: expected ${expected}, got ${actual}`)
    }
  }

  for (const check of provenanceChecks) {
    if (check.status === "failed") {
      tamperDetails.push(`${check.kind}:${check.targetId}: ${check.reason ?? "provenance check failed"}`)
    }
  }

  const anyStageFailed = stageResults.some((r) => r.status === "failed")
  const anyProvenanceFailed = provenanceChecks.some((c) => c.status === "failed")
  const anyAdapterFailed = adapterChecks.some((c) => c.status === "failed")
  const tamperDetected =
    anyStageFailed || anyProvenanceFailed || anyAdapterFailed

  const nonDeterministicWithoutSnapshot = adapterChecks.some(
    (check) =>
      check.determinism === "non-deterministic" && check.status === "failed",
  )
  const contextualAdapters = adapterChecks.some(
    (check) => check.status === "contextual",
  )

  let status: ReplayReport["status"]
  if (nonDeterministicWithoutSnapshot) {
    status = "impossible"
  } else if (tamperDetected) {
    status = "invalid"
  } else if (contextualAdapters) {
    status = "contextual"
  } else {
    status = "exact"
  }

  return {
    status,
    sessionId: session.id,
    sessionHash: session.hash,
    stageResults,
    adapterChecks,
    provenanceChecks,
    tamperDetected,
    tamperDetails,
    durationMs: Date.now() - startTime,
  }
}
