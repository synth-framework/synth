// ============================================================
// ENVIRONMENT: Discovery Evidence & Replay Integration
// ============================================================
// Canonical serialization, content hashing, replay, and
// persistence for Discovery Evidence artifacts (ADR-015).
//
// Replay integration lives entirely in the Environment Layer.
// The frozen Replay engine, Event Model, and synth-proof-v1
// proof object are not modified.
// ============================================================

import { createHash } from "node:crypto"
import type { DiscoveryEvidence } from "./types.js"
import type { FilesystemProvider } from "./filesystem-capability.js"
import {
  buildAssumptions,
  buildCapabilitySummaries,
  buildCompatibility,
  classifyEnvironment,
  platformFromObservations,
} from "./orchestrator.js"

/** Canonical location of the discovery evidence artifact */
export const DISCOVERY_EVIDENCE_PATH = "data/discovery-evidence.json"

/** Sections of the evidence artifact that replay re-derives */
export type ReplayedEvidence = {
  environment: {
    classification: DiscoveryEvidence["environment"]["classification"]
    platform: string
  }
  capabilities: DiscoveryEvidence["capabilities"]
  assumptions: DiscoveryEvidence["assumptions"]
  compatibility: DiscoveryEvidence["compatibility"]
}

/** Result of verifying an evidence artifact against its own replay */
export type DiscoveryReplayVerification = {
  consistent: boolean
  divergences: string[]
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeys(record[key])
    }
    return sorted
  }
  return value
}

/** Deterministic JSON serialization: sorted keys, recorded array order preserved */
export function canonicalizeEvidence(evidence: DiscoveryEvidence): string {
  return JSON.stringify(sortKeys(evidence))
}

/**
 * Content view used for hashing. Volatile fields (root timestamp,
 * observation timestamps) are excluded: they record WHEN discovery
 * happened, not WHAT was discovered.
 */
function contentView(evidence: DiscoveryEvidence): unknown {
  return {
    schema: evidence.schema,
    environment: evidence.environment,
    observations: evidence.observations.map((observation) => {
      const { timestamp: _timestamp, ...content } = observation
      return content
    }),
    capabilities: evidence.capabilities,
    providers: evidence.providers,
    assumptions: evidence.assumptions,
    compatibility: evidence.compatibility,
    provenance: evidence.provenance,
  }
}

/**
 * SHA-256 over the canonical content view. Two discovery runs in an
 * identical environment must produce identical hashes.
 */
export function hashDiscoveryEvidence(evidence: DiscoveryEvidence): string {
  const canonical = JSON.stringify(sortKeys(contentView(evidence)))
  return createHash("sha256").update(canonical).digest("hex")
}

/**
 * Replay the derived sections of an evidence artifact purely from its
 * recorded observations and provider selections. Provider selections
 * are treated as recorded decisions (inputs), exactly as events are
 * treated in kernel replay; everything derived must reproduce exactly.
 */
export function replayDiscoveryEvidence(evidence: DiscoveryEvidence): ReplayedEvidence {
  const capabilities = buildCapabilitySummaries(evidence.observations)
  return {
    environment: {
      classification: classifyEnvironment(evidence.observations),
      platform: platformFromObservations(evidence.observations),
    },
    capabilities,
    assumptions: buildAssumptions(evidence.observations, evidence.providers),
    compatibility: buildCompatibility(capabilities, evidence.providers),
  }
}

function sectionEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
}

/** Compare recorded evidence against its own replay */
export function verifyDiscoveryReplay(evidence: DiscoveryEvidence): DiscoveryReplayVerification {
  const replayed = replayDiscoveryEvidence(evidence)
  const divergences: string[] = []

  if (replayed.environment.classification !== evidence.environment.classification) {
    divergences.push(
      `environment.classification: recorded=${evidence.environment.classification} replayed=${replayed.environment.classification}`,
    )
  }
  if (replayed.environment.platform !== evidence.environment.platform) {
    divergences.push(
      `environment.platform: recorded=${evidence.environment.platform} replayed=${replayed.environment.platform}`,
    )
  }
  if (!sectionEquals(replayed.capabilities, evidence.capabilities)) {
    divergences.push("capabilities: recorded section does not match replay")
  }
  if (!sectionEquals(replayed.assumptions, evidence.assumptions)) {
    divergences.push("assumptions: recorded section does not match replay")
  }
  if (!sectionEquals(replayed.compatibility, evidence.compatibility)) {
    divergences.push("compatibility: recorded section does not match replay")
  }

  return { consistent: divergences.length === 0, divergences }
}

/** Persist the canonical artifact through the Filesystem capability */
export async function persistDiscoveryEvidence(
  fs: FilesystemProvider,
  evidence: DiscoveryEvidence,
  path: string = DISCOVERY_EVIDENCE_PATH,
): Promise<void> {
  await fs.writeFile(path, `${canonicalizeEvidence(evidence)}\n`)
}

/** Load and schema-check a persisted artifact; undefined when absent or invalid */
export async function loadDiscoveryEvidence(
  fs: FilesystemProvider,
  path: string = DISCOVERY_EVIDENCE_PATH,
): Promise<DiscoveryEvidence | undefined> {
  const content = await fs.readFile(path)
  if (content === undefined) return undefined
  try {
    const parsed = JSON.parse(content) as DiscoveryEvidence
    if (parsed.schema !== "synth-discovery-evidence-v1") return undefined
    if (!Array.isArray(parsed.observations) || !Array.isArray(parsed.providers)) return undefined
    return parsed
  } catch {
    return undefined
  }
}
