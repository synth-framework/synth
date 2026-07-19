// ============================================================
// DISCOVERY: Engine
// ============================================================
// Default implementation of the DiscoveryCapability.
//
// The engine orchestrates the Discovery compiler:
//   Acquire → Normalize → Correlate → Project → Verify
//
// It does not modify the observed system or persist anything.
// ============================================================

import type { DiscoveryCapability } from "../capabilities/discovery.js"
import type {
  CorrelationCapability,
  DiscoveryAdapter,
  DiscoveryContext,
  DiscoveryEngineOptions,
  DiscoveryInput,
  DiscoveryPipelineProvenance,
  DiscoverySession,
  EvidenceGraph,
  NormalizedObservation,
  Observation,
  ObservationCapability,
  PipelineStageProvenance,
  ProjectionCapability,
  ReplayReport,
} from "./types.js"
import { createFilesystemObservationCapability } from "./capabilities/filesystem-capability.js"
import { createGitObservationCapability } from "./capabilities/git-capability.js"
import { createOperationalArtifactObservationCapability } from "./capabilities/operational-artifact-capability.js"
import { executeProjectionCapabilities } from "./projection-capability-executor.js"
import { createFindingsProjectionCapability } from "./projections/findings.js"
import { createProjectModelProjectionCapability } from "./projections/project-model-capability.js"
import { correlateEvidence } from "./correlate.js"
import { normalizeObservations } from "./normalize.js"
import { hashCanonical } from "./canonical.js"
import { verifyDiscoveryReplay } from "./replay.js"

function createObservationId(index: number): string {
  return `obs-${String(index).padStart(6, "0")}`
}

function defaultObservationCapabilities(): ObservationCapability[] {
  return [
    createFilesystemObservationCapability(),
    createGitObservationCapability(),
    createOperationalArtifactObservationCapability(),
  ]
}

function adaptersFromCapabilities(capabilities: ObservationCapability[]): DiscoveryAdapter[] {
  return capabilities.map((capability) => capability.adapter)
}

function correlationCapabilitiesFromCapabilities(
  capabilities: ObservationCapability[],
): CorrelationCapability[] {
  const rules: CorrelationCapability[] = []
  for (const capability of capabilities) {
    if (capability.correlation) {
      rules.push(capability.correlation)
    }
  }
  return rules
}

function defaultProjectionCapabilities(declaredIntent?: string): ProjectionCapability[] {
  return [
    createFindingsProjectionCapability(),
    createProjectModelProjectionCapability(declaredIntent),
  ]
}

function createEmptyPipeline(): DiscoveryPipelineProvenance {
  return {
    acquisition: createStageProvenance(),
    normalization: createStageProvenance(),
    correlation: createStageProvenance(),
    projection: createStageProvenance(),
    verification: createStageProvenance(),
  }
}

function createStageProvenance(): PipelineStageProvenance {
  return {
    inputHash: "",
    outputHash: "",
    durationMs: 0,
    version: "1.0.0",
    warnings: [],
  }
}

function recordStage<T>(
  pipeline: DiscoveryPipelineProvenance,
  key: keyof DiscoveryPipelineProvenance,
  input: unknown,
  fn: () => T,
): T {
  const stage = pipeline[key]
  stage.inputHash = hashCanonical(input)
  const start = Date.now()
  try {
    const output = fn()
    stage.outputHash = hashCanonical(output)
    stage.durationMs = Date.now() - start
    return output
  } catch (error) {
    stage.durationMs = Date.now() - start
    stage.warnings.push(error instanceof Error ? error.message : String(error))
    throw error
  }
}

/**
 * Create the default Discovery engine.
 *
 * The engine is deterministic and read-only. It returns an immutable
 * DiscoverySession containing the full provenance chain.
 */
export function createDefaultDiscoveryEngine(
  options: DiscoveryEngineOptions = {},
): DiscoveryCapability {
  const observationCapabilities =
    options.observationCapabilities ?? defaultObservationCapabilities()
  const adapters = options.adapters ?? adaptersFromCapabilities(observationCapabilities)
  const correlationCapabilities =
    options.correlationCapabilities ??
    correlationCapabilitiesFromCapabilities(observationCapabilities)

  return {
    async discover(input: DiscoveryInput): Promise<DiscoverySession> {
      const startedAt = Date.now()
      const context: DiscoveryContext = { options: input.options }
      const projectionCapabilities =
        options.projectionCapabilities ?? defaultProjectionCapabilities(input.declaredIntent)

      const pipeline = createEmptyPipeline()
      const warnings: string[] = []

      // Acquire
      const adapterRecords: DiscoverySession["adapters"] = []
      const executionOrder: string[] = []
      const rawObservations: Observation[] = []

      for (const source of input.sources) {
        for (const adapter of adapters) {
          if (!adapter.canHandle(source)) continue
          const capability = observationCapabilities.find(
            (capability) => capability.adapter.id === adapter.id,
          )
          adapterRecords.push({
            adapterId: adapter.id,
            adapterVersion: adapter.version,
            capabilityVersion: capability?.version ?? "1.0.0",
            determinism: adapter.determinism,
            configurationHash: "",
            source,
          })
          executionOrder.push(adapter.id)

          try {
            const observations = await adapter.collectObservations(source, context)
            rawObservations.push(...observations)
          } catch (error) {
            warnings.push(
              `Adapter ${adapter.id} failed for source ${source.type}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            )
          }
        }
      }

      pipeline.acquisition.inputHash = hashCanonical(input.sources)
      pipeline.acquisition.outputHash = hashCanonical(rawObservations)
      pipeline.acquisition.durationMs = Date.now() - startedAt
      pipeline.acquisition.warnings = warnings

      // Stable observation ids based on collection order.
      const observations = rawObservations.map((obs, index) => ({
        ...obs,
        id: obs.id || createObservationId(index),
      }))

      // Normalize
      const normalized = recordStage(
        pipeline,
        "normalization",
        observations,
        () => normalizeObservations(observations),
      )

      // Correlate
      const evidenceGraph = recordStage(
        pipeline,
        "correlation",
        normalized,
        () => correlateEvidence(normalized, correlationCapabilities),
      )

      // Project
      let projectionProvenance: Record<string, import("./types.js").ProjectionProvenance> = {}
      const projections = recordStage(
        pipeline,
        "projection",
        evidenceGraph,
        () => {
          const result = executeProjectionCapabilities(
            evidenceGraph,
            projectionCapabilities,
            input.declaredIntent,
          )
          projectionProvenance = result.provenance
          return result.outputs
        },
      )

      // Build session content without hash/id/replay.
      const sessionContent: Omit<DiscoverySession, "id" | "hash" | "replay"> = {
        schemaVersion: "synth-discovery-session-v1",
        parentSessionId: input.parentSessionId,
        startedAt,
        completedAt: Date.now(),
        sources: input.sources,
        adapters: adapterRecords,
        executionOrder,
        observations: normalized,
        evidenceGraph,
        projections,
        projectionProvenance,
        pipeline,
      }

      // Verify
      let replay: ReplayReport
      try {
        replay = recordStage(
          pipeline,
          "verification",
          sessionContent,
          () =>
            verifyDiscoveryReplay(
              {
                ...sessionContent,
                id: "",
                hash: "",
                replay: {
                  status: "exact",
                  sessionId: "",
                  sessionHash: "",
                  stageResults: [],
                  adapterChecks: [],
                  provenanceChecks: [],
                  tamperDetected: false,
                  tamperDetails: [],
                  durationMs: 0,
                },
              },
              correlationCapabilities,
              projectionCapabilities,
            ),
        )
      } catch (error) {
        replay = {
          status: "impossible",
          sessionId: "",
          sessionHash: "",
          stageResults: [],
          adapterChecks: [],
          provenanceChecks: [],
          tamperDetected: false,
          tamperDetails: [error instanceof Error ? error.message : String(error)],
          durationMs: 0,
        }
      }

      // Session identity covers canonical evidence content (excluding
      // transient metadata like id, hash, replay, timestamps, and pipeline
      // provenance durations) so that deterministic adapters produce
      // identical sessions across runs.
      const {
        startedAt: _startedAt,
        completedAt: _completedAt,
        pipeline: _pipeline,
        ...canonicalContent
      } = sessionContent
      const sessionHash = hashCanonical(canonicalContent)
      const sessionId = `session-${sessionHash.slice(0, 16)}`

      const session: DiscoverySession = {
        ...sessionContent,
        id: sessionId,
        hash: sessionHash,
        replay: {
          ...replay,
          sessionId,
          sessionHash,
        },
      }

      return session
    },

    async replay(session: DiscoverySession): Promise<ReplayReport> {
      const projectionCapabilities =
        options.projectionCapabilities ?? defaultProjectionCapabilities()
      return verifyDiscoveryReplay(session, correlationCapabilities, projectionCapabilities)
    },
  }
}
