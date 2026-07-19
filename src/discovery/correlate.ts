// ============================================================
// DISCOVERY: Correlate Stage
// ============================================================
// Transforms normalized observations into an immutable EvidenceGraph
// using data-driven correlation rules contributed by capabilities.
//
// Contract:
//   Input:  NormalizedObservation[], CorrelationCapability[]
//   Output: EvidenceGraph
//   Invariants: Every claim is an assertion supported by observations;
//               the IR is immutable; no raw observations leak downstream.
//   Failure: Rule conflicts resolved by priority.
// ============================================================

import type {
  ConfidenceScore,
  CorrelationCapability,
  CorrelationRule,
  DiscoverySource,
  EvidenceClaim,
  EvidenceEdge,
  EvidenceGraph,
  NormalizedObservation,
} from "./types.js"

function generateClaimId(index: number): string {
  return `claim-${String(index).padStart(6, "0")}`
}

function deterministicConfidence(
  reason: string,
  label: ConfidenceScore["label"] = "certain",
): ConfidenceScore {
  return {
    value: label === "certain" ? 1.0 : label === "high" ? 0.85 : label === "medium" ? 0.6 : label === "low" ? 0.35 : 0,
    label,
    kind: "deterministic",
    reason,
  }
}

function sourceKey(source: DiscoverySource): string {
  switch (source.type) {
    case "filesystem":
      return `filesystem:${source.path}`
    case "git":
      return `git:${source.url}:${source.ref ?? "HEAD"}`
    case "github":
      return `github:${source.owner}/${source.repo}:${source.ref ?? "HEAD"}`
    case "knowledge":
      return `knowledge:${source.path}`
    case "tickets":
      return `tickets:${source.provider}:${source.endpoint}`
    case "api":
      return `api:${source.endpoint}`
    case "deployment":
      return `deployment:${source.provider}:${source.identifier}`
    case "database":
      return `database:${source.connection}`
    case "container":
      return `container:${source.image}`
    default:
      return `unknown:${JSON.stringify(source)}`
  }
}

function collectRules(capabilities: CorrelationCapability[]): CorrelationRule[] {
  const rules: CorrelationRule[] = []
  for (const capability of capabilities) {
    rules.push(...capability.registerRules())
  }
  return rules.sort((a, b) => b.priority - a.priority)
}

function buildObservationIndex(
  observations: NormalizedObservation[],
): Map<string, NormalizedObservation[]> {
  const index = new Map<string, NormalizedObservation[]>()
  for (const observation of observations) {
    const list = index.get(observation.fact) || []
    list.push(observation)
    index.set(observation.fact, list)
  }
  return index
}

function payloadMatches(
  payload: Record<string, unknown> | undefined,
  constraint: Record<string, unknown>,
): boolean {
  if (!payload) return false
  for (const [key, value] of Object.entries(constraint)) {
    if (payload[key] !== value) return false
  }
  return true
}

function evaluateRule(
  rule: CorrelationRule,
  observationIndex: Map<string, NormalizedObservation[]>,
): EvidenceClaim | null {
  const matchedObservations: NormalizedObservation[] = []

  for (let i = 0; i < rule.requiredFacts.length; i++) {
    const requiredFact = rule.requiredFacts[i]
    const observations = observationIndex.get(requiredFact)
    if (!observations || observations.length === 0) {
      return null
    }

    const constraint = rule.payloadConstraints?.[requiredFact]
    const observation = constraint
      ? observations.find((obs) => payloadMatches(obs.payload, constraint))
      : observations[0]

    if (!observation) {
      return null
    }
    matchedObservations.push(observation)
  }

  const primary = matchedObservations[0]
  return {
    id: "", // assigned later
    assertion: rule.assertion,
    observationIds: matchedObservations.map((o) => o.id),
    adapterId: primary.adapterId,
    adapterVersion: primary.adapterVersion,
    source: primary.source,
    confidence: rule.confidence,
  }
}

function createFallbackClaim(
  observation: NormalizedObservation,
  index: number,
): EvidenceClaim {
  return {
    id: "", // assigned later
    assertion: observation.fact,
    observationIds: [observation.id],
    adapterId: observation.adapterId,
    adapterVersion: observation.adapterVersion,
    source: observation.source,
    confidence: deterministicConfidence(
      `Direct observation: ${observation.fact}`,
      "certain",
    ),
  }
}

/**
 * Correlate normalized observations into an immutable EvidenceGraph.
 *
 * Rules are evaluated in priority order. Each matched rule produces one
 * claim. Unmatched observations become fallback claims that assert their
 * own fact.
 */
export function correlateEvidence(
  observations: NormalizedObservation[],
  capabilities: CorrelationCapability[],
): EvidenceGraph {
  const rules = collectRules(capabilities)
  const observationIndex = buildObservationIndex(observations)
  const usedObservationIds = new Set<string>()
  const claims: EvidenceClaim[] = []

  for (const rule of rules) {
    const claim = evaluateRule(rule, observationIndex)
    if (claim) {
      claim.id = generateClaimId(claims.length)
      claims.push(claim)
      for (const observationId of claim.observationIds) {
        usedObservationIds.add(observationId)
      }
    }
  }

  // Fallback claims for observations not consumed by any rule.
  for (const observation of observations) {
    if (!usedObservationIds.has(observation.id)) {
      const fallback = createFallbackClaim(observation, claims.length)
      fallback.id = generateClaimId(claims.length)
      claims.push(fallback)
    }
  }

  // Build indexes.
  const observationIndexMap: Record<string, number> = {}
  const claimIndexMap: Record<string, number> = {}
  const sourceIndexMap: Record<string, number> = {}

  for (let i = 0; i < observations.length; i++) {
    observationIndexMap[observations[i].id] = i
  }
  for (let i = 0; i < claims.length; i++) {
    claimIndexMap[claims[i].id] = i
  }

  const sourceKeys = new Set<string>()
  for (const observation of observations) {
    sourceKeys.add(sourceKey(observation.source))
  }
  const sortedSourceKeys = Array.from(sourceKeys).sort()
  for (let i = 0; i < sortedSourceKeys.length; i++) {
    sourceIndexMap[sortedSourceKeys[i]] = i
  }

  // Edges: each claim supports the observations it references.
  const edges: EvidenceEdge[] = []
  for (const claim of claims) {
    for (const observationId of claim.observationIds) {
      edges.push({
        from: observationId,
        to: claim.id,
        kind: "supports",
      })
    }
  }

  return {
    schema: "synth-discovery-evidence-v1",
    observations,
    claims,
    edges,
    observationIndex: observationIndexMap,
    claimIndex: claimIndexMap,
    sourceIndex: sourceIndexMap,
  }
}
