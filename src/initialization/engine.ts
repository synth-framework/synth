// ============================================================
// INITIALIZATION: Engine
// ============================================================
// Orchestrates the transition from an external project context
// into a governed SYNTH ProjectModel.
//
// The engine is source-agnostic: it resolves an appropriate
// InitializationAdapter, collects evidence, normalizes it through
// the ProjectModel contract, and returns a replayable result.
//
// It does not mutate filesystem state, emit events, or create
// governance artifacts. Those responsibilities live in the CLI
// and ExecutionGate respectively.
// ============================================================

import { createFilesystemInitializationAdapter } from "../adapters/filesystem-initialization-adapter.js"
import { evidenceToProjectModelInput } from "../adapters/initialization-adapter.js"
import type {
  InitializationAdapter,
  InitializationEvidence,
  InitializationInput,
  InitializationResult,
  SourceType,
} from "../adapters/initialization-adapter.js"
import { createProjectModel, type ProjectModel } from "./project-model.js"

/** Request to initialize a project from an external source. */
export interface InitializeProjectRequest {
  projectId: string
  projectName: string
  sourceType: SourceType
  sourceLocation: string
  declaredIntent?: string
}

/** Options for creating an initialization engine. */
export interface InitializationEngineOptions {
  adapters?: InitializationAdapter[]
}

/** The initialization engine API. */
export interface InitializationEngine {
  initialize(request: InitializeProjectRequest): Promise<InitializationResult>
}

function defaultAdapters(): InitializationAdapter[] {
  return [createFilesystemInitializationAdapter()]
}

function emptyEvidence(sourceType: SourceType): InitializationEvidence {
  return {
    adapterId: "unknown",
    adapterVersion: "0.0.0",
    sourceType,
    summary: `No adapter available for source type: ${sourceType}`,
    confidence: { value: 0, label: "none" },
  }
}

/**
 * Create an initialization engine.
 *
 * When no adapters are supplied, a filesystem adapter rooted at the
 * current working directory is used by default.
 */
export function createInitializationEngine(
  options: InitializationEngineOptions = {},
): InitializationEngine {
  const adapters = options.adapters ?? defaultAdapters()

  return {
    async initialize(request: InitializeProjectRequest): Promise<InitializationResult> {
      const input: InitializationInput = {
        sourceType: request.sourceType,
        sourceLocation: request.sourceLocation,
        declaredIntent: request.declaredIntent,
      }

      const adapter = adapters.find((a) => a.canHandle(input))
      if (!adapter) {
        const evidence = emptyEvidence(request.sourceType)
        const model = createProjectModel({
          identity: { id: request.projectId, name: request.projectName },
          intent: request.declaredIntent ?? "unknown",
        })
        return {
          success: false,
          model,
          evidence,
          errors: [evidence.summary],
        }
      }

      const evidence = await adapter.collectEvidence(input)
      const modelInput = evidenceToProjectModelInput(evidence)
      modelInput.identity = { id: request.projectId, name: request.projectName }
      const model = createProjectModel(modelInput)

      return {
        success: true,
        model,
        evidence,
      }
    },
  }
}

/**
 * Normalize a ProjectModel into a JSON-serializable plain object suitable
 * for event payloads and evidence artifacts.
 */
export function projectModelToRecord(model: ProjectModel): Record<string, unknown> {
  return {
    schemaVersion: model.schemaVersion,
    identity: model.identity,
    intent: model.intent,
    lifecycleStage: model.lifecycleStage,
    domains: model.domains,
    constraints: model.constraints,
    evidence: model.evidence,
    confidence: model.confidence,
  }
}
