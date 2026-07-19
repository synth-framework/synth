// ============================================================
// DISCOVERY: Normalize Stage
// ============================================================
// Validates observations, assigns stable ids, and produces a
// canonically ordered observation list.
//
// Contract:
//   Input:  Observation[]
//   Output: NormalizedObservation[]
//   Invariants: Stable ids; canonical ordering; no duplicates.
//   Failure: Malformed observations are rejected.
// ============================================================

import type { DiscoverySource, NormalizedObservation, Observation } from "./types.js"

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

function createObservationId(index: number): string {
  return `obs-${String(index).padStart(6, "0")}`
}

function validateObservation(obs: Observation, index: number): void {
  if (!obs.adapterId) {
    throw new Error(`Observation ${index}: missing adapterId`)
  }
  if (!obs.adapterVersion) {
    throw new Error(`Observation ${index}: missing adapterVersion`)
  }
  if (!obs.source) {
    throw new Error(`Observation ${index}: missing source`)
  }
  if (!obs.fact || typeof obs.fact !== "string") {
    throw new Error(`Observation ${index}: missing or invalid fact`)
  }
  if (typeof obs.timestamp !== "number" || obs.timestamp <= 0) {
    throw new Error(`Observation ${index}: missing or invalid timestamp`)
  }
}

/**
 * Normalize observations into a canonically ordered list.
 *
 * Assigns stable ids to observations missing them, validates required
 * fields, removes duplicates, and sorts by canonical key.
 */
export function normalizeObservations(
  observations: Observation[],
): NormalizedObservation[] {
  const seen = new Set<string>()
  const normalized: NormalizedObservation[] = []

  for (let i = 0; i < observations.length; i++) {
    const obs = observations[i]
    validateObservation(obs, i)

    const id = obs.id || createObservationId(i)
    if (seen.has(id)) {
      throw new Error(`Duplicate observation id: ${id}`)
    }
    seen.add(id)

    normalized.push({
      ...obs,
      id,
    })
  }

  return normalized.sort((a, b) => {
    const keyA = `${sourceKey(a.source)}|${a.adapterId}|${a.fact}|${a.id}`
    const keyB = `${sourceKey(b.source)}|${b.adapterId}|${b.fact}|${b.id}`
    return keyA.localeCompare(keyB)
  })
}
